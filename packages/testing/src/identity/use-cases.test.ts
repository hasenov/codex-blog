import { describe, expect, it } from 'vitest';

import { LoginUseCase, RefreshSessionUseCase, RegisterUserUseCase } from '@codex-blog/application';

import { createIdentityTestContext } from './create-identity-test-context.js';

describe('identity use cases', () => {
    it('registers a new user and issues tokens', async () => {
        const context = createIdentityTestContext();
        const useCase = new RegisterUserUseCase(context.dependencies);

        const result = await useCase.execute({
            email: 'reader@example.com',
            displayName: 'Reader',
            password: 'secret-123',
        });

        expect(result.user.email).toBe('reader@example.com');
        expect(result.tokens.accessToken).toContain('.');
    });

    it('logs in existing user with valid credentials', async () => {
        const context = createIdentityTestContext();
        const registration = await new RegisterUserUseCase(context.dependencies).execute({
            email: 'reader@example.com',
            displayName: 'Reader',
            password: 'secret-123',
        });

        const login = await new LoginUseCase(context.dependencies).execute({
            email: registration.user.email,
            password: 'secret-123',
        });

        expect(login.user.id).toBe(registration.user.id);
    });

    it('rotates session on refresh', async () => {
        const context = createIdentityTestContext();
        const registration = await new RegisterUserUseCase(context.dependencies).execute({
            email: 'reader@example.com',
            displayName: 'Reader',
            password: 'secret-123',
        });

        const refreshed = await new RefreshSessionUseCase(context.dependencies).execute({
            refreshToken: registration.tokens.refreshToken,
        });

        expect(refreshed.tokens.refreshToken).not.toBe(registration.tokens.refreshToken);
    });
});
