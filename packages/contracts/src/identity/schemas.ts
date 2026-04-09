import { z } from 'zod';

export const userRoleSchema = z.enum(['admin', 'editor', 'author', 'reader']);
export const userStatusSchema = z.enum(['active', 'suspended', 'invited']);

export const registerRequestSchema = z.object({
    email: z.string().email(),
    displayName: z.string().min(2).max(120),
    password: z.string().min(8).max(255),
});

export const loginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(255),
});

export const refreshRequestSchema = z.object({
    refreshToken: z.string().min(1),
});

export const logoutRequestSchema = refreshRequestSchema;

export const forgotPasswordRequestSchema = z.object({
    email: z.string().email(),
});

export const resetPasswordRequestSchema = z.object({
    token: z.string().min(1),
    nextPassword: z.string().min(8).max(255),
});

export const userResponseSchema = z.object({
    id: z.string().min(1),
    email: z.string().email(),
    displayName: z.string().min(2),
    role: userRoleSchema,
    status: userStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const sessionTokensResponseSchema = z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    accessTokenExpiresAt: z.string().datetime(),
    refreshTokenExpiresAt: z.string().datetime(),
});

export const authenticatedUserResponseSchema = z.object({
    user: userResponseSchema,
    tokens: sessionTokensResponseSchema,
});

export const changeUserRoleRequestSchema = z.object({
    role: userRoleSchema,
});

export const changeUserStatusRequestSchema = z.object({
    status: userStatusSchema,
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type AuthenticatedUserResponse = z.infer<typeof authenticatedUserResponseSchema>;
export type ChangeUserRoleRequest = z.infer<typeof changeUserRoleRequestSchema>;
export type ChangeUserStatusRequest = z.infer<typeof changeUserStatusRequestSchema>;
