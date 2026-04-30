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

export type PostStatus = z.infer<typeof postStatusSchema>;
export type RichContentParagraphBlock = z.infer<typeof richContentParagraphBlockSchema>;
export type RichContentHeadingBlock = z.infer<typeof richContentHeadingBlockSchema>;
export type RichContentImageBlock = z.infer<typeof richContentImageBlockSchema>;
export type RichContentEmbedBlock = z.infer<typeof richContentEmbedBlockSchema>;
export type RichContentCodeBlock = z.infer<typeof richContentCodeBlockSchema>;
export type RichContentBlock = z.infer<typeof richContentBlockSchema>;
export type RichContent = z.infer<typeof richContentSchema>;
export type SeoMetadata = z.infer<typeof seoMetadataSchema>;
