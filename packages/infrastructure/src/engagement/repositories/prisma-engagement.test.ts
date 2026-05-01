import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    Comment,
    CommentBody,
    Email,
    EntityId,
    Post,
    PostTitle,
    RichContent,
    SeoMetadata,
    Slug,
    UtcDateTime,
    User,
} from '@codex-blog/domain';

import { PrismaUserRepository } from '../../identity/repositories/prisma-identity.js';
import { PrismaPostRepository } from '../../publishing/repositories/prisma-publishing.js';
import { createPrismaClient } from '../../prisma/client.js';
import { PrismaCommentRepository } from './prisma-engagement.js';

const createTestUser = (id: string, email: string): User =>
    User.register({
        id: EntityId.create(id),
        email: Email.create(email),
        displayName: 'User',
        passwordHash: 'hashed-password',
        createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
    });

const createPublishedPost = (): Post => {
    const post = Post.createDraft({
        id: EntityId.create('post-0001'),
        authorId: EntityId.create('author-0001'),
        title: PostTitle.create('Published post'),
        slug: Slug.create('published-post'),
        excerpt: 'Excerpt',
        content: RichContent.create({
            version: 1,
            blocks: [{ type: 'paragraph', text: 'Content' }],
        }),
        seo: SeoMetadata.create(),
        createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
        initialRevisionId: EntityId.create('revision-0001'),
    });
    post.publish(UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));
    return post;
};

const createComment = (id: string, body: string): Comment =>
    Comment.createPending({
        id: EntityId.create(id),
        postId: EntityId.create('post-0001'),
        authorId: EntityId.create('reader-0001'),
        body: CommentBody.create(body),
        createdAt: UtcDateTime.fromISOString('2026-01-03T00:00:00.000Z'),
    });

describe('Prisma comment repository', () => {
    let tempDirectory: string;
    let prisma: ReturnType<typeof createPrismaClient>;

    beforeEach(async () => {
        tempDirectory = await mkdtemp(path.join(tmpdir(), 'codex-blog-engagement-prisma-'));
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
        await prisma.$executeRaw`
            CREATE TABLE "posts" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "authorId" TEXT NOT NULL,
                "categoryId" TEXT,
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
                CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
            )
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX "posts_slug_key" ON "posts" ("slug")`;
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
        await prisma.$executeRaw`
            CREATE TABLE "post_tags" (
                "postId" TEXT NOT NULL,
                "tagId" TEXT NOT NULL,
                CONSTRAINT "post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "post_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                PRIMARY KEY ("postId", "tagId")
            )
        `;
        await prisma.$executeRaw`
            CREATE TABLE "comments" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "postId" TEXT NOT NULL,
                "authorId" TEXT NOT NULL,
                "parentId" TEXT,
                "body" TEXT NOT NULL,
                "status" TEXT NOT NULL,
                "approvedAt" DATETIME,
                "rejectedAt" DATETIME,
                "deletedAt" DATETIME,
                "moderatedAt" DATETIME,
                "moderatedByUserId" TEXT,
                "createdAt" DATETIME NOT NULL,
                "updatedAt" DATETIME NOT NULL,
                CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "comments_moderatedByUserId_fkey" FOREIGN KEY ("moderatedByUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        await new PrismaUserRepository(prisma).save(createTestUser('author-0001', 'author@example.com'));
        await new PrismaUserRepository(prisma).save(createTestUser('reader-0001', 'reader@example.com'));
        await new PrismaUserRepository(prisma).save(createTestUser('editor-0001', 'editor@example.com'));
        await new PrismaPostRepository(prisma).save(createPublishedPost());
    });

    afterEach(async () => {
        await prisma.$disconnect();
        await rm(tempDirectory, { recursive: true, force: true });
    });

    it('persists and rehydrates comments', async () => {
        const repository = new PrismaCommentRepository(prisma);
        const comment = createComment('comment-0001', 'Pending comment');

        await repository.save(comment);

        const found = await repository.findById('comment-0001');

        expect(found?.body.toString()).toBe('Pending comment');
        expect(found?.status).toBe('pending');
    });

    it('lists approved comments only', async () => {
        const repository = new PrismaCommentRepository(prisma);
        const approved = createComment('comment-0001', 'Approved comment');
        const rejected = createComment('comment-0002', 'Rejected comment');
        approved.approve(EntityId.create('editor-0001'), UtcDateTime.fromISOString('2026-01-04T00:00:00.000Z'));
        rejected.reject(EntityId.create('editor-0001'), UtcDateTime.fromISOString('2026-01-04T00:00:00.000Z'));

        await repository.save(approved);
        await repository.save(rejected);

        const comments = await repository.listApprovedByPostId({ postId: 'post-0001' });

        expect(comments.map((comment) => comment.body.toString())).toEqual(['Approved comment']);
    });
});
