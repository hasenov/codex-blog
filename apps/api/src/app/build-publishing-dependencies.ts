import {
    ArchivePostUseCase,
    CreateDraftPostUseCase,
    GetPostRevisionsUseCase,
    GetPublishedPostBySlugUseCase,
    ListPublishedPostsUseCase,
    PublishPostUseCase,
    RestorePostRevisionUseCase,
    SchedulePostUseCase,
    UpdateDraftPostUseCase,
} from '@codex-blog/application';
import type { AppConfig } from '@codex-blog/config';
import type { CategoryRepository, MediaAssetRepository, PostRepository, TagRepository } from '@codex-blog/domain';
import {
    type createPrismaClient,
    InMemoryPostRepository,
    InMemoryTransactionManager,
    PrismaPostRepository,
    RandomIdGenerator,
    SystemClock,
} from '@codex-blog/infrastructure';

type PrismaClient = ReturnType<typeof createPrismaClient>;

export const createPostRepository = (config: AppConfig, prisma?: PrismaClient): PostRepository =>
    config.DATA_SOURCE === 'prisma' && prisma !== undefined
        ? new PrismaPostRepository(prisma)
        : new InMemoryPostRepository();

export const buildPublishingDependencies = (
    config: AppConfig,
    prisma?: PrismaClient,
    sharedPostRepository?: PostRepository,
    taxonomyRepositories?: { categoryRepository: CategoryRepository; tagRepository: TagRepository },
    mediaRepositories?: { mediaAssetRepository: MediaAssetRepository }
) => {
    const postRepository =
        sharedPostRepository ?? createPostRepository(config, prisma);

    const commonDependencies = {
        postRepository,
        ...(taxonomyRepositories === undefined ? {} : taxonomyRepositories),
        ...(mediaRepositories === undefined ? {} : mediaRepositories),
        idGenerator: new RandomIdGenerator(),
        clock: new SystemClock(),
        transactionManager: new InMemoryTransactionManager(),
    };

    return {
        createDraftPost: new CreateDraftPostUseCase(commonDependencies),
        updateDraftPost: new UpdateDraftPostUseCase(commonDependencies),
        publishPost: new PublishPostUseCase(commonDependencies),
        schedulePost: new SchedulePostUseCase(commonDependencies),
        archivePost: new ArchivePostUseCase(commonDependencies),
        restorePostRevision: new RestorePostRevisionUseCase(commonDependencies),
        listPublishedPosts: new ListPublishedPostsUseCase(commonDependencies),
        getPublishedPostBySlug: new GetPublishedPostBySlugUseCase(commonDependencies),
        getPostRevisions: new GetPostRevisionsUseCase(commonDependencies),
    };
};
