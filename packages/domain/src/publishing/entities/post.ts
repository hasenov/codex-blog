import { DomainError } from '../../shared/errors/domain-error.js';
import { EntityId } from '../../shared/value-objects/entity-id.js';
import type { Slug } from '../../shared/value-objects/slug.js';
import type { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';
import type { PostStatus } from '../publishing.types.js';
import { PostRevision } from './post-revision.js';
import type { PostTitle } from '../value-objects/post-title.js';
import type { RichContent } from '../value-objects/rich-content.js';
import type { SeoMetadata } from '../value-objects/seo-metadata.js';

export interface CreatePostDraftProps {
    authorId: EntityId;
    categoryId?: EntityId;
    content: RichContent;
    createdAt: UtcDateTime;
    excerpt: string;
    id: EntityId;
    initialRevisionId: EntityId;
    seo: SeoMetadata;
    slug: Slug;
    tagIds?: EntityId[];
    title: PostTitle;
}

export interface PostProps {
    archivedAt?: UtcDateTime;
    authorId: EntityId;
    categoryId?: EntityId;
    content: RichContent;
    createdAt: UtcDateTime;
    excerpt: string;
    id: EntityId;
    publishedAt?: UtcDateTime;
    revisions: PostRevision[];
    scheduledFor?: UtcDateTime;
    seo: SeoMetadata;
    slug: Slug;
    status: PostStatus;
    tagIds: EntityId[];
    title: PostTitle;
    updatedAt: UtcDateTime;
}

export interface UpdatePostDraftProps {
    categoryId?: EntityId;
    content: RichContent;
    excerpt: string;
    revisionId: EntityId;
    seo: SeoMetadata;
    tagIds?: EntityId[];
    title: PostTitle;
    updatedAt: UtcDateTime;
    updatedByUserId: EntityId;
}

export interface RestorePostRevisionProps {
    restoredAt: UtcDateTime;
    restoredByUserId: EntityId;
    restoredRevisionId: EntityId;
    revisionId: EntityId;
}

const normalizeExcerpt = (value: string): string => {
    const normalizedValue = value.trim();

    if (normalizedValue.length > 500) {
        throw new DomainError('Post excerpt must be at most 500 characters long.', 'INVALID_POST_EXCERPT');
    }

    return normalizedValue;
};

export class Post {
    private constructor(private props: PostProps) {}

    public static createDraft(props: CreatePostDraftProps): Post {
        const revision = PostRevision.create({
            id: props.initialRevisionId,
            number: 1,
            title: props.title,
            excerpt: normalizeExcerpt(props.excerpt),
            content: props.content,
            seo: props.seo,
            createdAt: props.createdAt,
            createdByUserId: props.authorId,
        });

        return new Post({
            id: props.id,
            authorId: props.authorId,
            ...(props.categoryId === undefined ? {} : { categoryId: props.categoryId }),
            title: props.title,
            slug: props.slug,
            excerpt: normalizeExcerpt(props.excerpt),
            content: props.content,
            seo: props.seo,
            status: 'draft',
            tagIds: props.tagIds ?? [],
            revisions: [revision],
            createdAt: props.createdAt,
            updatedAt: props.createdAt,
        });
    }

    public static rehydrate(props: PostProps): Post {
        return new Post(props);
    }

    public get archivedAt(): UtcDateTime | undefined {
        return this.props.archivedAt;
    }

    public get authorId(): EntityId {
        return this.props.authorId;
    }

    public get categoryId(): EntityId | undefined {
        return this.props.categoryId;
    }

    public get content(): RichContent {
        return this.props.content;
    }

    public get createdAt(): UtcDateTime {
        return this.props.createdAt;
    }

    public get excerpt(): string {
        return this.props.excerpt;
    }

    public get id(): EntityId {
        return this.props.id;
    }

    public get publishedAt(): UtcDateTime | undefined {
        return this.props.publishedAt;
    }

    public get revisions(): PostRevision[] {
        return this.props.revisions.map((revision) => PostRevision.rehydrate(revision.toPrimitives()));
    }

    public get scheduledFor(): UtcDateTime | undefined {
        return this.props.scheduledFor;
    }

    public get seo(): SeoMetadata {
        return this.props.seo;
    }

    public get slug(): Slug {
        return this.props.slug;
    }

    public get status(): PostStatus {
        return this.props.status;
    }

    public get tagIds(): EntityId[] {
        return this.props.tagIds.map((tagId) => EntityId.create(tagId.toString()));
    }

    public get title(): PostTitle {
        return this.props.title;
    }

    public get updatedAt(): UtcDateTime {
        return this.props.updatedAt;
    }

    public updateDraft(props: UpdatePostDraftProps): void {
        this.ensureDraft('Only draft posts can be updated.');
        this.applyRevision({
            revisionId: props.revisionId,
            title: props.title,
            excerpt: normalizeExcerpt(props.excerpt),
            content: props.content,
            seo: props.seo,
            ...(props.categoryId === undefined ? {} : { categoryId: props.categoryId }),
            tagIds: props.tagIds ?? [],
            occurredAt: props.updatedAt,
            actorUserId: props.updatedByUserId,
        });
    }

    public publish(publishedAt: UtcDateTime): void {
        if (this.props.status === 'published') {
            return;
        }

        if (this.props.status !== 'draft' && this.props.status !== 'scheduled') {
            throw new DomainError('Only draft or scheduled posts can be published.', 'INVALID_POST_TRANSITION');
        }

        const { archivedAt: _archivedAt, scheduledFor: _scheduledFor, ...rest } = this.props;
        void _archivedAt;
        void _scheduledFor;

        this.props = {
            ...rest,
            status: 'published',
            publishedAt,
            updatedAt: publishedAt,
        };
    }

    public schedule(scheduledFor: UtcDateTime, scheduledAt: UtcDateTime): void {
        this.ensureDraft('Only draft posts can be scheduled.');

        if (!scheduledFor.isAfter(scheduledAt)) {
            throw new DomainError('Scheduled publish date must be in the future.', 'INVALID_SCHEDULED_DATE');
        }

        this.props = {
            ...this.props,
            status: 'scheduled',
            scheduledFor,
            updatedAt: scheduledAt,
        };
    }

    public archive(archivedAt: UtcDateTime): void {
        if (this.props.status !== 'published' && this.props.status !== 'scheduled') {
            throw new DomainError('Only published or scheduled posts can be archived.', 'INVALID_POST_TRANSITION');
        }

        const { scheduledFor: _scheduledFor, ...rest } = this.props;
        void _scheduledFor;

        this.props = {
            ...rest,
            status: 'archived',
            archivedAt,
            updatedAt: archivedAt,
        };
    }

    public restoreRevision(props: RestorePostRevisionProps): void {
        this.ensureDraft('Only draft posts can restore revisions.');
        const revision = this.props.revisions.find((candidate) => candidate.id.equals(props.restoredRevisionId));

        if (revision === undefined) {
            throw new DomainError('Post revision was not found.', 'POST_REVISION_NOT_FOUND');
        }

        this.applyRevision({
            revisionId: props.revisionId,
            title: revision.title,
            excerpt: revision.excerpt,
            content: revision.content,
            seo: revision.seo,
            ...(this.props.categoryId === undefined ? {} : { categoryId: this.props.categoryId }),
            tagIds: this.props.tagIds,
            occurredAt: props.restoredAt,
            actorUserId: props.restoredByUserId,
        });
    }

    public toPrimitives(): PostProps {
        return this.props;
    }

    private applyRevision(props: {
        actorUserId: EntityId;
        content: RichContent;
        excerpt: string;
        occurredAt: UtcDateTime;
        revisionId: EntityId;
        seo: SeoMetadata;
        categoryId?: EntityId;
        tagIds: EntityId[];
        title: PostTitle;
    }): void {
        const revision = PostRevision.create({
            id: props.revisionId,
            number: this.props.revisions.length + 1,
            title: props.title,
            excerpt: props.excerpt,
            content: props.content,
            seo: props.seo,
            createdAt: props.occurredAt,
            createdByUserId: props.actorUserId,
        });
        const { categoryId: _categoryId, ...rest } = this.props;
        void _categoryId;

        this.props = {
            ...rest,
            title: props.title,
            excerpt: props.excerpt,
            content: props.content,
            seo: props.seo,
            ...(props.categoryId === undefined ? {} : { categoryId: props.categoryId }),
            tagIds: props.tagIds,
            revisions: [...this.props.revisions, revision],
            updatedAt: props.occurredAt,
        };
    }

    private ensureDraft(message: string): void {
        if (this.props.status !== 'draft') {
            throw new DomainError(message, 'INVALID_POST_TRANSITION');
        }
    }
}
