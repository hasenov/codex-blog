import { z } from 'zod';

export const problemDetailsSchema = z.object({
    type: z.string().min(1),
    title: z.string().min(1),
    status: z.number().int().positive(),
    detail: z.string().min(1),
    code: z.string().min(1),
    correlationId: z.string().min(1).optional(),
});

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
