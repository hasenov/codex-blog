import type { Comment } from '@codex-blog/domain';

import type { CommentDto } from './dto.js';

export const toCommentDto = (comment: Comment): CommentDto => {
    const props = comment.toPrimitives();

    return {
        id: props.id.toString(),
        postId: props.postId.toString(),
        authorId: props.authorId.toString(),
        body: props.body.toString(),
        status: props.status,
        createdAt: props.createdAt.toISOString(),
        updatedAt: props.updatedAt.toISOString(),
        ...(props.parentId === undefined ? {} : { parentId: props.parentId.toString() }),
        ...(props.approvedAt === undefined ? {} : { approvedAt: props.approvedAt.toISOString() }),
        ...(props.rejectedAt === undefined ? {} : { rejectedAt: props.rejectedAt.toISOString() }),
        ...(props.deletedAt === undefined ? {} : { deletedAt: props.deletedAt.toISOString() }),
        ...(props.moderatedAt === undefined ? {} : { moderatedAt: props.moderatedAt.toISOString() }),
        ...(props.moderatedByUserId === undefined ? {} : { moderatedByUserId: props.moderatedByUserId.toString() }),
    };
};
