import { describe, expect, it } from 'vitest';

import {
    ChangeUserRoleUseCase,
    ChangeUserStatusUseCase,
    ConflictError,
    ForbiddenError,
    LoginUseCase,
    LogoutUseCase,
    RefreshSessionUseCase,
    RegisterUserUseCase,
    UnauthorizedError,
} from '@codex-blog/application';
import { UtcDateTime } from '@codex-blog/domain';

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

    it('rejects duplicate user registration', async () => {
        const context = createIdentityTestContext();
        const useCase = new RegisterUserUseCase(context.dependencies);

        await useCase.execute({
            email: 'reader@example.com',
            displayName: 'Reader',
            password: 'secret-123',
        });

        await expect(
            useCase.execute({
                email: 'reader@example.com',
                displayName: 'Reader Two',
                password: 'secret-456',
            })
        ).rejects.toThrow(ConflictError);
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

    it('rejects login with invalid credentials', async () => {
        const context = createIdentityTestContext();
        await new RegisterUserUseCase(context.dependencies).execute({
            email: 'reader@example.com',
            displayName: 'Reader',
            password: 'secret-123',
        });

        await expect(
            new LoginUseCase(context.dependencies).execute({
                email: 'reader@example.com',
                password: 'wrong-password',
            })
        ).rejects.toThrow(UnauthorizedError);
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

    it('rejects a refresh token after it was rotated', async () => {
        const context = createIdentityTestContext();
        const registration = await new RegisterUserUseCase(context.dependencies).execute({
            email: 'reader@example.com',
            displayName: 'Reader',
            password: 'secret-123',
        });

        await new RefreshSessionUseCase(context.dependencies).execute({
            refreshToken: registration.tokens.refreshToken,
        });

        await expect(
            new RefreshSessionUseCase(context.dependencies).execute({
                refreshToken: registration.tokens.refreshToken,
            })
        ).rejects.toThrow(UnauthorizedError);
    });

    it('rejects a refresh token after logout', async () => {
        const context = createIdentityTestContext();
        const registration = await new RegisterUserUseCase(context.dependencies).execute({
            email: 'reader@example.com',
            displayName: 'Reader',
            password: 'secret-123',
        });

        await new LogoutUseCase(context.dependencies).execute({
            refreshToken: registration.tokens.refreshToken,
        });

        await expect(
            new RefreshSessionUseCase(context.dependencies).execute({
                refreshToken: registration.tokens.refreshToken,
            })
        ).rejects.toThrow(UnauthorizedError);
    });

    it('allows admins and rejects readers when changing user roles and statuses', async () => {
        const context = createIdentityTestContext();
        const adminRegistration = await new RegisterUserUseCase(context.dependencies).execute({
            email: 'admin@example.com',
            displayName: 'Admin',
            password: 'secret-123',
        });
        const readerRegistration = await new RegisterUserUseCase(context.dependencies).execute({
            email: 'reader@example.com',
            displayName: 'Reader',
            password: 'secret-123',
        });
        const admin = await context.dependencies.userRepository.findById(adminRegistration.user.id);

        if (admin === null) {
            throw new Error('Admin user was not persisted.');
        }

        admin.changeRole('admin', UtcDateTime.create(new Date('2026-01-01T00:00:00.000Z')));
        await context.dependencies.userRepository.save(admin);

        await expect(
            new ChangeUserRoleUseCase(context.dependencies).execute({
                actor: {
                    userId: readerRegistration.user.id,
                    role: 'reader',
                },
                targetUserId: adminRegistration.user.id,
                nextRole: 'editor',
            })
        ).rejects.toThrow(ForbiddenError);

        const changedRole = await new ChangeUserRoleUseCase(context.dependencies).execute({
            actor: {
                userId: adminRegistration.user.id,
                role: 'admin',
            },
            targetUserId: readerRegistration.user.id,
            nextRole: 'author',
        });

        const changedStatus = await new ChangeUserStatusUseCase(context.dependencies).execute({
            actor: {
                userId: adminRegistration.user.id,
                role: 'admin',
            },
            targetUserId: readerRegistration.user.id,
            nextStatus: 'suspended',
        });

        expect(changedRole.role).toBe('author');
        expect(changedStatus.status).toBe('suspended');
    });
});
