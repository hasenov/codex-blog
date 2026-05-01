import type { CommentStatus, EngagementActor } from '@codex-blog/domain';

export type EngagementActorDto = EngagementActor;

export interface CommentDto {
    approvedAt?: string;
    authorId: string;
    body: string;
    createdAt: string;
    deletedAt?: string;
    id: string;
    moderatedAt?: string;
    moderatedByUserId?: string;
    parentId?: string;
    postId: string;
    rejectedAt?: string;
    status: CommentStatus;
    updatedAt: string;
}
