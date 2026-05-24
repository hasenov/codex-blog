import { Router, type Request, type Response } from 'express';

import type { TokenService } from '@codex-blog/application';
import { type CreateMediaAssetRequest, createMediaAssetRequestSchema } from '@codex-blog/contracts';

import { getActor, type ActorDto } from './actor.js';
import { requireAuth } from '../middleware/require-auth.js';
import type { RequestContextLocals } from '../middleware/request-context.js';
import { validateBody } from '../middleware/validate-request.js';

type IdParams = { id: string };

export interface MediaApi {
    createMediaAsset: {
        execute(input: CreateMediaAssetRequest & { actor: ActorDto }): Promise<unknown>;
    };
    getMediaAssetById: {
        execute(input: { id: string }): Promise<unknown>;
    };
    listMediaAssets: {
        execute(): Promise<unknown>;
    };
}

export const buildMediaRouter = (tokenService: TokenService, media: MediaApi): Router => {
    const router = Router();
    const authMiddleware = requireAuth(tokenService);

    router.get('/media', async (_request, response, next) => {
        try {
            response.status(200).json(await media.listMediaAssets.execute());
        } catch (error) {
            next(error);
        }
    });

    router.get('/media/:id', async (request: Request<IdParams>, response, next) => {
        try {
            response.status(200).json(await media.getMediaAssetById.execute({ id: request.params.id }));
        } catch (error) {
            next(error);
        }
    });

    router.post('/media', authMiddleware, validateBody(createMediaAssetRequestSchema), async (
        request: Request<never, unknown, CreateMediaAssetRequest>,
        response: Response<unknown, RequestContextLocals>,
        next
    ) => {
        try {
            response.status(201).json(await media.createMediaAsset.execute({ actor: getActor(response), ...request.body }));
        } catch (error) {
            next(error);
        }
    });

    return router;
};
