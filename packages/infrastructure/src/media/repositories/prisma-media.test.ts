import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EntityId, MediaAsset, MimeType, OriginalFilename, StorageKey, UtcDateTime } from '@codex-blog/domain';

import { createPrismaClient } from '../../prisma/client.js';
import { PrismaMediaAssetRepository } from './prisma-media.js';

const now = UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z');

describe('Prisma media repository', () => {
    let tempDirectory: string;
    let prisma: ReturnType<typeof createPrismaClient>;

    beforeEach(async () => {
        tempDirectory = await mkdtemp(path.join(tmpdir(), 'codex-blog-media-prisma-'));
        prisma = createPrismaClient(`file:${path.join(tempDirectory, 'test.db')}`);
        await prisma.$connect();
        await prisma.$executeRaw`
            CREATE TABLE "users" (
                "id" TEXT NOT NULL PRIMARY KEY
            )
        `;
        await prisma.$executeRaw`
            CREATE TABLE "media_assets" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "originalFilename" TEXT NOT NULL,
                "mimeType" TEXT NOT NULL,
                "sizeBytes" INTEGER NOT NULL,
                "storageKey" TEXT NOT NULL,
                "url" TEXT NOT NULL,
                "altText" TEXT,
                "caption" TEXT,
                "status" TEXT NOT NULL,
                "archivedAt" DATETIME,
                "createdByUserId" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL,
                "updatedAt" DATETIME NOT NULL,
                CONSTRAINT "media_assets_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        await prisma.$executeRaw`CREATE INDEX "media_assets_status_idx" ON "media_assets" ("status")`;
        await prisma.$executeRaw`CREATE INDEX "media_assets_createdByUserId_idx" ON "media_assets" ("createdByUserId")`;
        await prisma.$executeRaw`
            INSERT INTO "users" ("id") VALUES ('user-0001')
        `;
    });

    afterEach(async () => {
        await prisma.$disconnect();
        await rm(tempDirectory, { recursive: true, force: true });
    });

    it('persists and lists active media assets', async () => {
        const repository = new PrismaMediaAssetRepository(prisma);
        const active = MediaAsset.create({
            id: EntityId.create('media-0001'),
            originalFilename: OriginalFilename.create('hero.png'),
            mimeType: MimeType.create('image/png'),
            sizeBytes: 1024,
            storageKey: StorageKey.create('media/hero.png'),
            url: 'https://cdn.example.com/media/hero.png',
            createdByUserId: EntityId.create('user-0001'),
            createdAt: now,
            altText: 'Hero',
        });
        const archived = MediaAsset.create({
            id: EntityId.create('media-0002'),
            originalFilename: OriginalFilename.create('old.png'),
            mimeType: MimeType.create('image/png'),
            sizeBytes: 2048,
            storageKey: StorageKey.create('media/old.png'),
            url: 'https://cdn.example.com/media/old.png',
            createdByUserId: EntityId.create('user-0001'),
            createdAt: now,
        });
        archived.archive(UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));

        await repository.save(active);
        await repository.save(archived);

        expect((await repository.findById('media-0001'))?.originalFilename.toString()).toBe('hero.png');
        expect((await repository.listActive()).map((asset) => asset.id.toString())).toEqual(['media-0001']);
    });
});
