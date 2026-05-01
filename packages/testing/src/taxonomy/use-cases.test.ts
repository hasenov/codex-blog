import { describe, expect, it } from 'vitest';

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

import { createTaxonomyTestContext } from './create-taxonomy-test-context.js';

describe('taxonomy use cases', () => {
    it('creates and lists active categories and tags', async () => {
        const context = createTaxonomyTestContext();
        const category = await new CreateCategoryUseCase(context.dependencies).execute({
            actor: context.actor.editor,
            name: 'Engineering',
            slug: 'engineering',
        });
        const tag = await new CreateTagUseCase(context.dependencies).execute({
            actor: context.actor.editor,
            name: 'TypeScript',
            slug: 'typescript',
        });

        expect((await new ListCategoriesUseCase(context.dependencies).execute()).map((item) => item.id)).toEqual([category.id]);
        expect((await new ListTagsUseCase(context.dependencies).execute()).map((item) => item.id)).toEqual([tag.id]);
    });

    it('rejects duplicate slugs and non-manager writes', async () => {
        const context = createTaxonomyTestContext();
        const createCategory = new CreateCategoryUseCase(context.dependencies);
        await createCategory.execute({
            actor: context.actor.editor,
            name: 'Engineering',
            slug: 'engineering',
        });

        await expect(
            createCategory.execute({
                actor: context.actor.reader,
                name: 'Reader Category',
                slug: 'reader-category',
            })
        ).rejects.toMatchObject({ code: 'INSUFFICIENT_ROLE' });
        await expect(
            createCategory.execute({
                actor: context.actor.editor,
                name: 'Duplicate',
                slug: 'engineering',
            })
        ).rejects.toMatchObject({ code: 'CATEGORY_SLUG_ALREADY_EXISTS' });
    });

    it('updates and archives taxonomy items', async () => {
        const context = createTaxonomyTestContext();
        const createCategory = new CreateCategoryUseCase(context.dependencies);
        const createTag = new CreateTagUseCase(context.dependencies);
        const category = await createCategory.execute({
            actor: context.actor.editor,
            name: 'Engineering',
            slug: 'engineering',
        });
        const tag = await createTag.execute({
            actor: context.actor.editor,
            name: 'TypeScript',
            slug: 'typescript',
        });

        const updatedCategory = await new UpdateCategoryUseCase(context.dependencies).execute({
            actor: context.actor.editor,
            id: category.id,
            name: 'Product Engineering',
            slug: 'product-engineering',
        });
        const updatedTag = await new UpdateTagUseCase(context.dependencies).execute({
            actor: context.actor.editor,
            id: tag.id,
            name: 'Node.js',
            slug: 'node-js',
        });

        expect(updatedCategory.slug).toBe('product-engineering');
        expect(updatedTag.slug).toBe('node-js');
        expect((await new GetCategoryBySlugUseCase(context.dependencies).execute({ slug: 'product-engineering' })).id).toBe(category.id);
        expect((await new GetTagBySlugUseCase(context.dependencies).execute({ slug: 'node-js' })).id).toBe(tag.id);

        await new DeleteCategoryUseCase(context.dependencies).execute({ actor: context.actor.editor, id: category.id });
        await new DeleteTagUseCase(context.dependencies).execute({ actor: context.actor.editor, id: tag.id });

        expect(await new ListCategoriesUseCase(context.dependencies).execute()).toHaveLength(0);
        expect(await new ListTagsUseCase(context.dependencies).execute()).toHaveLength(0);
    });
});
