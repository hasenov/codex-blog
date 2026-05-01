import { Router, type Request, type Response } from 'express';

import type { TokenService } from '@codex-blog/application';
import {
    type CreateTaxonomyItemRequest,
    type UpdateTaxonomyItemRequest,
    createTaxonomyItemRequestSchema,
    updateTaxonomyItemRequestSchema,
} from '@codex-blog/contracts';

import { getActor, type ActorDto } from './actor.js';
import { requireAuth } from '../middleware/require-auth.js';
import type { RequestContextLocals } from '../middleware/request-context.js';
import { validateBody } from '../middleware/validate-request.js';

type IdParams = { id: string };
type SlugParams = { slug: string };

export interface TaxonomyApi {
    createCategory: {
        execute(input: CreateTaxonomyItemRequest & { actor: ActorDto }): Promise<unknown>;
    };
    updateCategory: {
        execute(input: UpdateTaxonomyItemRequest & { actor: ActorDto; id: string }): Promise<unknown>;
    };
    deleteCategory: {
        execute(input: { actor: ActorDto; id: string }): Promise<void>;
    };
    listCategories: {
        execute(): Promise<unknown>;
    };
    getCategoryBySlug: {
        execute(input: { slug: string }): Promise<unknown>;
    };
    createTag: {
        execute(input: CreateTaxonomyItemRequest & { actor: ActorDto }): Promise<unknown>;
    };
    updateTag: {
        execute(input: UpdateTaxonomyItemRequest & { actor: ActorDto; id: string }): Promise<unknown>;
    };
    deleteTag: {
        execute(input: { actor: ActorDto; id: string }): Promise<void>;
    };
    listTags: {
        execute(): Promise<unknown>;
    };
    getTagBySlug: {
        execute(input: { slug: string }): Promise<unknown>;
    };
}

export const buildTaxonomyRouter = (tokenService: TokenService, taxonomy: TaxonomyApi): Router => {
    const router = Router();
    const authMiddleware = requireAuth(tokenService);

    router.get('/categories', async (_request, response, next) => {
        try {
            response.status(200).json(await taxonomy.listCategories.execute());
        } catch (error) {
            next(error);
        }
    });

    router.get('/categories/:slug', async (request: Request<SlugParams>, response, next) => {
        try {
            response.status(200).json(await taxonomy.getCategoryBySlug.execute({ slug: request.params.slug }));
        } catch (error) {
            next(error);
        }
    });

    router.post('/categories', authMiddleware, validateBody(createTaxonomyItemRequestSchema), async (
        request: Request<never, unknown, CreateTaxonomyItemRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            response.status(201).json(await taxonomy.createCategory.execute({ actor: getActor(response), ...request.body }));
        } catch (error) {
            next(error);
        }
    });

    router.patch('/categories/:id', authMiddleware, validateBody(updateTaxonomyItemRequestSchema), async (
        request: Request<IdParams, unknown, UpdateTaxonomyItemRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            response.status(200).json(await taxonomy.updateCategory.execute({
                actor: getActor(response),
                id: request.params.id,
                ...request.body,
            }));
        } catch (error) {
            next(error);
        }
    });

    router.delete('/categories/:id', authMiddleware, async (
        request: Request<IdParams>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            await taxonomy.deleteCategory.execute({ actor: getActor(response), id: request.params.id });
            response.status(204).send();
        } catch (error) {
            next(error);
        }
    });

    router.get('/tags', async (_request, response, next) => {
        try {
            response.status(200).json(await taxonomy.listTags.execute());
        } catch (error) {
            next(error);
        }
    });

    router.get('/tags/:slug', async (request: Request<SlugParams>, response, next) => {
        try {
            response.status(200).json(await taxonomy.getTagBySlug.execute({ slug: request.params.slug }));
        } catch (error) {
            next(error);
        }
    });

    router.post('/tags', authMiddleware, validateBody(createTaxonomyItemRequestSchema), async (
        request: Request<never, unknown, CreateTaxonomyItemRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            response.status(201).json(await taxonomy.createTag.execute({ actor: getActor(response), ...request.body }));
        } catch (error) {
            next(error);
        }
    });

    router.patch('/tags/:id', authMiddleware, validateBody(updateTaxonomyItemRequestSchema), async (
        request: Request<IdParams, unknown, UpdateTaxonomyItemRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            response.status(200).json(await taxonomy.updateTag.execute({
                actor: getActor(response),
                id: request.params.id,
                ...request.body,
            }));
        } catch (error) {
            next(error);
        }
    });

    router.delete('/tags/:id', authMiddleware, async (
        request: Request<IdParams>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            await taxonomy.deleteTag.execute({ actor: getActor(response), id: request.params.id });
            response.status(204).send();
        } catch (error) {
            next(error);
        }
    });

    return router;
};
