import { z } from 'zod';

export const taxonomyStatusSchema = z.enum(['active', 'archived']);

export const taxonomyItemResponseSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(2).max(80),
    slug: z.string().min(1),
    status: taxonomyStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    archivedAt: z.string().datetime().optional(),
});

export const createTaxonomyItemRequestSchema = z.object({
    name: z.string().min(2).max(80),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const updateTaxonomyItemRequestSchema = createTaxonomyItemRequestSchema;
export const taxonomyItemsResponseSchema = z.array(taxonomyItemResponseSchema);

export type TaxonomyStatus = z.infer<typeof taxonomyStatusSchema>;
export type TaxonomyItemResponse = z.infer<typeof taxonomyItemResponseSchema>;
export type CreateTaxonomyItemRequest = z.infer<typeof createTaxonomyItemRequestSchema>;
export type UpdateTaxonomyItemRequest = z.infer<typeof updateTaxonomyItemRequestSchema>;
