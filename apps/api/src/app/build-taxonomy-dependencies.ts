import {
    CreateCategoryUseCase,
    CreateTagUseCase,
    DeleteCategoryUseCase,
    DeleteTagUseCase,
    GetCategoryBySlugUseCase,
    GetTagBySlugUseCase,
    ListCategoriesUseCase,
    ListTagsUseCase,
    UpdateCategoryUseCase,
    UpdateTagUseCase,
} from '@codex-blog/application';
import type { AppConfig } from '@codex-blog/config';
import type { CategoryRepository, TagRepository } from '@codex-blog/domain';
import {
    type createPrismaClient,
    InMemoryCategoryRepository,
    InMemoryTagRepository,
    InMemoryTransactionManager,
    PrismaCategoryRepository,
    PrismaTagRepository,
    RandomIdGenerator,
    SystemClock,
} from '@codex-blog/infrastructure';

type PrismaClient = ReturnType<typeof createPrismaClient>;

export const createTaxonomyRepositories = (
    config: AppConfig,
    prisma?: PrismaClient
): { categoryRepository: CategoryRepository; tagRepository: TagRepository } => {
    if (config.DATA_SOURCE === 'prisma' && prisma !== undefined) {
        return {
            categoryRepository: new PrismaCategoryRepository(prisma),
            tagRepository: new PrismaTagRepository(prisma),
        };
    }

    return {
        categoryRepository: new InMemoryCategoryRepository(),
        tagRepository: new InMemoryTagRepository(),
    };
};

export const buildTaxonomyDependencies = (repositories: {
    categoryRepository: CategoryRepository;
    tagRepository: TagRepository;
}) => {
    const commonDependencies = {
        ...repositories,
        idGenerator: new RandomIdGenerator(),
        clock: new SystemClock(),
        transactionManager: new InMemoryTransactionManager(),
    };

    return {
        createCategory: new CreateCategoryUseCase(commonDependencies),
        updateCategory: new UpdateCategoryUseCase(commonDependencies),
        deleteCategory: new DeleteCategoryUseCase(commonDependencies),
        listCategories: new ListCategoriesUseCase(commonDependencies),
        getCategoryBySlug: new GetCategoryBySlugUseCase(commonDependencies),
        createTag: new CreateTagUseCase(commonDependencies),
        updateTag: new UpdateTagUseCase(commonDependencies),
        deleteTag: new DeleteTagUseCase(commonDependencies),
        listTags: new ListTagsUseCase(commonDependencies),
        getTagBySlug: new GetTagBySlugUseCase(commonDependencies),
    };
};
