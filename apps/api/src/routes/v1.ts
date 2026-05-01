import { Router } from 'express';

import type { EngagementApi } from './engagement.js';
import { buildEngagementRouter } from './engagement.js';
import type { IdentityApi } from './identity.js';
import { buildIdentityRouter } from './identity.js';
import type { PublishingApi } from './publishing.js';
import { buildPublishingRouter } from './publishing.js';
import type { TaxonomyApi } from './taxonomy.js';
import { buildTaxonomyRouter } from './taxonomy.js';

export const buildV1Router = (
    identity: IdentityApi,
    publishing: PublishingApi,
    engagement: EngagementApi,
    taxonomy: TaxonomyApi
): Router => {
    const router = Router();

    router.get('/health', (_request, response) => {
        response.status(200).json({ status: 'ok' });
    });

    router.use(buildIdentityRouter(identity));
    router.use(buildPublishingRouter(identity.tokenService, publishing));
    router.use(buildEngagementRouter(identity.tokenService, engagement));
    router.use(buildTaxonomyRouter(identity.tokenService, taxonomy));

    return router;
};
