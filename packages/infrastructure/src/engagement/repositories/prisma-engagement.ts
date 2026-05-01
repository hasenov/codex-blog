import type { PrismaClient } from '@prisma/client';

import {
    Comment,
    CommentBody,
    EntityId,
    UtcDateTime,
    type CommentRepository,
    type CommentStatus,
    type ListApprovedCommentsOptions,
} from '@codex-blog/domain';

interface CommentRecord {
    approvedAt: Date | null;
    authorId: string;
    body: string;
    createdAt: Date;
    deletedAt: Date | null;
    id: string;
    moderatedAt: Date | null;
    moderatedByUserId: string | null;
    parentId: string | null;
    postId: string;
    rejectedAt: Date | null;
    status: string;
    updatedAt: Date;
}

const toOptionalDateTime = (value: Date | null): UtcDateTime | undefined =>
    value === null ? undefined : UtcDateTime.create(value);

const toComment = (record: CommentRecord): Comment => {
    const parentId = record.parentId === null ? undefined : EntityId.create(record.parentId);
    const approvedAt = toOptionalDateTime(record.approvedAt);
    const rejectedAt = toOptionalDateTime(record.rejectedAt);
    const deletedAt = toOptionalDateTime(record.deletedAt);
    const moderatedAt = toOptionalDateTime(record.moderatedAt);
    const moderatedByUserId = record.moderatedByUserId === null ? undefined : EntityId.create(record.moderatedByUserId);

    return Comment.rehydrate({
        id: EntityId.create(record.id),
        postId: EntityId.create(record.postId),
        authorId: EntityId.create(record.authorId),
        body: CommentBody.create(record.body),
        status: record.status as CommentStatus,
        createdAt: UtcDateTime.create(record.createdAt),
        updatedAt: UtcDateTime.create(record.updatedAt),
        ...(parentId === undefined ? {} : { parentId }),
        ...(approvedAt === undefined ? {} : { approvedAt }),
        ...(rejectedAt === undefined ? {} : { rejectedAt }),
        ...(deletedAt === undefined ? {} : { deletedAt }),
        ...(moderatedAt === undefined ? {} : { moderatedAt }),
        ...(moderatedByUserId === undefined ? {} : { moderatedByUserId }),
    });
};

export class PrismaCommentRepository implements CommentRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public async findById(id: string): Promise<Comment | null> {
        const record = await this.prisma.comment.findUnique({
            where: {
                id,
            },
        });

        return record === null ? null : toComment(record);
    }

    public async listApprovedByPostId(options: ListApprovedCommentsOptions): Promise<Comment[]> {
        const records = await this.prisma.comment.findMany({
            where: {
                postId: options.postId,
                status: 'approved',
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });

        return records.map((record) => toComment(record));
    }

    public async save(comment: Comment): Promise<void> {
        const props = comment.toPrimitives();

        await this.prisma.comment.upsert({
            where: {
                id: props.id.toString(),
            },
            create: {
                id: props.id.toString(),
                postId: props.postId.toString(),
                authorId: props.authorId.toString(),
                parentId: props.parentId?.toString() ?? null,
                body: props.body.toString(),
                status: props.status,
                approvedAt: props.approvedAt?.toDate() ?? null,
                rejectedAt: props.rejectedAt?.toDate() ?? null,
                deletedAt: props.deletedAt?.toDate() ?? null,
                moderatedAt: props.moderatedAt?.toDate() ?? null,
                moderatedByUserId: props.moderatedByUserId?.toString() ?? null,
                createdAt: props.createdAt.toDate(),
                updatedAt: props.updatedAt.toDate(),
            },
            update: {
                postId: props.postId.toString(),
                authorId: props.authorId.toString(),
                parentId: props.parentId?.toString() ?? null,
                body: props.body.toString(),
                status: props.status,
                approvedAt: props.approvedAt?.toDate() ?? null,
                rejectedAt: props.rejectedAt?.toDate() ?? null,
                deletedAt: props.deletedAt?.toDate() ?? null,
                moderatedAt: props.moderatedAt?.toDate() ?? null,
                moderatedByUserId: props.moderatedByUserId?.toString() ?? null,
                updatedAt: props.updatedAt.toDate(),
            },
        });
    }
}
