import { CreateMediaAssetUseCase, GetMediaAssetByIdUseCase, ListMediaAssetsUseCase } from '@codex-blog/application';
import type { AppConfig } from '@codex-blog/config';
import type { MediaAssetRepository } from '@codex-blog/domain';
import {
    type createPrismaClient,
    InMemoryMediaAssetRepository,
    InMemoryTransactionManager,
    PrismaMediaAssetRepository,
    RandomIdGenerator,
    SystemClock,
} from '@codex-blog/infrastructure';

type PrismaClient = ReturnType<typeof createPrismaClient>;

export const createMediaAssetRepository = (config: AppConfig, prisma?: PrismaClient): MediaAssetRepository =>
    config.DATA_SOURCE === 'prisma' && prisma !== undefined
        ? new PrismaMediaAssetRepository(prisma)
        : new InMemoryMediaAssetRepository();

export const buildMediaDependencies = (mediaAssetRepository: MediaAssetRepository) => {
    const commonDependencies = {
        mediaAssetRepository,
        idGenerator: new RandomIdGenerator(),
        clock: new SystemClock(),
        transactionManager: new InMemoryTransactionManager(),
    };

    return {
        createMediaAsset: new CreateMediaAssetUseCase(commonDependencies),
        getMediaAssetById: new GetMediaAssetByIdUseCase(commonDependencies),
        listMediaAssets: new ListMediaAssetsUseCase(commonDependencies),
    };
};
