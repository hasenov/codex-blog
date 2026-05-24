import {
    assertCanCreateMedia,
    DomainError,
    EntityId,
    MediaAsset,
    MimeType,
    type MediaAssetRepository,
    OriginalFilename,
    StorageKey,
    UtcDateTime,
} from '@codex-blog/domain';

import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors/application-error.js';
import type { Clock, IdGenerator, TransactionManager } from '../shared/ports/core.js';
import type { MediaActorDto, MediaAssetDto } from './dto.js';
import { toMediaAssetDto } from './mappers.js';

interface MediaUseCaseDependencies {
    clock: Clock;
    idGenerator: IdGenerator;
    mediaAssetRepository: MediaAssetRepository;
    transactionManager: TransactionManager;
}

interface CreateMediaAssetInput {
    actor: MediaActorDto;
    altText?: string;
    caption?: string;
    mimeType: string;
    originalFilename: string;
    sizeBytes: number;
    storageKey: string;
    url: string;
}

interface GetMediaAssetByIdInput {
    id: string;
}

const mapMediaError = (error: unknown): Error => {
    if (error instanceof NotFoundError) {
        return error;
    }

    if (error instanceof DomainError) {
        if (error.code === 'INSUFFICIENT_ROLE') {
            return new ForbiddenError(error.message, error.code);
        }

        return new BadRequestError(error.message, error.code);
    }

    return error instanceof Error ? error : new Error('Unknown media error');
};

export class CreateMediaAssetUseCase {
    public constructor(private readonly dependencies: MediaUseCaseDependencies) {}

    public async execute(input: CreateMediaAssetInput): Promise<MediaAssetDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                assertCanCreateMedia(input.actor);
                const now = UtcDateTime.create(this.dependencies.clock.now());
                const asset = MediaAsset.create({
                    id: EntityId.create(this.dependencies.idGenerator.generate()),
                    originalFilename: OriginalFilename.create(input.originalFilename),
                    mimeType: MimeType.create(input.mimeType),
                    sizeBytes: input.sizeBytes,
                    storageKey: StorageKey.create(input.storageKey),
                    url: input.url,
                    createdByUserId: EntityId.create(input.actor.userId),
                    createdAt: now,
                    ...(input.altText === undefined ? {} : { altText: input.altText }),
                    ...(input.caption === undefined ? {} : { caption: input.caption }),
                });

                await this.dependencies.mediaAssetRepository.save(asset);
                return toMediaAssetDto(asset);
            } catch (error) {
                throw mapMediaError(error);
            }
        });
    }
}

export class GetMediaAssetByIdUseCase {
    public constructor(private readonly dependencies: MediaUseCaseDependencies) {}

    public async execute(input: GetMediaAssetByIdInput): Promise<MediaAssetDto> {
        const asset = await this.dependencies.mediaAssetRepository.findById(input.id);

        if (asset === null || asset.status !== 'active') {
            throw new NotFoundError('Media asset was not found.', 'MEDIA_ASSET_NOT_FOUND');
        }

        return toMediaAssetDto(asset);
    }
}

export class ListMediaAssetsUseCase {
    public constructor(private readonly dependencies: MediaUseCaseDependencies) {}

    public async execute(): Promise<MediaAssetDto[]> {
        const assets = await this.dependencies.mediaAssetRepository.listActive();
        return assets.map((asset) => toMediaAssetDto(asset));
    }
}
