import type { PrismaClient } from '@prisma/client';

import {
    EntityId,
    Post,
    PostRevision,
    PostTitle,
    RichContent,
    type RichContentProps,
    type ListPublishedPostsOptions,
    SeoMetadata,
    type SeoMetadataProps,
    Slug,
    UtcDateTime,
    type PostRepository,
    type PostStatus,
} from '@codex-blog/domain';

interface PostRecord {
    archivedAt: Date | null;
    authorId: string;
    contentJson: string;
    createdAt: Date;
    excerpt: string;
    id: string;
    publishedAt: Date | null;
    revisions: PostRevisionRecord[];
    scheduledFor: Date | null;
    seoJson: string;
    slug: string;
    status: string;
    title: string;
    updatedAt: Date;
}

interface PostRevisionRecord {
    contentJson: string;
    createdAt: Date;
    createdByUserId: string;
    excerpt: string;
    id: string;
    number: number;
    seoJson: string;
    title: string;
}

const parseJsonObject = (value: string): unknown => JSON.parse(value) as unknown;

const parseRichContent = (value: string): RichContent =>
    RichContent.create(parseJsonObject(value) as RichContentProps);

const parseSeoMetadata = (value: string): SeoMetadata =>
    SeoMetadata.create(parseJsonObject(value) as SeoMetadataProps);

const toRevision = (record: PostRevisionRecord): PostRevision =>
    PostRevision.rehydrate({
        id: EntityId.create(record.id),
        number: record.number,
        title: PostTitle.create(record.title),
        excerpt: record.excerpt,
        content: parseRichContent(record.contentJson),
        seo: parseSeoMetadata(record.seoJson),
        createdAt: UtcDateTime.create(record.createdAt),
        createdByUserId: EntityId.create(record.createdByUserId),
    });

const toPost = (record: PostRecord): Post => {
    const publishedAt = record.publishedAt === null ? undefined : UtcDateTime.create(record.publishedAt);
    const scheduledFor = record.scheduledFor === null ? undefined : UtcDateTime.create(record.scheduledFor);
    const archivedAt = record.archivedAt === null ? undefined : UtcDateTime.create(record.archivedAt);

    return Post.rehydrate({
        id: EntityId.create(record.id),
        authorId: EntityId.create(record.authorId),
        title: PostTitle.create(record.title),
        slug: Slug.create(record.slug),
        excerpt: record.excerpt,
        content: parseRichContent(record.contentJson),
        seo: parseSeoMetadata(record.seoJson),
        status: record.status as PostStatus,
        revisions: record.revisions
            .slice()
            .sort((left, right) => left.number - right.number)
            .map((revision) => toRevision(revision)),
        createdAt: UtcDateTime.create(record.createdAt),
        updatedAt: UtcDateTime.create(record.updatedAt),
        ...(publishedAt === undefined ? {} : { publishedAt }),
        ...(scheduledFor === undefined ? {} : { scheduledFor }),
        ...(archivedAt === undefined ? {} : { archivedAt }),
    });
};

export class PrismaPostRepository implements PostRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public async existsBySlug(slug: Slug): Promise<boolean> {
        const count = await this.prisma.post.count({
            where: {
                slug: slug.toString(),
            },
        });

        return count > 0;
    }

    public async findById(id: string): Promise<Post | null> {
        const record = await this.prisma.post.findUnique({
            where: {
                id,
            },
            include: {
                revisions: true,
            },
        });

        return record === null ? null : toPost(record);
    }

    public async findBySlug(slug: Slug): Promise<Post | null> {
        const record = await this.prisma.post.findUnique({
            where: {
                slug: slug.toString(),
            },
            include: {
                revisions: true,
            },
        });

        return record === null ? null : toPost(record);
    }

    public async listPublished(options: ListPublishedPostsOptions): Promise<Post[]> {
        const records = await this.prisma.post.findMany({
            where: {
                status: 'published',
            },
            include: {
                revisions: true,
            },
            orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
        });
        const cursorIndex =
            options.cursor === undefined ? -1 : records.findIndex((record) => record.id === options.cursor);
        const startIndex = cursorIndex < 0 ? 0 : cursorIndex + 1;

        return records.slice(startIndex, startIndex + options.limit).map((record) => toPost(record));
    }

    public async save(post: Post): Promise<void> {
        const props = post.toPrimitives();

        await this.prisma.$transaction(async (transaction) => {
            await transaction.post.upsert({
                where: {
                    id: props.id.toString(),
                },
                create: {
                    id: props.id.toString(),
                    authorId: props.authorId.toString(),
                    title: props.title.toString(),
                    slug: props.slug.toString(),
                    excerpt: props.excerpt,
                    contentJson: JSON.stringify(props.content.toPrimitives()),
                    seoJson: JSON.stringify(props.seo.toPrimitives()),
                    status: props.status,
                    publishedAt: props.publishedAt?.toDate() ?? null,
                    scheduledFor: props.scheduledFor?.toDate() ?? null,
                    archivedAt: props.archivedAt?.toDate() ?? null,
                    createdAt: props.createdAt.toDate(),
                    updatedAt: props.updatedAt.toDate(),
                },
                update: {
                    authorId: props.authorId.toString(),
                    title: props.title.toString(),
                    slug: props.slug.toString(),
                    excerpt: props.excerpt,
                    contentJson: JSON.stringify(props.content.toPrimitives()),
                    seoJson: JSON.stringify(props.seo.toPrimitives()),
                    status: props.status,
                    publishedAt: props.publishedAt?.toDate() ?? null,
                    scheduledFor: props.scheduledFor?.toDate() ?? null,
                    archivedAt: props.archivedAt?.toDate() ?? null,
                    updatedAt: props.updatedAt.toDate(),
                },
            });
            await transaction.postRevision.deleteMany({
                where: {
                    postId: props.id.toString(),
                },
            });

            for (const revision of props.revisions) {
                await transaction.postRevision.create({
                    data: {
                        id: revision.id.toString(),
                        postId: props.id.toString(),
                        number: revision.number,
                        title: revision.title.toString(),
                        excerpt: revision.excerpt,
                        contentJson: JSON.stringify(revision.content.toPrimitives()),
                        seoJson: JSON.stringify(revision.seo.toPrimitives()),
                        createdAt: revision.createdAt.toDate(),
                        createdByUserId: revision.createdByUserId.toString(),
                    },
                });
            }
        });
    }
}
