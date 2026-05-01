import {
    CreateCommentUseCase,
    DeleteCommentUseCase,
    ListPostCommentsUseCase,
    ModerateCommentUseCase,
    UpdateCommentUseCase,
} from '@codex-blog/application';
import type { PostRepository } from '@codex-blog/domain';
import type { AppConfig } from '@codex-blog/config';
import {
    type createPrismaClient,
    InMemoryCommentRepository,
    InMemoryTransactionManager,
    PrismaCommentRepository,
    RandomIdGenerator,
    SystemClock,
} from '@codex-blog/infrastructure';

type PrismaClient = ReturnType<typeof createPrismaClient>;

export const buildEngagementDependencies = (config: AppConfig, postRepository: PostRepository, prisma?: PrismaClient) => {
    const commentRepository =
        config.DATA_SOURCE === 'prisma' && prisma !== undefined
            ? new PrismaCommentRepository(prisma)
            : new InMemoryCommentRepository();

    const commonDependencies = {
        commentRepository,
        postRepository,
        idGenerator: new RandomIdGenerator(),
        clock: new SystemClock(),
        transactionManager: new InMemoryTransactionManager(),
    };

    return {
        createComment: new CreateCommentUseCase(commonDependencies),
        listPostComments: new ListPostCommentsUseCase(commonDependencies),
        updateComment: new UpdateCommentUseCase(commonDependencies),
        deleteComment: new DeleteCommentUseCase(commonDependencies),
        moderateComment: new ModerateCommentUseCase(commonDependencies),
    };
};
