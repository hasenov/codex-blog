import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { loadConfig } from '@codex-blog/config';
import type { AppConfig } from '@codex-blog/config';

import { buildIdentityDependencies } from './build-identity-dependencies.js';
import { getCurrentCorrelationId } from './request-scope.js';
import { errorHandler } from '../middleware/error-handler.js';
import { attachRequestContext } from '../middleware/request-context.js';
import { buildV1Router } from '../routes/v1.js';

interface CreatedApp {
    app: Express;
    config: AppConfig;
    dispose(): Promise<void>;
}

export const createApp = (): CreatedApp => {
    const config = loadConfig();
    const app = express();

    app.use(helmet());
    app.use(cors());
    app.use(
        rateLimit({
            windowMs: 60 * 1000,
            limit: 100,
            standardHeaders: true,
            legacyHeaders: false,
        })
    );
    app.use(express.json());
    app.use(attachRequestContext);

    const identity = buildIdentityDependencies(config, getCurrentCorrelationId);

    app.use(config.API_PREFIX, buildV1Router(identity));
    app.use(errorHandler);

    return {
        app,
        config,
        dispose: identity.dispose,
    };
};
