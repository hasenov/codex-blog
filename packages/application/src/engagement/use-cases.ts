import {
    assertCanCreateComment,
    assertCanDeleteComment,
    assertCanModerateComment,
    assertCanUpdateComment,
    Comment,
    CommentBody,
    DomainError,
    EntityId,
    Slug,
    UtcDateTime,
    type CommentRepository,
    type PostRepository,
} from '@codex-blog/domain';

import type { Clock, IdGenerator, TransactionManager } from '../shared/ports/core.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../shared/errors/application-error.js';
import type { CommentDto, EngagementActorDto } from './dto.js';
import { toCommentDto } from './mappers.js';

interface EngagementUseCaseDependencies {
    clock: Clock;
    commentRepository: CommentRepository;
    idGenerator: IdGenerator;
    postRepository: PostRepository;
    transactionManager: TransactionManager;
}

interface CreateCommentInput {
    actor: EngagementActorDto;
    body: string;
    parentId?: string;
    postSlug: string;
}

interface ListPostCommentsInput {
    postSlug: string;
}

interface UpdateCommentInput {
    actor: EngagementActorDto;
    body: string;
    commentId: string;
}

interface DeleteCommentInput {
    actor: EngagementActorDto;
    commentId: string;
}

interface ModerateCommentInput {
    actor: EngagementActorDto;
    commentId: string;
    status: 'approved' | 'rejected';
}

const findCommentOrThrow = async (repository: CommentRepository, commentId: string): Promise<Comment> => {
    const comment = await repository.findById(commentId);

    if (comment === null) {
        throw new NotFoundError('Comment was not found.', 'COMMENT_NOT_FOUND');
    }

    return comment;
};

const findPublishedPostBySlugOrThrow = async (repository: PostRepository, postSlug: string) => {
    const post = await repository.findBySlug(Slug.create(postSlug));

    if (post === null || post.status !== 'published') {
        throw new NotFoundError('Post was not found.', 'POST_NOT_FOUND');
    }

    return post;
};

export class CreateCommentUseCase {
    public constructor(private readonly dependencies: EngagementUseCaseDependencies) {}

    public async execute(input: CreateCommentInput): Promise<CommentDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                assertCanCreateComment(input.actor);
                const post = await findPublishedPostBySlugOrThrow(this.dependencies.postRepository, input.postSlug);
                const parentComment = input.parentId === undefined
                    ? null
                    : await findCommentOrThrow(this.dependencies.commentRepository, input.parentId);

                if (parentComment !== null) {
                    if (parentComment.postId.toString() !== post.id.toString()) {
                        throw new BadRequestError('Parent comment belongs to another post.', 'INVALID_PARENT_COMMENT');
                    }

                    if (parentComment.status === 'deleted') {
                        throw new BadRequestError('Deleted comments cannot receive replies.', 'INVALID_PARENT_COMMENT');
                    }

                    if (parentComment.parentId !== undefined) {
                        throw new BadRequestError('Comment thread depth cannot exceed 2 levels.', 'COMMENT_THREAD_DEPTH_EXCEEDED');
                    }
                }

                const now = UtcDateTime.create(this.dependencies.clock.now());
                const comment = Comment.createPending({
                    id: EntityId.create(this.dependencies.idGenerator.generate()),
                    postId: post.id,
                    authorId: EntityId.create(input.actor.userId),
                    body: CommentBody.create(input.body),
                    createdAt: now,
                    ...(input.parentId === undefined ? {} : { parentId: EntityId.create(input.parentId) }),
                });

                await this.dependencies.commentRepository.save(comment);
                return toCommentDto(comment);
            } catch (error) {
                throw mapEngagementError(error);
            }
        });
    }
}

export class ListPostCommentsUseCase {
    public constructor(private readonly dependencies: EngagementUseCaseDependencies) {}

    public async execute(input: ListPostCommentsInput): Promise<CommentDto[]> {
        try {
            const post = await findPublishedPostBySlugOrThrow(this.dependencies.postRepository, input.postSlug);
            const comments = await this.dependencies.commentRepository.listApprovedByPostId({
                postId: post.id.toString(),
            });

            return comments.map((comment) => toCommentDto(comment));
        } catch (error) {
            throw mapEngagementError(error);
        }
    }
}

export class UpdateCommentUseCase {
    public constructor(private readonly dependencies: EngagementUseCaseDependencies) {}

    public async execute(input: UpdateCommentInput): Promise<CommentDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                const comment = await findCommentOrThrow(this.dependencies.commentRepository, input.commentId);
                assertCanUpdateComment(input.actor, comment);
                comment.updateBody(CommentBody.create(input.body), UtcDateTime.create(this.dependencies.clock.now()));
                await this.dependencies.commentRepository.save(comment);
                return toCommentDto(comment);
            } catch (error) {
                throw mapEngagementError(error);
            }
        });
    }
}

export class DeleteCommentUseCase {
    public constructor(private readonly dependencies: EngagementUseCaseDependencies) {}

    public async execute(input: DeleteCommentInput): Promise<void> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                const comment = await findCommentOrThrow(this.dependencies.commentRepository, input.commentId);
                assertCanDeleteComment(input.actor, comment);
                comment.delete(UtcDateTime.create(this.dependencies.clock.now()));
                await this.dependencies.commentRepository.save(comment);
            } catch (error) {
                throw mapEngagementError(error);
            }
        });
    }
}

export class ModerateCommentUseCase {
    public constructor(private readonly dependencies: EngagementUseCaseDependencies) {}

    public async execute(input: ModerateCommentInput): Promise<CommentDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                const comment = await findCommentOrThrow(this.dependencies.commentRepository, input.commentId);
                assertCanModerateComment(input.actor);
                const now = UtcDateTime.create(this.dependencies.clock.now());
                const moderatorId = EntityId.create(input.actor.userId);

                if (input.status === 'approved') {
                    comment.approve(moderatorId, now);
                } else {
                    comment.reject(moderatorId, now);
                }

                await this.dependencies.commentRepository.save(comment);
                return toCommentDto(comment);
            } catch (error) {
                throw mapEngagementError(error);
            }
        });
    }
}

const mapEngagementError = (error: unknown): Error => {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
        return error;
    }

    if (error instanceof DomainError) {
        if (error.code === 'INSUFFICIENT_ROLE' || error.code === 'COMMENT_OWNERSHIP_REQUIRED') {
            return new ForbiddenError(error.message, error.code);
        }

        return new BadRequestError(error.message, error.code);
    }

    return error instanceof Error ? error : new Error('Unknown engagement error');
};
