import { DomainError } from '../../shared/errors/domain-error.js';
import type { EntityId } from '../../shared/value-objects/entity-id.js';
import type { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';
import type { MediaStatus } from '../media.types.js';
import type { MimeType } from '../value-objects/mime-type.js';
import type { OriginalFilename } from '../value-objects/original-filename.js';
import type { StorageKey } from '../value-objects/storage-key.js';

export interface CreateMediaAssetProps {
    altText?: string;
    caption?: string;
    createdAt: UtcDateTime;
    createdByUserId: EntityId;
    id: EntityId;
    mimeType: MimeType;
    originalFilename: OriginalFilename;
    sizeBytes: number;
    storageKey: StorageKey;
    url: string;
}

export interface MediaAssetProps {
    altText?: string;
    archivedAt?: UtcDateTime;
    caption?: string;
    createdAt: UtcDateTime;
    createdByUserId: EntityId;
    id: EntityId;
    mimeType: MimeType;
    originalFilename: OriginalFilename;
    sizeBytes: number;
    status: MediaStatus;
    storageKey: StorageKey;
    updatedAt: UtcDateTime;
    url: string;
}

const normalizeOptionalText = (value: string | undefined, maxLength: number, code: string): string | undefined => {
    if (value === undefined) {
        return undefined;
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length === 0 || normalizedValue.length > maxLength) {
        throw new DomainError('Media text metadata is invalid.', code);
    }

    return normalizedValue;
};

const normalizeSizeBytes = (value: number): number => {
    if (!Number.isInteger(value) || value <= 0) {
        throw new DomainError('Media asset size must be a positive integer.', 'INVALID_MEDIA_SIZE_BYTES');
    }

    return value;
};

const normalizeUrl = (value: string): string => {
    try {
        return new URL(value.trim()).toString();
    } catch {
        throw new DomainError('Media asset URL is invalid.', 'INVALID_MEDIA_URL');
    }
};

export class MediaAsset {
    private constructor(private props: MediaAssetProps) {}

    public static create(props: CreateMediaAssetProps): MediaAsset {
        const altText = normalizeOptionalText(props.altText, 240, 'INVALID_MEDIA_ALT_TEXT');
        const caption = normalizeOptionalText(props.caption, 500, 'INVALID_MEDIA_CAPTION');

        return new MediaAsset({
            id: props.id,
            originalFilename: props.originalFilename,
            mimeType: props.mimeType,
            sizeBytes: normalizeSizeBytes(props.sizeBytes),
            storageKey: props.storageKey,
            url: normalizeUrl(props.url),
            createdByUserId: props.createdByUserId,
            createdAt: props.createdAt,
            updatedAt: props.createdAt,
            status: 'active',
            ...(altText === undefined ? {} : { altText }),
            ...(caption === undefined ? {} : { caption }),
        });
    }

    public static rehydrate(props: MediaAssetProps): MediaAsset {
        return new MediaAsset(props);
    }

    public get altText(): string | undefined {
        return this.props.altText;
    }

    public get archivedAt(): UtcDateTime | undefined {
        return this.props.archivedAt;
    }

    public get caption(): string | undefined {
        return this.props.caption;
    }

    public get createdAt(): UtcDateTime {
        return this.props.createdAt;
    }

    public get createdByUserId(): EntityId {
        return this.props.createdByUserId;
    }

    public get id(): EntityId {
        return this.props.id;
    }

    public get mimeType(): MimeType {
        return this.props.mimeType;
    }

    public get originalFilename(): OriginalFilename {
        return this.props.originalFilename;
    }

    public get sizeBytes(): number {
        return this.props.sizeBytes;
    }

    public get status(): MediaStatus {
        return this.props.status;
    }

    public get storageKey(): StorageKey {
        return this.props.storageKey;
    }

    public get updatedAt(): UtcDateTime {
        return this.props.updatedAt;
    }

    public get url(): string {
        return this.props.url;
    }

    public archive(archivedAt: UtcDateTime): void {
        if (this.props.status === 'archived') {
            return;
        }

        this.props = {
            ...this.props,
            status: 'archived',
            archivedAt,
            updatedAt: archivedAt,
        };
    }

    public toPrimitives(): MediaAssetProps {
        return this.props;
    }
}
