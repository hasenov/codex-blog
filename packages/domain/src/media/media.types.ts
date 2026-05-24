import type { UserRole } from '../identity/identity.types.js';

export const MEDIA_STATUSES = ['active', 'archived'] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export interface MediaActor {
    role: UserRole;
    userId: string;
}
