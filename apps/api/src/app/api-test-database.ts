import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createPrismaClient } from '@codex-blog/infrastructure';

export const createApiTestSchema = async (databaseUrl: string): Promise<void> => {
    const prisma = createPrismaClient(databaseUrl);

    try {
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
            CREATE TABLE "sessions" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "refreshTokenId" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL,
                "expiresAt" DATETIME NOT NULL,
                "revokedAt" DATETIME,
                "replacedBySessionId" TEXT,
                CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX "sessions_refreshTokenId_key" ON "sessions" ("refreshTokenId")`;
        await prisma.$executeRaw`CREATE INDEX "sessions_userId_idx" ON "sessions" ("userId")`;
        await prisma.$executeRaw`
            CREATE TABLE "security_events" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "type" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "occurredAt" DATETIME NOT NULL,
                "correlationId" TEXT NOT NULL,
                "metadataJson" TEXT,
                CONSTRAINT "security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        await prisma.$executeRaw`CREATE INDEX "security_events_userId_idx" ON "security_events" ("userId")`;
        await prisma.$executeRaw`
            CREATE TABLE "password_reset_tokens" (
                "token" TEXT NOT NULL PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "expiresAt" DATETIME NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        await prisma.$executeRaw`CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens" ("userId")`;
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
    } finally {
        await prisma.$disconnect();
    }
};

export const withPrismaApiTestDatabase = async (work: (databaseUrl: string) => Promise<void>): Promise<void> => {
    const previousDataSource = process.env.DATA_SOURCE;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const tempDirectory = await mkdtemp(path.join(tmpdir(), 'codex-blog-api-prisma-'));
    const databaseUrl = `file:${path.join(tempDirectory, 'api-test.db')}`;

    try {
        await createApiTestSchema(databaseUrl);

        process.env.DATA_SOURCE = 'prisma';
        process.env.DATABASE_URL = databaseUrl;

        await work(databaseUrl);
    } finally {
        if (previousDataSource === undefined) {
            delete process.env.DATA_SOURCE;
        } else {
            process.env.DATA_SOURCE = previousDataSource;
        }

        if (previousDatabaseUrl === undefined) {
            delete process.env.DATABASE_URL;
        } else {
            process.env.DATABASE_URL = previousDatabaseUrl;
        }

        await rm(tempDirectory, { recursive: true, force: true });
    }
};
