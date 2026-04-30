import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Email, EntityId, Post, PostTitle, RichContent, SeoMetadata, Slug, UtcDateTime, User } from '@codex-blog/domain';

import { PrismaUserRepository } from '../../identity/repositories/prisma-identity.js';
import { createPrismaClient } from '../../prisma/client.js';
import { PrismaPostRepository } from './prisma-publishing.js';

const createTestUser = (id: string, email: string): User =>
    User.register({
        id: EntityId.create(id),
        email: Email.create(email),
        displayName: 'Author',
        passwordHash: 'hashed-password',
        createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
    });

const createContent = (text: string): RichContent =>
    RichContent.create({
        version: 1,
        blocks: [
            {
                type: 'paragraph',
                text,
            },
        ],
    });

const createDraftPost = (id: string, slug: string): Post =>
    Post.createDraft({
        id: EntityId.create(id),
        authorId: EntityId.create('author-0001'),
        title: PostTitle.create(`Post ${id}`),
        slug: Slug.create(slug),
        excerpt: 'Excerpt',
        content: createContent('Initial content'),
        seo: SeoMetadata.create({
            title: 'SEO title',
        }),
        createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
        initialRevisionId: EntityId.create(`${id}-revision-0001`),
    });

describe('Prisma publishing repository', () => {
    let tempDirectory: string;
    let prisma: ReturnType<typeof createPrismaClient>;

    beforeEach(async () => {
        tempDirectory = await mkdtemp(path.join(tmpdir(), 'codex-blog-publishing-prisma-'));
        prisma = createPrismaClient(`file:${path.join(tempDirectory, 'test.db')}`);
        await prisma.$connect();
        await prisma.$executeRaw`
            CREATE TABLE "users" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "email" TEXT NOT NULL,
                "displayName" TEXT NOT NULL,
                "role" TEXT NOT NULL,
                "status" TEXT NOT NULL,
                "passwordHash" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL,
                "updatedAt" DATETIME NOT NULL
            )
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX "users_email_key" ON "users" ("email")`;
        await prisma.$executeRaw`
            CREATE TABLE "posts" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "authorId" TEXT NOT NULL,
                "title" TEXT NOT NULL,
                "slug" TEXT NOT NULL,
                "excerpt" TEXT NOT NULL,
                "contentJson" TEXT NOT NULL,
                "seoJson" TEXT NOT NULL,
                "status" TEXT NOT NULL,
                "publishedAt" DATETIME,
                "scheduledFor" DATETIME,
                "archivedAt" DATETIME,
                "createdAt" DATETIME NOT NULL,
                "updatedAt" DATETIME NOT NULL,
                CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX "posts_slug_key" ON "posts" ("slug")`;
        await prisma.$executeRaw`CREATE INDEX "posts_authorId_idx" ON "posts" ("authorId")`;
        await prisma.$executeRaw`CREATE INDEX "posts_status_idx" ON "posts" ("status")`;
        await prisma.$executeRaw`CREATE INDEX "posts_publishedAt_idx" ON "posts" ("publishedAt")`;
        await prisma.$executeRaw`CREATE INDEX "posts_scheduledFor_idx" ON "posts" ("scheduledFor")`;
        await prisma.$executeRaw`
            CREATE TABLE "post_revisions" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "postId" TEXT NOT NULL,
                "number" INTEGER NOT NULL,
                "title" TEXT NOT NULL,
                "excerpt" TEXT NOT NULL,
                "contentJson" TEXT NOT NULL,
                "seoJson" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL,
                "createdByUserId" TEXT NOT NULL,
                CONSTRAINT "post_revisions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "post_revisions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX "post_revisions_postId_number_key" ON "post_revisions" ("postId", "number")`;
        await prisma.$executeRaw`CREATE INDEX "post_revisions_postId_idx" ON "post_revisions" ("postId")`;
        await prisma.$executeRaw`CREATE INDEX "post_revisions_createdByUserId_idx" ON "post_revisions" ("createdByUserId")`;
        await new PrismaUserRepository(prisma).save(createTestUser('author-0001', 'author@example.com'));
        await new PrismaUserRepository(prisma).save(createTestUser('editor-0001', 'editor@example.com'));
    });

    afterEach(async () => {
        await prisma.$disconnect();
        await rm(tempDirectory, { recursive: true, force: true });
    });

    it('persists and rehydrates posts with revisions', async () => {
        const repository = new PrismaPostRepository(prisma);
        const post = createDraftPost('post-0001', 'first-post');
        post.updateDraft({
            title: PostTitle.create('Updated title'),
            excerpt: 'Updated excerpt',
            content: createContent('Updated content'),
            seo: SeoMetadata.create(),
            revisionId: EntityId.create('post-0001-revision-0002'),
            updatedAt: UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'),
            updatedByUserId: EntityId.create('author-0001'),
        });

        await repository.save(post);

        const found = await repository.findById('post-0001');

        expect(found?.title.toString()).toBe('Updated title');
        expect(found?.revisions).toHaveLength(2);
        expect(await repository.existsBySlug(Slug.create('first-post'))).toBe(true);
    });

    it('lists only published posts', async () => {
        const repository = new PrismaPostRepository(prisma);
        const draft = createDraftPost('post-0001', 'draft-post');
        const published = createDraftPost('post-0002', 'published-post');
        const scheduled = createDraftPost('post-0003', 'scheduled-post');
        published.publish(UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));
        scheduled.schedule(
            UtcDateTime.fromISOString('2026-01-03T00:00:00.000Z'),
            UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z')
        );

        await repository.save(draft);
        await repository.save(published);
        await repository.save(scheduled);

        const posts = await repository.listPublished();

        expect(posts.map((post) => post.slug.toString())).toEqual(['published-post']);
    });

    it('persists restored revisions', async () => {
        const repository = new PrismaPostRepository(prisma);
        const post = createDraftPost('post-0001', 'restored-post');
        post.updateDraft({
            title: PostTitle.create('Updated title'),
            excerpt: 'Updated excerpt',
            content: createContent('Updated content'),
            seo: SeoMetadata.create(),
            revisionId: EntityId.create('post-0001-revision-0002'),
            updatedAt: UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'),
            updatedByUserId: EntityId.create('author-0001'),
        });
        post.restoreRevision({
            restoredRevisionId: EntityId.create('post-0001-revision-0001'),
            revisionId: EntityId.create('post-0001-revision-0003'),
            restoredAt: UtcDateTime.fromISOString('2026-01-03T00:00:00.000Z'),
            restoredByUserId: EntityId.create('editor-0001'),
        });

        await repository.save(post);

        const restored = await repository.findBySlug(Slug.create('restored-post'));

        expect(restored?.title.toString()).toBe('Post post-0001');
        expect(restored?.revisions).toHaveLength(3);
    });
});
