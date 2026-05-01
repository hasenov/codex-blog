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
);

CREATE INDEX "comments_postId_idx" ON "comments" ("postId");
CREATE INDEX "comments_authorId_idx" ON "comments" ("authorId");
CREATE INDEX "comments_parentId_idx" ON "comments" ("parentId");
CREATE INDEX "comments_status_idx" ON "comments" ("status");
CREATE INDEX "comments_moderatedByUserId_idx" ON "comments" ("moderatedByUserId");
