import { Router, type Request, type Response } from 'express';

import type { TokenService } from '@codex-blog/application';
import { BadRequestError } from '@codex-blog/application';
import {
    type CreatePostRequest,
    type SchedulePostRequest,
    type UpdatePostRequest,
    createPostRequestSchema,
    cursorPaginationSchema,
    schedulePostRequestSchema,
    updatePostRequestSchema,
} from '@codex-blog/contracts';

import { getActor, type ActorDto } from './actor.js';
import { requireAuth } from '../middleware/require-auth.js';
import type { RequestContextLocals } from '../middleware/request-context.js';
import { validateBody } from '../middleware/validate-request.js';

type IdParams = { id: string };
type SlugParams = { slug: string };
type RevisionParams = { id: string; revisionId: string };
type PostListQuery = { cursor?: string; limit: number };

export interface PublishingApi {
    createDraftPost: {
        execute(input: CreatePostRequest & { actor: ActorDto }): Promise<unknown>;
    };
    updateDraftPost: {
        execute(input: UpdatePostRequest & { actor: ActorDto; postId: string }): Promise<unknown>;
    };
    publishPost: {
        execute(input: { actor: ActorDto; postId: string }): Promise<unknown>;
    };
    schedulePost: {
        execute(input: SchedulePostRequest & { actor: ActorDto; postId: string }): Promise<unknown>;
    };
    archivePost: {
        execute(input: { actor: ActorDto; postId: string }): Promise<unknown>;
    };
    restorePostRevision: {
        execute(input: { actor: ActorDto; postId: string; revisionId: string }): Promise<unknown>;
    };
    listPublishedPosts: {
        execute(input: PostListQuery): Promise<unknown>;
    };
    getPublishedPostBySlug: {
        execute(input: { slug: string }): Promise<unknown>;
    };
    getPostRevisions: {
        execute(input: { actor: ActorDto; postId: string }): Promise<unknown>;
    };
}

export const buildPublishingRouter = (tokenService: TokenService, publishing: PublishingApi): Router => {
    const router = Router();
    const authMiddleware = requireAuth(tokenService);

    router.get('/posts', async (request, response, next) => {
        try {
            const parsedQuery = cursorPaginationSchema.safeParse(request.query);

            if (!parsedQuery.success) {
                throw new BadRequestError('Request query validation failed.', 'VALIDATION_ERROR');
            }

            const query: PostListQuery = parsedQuery.data.cursor === undefined
                ? { limit: parsedQuery.data.limit }
                : { cursor: parsedQuery.data.cursor, limit: parsedQuery.data.limit };
            const result = await publishing.listPublishedPosts.execute(query);
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.get('/posts/:slug', async (request: Request<SlugParams>, response, next) => {
        try {
            const result = await publishing.getPublishedPostBySlug.execute({
                slug: request.params.slug,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.post('/posts', authMiddleware, validateBody(createPostRequestSchema), async (
        request: Request<never, unknown, CreatePostRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            const result = await publishing.createDraftPost.execute({
                actor: getActor(response),
                ...request.body,
            });
            response.status(201).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.patch('/posts/:id', authMiddleware, validateBody(updatePostRequestSchema), async (
        request: Request<IdParams, unknown, UpdatePostRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            const result = await publishing.updateDraftPost.execute({
                actor: getActor(response),
                postId: request.params.id,
                ...request.body,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.post('/posts/:id/publish', authMiddleware, async (
        request: Request<IdParams>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            const result = await publishing.publishPost.execute({
                actor: getActor(response),
                postId: request.params.id,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.post('/posts/:id/schedule', authMiddleware, validateBody(schedulePostRequestSchema), async (
        request: Request<IdParams, unknown, SchedulePostRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            const result = await publishing.schedulePost.execute({
                actor: getActor(response),
                postId: request.params.id,
                ...request.body,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.post('/posts/:id/archive', authMiddleware, async (
        request: Request<IdParams>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            const result = await publishing.archivePost.execute({
                actor: getActor(response),
                postId: request.params.id,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.get('/posts/:id/revisions', authMiddleware, async (
        request: Request<IdParams>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            const result = await publishing.getPostRevisions.execute({
                actor: getActor(response),
                postId: request.params.id,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    router.post('/posts/:id/revisions/:revisionId/restore', authMiddleware, async (
        request: Request<RevisionParams>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            const result = await publishing.restorePostRevision.execute({
                actor: getActor(response),
                postId: request.params.id,
                revisionId: request.params.revisionId,
            });
            response.status(200).json(result);
        } catch (error) {
            next(error);
        }
    });

    return router;
};
