import type { EntityId } from '../../shared/value-objects/entity-id.js';
import type { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';
import type { PostTitle } from '../value-objects/post-title.js';
import type { RichContent } from '../value-objects/rich-content.js';
import type { SeoMetadata } from '../value-objects/seo-metadata.js';

export interface PostRevisionProps {
    content: RichContent;
    createdAt: UtcDateTime;
    createdByUserId: EntityId;
    excerpt: string;
    id: EntityId;
    number: number;
    seo: SeoMetadata;
    title: PostTitle;
}

export class PostRevision {
    private constructor(private readonly props: PostRevisionProps) {}

    public static create(props: PostRevisionProps): PostRevision {
        return new PostRevision(props);
    }

    public static rehydrate(props: PostRevisionProps): PostRevision {
        return new PostRevision(props);
    }

    public get content(): RichContent {
        return this.props.content;
    }

    public get createdAt(): UtcDateTime {
        return this.props.createdAt;
    }

    public get createdByUserId(): EntityId {
        return this.props.createdByUserId;
    }

    public get excerpt(): string {
        return this.props.excerpt;
    }

    public get id(): EntityId {
        return this.props.id;
    }

    public get number(): number {
        return this.props.number;
    }

    public get seo(): SeoMetadata {
        return this.props.seo;
    }

    public get title(): PostTitle {
        return this.props.title;
    }

    public toPrimitives(): PostRevisionProps {
        return this.props;
    }
}
