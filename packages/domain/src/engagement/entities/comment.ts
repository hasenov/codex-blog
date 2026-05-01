import type { CommentStatus } from '../engagement.types.js';
import type { CommentBody } from '../value-objects/comment-body.js';
import { DomainError } from '../../shared/errors/domain-error.js';
import type { EntityId } from '../../shared/value-objects/entity-id.js';
import type { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';

export interface CreateCommentProps {
    authorId: EntityId;
    body: CommentBody;
    createdAt: UtcDateTime;
    id: EntityId;
    parentId?: EntityId;
    postId: EntityId;
}

export interface CommentProps {
    approvedAt?: UtcDateTime;
    authorId: EntityId;
    body: CommentBody;
    createdAt: UtcDateTime;
    deletedAt?: UtcDateTime;
    id: EntityId;
    moderatedAt?: UtcDateTime;
    moderatedByUserId?: EntityId;
    parentId?: EntityId;
    postId: EntityId;
    rejectedAt?: UtcDateTime;
    status: CommentStatus;
    updatedAt: UtcDateTime;
}

export class Comment {
    private constructor(private props: CommentProps) {}

    public static createPending(props: CreateCommentProps): Comment {
        return new Comment({
            id: props.id,
            postId: props.postId,
            authorId: props.authorId,
            body: props.body,
            status: 'pending',
            createdAt: props.createdAt,
            updatedAt: props.createdAt,
            ...(props.parentId === undefined ? {} : { parentId: props.parentId }),
        });
    }

    public static rehydrate(props: CommentProps): Comment {
        return new Comment(props);
    }

    public get authorId(): EntityId {
        return this.props.authorId;
    }

    public get body(): CommentBody {
        return this.props.body;
    }

    public get createdAt(): UtcDateTime {
        return this.props.createdAt;
    }

    public get id(): EntityId {
        return this.props.id;
    }

    public get parentId(): EntityId | undefined {
        return this.props.parentId;
    }

    public get postId(): EntityId {
        return this.props.postId;
    }

    public get status(): CommentStatus {
        return this.props.status;
    }

    public get updatedAt(): UtcDateTime {
        return this.props.updatedAt;
    }

    public approve(moderatedByUserId: EntityId, approvedAt: UtcDateTime): void {
        this.ensureNotDeleted();

        this.props = {
            ...this.props,
            status: 'approved',
            approvedAt,
            moderatedAt: approvedAt,
            moderatedByUserId,
            updatedAt: approvedAt,
        };
    }

    public reject(moderatedByUserId: EntityId, rejectedAt: UtcDateTime): void {
        this.ensureNotDeleted();

        this.props = {
            ...this.props,
            status: 'rejected',
            rejectedAt,
            moderatedAt: rejectedAt,
            moderatedByUserId,
            updatedAt: rejectedAt,
        };
    }

    public updateBody(body: CommentBody, updatedAt: UtcDateTime): void {
        this.ensureNotDeleted();

        this.props = {
            ...this.props,
            body,
            status: 'pending',
            updatedAt,
        };
    }

    public delete(deletedAt: UtcDateTime): void {
        if (this.props.status === 'deleted') {
            return;
        }

        this.props = {
            ...this.props,
            status: 'deleted',
            deletedAt,
            updatedAt: deletedAt,
        };
    }

    public toPrimitives(): CommentProps {
        return this.props;
    }

    private ensureNotDeleted(): void {
        if (this.props.status === 'deleted') {
            throw new DomainError('Deleted comments cannot be changed.', 'COMMENT_DELETED');
        }
    }
}
