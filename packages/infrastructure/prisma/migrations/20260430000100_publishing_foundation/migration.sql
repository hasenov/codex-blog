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
);

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
);

CREATE UNIQUE INDEX "posts_slug_key" ON "posts" ("slug");
CREATE INDEX "posts_authorId_idx" ON "posts" ("authorId");
CREATE INDEX "posts_status_idx" ON "posts" ("status");
CREATE INDEX "posts_publishedAt_idx" ON "posts" ("publishedAt");
CREATE INDEX "posts_scheduledFor_idx" ON "posts" ("scheduledFor");
CREATE UNIQUE INDEX "post_revisions_postId_number_key" ON "post_revisions" ("postId", "number");
CREATE INDEX "post_revisions_postId_idx" ON "post_revisions" ("postId");
CREATE INDEX "post_revisions_createdByUserId_idx" ON "post_revisions" ("createdByUserId");
