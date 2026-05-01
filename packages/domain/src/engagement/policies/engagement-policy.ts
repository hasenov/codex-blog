import { DomainError } from '../../shared/errors/domain-error.js';
import type { Comment } from '../entities/comment.js';
import type { EngagementActor } from '../engagement.types.js';

const canModerateComments = (actor: EngagementActor): boolean => actor.role === 'admin' || actor.role === 'editor';

export const assertCanCreateComment = (actor: EngagementActor): void => {
    if (actor.role !== 'admin' && actor.role !== 'editor' && actor.role !== 'author' && actor.role !== 'reader') {
        throw new DomainError('Actor cannot create comments.', 'INSUFFICIENT_ROLE');
    }
};

export const assertCanUpdateComment = (actor: EngagementActor, comment: Comment): void => {
    if (comment.status === 'deleted') {
        throw new DomainError('Deleted comments cannot be updated.', 'COMMENT_DELETED');
    }

    if (comment.authorId.toString() !== actor.userId) {
        throw new DomainError('Actors can update only their own comments.', 'COMMENT_OWNERSHIP_REQUIRED');
    }
};

export const assertCanDeleteComment = (actor: EngagementActor, comment: Comment): void => {
    if (canModerateComments(actor)) {
        return;
    }

    if (comment.authorId.toString() !== actor.userId) {
        throw new DomainError('Actors can delete only their own comments.', 'COMMENT_OWNERSHIP_REQUIRED');
    }
};

export const assertCanModerateComment = (actor: EngagementActor): void => {
    if (!canModerateComments(actor)) {
        throw new DomainError('Only editors and admins can moderate comments.', 'INSUFFICIENT_ROLE');
    }
};
