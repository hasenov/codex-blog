import {
    assertAuthorMatchesActor,
    assertCanCreatePost,
    assertCanManagePostLifecycle,
    assertCanRestoreRevision,
    assertCanUpdateDraftPost,
    DomainError,
    EntityId,
    Post,
    PostTitle,
    RichContent,
    SeoMetadata,
    Slug,
    UtcDateTime,
    type PostRepository,
    type CategoryRepository,
    type TagRepository,
} from '@codex-blog/domain';

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../shared/errors/application-error.js';
import type { Clock, IdGenerator, TransactionManager } from '../shared/ports/core.js';
import type { PaginatedPostsDto, PostDto, PostRevisionDto, PublishingActorDto, RichContentDto, SeoMetadataDto } from './dto.js';
import { toPostDto, toPostRevisionDto } from './mappers.js';

interface PublishingUseCaseDependencies {
    clock: Clock;
    idGenerator: IdGenerator;
    postRepository: PostRepository;
    categoryRepository?: CategoryRepository;
    tagRepository?: TagRepository;
    transactionManager: TransactionManager;
}

interface CreateDraftPostInput {
    actor: PublishingActorDto;
    authorId?: string | undefined;
    categoryId?: string | undefined;
    content: RichContentDto;
    excerpt: string;
    seo: SeoMetadataDto;
    slug: string;
    tagIds?: string[] | undefined;
    title: string;
}

interface UpdateDraftPostInput {
    actor: PublishingActorDto;
    categoryId?: string | undefined;
    content: RichContentDto;
    excerpt: string;
    postId: string;
    seo: SeoMetadataDto;
    tagIds?: string[] | undefined;
    title: string;
}

interface PublishPostInput {
    actor: PublishingActorDto;
    postId: string;
}

interface SchedulePostInput {
    actor: PublishingActorDto;
    postId: string;
    scheduledFor: string;
}

interface ArchivePostInput {
    actor: PublishingActorDto;
    postId: string;
}

interface RestorePostRevisionInput {
    actor: PublishingActorDto;
    postId: string;
    revisionId: string;
}

interface GetPublishedPostBySlugInput {
    slug: string;
}

interface GetPostRevisionsInput {
    actor: PublishingActorDto;
    postId: string;
}

interface ListPublishedPostsInput {
    cursor?: string;
    limit: number;
}

const buildEditableContent = (input: {
    content: RichContentDto;
    seo: SeoMetadataDto;
    title: string;
}): { content: RichContent; seo: SeoMetadata; title: PostTitle } => ({
    title: PostTitle.create(input.title),
    content: RichContent.create(input.content),
    seo: SeoMetadata.create(input.seo),
});

const uniqueIds = (ids: string[]): string[] => Array.from(new Set(ids));

const resolveCategoryId = async (
    repository: CategoryRepository | undefined,
    categoryId: string | undefined
): Promise<EntityId | undefined> => {
    if (categoryId === undefined) {
        return undefined;
    }

    if (repository === undefined) {
        return EntityId.create(categoryId);
    }

    const category = await repository.findById(categoryId);

    if (category === null || category.status !== 'active') {
        throw new BadRequestError('Category is not active or was not found.', 'CATEGORY_NOT_ACTIVE');
    }

    return category.id;
};

const resolveTagIds = async (repository: TagRepository | undefined, tagIds: string[] | undefined): Promise<EntityId[]> => {
    const ids = uniqueIds(tagIds ?? []);

    if (repository === undefined) {
        return ids.map((tagId) => EntityId.create(tagId));
    }

    const tags = await Promise.all(ids.map((tagId) => repository.findById(tagId)));

    if (tags.some((tag) => tag === null || tag.status !== 'active')) {
        throw new BadRequestError('All tags must be active and existing.', 'TAG_NOT_ACTIVE');
    }

    return tags.map((tag) => {
        if (tag === null) {
            throw new BadRequestError('All tags must be active and existing.', 'TAG_NOT_ACTIVE');
        }

        return tag.id;
    });
};

