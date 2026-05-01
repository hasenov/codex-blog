import { describe, expect, it } from 'vitest';

import { EntityId } from '../../shared/value-objects/entity-id.js';
import { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';
import { CommentBody } from '../value-objects/comment-body.js';
import { Comment } from './comment.js';

const createComment = (): Comment =>
    Comment.createPending({
        id: EntityId.create('comment-0001'),
        postId: EntityId.create('post-0001'),
        authorId: EntityId.create('reader-0001'),
        body: CommentBody.create('Initial comment'),
        createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
    });

describe('Comment', () => {
    it('creates pending comments', () => {
        const comment = createComment();

        expect(comment.status).toBe('pending');
        expect(comment.body.toString()).toBe('Initial comment');
    });

    it('approves and rejects comments', () => {
        const approved = createComment();
        const rejected = createComment();

        approved.approve(EntityId.create('editor-0001'), UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));
        rejected.reject(EntityId.create('editor-0001'), UtcDateTime.fromISOString('2026-01-03T00:00:00.000Z'));

        expect(approved.status).toBe('approved');
        expect(approved.toPrimitives().moderatedByUserId?.toString()).toBe('editor-0001');
        expect(rejected.status).toBe('rejected');
    });

    it('returns updated comments to pending moderation', () => {
        const comment = createComment();
        comment.approve(EntityId.create('editor-0001'), UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));

        comment.updateBody(CommentBody.create('Updated comment'), UtcDateTime.fromISOString('2026-01-03T00:00:00.000Z'));

        expect(comment.status).toBe('pending');
        expect(comment.body.toString()).toBe('Updated comment');
    });

    it('soft deletes and rejects later changes', () => {
        const comment = createComment();

        comment.delete(UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));

        expect(comment.status).toBe('deleted');
        expect(() => comment.updateBody(CommentBody.create('Nope'), UtcDateTime.fromISOString('2026-01-03T00:00:00.000Z'))).toThrow(
            'Deleted comments cannot be changed.'
        );
    });
});
