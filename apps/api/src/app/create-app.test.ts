import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { z } from 'zod';

import { authenticatedUserResponseSchema, postListResponseSchema, postResponseSchema, userResponseSchema } from '@codex-blog/contracts';
import { createPrismaClient, HmacTokenService } from '@codex-blog/infrastructure';

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
        await prisma.$executeRaw`
            CREATE TABLE "posts" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "authorId" TEXT NOT NULL,
                "title" TEXT NOT NULL,
                "slug" TEXT NOT NULL,
                "excerpt" TEXT NOT NULL,
                "contentJson" TEXT NOT NULL,
                "seoJson" TEXT NOT NULL,
                "status" TEXT NOT NULL,
                "publishedAt" DATETIME,
                "scheduledFor" DATETIME,
                "archivedAt" DATETIME,
                "createdAt" DATETIME NOT NULL,
                "updatedAt" DATETIME NOT NULL,
                CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX "posts_slug_key" ON "posts" ("slug")`;
        await prisma.$executeRaw`CREATE INDEX "posts_authorId_idx" ON "posts" ("authorId")`;
        await prisma.$executeRaw`CREATE INDEX "posts_status_idx" ON "posts" ("status")`;
        await prisma.$executeRaw`CREATE INDEX "posts_publishedAt_idx" ON "posts" ("publishedAt")`;
        await prisma.$executeRaw`CREATE INDEX "posts_scheduledFor_idx" ON "posts" ("scheduledFor")`;
        await prisma.$executeRaw`
            CREATE TABLE "post_revisions" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "postId" TEXT NOT NULL,
                "number" INTEGER NOT NULL,
                "title" TEXT NOT NULL,
                "excerpt" TEXT NOT NULL,
                "contentJson" TEXT NOT NULL,
                "seoJson" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL,
                "createdByUserId" TEXT NOT NULL,
                CONSTRAINT "post_revisions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "post_revisions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX "post_revisions_postId_number_key" ON "post_revisions" ("postId", "number")`;
        await prisma.$executeRaw`CREATE INDEX "post_revisions_postId_idx" ON "post_revisions" ("postId")`;
        await prisma.$executeRaw`CREATE INDEX "post_revisions_createdByUserId_idx" ON "post_revisions" ("createdByUserId")`;
    } finally {
        await prisma.$disconnect();
    }
};