const findPostOrThrow = async (repository: PostRepository, postId: string): Promise<Post> => {
    const post = await repository.findById(postId);

    if (post === null) {
        throw new NotFoundError('Post was not found.', 'POST_NOT_FOUND');
    }

    return post;
};

export class CreateDraftPostUseCase {
    public constructor(private readonly dependencies: PublishingUseCaseDependencies) {}

    public async execute(input: CreateDraftPostInput): Promise<PostDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                assertCanCreatePost(input.actor);
                const slug = Slug.create(input.slug);
                const authorId = EntityId.create(input.authorId ?? input.actor.userId);
                assertAuthorMatchesActor(input.actor, authorId);

                if (await this.dependencies.postRepository.existsBySlug(slug)) {
                    throw new ConflictError('Post slug already exists.', 'POST_SLUG_ALREADY_EXISTS');
                }

                const now = UtcDateTime.create(this.dependencies.clock.now());
                const editable = buildEditableContent(input);
                const categoryId = await resolveCategoryId(this.dependencies.categoryRepository, input.categoryId);
                const tagIds = await resolveTagIds(this.dependencies.tagRepository, input.tagIds);
                const post = Post.createDraft({
                    id: EntityId.create(this.dependencies.idGenerator.generate()),
                    authorId,
                    ...(categoryId === undefined ? {} : { categoryId }),
                    slug,
                    title: editable.title,
                    excerpt: input.excerpt,
                    content: editable.content,
                    seo: editable.seo,
                    tagIds,
                    createdAt: now,
                    initialRevisionId: EntityId.create(this.dependencies.idGenerator.generate()),
                });

                await this.dependencies.postRepository.save(post);
                return toPostDto(post);
            } catch (error) {
                throw mapPublishingError(error);
            }
        });
    }
}

export class UpdateDraftPostUseCase {
    public constructor(private readonly dependencies: PublishingUseCaseDependencies) {}

    public async execute(input: UpdateDraftPostInput): Promise<PostDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                const post = await findPostOrThrow(this.dependencies.postRepository, input.postId);
                assertCanUpdateDraftPost(input.actor, post);
                const now = UtcDateTime.create(this.dependencies.clock.now());
                const editable = buildEditableContent(input);
                const categoryId = await resolveCategoryId(this.dependencies.categoryRepository, input.categoryId);
                const tagIds = await resolveTagIds(this.dependencies.tagRepository, input.tagIds);

                post.updateDraft({
                    title: editable.title,
                    ...(categoryId === undefined ? {} : { categoryId }),
                    excerpt: input.excerpt,
                    content: editable.content,
                    seo: editable.seo,
                    tagIds,
                    revisionId: EntityId.create(this.dependencies.idGenerator.generate()),
                    updatedAt: now,
                    updatedByUserId: EntityId.create(input.actor.userId),
                });

                await this.dependencies.postRepository.save(post);
                return toPostDto(post);
            } catch (error) {
                throw mapPublishingError(error);
            }
        });
    }
}

export class PublishPostUseCase {
    public constructor(private readonly dependencies: PublishingUseCaseDependencies) {}

    public async execute(input: PublishPostInput): Promise<PostDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                const post = await findPostOrThrow(this.dependencies.postRepository, input.postId);
                assertCanManagePostLifecycle(input.actor);
                post.publish(UtcDateTime.create(this.dependencies.clock.now()));
                await this.dependencies.postRepository.save(post);
                return toPostDto(post);
            } catch (error) {
                throw mapPublishingError(error);
            }
        });
    }
}

export class SchedulePostUseCase {
    public constructor(private readonly dependencies: PublishingUseCaseDependencies) {}

