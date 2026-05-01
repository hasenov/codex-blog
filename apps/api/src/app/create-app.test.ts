import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { z } from 'zod';

import {
    authenticatedUserResponseSchema,
    commentResponseSchema,
    commentsResponseSchema,
    paginatedPostsResponseSchema,
    postResponseSchema,
    userResponseSchema,
} from '@codex-blog/contracts';
import { createPrismaClient, HmacTokenService } from '@codex-blog/infrastructure';

import { withPrismaApiTestDatabase } from './api-test-database.js';
import { createApp } from './create-app.js';

const problemDetailsSchema = z.object({
    code: z.string(),
    correlationId: z.string(),
    detail: z.string(),
    status: z.number(),
    title: z.string(),
    type: z.string(),
});

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
        await withPrismaApiTestDatabase(async () => {
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
        await withPrismaApiTestDatabase(async (databaseUrl) => {
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
        await withPrismaApiTestDatabase(async (databaseUrl) => {
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
        await withPrismaApiTestDatabase(async (databaseUrl) => {
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

                expect(paginatedPostsResponseSchema.parse((await request(created.app).get('/v1/posts').expect(200)).body).items).toHaveLength(0);
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
                expect(paginatedPostsResponseSchema.parse((await request(created.app).get('/v1/posts').expect(200)).body).items).toHaveLength(1);
                expect(postResponseSchema.parse((await request(created.app).get('/v1/posts/publishing-api-post').expect(200)).body).id).toBe(draft.id);

                const secondPublishedDraftResponse = await request(created.app)
                    .post('/v1/posts')
                    .set('authorization', authorBearer)
                    .send({
                        ...draftInput,
                        title: 'Second published post',
                        slug: 'second-published-post',
                    })
                    .expect(201);
                const secondPublishedDraft = postResponseSchema.parse(secondPublishedDraftResponse.body);
                await request(created.app)
                    .post(`/v1/posts/${secondPublishedDraft.id}/publish`)
                    .set('authorization', editorBearer)
                    .expect(200);
                const firstPage = paginatedPostsResponseSchema.parse(
                    (await request(created.app).get('/v1/posts').query({ limit: 1 }).expect(200)).body
                );
                const nextCursor = firstPage.nextCursor;

                if (nextCursor === undefined) {
                    throw new Error('Expected first published posts page to include a next cursor.');
                }

                const secondPage = paginatedPostsResponseSchema.parse(
                    (await request(created.app).get('/v1/posts').query({ limit: 1, cursor: nextCursor }).expect(200)).body
                );

                expect(firstPage.items).toHaveLength(1);
                expect(secondPage.items).toHaveLength(1);

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

    it('serializes publishing validation and conflict errors as problem details', async () => {
        await withPrismaApiTestDatabase(async (databaseUrl) => {
            const created = createApp();
            const editorResponse = await request(created.app)
                .post('/v1/auth/register')
                .send({
                    email: 'publishing-editor@example.com',
                    displayName: 'Publishing Editor',
                    password: 'secret-123',
                })
                .expect(201);
            const editor = authenticatedUserResponseSchema.parse(editorResponse.body);
            const prisma = createPrismaClient(databaseUrl);

            try {
                await prisma.user.update({
                    where: {
                        id: editor.user.id,
                    },
                    data: {
                        role: 'editor',
                    },
                });
                const editorLoginResponse = await request(created.app)
                    .post('/v1/auth/login')
                    .send({
                        email: 'publishing-editor@example.com',
                        password: 'secret-123',
                    })
                    .expect(200);
                const editorBearer = `Bearer ${authenticatedUserResponseSchema.parse(editorLoginResponse.body).tokens.accessToken}`;
                const validInput = {
                    title: 'Validated publishing post',
                    slug: 'validated-publishing-post',
                    excerpt: 'Validated excerpt',
                    content: {
                        version: 1,
                        blocks: [{ type: 'paragraph', text: 'Validated content' }],
                    },
                    seo: {},
                };

                await request(created.app).post('/v1/posts').send(validInput).expect(401);
                const invalidSlugResponse = await request(created.app)
                    .post('/v1/posts')
                    .set('authorization', editorBearer)
                    .send({
                        ...validInput,
                        slug: 'Invalid Slug',
                    })
                    .expect(400);
                const invalidContentResponse = await request(created.app)
                    .post('/v1/posts')
                    .set('authorization', editorBearer)
                    .send({
                        ...validInput,
                        content: {
                            version: 1,
                            blocks: [{ type: 'paragraph', text: '' }],
                        },
                    })
                    .expect(400);
                const createdPostResponse = await request(created.app)
                    .post('/v1/posts')
                    .set('authorization', editorBearer)
                    .send(validInput)
                    .expect(201);
                const duplicateSlugResponse = await request(created.app)
                    .post('/v1/posts')
                    .set('authorization', editorBearer)
                    .send({
                        ...validInput,
                        title: 'Duplicate publishing post',
                    })
                    .expect(409);
                const createdPost = postResponseSchema.parse(createdPostResponse.body);
                const invalidScheduleResponse = await request(created.app)
                    .post(`/v1/posts/${createdPost.id}/schedule`)
                    .set('authorization', editorBearer)
                    .send({
                        scheduledFor: '2020-01-01T00:00:00.000Z',
                    })
                    .expect(400);

                expect(problemDetailsSchema.parse(invalidSlugResponse.body).code).toBe('VALIDATION_ERROR');
                expect(problemDetailsSchema.parse(invalidContentResponse.body).code).toBe('VALIDATION_ERROR');
                expect(problemDetailsSchema.parse(duplicateSlugResponse.body).code).toBe('POST_SLUG_ALREADY_EXISTS');
                expect(problemDetailsSchema.parse(invalidScheduleResponse.body).code).toBe('INVALID_SCHEDULED_DATE');
            } finally {
                await prisma.$disconnect();
                await created.dispose();
            }
        });
    });

    it('manages comment moderation through the Prisma-backed API', async () => {
        await withPrismaApiTestDatabase(async (databaseUrl) => {
            const created = createApp();
            const authorResponse = await request(created.app)
                .post('/v1/auth/register')
                .send({
                    email: 'comments-author@example.com',
                    displayName: 'Comments Author',
                    password: 'secret-123',
                })
                .expect(201);
            const editorResponse = await request(created.app)
                .post('/v1/auth/register')
                .send({
                    email: 'comments-editor@example.com',
                    displayName: 'Comments Editor',
                    password: 'secret-123',
                })
                .expect(201);
            const readerResponse = await request(created.app)
                .post('/v1/auth/register')
                .send({
                    email: 'comments-reader@example.com',
                    displayName: 'Comments Reader',
                    password: 'secret-123',
                })
                .expect(201);
            const otherReaderResponse = await request(created.app)
                .post('/v1/auth/register')
                .send({
                    email: 'comments-other-reader@example.com',
                    displayName: 'Other Comments Reader',
                    password: 'secret-123',
                })
                .expect(201);
            const author = authenticatedUserResponseSchema.parse(authorResponse.body);
            const editor = authenticatedUserResponseSchema.parse(editorResponse.body);
            const reader = authenticatedUserResponseSchema.parse(readerResponse.body);
            const otherReader = authenticatedUserResponseSchema.parse(otherReaderResponse.body);
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
                        email: 'comments-author@example.com',
                        password: 'secret-123',
                    })
                    .expect(200);
                const editorLoginResponse = await request(created.app)
                    .post('/v1/auth/login')
                    .send({
                        email: 'comments-editor@example.com',
                        password: 'secret-123',
                    })
                    .expect(200);
                const authorBearer = `Bearer ${authenticatedUserResponseSchema.parse(authorLoginResponse.body).tokens.accessToken}`;
                const editorBearer = `Bearer ${authenticatedUserResponseSchema.parse(editorLoginResponse.body).tokens.accessToken}`;
                const readerBearer = `Bearer ${reader.tokens.accessToken}`;
                const otherReaderBearer = `Bearer ${otherReader.tokens.accessToken}`;
                const draftResponse = await request(created.app)
                    .post('/v1/posts')
                    .set('authorization', authorBearer)
                    .send({
                        title: 'Commentable post',
                        slug: 'commentable-post',
                        excerpt: 'Commentable excerpt',
                        content: {
                            version: 1,
                            blocks: [{ type: 'paragraph', text: 'Commentable content' }],
                        },
                        seo: {},
                    })
                    .expect(201);
                const draft = postResponseSchema.parse(draftResponse.body);
                await request(created.app)
                    .post(`/v1/posts/${draft.id}/publish`)
                    .set('authorization', editorBearer)
                    .expect(200);

                await request(created.app)
                    .post('/v1/posts/commentable-post/comments')
                    .send({
                        body: 'No token',
                    })
                    .expect(401);
                const createdCommentResponse = await request(created.app)
                    .post('/v1/posts/commentable-post/comments')
                    .set('authorization', readerBearer)
                    .send({
                        body: 'First public thought',
                    })
                    .expect(201);
                const comment = commentResponseSchema.parse(createdCommentResponse.body);

                expect(comment.status).toBe('pending');
                expect(commentsResponseSchema.parse((await request(created.app).get('/v1/posts/commentable-post/comments').expect(200)).body)).toHaveLength(0);

                await request(created.app)
                    .post(`/v1/comments/${comment.id}/moderate`)
                    .set('authorization', readerBearer)
                    .send({
                        status: 'approved',
                    })
                    .expect(403);
                const approvedResponse = await request(created.app)
                    .post(`/v1/comments/${comment.id}/moderate`)
                    .set('authorization', editorBearer)
                    .send({
                        status: 'approved',
                    })
                    .expect(200);

                expect(commentResponseSchema.parse(approvedResponse.body).status).toBe('approved');
                expect(commentsResponseSchema.parse((await request(created.app).get('/v1/posts/commentable-post/comments').expect(200)).body)).toHaveLength(1);

                await request(created.app)
                    .patch(`/v1/comments/${comment.id}`)
                    .set('authorization', otherReaderBearer)
                    .send({
                        body: 'Hijacked',
                    })
                    .expect(403);
                const updatedResponse = await request(created.app)
                    .patch(`/v1/comments/${comment.id}`)
                    .set('authorization', readerBearer)
                    .send({
                        body: 'Edited thought',
                    })
                    .expect(200);

                expect(commentResponseSchema.parse(updatedResponse.body).status).toBe('pending');
                await request(created.app)
                    .post(`/v1/comments/${comment.id}/moderate`)
                    .set('authorization', editorBearer)
                    .send({
                        status: 'approved',
                    })
                    .expect(200);

                const replyResponse = await request(created.app)
                    .post('/v1/posts/commentable-post/comments')
                    .set('authorization', otherReaderBearer)
                    .send({
                        parentId: comment.id,
                        body: 'Reply',
                    })
                    .expect(201);
                const reply = commentResponseSchema.parse(replyResponse.body);

                await request(created.app)
                    .post('/v1/posts/commentable-post/comments')
                    .set('authorization', readerBearer)
                    .send({
                        parentId: reply.id,
                        body: 'Too deep',
                    })
                    .expect(400);
                await request(created.app)
                    .delete(`/v1/comments/${comment.id}`)
                    .set('authorization', otherReaderBearer)
                    .expect(403);
                await request(created.app)
                    .delete(`/v1/comments/${comment.id}`)
                    .set('authorization', editorBearer)
                    .expect(204);

                expect(commentsResponseSchema.parse((await request(created.app).get('/v1/posts/commentable-post/comments').expect(200)).body)).toHaveLength(0);
            } finally {
                await prisma.$disconnect();
                await created.dispose();
            }
        });
    });
});
