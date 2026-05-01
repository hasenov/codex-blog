import { z } from 'zod';

export const commentStatusSchema = z.enum(['pending', 'approved', 'rejected', 'deleted']);

export const commentResponseSchema = z.object({
    id: z.string().min(1),
    postId: z.string().min(1),
    authorId: z.string().min(1),
    parentId: z.string().min(1).optional(),
    body: z.string().min(1).max(2000),
    status: commentStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    approvedAt: z.string().datetime().optional(),
    rejectedAt: z.string().datetime().optional(),
    deletedAt: z.string().datetime().optional(),
    moderatedAt: z.string().datetime().optional(),
    moderatedByUserId: z.string().min(1).optional(),
});

export const createCommentRequestSchema = z.object({
    body: z.string().min(1).max(2000),
    parentId: z.string().min(1).optional(),
});

export const updateCommentRequestSchema = z.object({
    body: z.string().min(1).max(2000),
});

export const moderateCommentRequestSchema = z.object({
    status: z.enum(['approved', 'rejected']),
});

export const commentsResponseSchema = z.array(commentResponseSchema);

export type CommentStatus = z.infer<typeof commentStatusSchema>;
export type CommentResponse = z.infer<typeof commentResponseSchema>;
export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>;
export type UpdateCommentRequest = z.infer<typeof updateCommentRequestSchema>;
export type ModerateCommentRequest = z.infer<typeof moderateCommentRequestSchema>;
