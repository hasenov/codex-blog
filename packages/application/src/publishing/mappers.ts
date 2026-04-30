import type { Post, PostRevision } from '@codex-blog/domain';

import type { PostDto, PostRevisionDto } from './dto.js';

export const toPostRevisionDto = (revision: PostRevision): PostRevisionDto => ({
    id: revision.id.toString(),
    number: revision.number,
    title: revision.title.toString(),
    excerpt: revision.excerpt,
    content: revision.content.toPrimitives(),
    seo: revision.seo.toPrimitives(),
    createdAt: revision.createdAt.toISOString(),
    createdByUserId: revision.createdByUserId.toString(),
});

export const toPostDto = (post: Post): PostDto => ({
    id: post.id.toString(),
    authorId: post.authorId.toString(),
    title: post.title.toString(),
    slug: post.slug.toString(),
    excerpt: post.excerpt,
    content: post.content.toPrimitives(),
    seo: post.seo.toPrimitives(),
    status: post.status,
    revisions: post.revisions.map((revision) => toPostRevisionDto(revision)),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    ...(post.publishedAt === undefined ? {} : { publishedAt: post.publishedAt.toISOString() }),
    ...(post.scheduledFor === undefined ? {} : { scheduledFor: post.scheduledFor.toISOString() }),
    ...(post.archivedAt === undefined ? {} : { archivedAt: post.archivedAt.toISOString() }),
});
