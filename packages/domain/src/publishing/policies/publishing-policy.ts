import { DomainError } from '../../shared/errors/domain-error.js';
import type { EntityId } from '../../shared/value-objects/entity-id.js';
import type { Post } from '../entities/post.js';
import type { PublishingActor } from '../publishing.types.js';

const canManageAllPosts = (actor: PublishingActor): boolean => actor.role === 'admin' || actor.role === 'editor';

export const assertCanCreatePost = (actor: PublishingActor): void => {
    if (actor.role !== 'author' && !canManageAllPosts(actor)) {
        throw new DomainError('Actor cannot create posts.', 'INSUFFICIENT_ROLE');
    }
};

export const assertCanUpdateDraftPost = (actor: PublishingActor, post: Post): void => {
    if (canManageAllPosts(actor)) {
        return;
    }

    if (actor.role !== 'author') {
        throw new DomainError('Actor cannot update posts.', 'INSUFFICIENT_ROLE');
    }

    if (post.status !== 'draft') {
        throw new DomainError('Authors can update draft posts only.', 'INVALID_POST_TRANSITION');
    }

    if (post.authorId.toString() !== actor.userId) {
        throw new DomainError('Authors can update only their own posts.', 'POST_OWNERSHIP_REQUIRED');
    }
};

export const assertCanManagePostLifecycle = (actor: PublishingActor): void => {
    if (!canManageAllPosts(actor)) {
        throw new DomainError('Only editors and admins can manage post lifecycle.', 'INSUFFICIENT_ROLE');
    }
};

export const assertCanRestoreRevision = (actor: PublishingActor, post: Post): void => {
    assertCanUpdateDraftPost(actor, post);
};

export const assertAuthorMatchesActor = (actor: PublishingActor, authorId: EntityId): void => {
    if (actor.role === 'author' && authorId.toString() !== actor.userId) {
        throw new DomainError('Authors can create only their own posts.', 'POST_OWNERSHIP_REQUIRED');
    }
};
