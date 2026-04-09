import { Router, type Request, type Response } from 'express';

import type { TokenService } from '@codex-blog/application';
import {
    type ChangeUserRoleRequest,
    type ChangeUserStatusRequest,
    type ForgotPasswordRequest,
    type LoginRequest,
    type LogoutRequest,
    type RefreshRequest,
    type RegisterRequest,
    type ResetPasswordRequest,
    changeUserRoleRequestSchema,
    changeUserStatusRequestSchema,
    forgotPasswordRequestSchema,
    loginRequestSchema,
    logoutRequestSchema,
    refreshRequestSchema,
    registerRequestSchema,
    resetPasswordRequestSchema,
} from '@codex-blog/contracts';

import { requireAuth } from '../middleware/require-auth.js';
import type { RequestContextLocals } from '../middleware/request-context.js';
import { validateBody } from '../middleware/validate-request.js';

type ActorDto = { role: 'admin' | 'editor' | 'author' | 'reader'; userId: string };
type IdParams = { id: string };

interface IdentityApi {
    tokenService: TokenService;
    registerUser: {
        execute(input: { displayName: string; email: string; password: string }): Promise<unknown>;
    };
    login: {
        execute(input: { email: string; password: string }): Promise<unknown>;
    };
    refreshSession: {
        execute(input: { refreshToken: string }): Promise<unknown>;
    };
    logout: {
        execute(input: { refreshToken: string }): Promise<void>;
    };
    getCurrentUser: {
        execute(input: { userId: string }): Promise<unknown>;
    };
    getUserById: {
        execute(actor: { role: 'admin' | 'editor' | 'author' | 'reader'; userId: string }, userId: string): Promise<unknown>;
    };
    listUsers: {
        execute(actor: { role: 'admin' | 'editor' | 'author' | 'reader'; userId: string }): Promise<unknown>;
    };
    changeUserRole: {
        execute(input: {
            actor: { role: 'admin' | 'editor' | 'author' | 'reader'; userId: string };
            nextRole: 'admin' | 'editor' | 'author' | 'reader';
            targetUserId: string;
        }): Promise<unknown>;
    };
    changeUserStatus: {
        execute(input: {
            actor: { role: 'admin' | 'editor' | 'author' | 'reader'; userId: string };
            nextStatus: 'active' | 'suspended' | 'invited';
            targetUserId: string;
        }): Promise<unknown>;
    };
    forgotPassword: {
        execute(input: { email: string }): Promise<void>;
    };
    resetPassword: {
        execute(input: { nextPassword: string; token: string }): Promise<void>;
    };
}

export const buildV1Router = (identity: IdentityApi): Router => {
    const router = Router();
    const authMiddleware = requireAuth(identity.tokenService);

    router.get('/health', (_request, response) => {
        response.status(200).json({ status: 'ok' });
    });

    router.post('/auth/register', validateBody(registerRequestSchema), async (request: Request<never, unknown, RegisterRequest>, response, next) => {
        try {
            const result = await identity.registerUser.execute(request.body);
            response.status(201).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.post('/auth/login', validateBody(loginRequestSchema), async (request: Request<never, unknown, LoginRequest>, response, next) => {
        try {
            const result = await identity.login.execute(request.body);
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.post('/auth/refresh', validateBody(refreshRequestSchema), async (request: Request<never, unknown, RefreshRequest>, response, next) => {
        try {
            const result = await identity.refreshSession.execute(request.body);
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.post('/auth/logout', validateBody(logoutRequestSchema), async (request: Request<never, unknown, LogoutRequest>, response, next) => {
        try {
            await identity.logout.execute(request.body);
            response.status(204).send();
        } catch (error) {
            next(error);
        }
    });

    router.post('/auth/password/forgot', validateBody(forgotPasswordRequestSchema), async (request: Request<never, unknown, ForgotPasswordRequest>, response, next) => {
        try {
            await identity.forgotPassword.execute(request.body);
            response.status(204).send();
        } catch (error) {
            next(error);
        }
    });

    router.post('/auth/password/reset', validateBody(resetPasswordRequestSchema), async (request: Request<never, unknown, ResetPasswordRequest>, response, next) => {
        try {
            await identity.resetPassword.execute(request.body);
            response.status(204).send();
        } catch (error) {
            next(error);
        }
    });

    router.get('/auth/me', authMiddleware, async (_request, response: Response<unknown, RequestContextLocals>, next) => {
        try {
            const actor = response.locals.actor;

            if (actor === undefined) {
                throw new Error('Authenticated actor context is missing.');
            }

            const result = await identity.getCurrentUser.execute({
                userId: actor.userId,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.get('/users', authMiddleware, async (_request, response: Response<unknown, RequestContextLocals>, next) => {
        try {
            const actor = response.locals.actor;

            if (actor === undefined) {
                throw new Error('Authenticated actor context is missing.');
            }

            const result = await identity.listUsers.execute({
                userId: actor.userId,
                role: actor.role,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.get('/users/:id', authMiddleware, async (request: Request<IdParams>, response: Response<unknown, RequestContextLocals>, next) => {
        try {
            const actor = response.locals.actor;

            if (actor === undefined) {
                throw new Error('Authenticated actor context is missing.');
            }

            const result = await identity.getUserById.execute({ userId: actor.userId, role: actor.role }, request.params.id);
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.patch('/users/:id/role', authMiddleware, validateBody(changeUserRoleRequestSchema), async (
        request: Request<IdParams, unknown, ChangeUserRoleRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            const actor = response.locals.actor;

            if (actor === undefined) {
                throw new Error('Authenticated actor context is missing.');
            }

            const result = await identity.changeUserRole.execute({
                actor: { userId: actor.userId, role: actor.role } satisfies ActorDto,
                targetUserId: request.params.id,
                nextRole: request.body.role,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.patch('/users/:id/status', authMiddleware, validateBody(changeUserStatusRequestSchema), async (
        request: Request<IdParams, unknown, ChangeUserStatusRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            const actor = response.locals.actor;

            if (actor === undefined) {
                throw new Error('Authenticated actor context is missing.');
            }

            const result = await identity.changeUserStatus.execute({
                actor: { userId: actor.userId, role: actor.role } satisfies ActorDto,
                targetUserId: request.params.id,
                nextStatus: request.body.status,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    return router;
};