const withPrismaEnvironment = async (work: (databaseUrl: string) => Promise<void>): Promise<void> => {
    const previousDataSource = process.env.DATA_SOURCE;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const tempDirectory = await mkdtemp(path.join(tmpdir(), 'codex-blog-api-prisma-'));
    const databaseUrl = `file:${path.join(tempDirectory, 'api-test.db')}`;

    try {
        await createIdentitySchema(databaseUrl);

        process.env.DATA_SOURCE = 'prisma';
        process.env.DATABASE_URL = databaseUrl;

        await work(databaseUrl);
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

    it('rejects protected routes with invalid and expired bearer tokens', async () => {
        const { app } = createApp();
        const expiredToken = await new HmacTokenService(
            'dev-access-secret-dev-access-secret',
            'dev-refresh-secret-dev-refresh-secret',
            -1,
            30
        ).issueAccessToken({
            kind: 'access',
            userId: 'user-0001',
            sessionId: 'session-0001',
            role: 'reader',
        });

        const invalidResponse = await request(app)
            .get('/v1/auth/me')
            .set('authorization', 'Bearer invalid-token')
            .expect(401);
        const expiredResponse = await request(app)
            .get('/v1/auth/me')
            .set('authorization', `Bearer ${expiredToken.token}`)
            .expect(401);

        expect(problemDetailsSchema.parse(invalidResponse.body).code).toBe('INVALID_ACCESS_TOKEN');
        expect(problemDetailsSchema.parse(expiredResponse.body).code).toBe('INVALID_ACCESS_TOKEN');
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
        await withPrismaEnvironment(async () => {
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
        });
    });

    it('resets passwords through the Prisma-backed auth API', async () => {
        await withPrismaEnvironment(async (databaseUrl) => {
            const created = createApp();
            const registrationResponse = await request(created.app)
                .post('/v1/auth/register')
                .send({
                    email: 'reset@example.com',
                    displayName: 'Reset User',
                    password: 'secret-123',
                })
                .expect(201);
            authenticatedUserResponseSchema.parse(registrationResponse.body);

            await request(created.app)
                .post('/v1/auth/password/forgot')
                .send({
                    email: 'reset@example.com',
                })
                .expect(204);

            const prisma = createPrismaClient(databaseUrl);

            try {
                const token = await prisma.passwordResetToken.findFirstOrThrow();

                await request(created.app)
                    .post('/v1/auth/password/reset')
                    .send({
                        token: token.token,
                        nextPassword: 'secret-456',
                    })
                    .expect(204);

                await request(created.app)
                    .post('/v1/auth/login')
                    .send({
                        email: 'reset@example.com',
                        password: 'secret-123',
                    })
                    .expect(401);
                await request(created.app)
                    .post('/v1/auth/login')
                    .send({
                        email: 'reset@example.com',
                        password: 'secret-456',
                    })
                    .expect(200);
                await request(created.app)
                    .post('/v1/auth/password/reset')
                    .send({
                        token: token.token,
                        nextPassword: 'secret-789',
                    })
                    .expect(401);

                await request(created.app)
                    .post('/v1/auth/password/forgot')
                    .send({
                        email: 'reset@example.com',
                    })
                    .expect(204);
                const expiredToken = await prisma.passwordResetToken.findFirstOrThrow();
                await prisma.passwordResetToken.update({
                    where: {
                        token: expiredToken.token,
                    },
                    data: {
                        expiresAt: new Date('2025-01-01T00:00:00.000Z'),
                    },
                });
                await request(created.app)
                    .post('/v1/auth/password/reset')
                    .send({
                        token: expiredToken.token,
                        nextPassword: 'secret-890',
                    })
                    .expect(401);
            } finally {
                await prisma.$disconnect();
                await created.dispose();
            }
        });
    });

    it('enforces user management permission boundaries through the API', async () => {
        await withPrismaEnvironment(async (databaseUrl) => {
            const created = createApp();
            const adminRegistrationResponse = await request(created.app)
                .post('/v1/auth/register')
                .send({
                    email: 'admin@example.com',
                    displayName: 'Admin User',
                    password: 'secret-123',
                })
                .expect(201);
            const readerRegistrationResponse = await request(created.app)
                .post('/v1/auth/register')
                .send({
                    email: 'reader@example.com',
                    displayName: 'Reader User',
                    password: 'secret-123',
                })
                .expect(201);
            const adminRegistration = authenticatedUserResponseSchema.parse(adminRegistrationResponse.body);
            const readerRegistration = authenticatedUserResponseSchema.parse(readerRegistrationResponse.body);
            const prisma = createPrismaClient(databaseUrl);

            try {
                await prisma.user.update({
                    where: {
                        id: adminRegistration.user.id,
                    },
                    data: {
                        role: 'admin',
                    },
                });

                const adminLoginResponse = await request(created.app)
                    .post('/v1/auth/login')
                    .send({
                        email: 'admin@example.com',
                        password: 'secret-123',
                    })
                    .expect(200);
                const adminLogin = authenticatedUserResponseSchema.parse(adminLoginResponse.body);
                const adminBearer = `Bearer ${adminLogin.tokens.accessToken}`;
                const readerBearer = `Bearer ${readerRegistration.tokens.accessToken}`;

                await request(created.app).get('/v1/users').set('authorization', readerBearer).expect(403);
                await request(created.app)
                    .get(`/v1/users/${adminRegistration.user.id}`)
                    .set('authorization', readerBearer)
                    .expect(403);
                await request(created.app)
                    .patch(`/v1/users/${readerRegistration.user.id}/role`)
                    .set('authorization', readerBearer)
                    .send({
                        role: 'author',
                    })
                    .expect(403);
                await request(created.app)
                    .patch(`/v1/users/${readerRegistration.user.id}/status`)
                    .set('authorization', readerBearer)
                    .send({
                        status: 'suspended',
                    })
                    .expect(403);

                await request(created.app).get('/v1/users').set('authorization', adminBearer).expect(200);
                await request(created.app)
                    .get(`/v1/users/${readerRegistration.user.id}`)
                    .set('authorization', adminBearer)
                    .expect(200);
                await request(created.app)
                    .patch(`/v1/users/${readerRegistration.user.id}/role`)
                    .set('authorization', adminBearer)
                    .send({
                        role: 'author',
                    })
                    .expect(200);
                const statusResponse = await request(created.app)
                    .patch(`/v1/users/${readerRegistration.user.id}/status`)
                    .set('authorization', adminBearer)
                    .send({
                        status: 'suspended',
                    })
                    .expect(200);

                expect(userResponseSchema.parse(statusResponse.body).status).toBe('suspended');
            } finally {
                await prisma.$disconnect();
                await created.dispose();
            }
        });
    });

    it('manages publishing lifecycle through the Prisma-backed API', async () => {
        await withPrismaEnvironment(async (databaseUrl) => {
            const created = createApp();
            const authorResponse = await request(created.app)
                .post('/v1/auth/register')
                .send({
                    email: 'author@example.com',
                    displayName: 'Author User',
                    password: 'secret-123',
                })
                .expect(201);
            const readerResponse = await request(created.app)
                .post('/v1/auth/register')
                .send({
                    email: 'publishing-reader@example.com',
                    displayName: 'Reader User',
                    password: 'secret-123',
                })
                .expect(201);
            const editorResponse = await request(created.app)
                .post('/v1/auth/register')
                .send({
                    email: 'editor@example.com',
                    displayName: 'Editor User',
                    password: 'secret-123',
                })
                .expect(201);
            const author = authenticatedUserResponseSchema.parse(authorResponse.body);
            const reader = authenticatedUserResponseSchema.parse(readerResponse.body);
            const editor = authenticatedUserResponseSchema.parse(editorResponse.body);
            const prisma = createPrismaClient(databaseUrl);

            try {
                await prisma.user.update({
                    where: {
                        id: author.user.id,
                    },
                    data: {
                        role: 'author',
                    },
                });
                await prisma.user.update({
                    where: {
                        id: editor.user.id,
                    },
                    data: {
                        role: 'editor',
                    },
                });

                const authorLoginResponse = await request(created.app)
                    .post('/v1/auth/login')
                    .send({
                        email: 'author@example.com',
                        password: 'secret-123',
                    })
                    .expect(200);
                const editorLoginResponse = await request(created.app)
                    .post('/v1/auth/login')
                    .send({
                        email: 'editor@example.com',
                        password: 'secret-123',
                    })
                    .expect(200);
                const authorBearer = `Bearer ${authenticatedUserResponseSchema.parse(authorLoginResponse.body).tokens.accessToken}`;
                const editorBearer = `Bearer ${authenticatedUserResponseSchema.parse(editorLoginResponse.body).tokens.accessToken}`;
                const readerBearer = `Bearer ${reader.tokens.accessToken}`;
                const draftInput = {
                    title: 'Publishing API post',
                    slug: 'publishing-api-post',
                    excerpt: 'Visible after publish',
                    content: {
                        version: 1,
                        blocks: [{ type: 'paragraph', text: 'Initial content' }],
                    },
                    seo: {
                        title: 'Publishing API post',
                    },
                };

                await request(created.app).post('/v1/posts').set('authorization', readerBearer).send(draftInput).expect(403);
                const draftResponse = await request(created.app)
                    .post('/v1/posts')
                    .set('authorization', authorBearer)
                    .send(draftInput)
                    .expect(201);
                const draft = postResponseSchema.parse(draftResponse.body);

                expect(postListResponseSchema.parse((await request(created.app).get('/v1/posts').expect(200)).body)).toHaveLength(0);
                await request(created.app).get('/v1/posts/publishing-api-post').expect(404);

                const updatedResponse = await request(created.app)
                    .patch(`/v1/posts/${draft.id}`)
                    .set('authorization', authorBearer)
                    .send({
                        title: 'Updated publishing API post',
                        excerpt: 'Updated excerpt',
                        content: {
                            version: 1,
                            blocks: [{ type: 'paragraph', text: 'Updated content' }],
                        },
                        seo: {},
                    })
                    .expect(200);
                const updated = postResponseSchema.parse(updatedResponse.body);
                const revisionsResponse = await request(created.app)
                    .get(`/v1/posts/${draft.id}/revisions`)
                    .set('authorization', authorBearer)
                    .expect(200);

                expect(updated.revisions).toHaveLength(2);
                expect(revisionsResponse.body).toHaveLength(2);

                const restoredResponse = await request(created.app)
                    .post(`/v1/posts/${draft.id}/revisions/${draft.revisions[0]?.id}/restore`)
                    .set('authorization', authorBearer)
                    .expect(200);
                const restored = postResponseSchema.parse(restoredResponse.body);

                expect(restored.title).toBe('Publishing API post');
                expect(restored.revisions).toHaveLength(3);

                const publishedResponse = await request(created.app)
                    .post(`/v1/posts/${draft.id}/publish`)
                    .set('authorization', editorBearer)
                    .expect(200);
                const published = postResponseSchema.parse(publishedResponse.body);

                expect(published.status).toBe('published');
                expect(postListResponseSchema.parse((await request(created.app).get('/v1/posts').expect(200)).body)).toHaveLength(1);
                expect(postResponseSchema.parse((await request(created.app).get('/v1/posts/publishing-api-post').expect(200)).body).id).toBe(draft.id);

                const scheduledDraftResponse = await request(created.app)
                    .post('/v1/posts')
                    .set('authorization', authorBearer)
                    .send({
                        ...draftInput,
                        title: 'Scheduled post',
                        slug: 'scheduled-post',
                    })
                    .expect(201);
                const scheduledDraft = postResponseSchema.parse(scheduledDraftResponse.body);
                await request(created.app)
                    .post(`/v1/posts/${scheduledDraft.id}/schedule`)
                    .set('authorization', editorBearer)
                    .send({
                        scheduledFor: '2999-01-01T00:00:00.000Z',
                    })
                    .expect(200);
                await request(created.app).get('/v1/posts/scheduled-post').expect(404);
                const archivedResponse = await request(created.app)
                    .post(`/v1/posts/${scheduledDraft.id}/archive`)
                    .set('authorization', editorBearer)
                    .expect(200);

                expect(postResponseSchema.parse(archivedResponse.body).status).toBe('archived');
            } finally {
                await prisma.$disconnect();
                await created.dispose();
            }
        });
    });
});
