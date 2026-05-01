import {
    assertCanManageTaxonomy,
    Category,
    DomainError,
    EntityId,
    Slug,
    Tag,
    TaxonomyName,
    UtcDateTime,
    type CategoryRepository,
    type TagRepository,
} from '@codex-blog/domain';

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../shared/errors/application-error.js';
import type { Clock, IdGenerator, TransactionManager } from '../shared/ports/core.js';
import type { TaxonomyActorDto, TaxonomyItemDto } from './dto.js';
import { toCategoryDto, toTagDto } from './mappers.js';

interface TaxonomyUseCaseDependencies {
    categoryRepository: CategoryRepository;
    clock: Clock;
    idGenerator: IdGenerator;
    tagRepository: TagRepository;
    transactionManager: TransactionManager;
}

interface CreateTaxonomyItemInput {
    actor: TaxonomyActorDto;
    name: string;
    slug: string;
}

interface UpdateTaxonomyItemInput {
    actor: TaxonomyActorDto;
    id: string;
    name: string;
    slug: string;
}

interface DeleteTaxonomyItemInput {
    actor: TaxonomyActorDto;
    id: string;
}

interface GetTaxonomyItemBySlugInput {
    slug: string;
}

const mapTaxonomyError = (error: unknown): Error => {
    if (error instanceof ConflictError || error instanceof NotFoundError) {
        return error;
    }

    if (error instanceof DomainError) {
        if (error.code === 'INSUFFICIENT_ROLE') {
            return new ForbiddenError(error.message, error.code);
        }

        return new BadRequestError(error.message, error.code);
    }

    return error instanceof Error ? error : new Error('Unknown taxonomy error');
};

export class CreateCategoryUseCase {
    public constructor(private readonly dependencies: TaxonomyUseCaseDependencies) {}

    public async execute(input: CreateTaxonomyItemInput): Promise<TaxonomyItemDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                assertCanManageTaxonomy(input.actor);
                const slug = Slug.create(input.slug);

                if (await this.dependencies.categoryRepository.existsBySlug(slug)) {
                    throw new ConflictError('Category slug already exists.', 'CATEGORY_SLUG_ALREADY_EXISTS');
                }

                const now = UtcDateTime.create(this.dependencies.clock.now());
                const category = Category.create({
                    id: EntityId.create(this.dependencies.idGenerator.generate()),
                    name: TaxonomyName.create(input.name),
                    slug,
                    createdAt: now,
                });

                await this.dependencies.categoryRepository.save(category);
                return toCategoryDto(category);
            } catch (error) {
                throw mapTaxonomyError(error);
            }
        });
    }
}

export class UpdateCategoryUseCase {
    public constructor(private readonly dependencies: TaxonomyUseCaseDependencies) {}

    public async execute(input: UpdateTaxonomyItemInput): Promise<TaxonomyItemDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                assertCanManageTaxonomy(input.actor);
                const category = await this.dependencies.categoryRepository.findById(input.id);

                if (category === null) {
                    throw new NotFoundError('Category was not found.', 'CATEGORY_NOT_FOUND');
                }

                const slug = Slug.create(input.slug);

                if (await this.dependencies.categoryRepository.existsBySlug(slug, input.id)) {
                    throw new ConflictError('Category slug already exists.', 'CATEGORY_SLUG_ALREADY_EXISTS');
                }

                category.rename({
                    name: TaxonomyName.create(input.name),
                    slug,
                    updatedAt: UtcDateTime.create(this.dependencies.clock.now()),
                });
                await this.dependencies.categoryRepository.save(category);
                return toCategoryDto(category);
            } catch (error) {
                throw mapTaxonomyError(error);
            }
        });
    }
}

export class DeleteCategoryUseCase {
    public constructor(private readonly dependencies: TaxonomyUseCaseDependencies) {}

    public async execute(input: DeleteTaxonomyItemInput): Promise<void> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                assertCanManageTaxonomy(input.actor);
                const category = await this.dependencies.categoryRepository.findById(input.id);

                if (category === null) {
                    throw new NotFoundError('Category was not found.', 'CATEGORY_NOT_FOUND');
                }

                category.archive(UtcDateTime.create(this.dependencies.clock.now()));
                await this.dependencies.categoryRepository.save(category);
            } catch (error) {
                throw mapTaxonomyError(error);
            }
        });
    }
}

export class ListCategoriesUseCase {
    public constructor(private readonly dependencies: TaxonomyUseCaseDependencies) {}

