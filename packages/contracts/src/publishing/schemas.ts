import { z } from 'zod';

export const postStatusSchema = z.enum(['draft', 'scheduled', 'published', 'archived']);

export const richContentParagraphBlockSchema = z.object({
    type: z.literal('paragraph'),
    text: z.string().min(1).max(10000),
});

export const richContentHeadingBlockSchema = z.object({
    type: z.literal('heading'),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    text: z.string().min(1).max(240),
});

export const richContentImageBlockSchema = z.object({
    type: z.literal('image'),
    url: z.string().url(),
    assetId: z.string().min(1).optional(),
    alt: z.string().min(1).max(240).optional(),
    caption: z.string().min(1).max(500).optional(),
});

export const richContentEmbedBlockSchema = z.object({
    type: z.literal('embed'),
    url: z.string().url(),
    provider: z.string().min(1).max(80).optional(),
});

export const richContentCodeBlockSchema = z.object({
    type: z.literal('code'),
    code: z.string().min(1).max(20000),
    language: z.string().min(1).max(80).optional(),
});

export const richContentBlockSchema = z.discriminatedUnion('type', [
    richContentParagraphBlockSchema,
    richContentHeadingBlockSchema,
    richContentImageBlockSchema,
    richContentEmbedBlockSchema,
    richContentCodeBlockSchema,
]);

export const richContentSchema = z.object({
    version: z.literal(1),
    blocks: z.array(richContentBlockSchema).min(1).max(200),
});

export const seoMetadataSchema = z.object({
    title: z.string().min(1).max(70).optional(),
    description: z.string().min(1).max(160).optional(),
    canonicalUrl: z.string().url().optional(),
    ogTitle: z.string().min(1).max(70).optional(),
    ogDescription: z.string().min(1).max(160).optional(),
    ogImageUrl: z.string().url().optional(),
});

export const postRevisionResponseSchema = z.object({
    id: z.string().min(1),
    number: z.number().int().positive(),
    title: z.string().min(3),
    excerpt: z.string().max(500),
    content: richContentSchema,
    seo: seoMetadataSchema,
    createdAt: z.string().datetime(),
    createdByUserId: z.string().min(1),
});

export const postResponseSchema = z.object({
    id: z.string().min(1),
    authorId: z.string().min(1),
    categoryId: z.string().min(1).optional(),
    title: z.string().min(3),
    slug: z.string().min(1),
    excerpt: z.string().max(500),
    content: richContentSchema,
    seo: seoMetadataSchema,
    status: postStatusSchema,
    tagIds: z.array(z.string().min(1)),
    revisions: z.array(postRevisionResponseSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    publishedAt: z.string().datetime().optional(),
    scheduledFor: z.string().datetime().optional(),
    archivedAt: z.string().datetime().optional(),
});

export const createPostRequestSchema = z.object({
    authorId: z.string().min(8).optional(),
    categoryId: z.string().min(1).optional(),
    title: z.string().min(3).max(160),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    excerpt: z.string().max(500),
    content: richContentSchema,
    seo: seoMetadataSchema.default({}),
    tagIds: z.array(z.string().min(1)).max(20).default([]),
});

export const updatePostRequestSchema = z.object({
    categoryId: z.string().min(1).optional(),
    title: z.string().min(3).max(160),
    excerpt: z.string().max(500),
    content: richContentSchema,
    seo: seoMetadataSchema.default({}),
    tagIds: z.array(z.string().min(1)).max(20).default([]),
});

export const schedulePostRequestSchema = z.object({
    scheduledFor: z.string().datetime(),
});

export const postListResponseSchema = z.array(postResponseSchema);
export const paginatedPostsResponseSchema = z.object({
    items: z.array(postResponseSchema),
    nextCursor: z.string().min(1).optional(),
});
export const postRevisionsResponseSchema = z.array(postRevisionResponseSchema);

export type PostStatus = z.infer<typeof postStatusSchema>;
export type RichContentParagraphBlock = z.infer<typeof richContentParagraphBlockSchema>;
export type RichContentHeadingBlock = z.infer<typeof richContentHeadingBlockSchema>;
export type RichContentImageBlock = z.infer<typeof richContentImageBlockSchema>;
export type RichContentEmbedBlock = z.infer<typeof richContentEmbedBlockSchema>;
export type RichContentCodeBlock = z.infer<typeof richContentCodeBlockSchema>;
export type RichContentBlock = z.infer<typeof richContentBlockSchema>;
export type RichContent = z.infer<typeof richContentSchema>;
export type SeoMetadata = z.infer<typeof seoMetadataSchema>;
export type PostRevisionResponse = z.infer<typeof postRevisionResponseSchema>;
export type PostResponse = z.infer<typeof postResponseSchema>;
export type PaginatedPostsResponse = z.infer<typeof paginatedPostsResponseSchema>;
export type CreatePostRequest = z.infer<typeof createPostRequestSchema>;
export type UpdatePostRequest = z.infer<typeof updatePostRequestSchema>;
export type SchedulePostRequest = z.infer<typeof schedulePostRequestSchema>;