    public async execute(input: SchedulePostInput): Promise<PostDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                const post = await findPostOrThrow(this.dependencies.postRepository, input.postId);
                assertCanManagePostLifecycle(input.actor);
                post.schedule(UtcDateTime.fromISOString(input.scheduledFor), UtcDateTime.create(this.dependencies.clock.now()));
                await this.dependencies.postRepository.save(post);
                return toPostDto(post);
            } catch (error) {
                throw mapPublishingError(error);
            }
        });
    }
}

export class ArchivePostUseCase {
    public constructor(private readonly dependencies: PublishingUseCaseDependencies) {}

    public async execute(input: ArchivePostInput): Promise<PostDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                const post = await findPostOrThrow(this.dependencies.postRepository, input.postId);
                assertCanManagePostLifecycle(input.actor);
                post.archive(UtcDateTime.create(this.dependencies.clock.now()));
                await this.dependencies.postRepository.save(post);
                return toPostDto(post);
            } catch (error) {
                throw mapPublishingError(error);
            }
        });
    }
}

export class RestorePostRevisionUseCase {
    public constructor(private readonly dependencies: PublishingUseCaseDependencies) {}

    public async execute(input: RestorePostRevisionInput): Promise<PostDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                const post = await findPostOrThrow(this.dependencies.postRepository, input.postId);
                assertCanRestoreRevision(input.actor, post);
                post.restoreRevision({
                    restoredRevisionId: EntityId.create(input.revisionId),
                    revisionId: EntityId.create(this.dependencies.idGenerator.generate()),
                    restoredAt: UtcDateTime.create(this.dependencies.clock.now()),
                    restoredByUserId: EntityId.create(input.actor.userId),
                });
                await this.dependencies.postRepository.save(post);
                return toPostDto(post);
            } catch (error) {
                throw mapPublishingError(error);
            }
        });
    }
}

export class ListPublishedPostsUseCase {
    public constructor(private readonly dependencies: PublishingUseCaseDependencies) {}

    public async execute(input: ListPublishedPostsInput): Promise<PaginatedPostsDto> {
        const posts = await this.dependencies.postRepository.listPublished({
            limit: input.limit + 1,
            ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
        });
        const items = posts.slice(0, input.limit).map((post) => toPostDto(post));
        const nextCursor = posts.length > input.limit ? items.at(-1)?.id : undefined;

        return {
            items,
            ...(nextCursor === undefined ? {} : { nextCursor }),
        };
    }
}

export class GetPublishedPostBySlugUseCase {
    public constructor(private readonly dependencies: PublishingUseCaseDependencies) {}

    public async execute(input: GetPublishedPostBySlugInput): Promise<PostDto> {
        try {
            const post = await this.dependencies.postRepository.findBySlug(Slug.create(input.slug));

            if (post === null || post.status !== 'published') {
                throw new NotFoundError('Post was not found.', 'POST_NOT_FOUND');
            }

            return toPostDto(post);
        } catch (error) {
            throw mapPublishingError(error);
        }
    }
}

export class GetPostRevisionsUseCase {
    public constructor(private readonly dependencies: PublishingUseCaseDependencies) {}

    public async execute(input: GetPostRevisionsInput): Promise<PostRevisionDto[]> {
        try {
            const post = await findPostOrThrow(this.dependencies.postRepository, input.postId);
            assertCanUpdateDraftPost(input.actor, post);
            return post.revisions.map((revision) => toPostRevisionDto(revision));
        } catch (error) {
            throw mapPublishingError(error);
        }
    }
}

const mapPublishingError = (error: unknown): Error => {
    if (error instanceof ConflictError || error instanceof NotFoundError) {
        return error;
    }

    if (error instanceof DomainError) {
        if (error.code === 'INSUFFICIENT_ROLE' || error.code === 'POST_OWNERSHIP_REQUIRED') {
            return new ForbiddenError(error.message, error.code);
        }

        return new BadRequestError(error.message, error.code);
    }

    return error instanceof Error ? error : new Error('Unknown publishing error');
};
