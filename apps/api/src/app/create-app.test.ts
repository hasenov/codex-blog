import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { z } from 'zod';

import { authenticatedUserResponseSchema, userResponseSchema } from '@codex-blog/contracts';
import { createPrismaClient } from '@codex-blog/infrastructure';

import { createApp } from './create-app.js';

const problemDetailsSchema = z.object({
    code: z.string(),
    correlationId: z.string(),
    detail: z.string(),
    status: z.number(),
    title: z.string(),
    type: z.string(),
});

const createIdentitySchema = async (databaseUrl: string): Promise<void> => {
    const prisma = createPrismaClient(databaseUrl);

    try {
        await prisma.$connect();
        await prisma.$executeRaw`
            CREATE TABLE "users" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "email" TEXT NOT NULL,
                "displayName" TEXT NOT NULL,
                "role" TEXT NOT NULL,
                "status" TEXT NOT NULL,
                "passwordHash" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL,
                "updatedAt" DATETIME NOT NULL
            )
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX "users_email_key" ON "users" ("email")`;
        await prisma.$executeRaw`
            CREATE TABLE "sessions" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "refreshTokenId" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL,
                "expiresAt" DATETIME NOT NULL,
                "revokedAt" DATETIME,
                "replacedBySessionId" TEXT,
                CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX "sessions_refreshTokenId_key" ON "sessions" ("refreshTokenId")`;
        await prisma.$executeRaw`CREATE INDEX "sessions_userId_idx" ON "sessions" ("userId")`;
        await prisma.$executeRaw`
            CREATE TABLE "security_events" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "type" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "occurredAt" DATETIME NOT NULL,
                "correlationId" TEXT NOT NULL,
                "metadataJson" TEXT,
                CONSTRAINT "security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        await prisma.$executeRaw`CREATE INDEX "security_events_userId_idx" ON "security_events" ("userId")`;
        await prisma.$executeRaw`
            CREATE TABLE "password_reset_tokens" (
                "token" TEXT NOT NULL PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "expiresAt" DATETIME NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        await prisma.$executeRaw`CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens" ("userId")`;
    } finally {
        await prisma.$disconnect();
    }
};

describe('createApp', () => {
    it('returns health status under v1', async () => {
        const { app } = createApp();

        const response = await request(app).get('/v1/health').expect(200);

        expect(response.body).toEqual({ status: 'ok' });
    });

    it('registers a user through the auth API', async () => {
        const { app } = createApp();

        const response = await request(app)
            .post('/v1/auth/register')
            .send({
                email: 'reader@example.com',
                displayName: 'Reader',
                password: 'secret-123',
            })
            .expect(201);

        const body = authenticatedUserResponseSchema.parse(response.body);

        expect(body.user.email).toBe('reader@example.com');
        expect(body.user.role).toBe('reader');
        expect(body.tokens.accessToken).toContain('.');
        expect(body.tokens.refreshToken).toContain('.');
    });

    it('serializes request validation errors as problem details', async () => {
        const { app } = createApp();

        const response = await request(app)
            .post('/v1/auth/register')
            .send({
                email: 'not-an-email',
                displayName: 'R',
                password: 'short',
            })
            .set('x-correlation-id', 'api-validation-test')
            .expect(400);

        const body = problemDetailsSchema.parse(response.body);

        expect(body.code).toBe('VALIDATION_ERROR');
        expect(body.correlationId).toBe('api-validation-test');
    });

    it('rejects protected routes without a bearer token', async () => {
        const { app } = createApp();

        const response = await request(app).get('/v1/auth/me').set('x-correlation-id', 'missing-token-test').expect(401);
        const body = problemDetailsSchema.parse(response.body);

        expect(body.code).toBe('MISSING_BEARER_TOKEN');
        expect(body.correlationId).toBe('missing-token-test');
    });

    it('returns the current user with a valid access token', async () => {
        const { app } = createApp();
        const registrationResponse = await request(app)
            .post('/v1/auth/register')
            .send({
                email: 'current@example.com',
                displayName: 'Current User',
                password: 'secret-123',
            })
            .expect(201);
        const registration = authenticatedUserResponseSchema.parse(registrationResponse.body);

        const response = await request(app)
            .get('/v1/auth/me')
            .set('authorization', `Bearer ${registration.tokens.accessToken}`)
            .expect(200);
        const body = userResponseSchema.parse(response.body);

        expect(body.id).toBe(registration.user.id);
        expect(body.email).toBe(registration.user.email);
    });

    it('uses Prisma persistence when DATA_SOURCE is prisma', async () => {
        const previousDataSource = process.env.DATA_SOURCE;
        const previousDatabaseUrl = process.env.DATABASE_URL;
        const tempDirectory = await mkdtemp(path.join(tmpdir(), 'codex-blog-api-prisma-'));
        const databaseUrl = `file:${path.join(tempDirectory, 'api-test.db')}`;

        try {
            await createIdentitySchema(databaseUrl);

            process.env.DATA_SOURCE = 'prisma';
            process.env.DATABASE_URL = databaseUrl;

            const firstApp = createApp();
            const registrationResponse = await request(firstApp.app)
                .post('/v1/auth/register')
                .send({
                    email: 'persisted@example.com',
                    displayName: 'Persisted User',
                    password: 'secret-123',
                })
                .expect(201);
            const registration = authenticatedUserResponseSchema.parse(registrationResponse.body);
            await firstApp.dispose();

            const secondApp = createApp();
            const loginResponse = await request(secondApp.app)
                .post('/v1/auth/login')
                .send({
                    email: 'persisted@example.com',
                    password: 'secret-123',
                })
                .expect(200);
            const login = authenticatedUserResponseSchema.parse(loginResponse.body);
            await secondApp.dispose();

            expect(login.user.id).toBe(registration.user.id);
        } finally {
            if (previousDataSource === undefined) {
                delete process.env.DATA_SOURCE;
            } else {
                process.env.DATA_SOURCE = previousDataSource;
            }

            if (previousDatabaseUrl === undefined) {
                delete process.env.DATABASE_URL;
            } else {
                process.env.DATABASE_URL = previousDatabaseUrl;
            }

            await rm(tempDirectory, { recursive: true, force: true });
        }
    });
});