    public async execute(): Promise<TaxonomyItemDto[]> {
        const categories = await this.dependencies.categoryRepository.listActive();
        return categories.map((category) => toCategoryDto(category));
    }
}

export class GetCategoryBySlugUseCase {
    public constructor(private readonly dependencies: TaxonomyUseCaseDependencies) {}

    public async execute(input: GetTaxonomyItemBySlugInput): Promise<TaxonomyItemDto> {
        try {
            const category = await this.dependencies.categoryRepository.findBySlug(Slug.create(input.slug));

            if (category === null || category.status !== 'active') {
                throw new NotFoundError('Category was not found.', 'CATEGORY_NOT_FOUND');
            }

            return toCategoryDto(category);
        } catch (error) {
            throw mapTaxonomyError(error);
        }
    }
}

export class CreateTagUseCase {
    public constructor(private readonly dependencies: TaxonomyUseCaseDependencies) {}

    public async execute(input: CreateTaxonomyItemInput): Promise<TaxonomyItemDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                assertCanManageTaxonomy(input.actor);
                const slug = Slug.create(input.slug);

                if (await this.dependencies.tagRepository.existsBySlug(slug)) {
                    throw new ConflictError('Tag slug already exists.', 'TAG_SLUG_ALREADY_EXISTS');
                }

                const now = UtcDateTime.create(this.dependencies.clock.now());
                const tag = Tag.create({
                    id: EntityId.create(this.dependencies.idGenerator.generate()),
                    name: TaxonomyName.create(input.name),
                    slug,
                    createdAt: now,
                });

                await this.dependencies.tagRepository.save(tag);
                return toTagDto(tag);
            } catch (error) {
                throw mapTaxonomyError(error);
            }
        });
    }
}

export class UpdateTagUseCase {
    public constructor(private readonly dependencies: TaxonomyUseCaseDependencies) {}

    public async execute(input: UpdateTaxonomyItemInput): Promise<TaxonomyItemDto> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                assertCanManageTaxonomy(input.actor);
                const tag = await this.dependencies.tagRepository.findById(input.id);

                if (tag === null) {
                    throw new NotFoundError('Tag was not found.', 'TAG_NOT_FOUND');
                }

                const slug = Slug.create(input.slug);

                if (await this.dependencies.tagRepository.existsBySlug(slug, input.id)) {
                    throw new ConflictError('Tag slug already exists.', 'TAG_SLUG_ALREADY_EXISTS');
                }

                tag.rename({
                    name: TaxonomyName.create(input.name),
                    slug,
                    updatedAt: UtcDateTime.create(this.dependencies.clock.now()),
                });
                await this.dependencies.tagRepository.save(tag);
                return toTagDto(tag);
            } catch (error) {
                throw mapTaxonomyError(error);
            }
        });
    }
}

export class DeleteTagUseCase {
    public constructor(private readonly dependencies: TaxonomyUseCaseDependencies) {}

    public async execute(input: DeleteTaxonomyItemInput): Promise<void> {
        return this.dependencies.transactionManager.runInTransaction(async () => {
            try {
                assertCanManageTaxonomy(input.actor);
                const tag = await this.dependencies.tagRepository.findById(input.id);

                if (tag === null) {
                    throw new NotFoundError('Tag was not found.', 'TAG_NOT_FOUND');
                }

                tag.archive(UtcDateTime.create(this.dependencies.clock.now()));
                await this.dependencies.tagRepository.save(tag);
            } catch (error) {
                throw mapTaxonomyError(error);
            }
        });
    }
}

export class ListTagsUseCase {
    public constructor(private readonly dependencies: TaxonomyUseCaseDependencies) {}

    public async execute(): Promise<TaxonomyItemDto[]> {
        const tags = await this.dependencies.tagRepository.listActive();
        return tags.map((tag) => toTagDto(tag));
    }
}

export class GetTagBySlugUseCase {
    public constructor(private readonly dependencies: TaxonomyUseCaseDependencies) {}

    public async execute(input: GetTaxonomyItemBySlugInput): Promise<TaxonomyItemDto> {
        try {
            const tag = await this.dependencies.tagRepository.findBySlug(Slug.create(input.slug));

            if (tag === null || tag.status !== 'active') {
                throw new NotFoundError('Tag was not found.', 'TAG_NOT_FOUND');
            }

            return toTagDto(tag);
        } catch (error) {
            throw mapTaxonomyError(error);
        }
    }
}
