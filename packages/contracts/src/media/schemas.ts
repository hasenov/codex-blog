import { z } from 'zod';

export const mediaAssetResponseSchema = z.object({
    id: z.string().min(1),
    originalFilename: z.string().min(1),
    mimeType: z.string().min(3),
    sizeBytes: z.number().int().positive(),
    storageKey: z.string().min(1),
    url: z.string().url(),
    createdByUserId: z.string().min(1),
    status: z.enum(['active', 'archived']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    altText: z.string().min(1).max(240).optional(),
    caption: z.string().min(1).max(500).optional(),
    archivedAt: z.string().datetime().optional(),
});

export const mediaAssetsResponseSchema = z.array(mediaAssetResponseSchema);

export const createMediaAssetRequestSchema = z.object({
    originalFilename: z.string().min(1).max(255),
    mimeType: z.string().min(3).max(160),
    sizeBytes: z.number().int().positive(),
    storageKey: z.string().min(1).max(500),
    url: z.string().url(),
    altText: z.string().min(1).max(240).optional(),
    caption: z.string().min(1).max(500).optional(),
});

export type MediaAssetResponse = z.infer<typeof mediaAssetResponseSchema>;
export type MediaAssetsResponse = z.infer<typeof mediaAssetsResponseSchema>;
export type CreateMediaAssetRequest = z.infer<typeof createMediaAssetRequestSchema>;
