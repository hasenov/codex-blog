import type { MediaActor, MediaStatus } from '@codex-blog/domain';

export type MediaActorDto = MediaActor;

export interface MediaAssetDto {
    altText?: string;
    archivedAt?: string;
    caption?: string;
    createdAt: string;
    createdByUserId: string;
    id: string;
    mimeType: string;
    originalFilename: string;
    sizeBytes: number;
    status: MediaStatus;
    storageKey: string;
    updatedAt: string;
    url: string;
}
