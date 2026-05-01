import { Router, type Request, type Response } from 'express';

import type { TokenService } from '@codex-blog/application';
import {
    type CreateCommentRequest,
    type ModerateCommentRequest,
    type UpdateCommentRequest,
    createCommentRequestSchema,
    moderateCommentRequestSchema,
    updateCommentRequestSchema,
} from '@codex-blog/contracts';

import { getActor, type ActorDto } from './actor.js';
import { requireAuth } from '../middleware/require-auth.js';
import type { RequestContextLocals } from '../middleware/request-context.js';
import { validateBody } from '../middleware/validate-request.js';

type SlugParams = { slug: string };
type IdParams = { id: string };

export interface EngagementApi {
    createComment: {
        execute(input: CreateCommentRequest & { actor: ActorDto; postSlug: string }): Promise<unknown>;
    };
    listPostComments: {
        execute(input: { postSlug: string }): Promise<unknown>;
    };
    updateComment: {
        execute(input: UpdateCommentRequest & { actor: ActorDto; commentId: string }): Promise<unknown>;
    };
    deleteComment: {
        execute(input: { actor: ActorDto; commentId: string }): Promise<void>;
    };
    moderateComment: {
        execute(input: ModerateCommentRequest & { actor: ActorDto; commentId: string }): Promise<unknown>;
    };
}

export const buildEngagementRouter = (tokenService: TokenService, engagement: EngagementApi): Router => {
    const router = Router();
    const authMiddleware = requireAuth(tokenService);

    router.get('/posts/:slug/comments', async (request: Request<SlugParams>, response, next) => {
        try {
            const result = await engagement.listPostComments.execute({
                postSlug: request.params.slug,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.post('/posts/:slug/comments', authMiddleware, validateBody(createCommentRequestSchema), async (
        request: Request<SlugParams, unknown, CreateCommentRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            const result = await engagement.createComment.execute({
                actor: getActor(response),
                postSlug: request.params.slug,
                ...request.body,
            });
            response.status(201).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.patch('/comments/:id', authMiddleware, validateBody(updateCommentRequestSchema), async (
        request: Request<IdParams, unknown, UpdateCommentRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            const result = await engagement.updateComment.execute({
                actor: getActor(response),
                commentId: request.params.id,
                ...request.body,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.post('/comments/:id/moderate', authMiddleware, validateBody(moderateCommentRequestSchema), async (
        request: Request<IdParams, unknown, ModerateCommentRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            const result = await engagement.moderateComment.execute({
                actor: getActor(response),
                commentId: request.params.id,
                ...request.body,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.delete('/comments/:id', authMiddleware, async (
        request: Request<IdParams>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            await engagement.deleteComment.execute({
                actor: getActor(response),
                commentId: request.params.id,
            });
            response.status(204).send();
        } catch (error) {
            next(error);
        }
    });

    return router;
};
