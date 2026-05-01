import type { UserRole } from '../identity/identity.types.js';

export const COMMENT_STATUSES = ['pending', 'approved', 'rejected', 'deleted'] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export interface EngagementActor {
    role: UserRole;
    userId: string;
}
