import type { Category, Tag } from '@codex-blog/domain';

import type { TaxonomyItemDto } from './dto.js';

export const toCategoryDto = (category: Category): TaxonomyItemDto => {
    const props = category.toPrimitives();

    return {
        id: props.id.toString(),
        name: props.name.toString(),
        slug: props.slug.toString(),
        status: props.status,
        createdAt: props.createdAt.toISOString(),
        updatedAt: props.updatedAt.toISOString(),
        ...(props.archivedAt === undefined ? {} : { archivedAt: props.archivedAt.toISOString() }),
    };
};

export const toTagDto = (tag: Tag): TaxonomyItemDto => {
    const props = tag.toPrimitives();

    return {
        id: props.id.toString(),
        name: props.name.toString(),
        slug: props.slug.toString(),
        status: props.status,
        createdAt: props.createdAt.toISOString(),
        updatedAt: props.updatedAt.toISOString(),
        ...(props.archivedAt === undefined ? {} : { archivedAt: props.archivedAt.toISOString() }),
    };
};
