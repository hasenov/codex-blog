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
import {
    type createPrismaClient,
    InMemoryPostRepository,
    InMemoryTransactionManager,
    PrismaPostRepository,
    RandomIdGenerator,
    SystemClock,
} from '@codex-blog/infrastructure';
import type { PostRepository } from '@codex-blog/domain';

type PrismaClient = ReturnType<typeof createPrismaClient>;

export const createPostRepository = (config: AppConfig, prisma?: PrismaClient): PostRepository =>
    config.DATA_SOURCE === 'prisma' && prisma !== undefined
        ? new PrismaPostRepository(prisma)
        : new InMemoryPostRepository();

export const buildPublishingDependencies = (config: AppConfig, prisma?: PrismaClient, sharedPostRepository?: PostRepository) => {
    const postRepository =
        sharedPostRepository ?? createPostRepository(config, prisma);

    const commonDependencies = {
        postRepository,
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
