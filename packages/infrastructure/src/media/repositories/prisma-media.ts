import type { PrismaClient } from '@prisma/client';

import {
    EntityId,
    MediaAsset,
    MimeType,
    OriginalFilename,
    StorageKey,
    UtcDateTime,
    type MediaAssetRepository,
    type MediaStatus,
} from '@codex-blog/domain';

interface MediaAssetRecord {
    altText: string | null;
    archivedAt: Date | null;
    caption: string | null;
    createdAt: Date;
    createdByUserId: string;
    id: string;
    mimeType: string;
    originalFilename: string;
    sizeBytes: number;
    status: string;
    storageKey: string;
    updatedAt: Date;
    url: string;
}

const toMediaAsset = (record: MediaAssetRecord): MediaAsset => {
    const archivedAt = record.archivedAt === null ? undefined : UtcDateTime.create(record.archivedAt);

    return MediaAsset.rehydrate({
        id: EntityId.create(record.id),
        originalFilename: OriginalFilename.create(record.originalFilename),
        mimeType: MimeType.create(record.mimeType),
        sizeBytes: record.sizeBytes,
        storageKey: StorageKey.create(record.storageKey),
        url: record.url,
        createdByUserId: EntityId.create(record.createdByUserId),
        status: record.status as MediaStatus,
        createdAt: UtcDateTime.create(record.createdAt),
        updatedAt: UtcDateTime.create(record.updatedAt),
        ...(record.altText === null ? {} : { altText: record.altText }),
        ...(record.caption === null ? {} : { caption: record.caption }),
        ...(archivedAt === undefined ? {} : { archivedAt }),
    });
};

export class PrismaMediaAssetRepository implements MediaAssetRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public async findById(id: string): Promise<MediaAsset | null> {
        const record = await this.prisma.mediaAsset.findUnique({ where: { id } });
        return record === null ? null : toMediaAsset(record);
    }

    public async listActive(): Promise<MediaAsset[]> {
        const records = await this.prisma.mediaAsset.findMany({
            where: {
                status: 'active',
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        });

        return records.map((record) => toMediaAsset(record));
    }

    public async save(asset: MediaAsset): Promise<void> {
        const props = asset.toPrimitives();

        await this.prisma.mediaAsset.upsert({
            where: {
                id: props.id.toString(),
            },
            create: {
                id: props.id.toString(),
                originalFilename: props.originalFilename.toString(),
                mimeType: props.mimeType.toString(),
                sizeBytes: props.sizeBytes,
                storageKey: props.storageKey.toString(),
                url: props.url,
                createdByUserId: props.createdByUserId.toString(),
                status: props.status,
                createdAt: props.createdAt.toDate(),
                updatedAt: props.updatedAt.toDate(),
                altText: props.altText ?? null,
                caption: props.caption ?? null,
                archivedAt: props.archivedAt?.toDate() ?? null,
            },
            update: {
                originalFilename: props.originalFilename.toString(),
                mimeType: props.mimeType.toString(),
                sizeBytes: props.sizeBytes,
                storageKey: props.storageKey.toString(),
                url: props.url,
                createdByUserId: props.createdByUserId.toString(),
                status: props.status,
                updatedAt: props.updatedAt.toDate(),
                altText: props.altText ?? null,
                caption: props.caption ?? null,
                archivedAt: props.archivedAt?.toDate() ?? null,
            },
        });
    }
}
