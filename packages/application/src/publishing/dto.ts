import type {
    PostStatus,
    PublishingActor,
    RichContentProps,
    SeoMetadataProps,
} from '@codex-blog/domain';

export type PublishingActorDto = PublishingActor;
export type RichContentDto = RichContentProps;
export type SeoMetadataDto = SeoMetadataProps;

export interface PostRevisionDto {
    content: RichContentDto;
    createdAt: string;
    createdByUserId: string;
    excerpt: string;
    id: string;
    number: number;
    seo: SeoMetadataDto;
    title: string;
}

export interface PostDto {
    archivedAt?: string;
    authorId: string;
    content: RichContentDto;
    createdAt: string;
    excerpt: string;
    id: string;
    publishedAt?: string;
    revisions: PostRevisionDto[];
    scheduledFor?: string;
    seo: SeoMetadataDto;
    slug: string;
    status: PostStatus;
    title: string;
    updatedAt: string;
}

export interface PaginatedPostsDto {
    items: PostDto[];
    nextCursor?: string;
}
