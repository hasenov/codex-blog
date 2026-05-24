import { describe, expect, it } from 'vitest';

import { EntityId } from '../../shared/value-objects/entity-id.js';
import { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';
import { MediaAsset } from './media-asset.js';
import { MimeType } from '../value-objects/mime-type.js';
import { OriginalFilename } from '../value-objects/original-filename.js';
import { StorageKey } from '../value-objects/storage-key.js';

describe('MediaAsset', () => {
    it('creates active media metadata with normalized optional fields', () => {
        const asset = MediaAsset.create({
            id: EntityId.create('media-0001'),
            originalFilename: OriginalFilename.create(' hero.png '),
            mimeType: MimeType.create('IMAGE/PNG'),
            sizeBytes: 1024,
            storageKey: StorageKey.create('media/hero.png'),
            url: ' https://cdn.example.com/media/hero.png ',
            createdByUserId: EntityId.create('user-0001'),
            createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
            altText: ' Hero image ',
            caption: ' Landing page hero ',
        });

        expect(asset.status).toBe('active');
        expect(asset.originalFilename.toString()).toBe('hero.png');
        expect(asset.mimeType.toString()).toBe('image/png');
        expect(asset.url).toBe('https://cdn.example.com/media/hero.png');
        expect(asset.altText).toBe('Hero image');
        expect(asset.caption).toBe('Landing page hero');
    });

    it('archives an active media asset', () => {
        const asset = MediaAsset.create({
            id: EntityId.create('media-0001'),
            originalFilename: OriginalFilename.create('hero.png'),
            mimeType: MimeType.create('image/png'),
            sizeBytes: 1024,
            storageKey: StorageKey.create('media/hero.png'),
            url: 'https://cdn.example.com/media/hero.png',
            createdByUserId: EntityId.create('user-0001'),
            createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
        });

        asset.archive(UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));

        expect(asset.status).toBe('archived');
        expect(asset.archivedAt?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    });
});
