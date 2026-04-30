import { Router } from 'express';

import type { IdentityApi } from './identity.js';
import { buildIdentityRouter } from './identity.js';
import type { PublishingApi } from './publishing.js';
import { buildPublishingRouter } from './publishing.js';

export const buildV1Router = (identity: IdentityApi, publishing: PublishingApi): Router => {
    const router = Router();

    router.get('/health', (_request, response) => {
        response.status(200).json({ status: 'ok' });
    });

    router.use(buildIdentityRouter(identity));
    router.use(buildPublishingRouter(identity.tokenService, publishing));

    return router;
};
