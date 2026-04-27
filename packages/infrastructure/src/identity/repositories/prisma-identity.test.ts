import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Email, EntityId, Session, UtcDateTime, User } from '@codex-blog/domain';

import {
    PrismaPasswordResetTokenStore,
    PrismaSecurityEventRepository,
    PrismaSessionRepository,
    PrismaUserRepository,
} from './prisma-identity.js';
import { createPrismaClient } from '../../prisma/client.js';

const createTestUser = (id: string, email: string): User =>
    User.register({
        id: EntityId.create(id),
        email: Email.create(email),
        displayName: 'Reader',
        passwordHash: 'hashed-password',
        createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
    });

const createTestSession = (id: string, userId: string): Session =>
    Session.create({
        id: EntityId.create(id),
        userId: EntityId.create(userId),
        refreshTokenId: `${id}-refresh-token`,
        createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
        expiresAt: UtcDateTime.fromISOString('2026-02-01T00:00:00.000Z'),
    });

describe('Prisma identity repositories', () => {
    let tempDirectory: string;
    let prisma: ReturnType<typeof createPrismaClient>;

    beforeEach(async () => {
        tempDirectory = await mkdtemp(path.join(tmpdir(), 'codex-blog-prisma-'));
        prisma = createPrismaClient(`file:${path.join(tempDirectory, 'test.db')}`);
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
    });

    afterEach(async () => {
        await prisma.$disconnect();
        await rm(tempDirectory, { recursive: true, force: true });
    });

    it('persists and rehydrates users', async () => {
        const repository = new PrismaUserRepository(prisma);
        const user = createTestUser('user-0001', 'reader@example.com');

        await repository.save(user);
        user.changeRole('author', UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));
        await repository.save(user);

        const foundById = await repository.findById('user-0001');
        const foundByEmail = await repository.findByEmail('reader@example.com');
        const users = await repository.list();

        expect(foundById?.role).toBe('author');
        expect(foundByEmail?.id.toString()).toBe('user-0001');
        expect(users).toHaveLength(1);
    });

    it('persists sessions and revokes all sessions for a user', async () => {
        await new PrismaUserRepository(prisma).save(createTestUser('user-0001', 'reader@example.com'));
        const repository = new PrismaSessionRepository(prisma);

        await repository.save(createTestSession('session-1', 'user-0001'));
        await repository.save(createTestSession('session-2', 'user-0001'));
        await repository.revokeAllForUser('user-0001', '2026-01-03T00:00:00.000Z');

        const session = await repository.findById('session-1');

        expect(session?.isActive(UtcDateTime.fromISOString('2026-01-04T00:00:00.000Z'))).toBe(false);
    });

    it('persists security events with metadata', async () => {
        await new PrismaUserRepository(prisma).save(createTestUser('user-0001', 'reader@example.com'));
        const repository = new PrismaSecurityEventRepository(prisma);

        await repository.append({
            type: 'login',
            userId: 'user-0001',
            occurredAt: '2026-01-01T00:00:00.000Z',
            correlationId: 'correlation-id',
            metadata: {
                ip: '127.0.0.1',
            },
        });

        const events = await repository.listByUserId('user-0001');

        expect(events).toEqual([
            {
                type: 'login',
                userId: 'user-0001',
                occurredAt: '2026-01-01T00:00:00.000Z',
                correlationId: 'correlation-id',
                metadata: {
                    ip: '127.0.0.1',
                },
            },
        ]);
    });

    it('persists password reset tokens', async () => {
        await new PrismaUserRepository(prisma).save(createTestUser('user-0001', 'reader@example.com'));
        const store = new PrismaPasswordResetTokenStore(prisma);

        await store.save('user-0001', 'reset-token', '2026-01-01T01:00:00.000Z');
        const token = await prisma.passwordResetToken.findUnique({
            where: {
                token: 'reset-token',
            },
        });

        expect(token?.userId).toBe('user-0001');
        expect(token?.expiresAt.toISOString()).toBe('2026-01-01T01:00:00.000Z');
    });
});
