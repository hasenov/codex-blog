import { describe, expect, it } from 'vitest';

import { EntityId } from '../../shared/value-objects/entity-id.js';
import { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';
import { Comment } from '../entities/comment.js';
import { CommentBody } from '../value-objects/comment-body.js';
import { assertCanDeleteComment, assertCanModerateComment, assertCanUpdateComment } from './engagement-policy.js';

const comment = Comment.createPending({
    id: EntityId.create('comment-0001'),
    postId: EntityId.create('post-0001'),
    authorId: EntityId.create('reader-0001'),
    body: CommentBody.create('Comment'),
    createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
});

describe('engagement policy', () => {
    it('allows owners to update and delete their comments', () => {
        const actor = { role: 'reader' as const, userId: 'reader-0001' };

        expect(() => assertCanUpdateComment(actor, comment)).not.toThrow();
        expect(() => assertCanDeleteComment(actor, comment)).not.toThrow();
    });

    it('rejects non-owners editing or deleting without moderation rights', () => {
        const actor = { role: 'reader' as const, userId: 'reader-0002' };

        expect(() => assertCanUpdateComment(actor, comment)).toThrow('Actors can update only their own comments.');
        expect(() => assertCanDeleteComment(actor, comment)).toThrow('Actors can delete only their own comments.');
    });

    it('allows editors and admins to moderate and delete comments', () => {
        expect(() => assertCanModerateComment({ role: 'editor', userId: 'editor-0001' })).not.toThrow();
        expect(() => assertCanModerateComment({ role: 'admin', userId: 'admin-0001' })).not.toThrow();
        expect(() => assertCanDeleteComment({ role: 'editor', userId: 'editor-0001' }, comment)).not.toThrow();
    });
});
