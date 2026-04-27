import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { z } from 'zod';

import { authenticatedUserResponseSchema, userResponseSchema } from '@codex-blog/contracts';

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
});
