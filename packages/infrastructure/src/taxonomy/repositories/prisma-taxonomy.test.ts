import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Category, EntityId, Slug, Tag, TaxonomyName, UtcDateTime } from '@codex-blog/domain';

import { createPrismaClient } from '../../prisma/client.js';
import { PrismaCategoryRepository, PrismaTagRepository } from './prisma-taxonomy.js';

const now = UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z');

describe('Prisma taxonomy repositories', () => {
    let tempDirectory: string;
    let prisma: ReturnType<typeof createPrismaClient>;

    beforeEach(async () => {
        tempDirectory = await mkdtemp(path.join(tmpdir(), 'codex-blog-taxonomy-prisma-'));
        prisma = createPrismaClient(`file:${path.join(tempDirectory, 'test.db')}`);
        await prisma.$connect();
        await prisma.$executeRaw`
            CREATE TABLE "categories" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "slug" TEXT NOT NULL,
                "status" TEXT NOT NULL,
                "archivedAt" DATETIME,
                "createdAt" DATETIME NOT NULL,
                "updatedAt" DATETIME NOT NULL
            )
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX "categories_slug_key" ON "categories" ("slug")`;
        await prisma.$executeRaw`CREATE INDEX "categories_status_idx" ON "categories" ("status")`;
        await prisma.$executeRaw`
            CREATE TABLE "tags" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "slug" TEXT NOT NULL,
                "status" TEXT NOT NULL,
                "archivedAt" DATETIME,
                "createdAt" DATETIME NOT NULL,
                "updatedAt" DATETIME NOT NULL
            )
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX "tags_slug_key" ON "tags" ("slug")`;
        await prisma.$executeRaw`CREATE INDEX "tags_status_idx" ON "tags" ("status")`;
    });

    afterEach(async () => {
        await prisma.$disconnect();
        await rm(tempDirectory, { recursive: true, force: true });
    });

    it('persists and lists active categories', async () => {
        const repository = new PrismaCategoryRepository(prisma);
        const active = Category.create({
            id: EntityId.create('category-0001'),
            name: TaxonomyName.create('Engineering'),
            slug: Slug.create('engineering'),
            createdAt: now,
        });
        const archived = Category.create({
            id: EntityId.create('category-0002'),
            name: TaxonomyName.create('Archived'),
            slug: Slug.create('archived'),
            createdAt: now,
        });
        archived.archive(UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));

        await repository.save(active);
        await repository.save(archived);

        expect((await repository.findBySlug(Slug.create('engineering')))?.name.toString()).toBe('Engineering');
        expect(await repository.existsBySlug(Slug.create('engineering'))).toBe(true);
        expect((await repository.listActive()).map((category) => category.slug.toString())).toEqual(['engineering']);
    });

    it('persists and lists active tags', async () => {
        const repository = new PrismaTagRepository(prisma);
        const active = Tag.create({
            id: EntityId.create('tag-0001'),
            name: TaxonomyName.create('TypeScript'),
            slug: Slug.create('typescript'),
            createdAt: now,
        });
        const archived = Tag.create({
            id: EntityId.create('tag-0002'),
            name: TaxonomyName.create('Archived'),
            slug: Slug.create('archived-tag'),
            createdAt: now,
        });
        archived.archive(UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));

        await repository.save(active);
        await repository.save(archived);

        expect((await repository.findById('tag-0001'))?.name.toString()).toBe('TypeScript');
        expect(await repository.existsBySlug(Slug.create('typescript'))).toBe(true);
        expect((await repository.listActive()).map((tag) => tag.slug.toString())).toEqual(['typescript']);
    });
});
