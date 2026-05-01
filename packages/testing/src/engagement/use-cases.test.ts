import { describe, expect, it } from 'vitest';

import {
    CreateCommentUseCase,
    DeleteCommentUseCase,
    ListPostCommentsUseCase,
    ModerateCommentUseCase,
    UpdateCommentUseCase,
} from '@codex-blog/application';

import { createEngagementTestContext, createPublishedPost } from './create-engagement-test-context.js';

describe('engagement use cases', () => {
    it('creates pending comments only for published posts', async () => {
        const context = createEngagementTestContext();
        await context.postRepository.save(createPublishedPost());
        const createComment = new CreateCommentUseCase(context.dependencies);

        const comment = await createComment.execute({
            actor: context.actor.reader,
            postSlug: 'published-post',
            body: 'Great article',
        });

        await expect(
            createComment.execute({
                actor: context.actor.reader,
                postSlug: 'missing-post',
                body: 'Nope',
            })
        ).rejects.toMatchObject({ code: 'POST_NOT_FOUND' });
        expect(comment.status).toBe('pending');
    });

    it('moderates comments and lists approved public comments only', async () => {
        const context = createEngagementTestContext();
        await context.postRepository.save(createPublishedPost());
        const createComment = new CreateCommentUseCase(context.dependencies);
        const moderateComment = new ModerateCommentUseCase(context.dependencies);
        const listComments = new ListPostCommentsUseCase(context.dependencies);
        const approved = await createComment.execute({
            actor: context.actor.reader,
            postSlug: 'published-post',
            body: 'Visible',
        });
        const rejected = await createComment.execute({
            actor: context.actor.otherReader,
            postSlug: 'published-post',
            body: 'Hidden',
        });

        await moderateComment.execute({
            actor: context.actor.editor,
            commentId: approved.id,
            status: 'approved',
        });
        await moderateComment.execute({
            actor: context.actor.editor,
            commentId: rejected.id,
            status: 'rejected',
        });

        const comments = await listComments.execute({ postSlug: 'published-post' });

        expect(comments.map((comment) => comment.body)).toEqual(['Visible']);
    });

    it('enforces ownership and moderation permissions', async () => {
        const context = createEngagementTestContext();
        await context.postRepository.save(createPublishedPost());
        const createComment = new CreateCommentUseCase(context.dependencies);
        const updateComment = new UpdateCommentUseCase(context.dependencies);
        const deleteComment = new DeleteCommentUseCase(context.dependencies);
        const moderateComment = new ModerateCommentUseCase(context.dependencies);
        const comment = await createComment.execute({
            actor: context.actor.reader,
            postSlug: 'published-post',
            body: 'Mine',
        });

        await expect(
            updateComment.execute({
                actor: context.actor.otherReader,
                commentId: comment.id,
                body: 'Taken',
            })
        ).rejects.toMatchObject({ code: 'COMMENT_OWNERSHIP_REQUIRED' });
        await expect(
            moderateComment.execute({
                actor: context.actor.reader,
                commentId: comment.id,
                status: 'approved',
            })
        ).rejects.toMatchObject({ code: 'INSUFFICIENT_ROLE' });
        await expect(
            deleteComment.execute({
                actor: context.actor.otherReader,
                commentId: comment.id,
            })
        ).rejects.toMatchObject({ code: 'COMMENT_OWNERSHIP_REQUIRED' });

        await updateComment.execute({
            actor: context.actor.reader,
            commentId: comment.id,
            body: 'Updated',
        });
        await deleteComment.execute({
            actor: context.actor.editor,
            commentId: comment.id,
        });

        const deleted = await context.commentRepository.findById(comment.id);
        expect(deleted?.status).toBe('deleted');
    });

    it('limits comment threads to two levels', async () => {
        const context = createEngagementTestContext();
        await context.postRepository.save(createPublishedPost());
        const createComment = new CreateCommentUseCase(context.dependencies);
        const root = await createComment.execute({
            actor: context.actor.reader,
            postSlug: 'published-post',
            body: 'Root',
        });
        const reply = await createComment.execute({
            actor: context.actor.otherReader,
            postSlug: 'published-post',
            parentId: root.id,
            body: 'Reply',
        });

        await expect(
            createComment.execute({
                actor: context.actor.reader,
                postSlug: 'published-post',
                parentId: reply.id,
                body: 'Too deep',
            })
        ).rejects.toMatchObject({ code: 'COMMENT_THREAD_DEPTH_EXCEEDED' });
    });
});
