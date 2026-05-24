import type { MediaAsset } from '@codex-blog/domain';

import type { MediaAssetDto } from './dto.js';

export const toMediaAssetDto = (asset: MediaAsset): MediaAssetDto => {
    const props = asset.toPrimitives();

    return {
        id: props.id.toString(),
        originalFilename: props.originalFilename.toString(),
        mimeType: props.mimeType.toString(),
        sizeBytes: props.sizeBytes,
        storageKey: props.storageKey.toString(),
        url: props.url,
        createdByUserId: props.createdByUserId.toString(),
        status: props.status,
        createdAt: props.createdAt.toISOString(),
        updatedAt: props.updatedAt.toISOString(),
        ...(props.altText === undefined ? {} : { altText: props.altText }),
        ...(props.caption === undefined ? {} : { caption: props.caption }),
        ...(props.archivedAt === undefined ? {} : { archivedAt: props.archivedAt.toISOString() }),
    };
};
