import type { TaxonomyActor, TaxonomyStatus } from '@codex-blog/domain';

export type TaxonomyActorDto = TaxonomyActor;

export interface TaxonomyItemDto {
    archivedAt?: string;
    createdAt: string;
    id: string;
    name: string;
    slug: string;
    status: TaxonomyStatus;
    updatedAt: string;
}
