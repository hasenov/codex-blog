import type { UserRole } from '../identity/identity.types.js';

export const TAXONOMY_STATUSES = ['active', 'archived'] as const;
export type TaxonomyStatus = (typeof TAXONOMY_STATUSES)[number];

export interface TaxonomyActor {
    role: UserRole;
    userId: string;
}
