import type { RequestHandler } from 'express';

import { ApplicationError, UnauthorizedError } from '@codex-blog/application';
import type { TokenService } from '@codex-blog/application';

import type { AuthenticatedActor, RequestContextLocals } from './request-context.js';

export const requireAuth = (tokenService: TokenService): RequestHandler<unknown, unknown, unknown, unknown, RequestContextLocals> => {
    return async (request, response, next) => {
        try {
            const authorizationHeader = request.header('authorization');

            if (authorizationHeader === undefined || !authorizationHeader.startsWith('Bearer ')) {
                throw new UnauthorizedError('Missing bearer token.', 'MISSING_BEARER_TOKEN');
            }

            const token = authorizationHeader.replace('Bearer ', '');
            const payload = await tokenService.verifyAccessToken(token);
            response.locals.actor = {
                userId: payload.userId,
                role: payload.role as AuthenticatedActor['role'],
                sessionId: payload.sessionId,
            };
            next();
        } catch (error) {
            if (error instanceof ApplicationError) {
                next(error);
                return;
            }

            next(new UnauthorizedError('Access token is invalid or expired.', 'INVALID_ACCESS_TOKEN'));
        }
    };
};
