import { describe, expect, it } from 'vitest';

import { EntityId } from '../../shared/value-objects/entity-id.js';
import { Slug } from '../../shared/value-objects/slug.js';
import { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';
import { TaxonomyName } from '../value-objects/taxonomy-name.js';
import { Category } from './category.js';
import { Tag } from './tag.js';

const now = UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z');

describe('taxonomy entities', () => {
    it('creates active categories and tags', () => {
        const category = Category.create({
            id: EntityId.create('category-0001'),
            name: TaxonomyName.create('Engineering'),
            slug: Slug.create('engineering'),
            createdAt: now,
        });
        const tag = Tag.create({
            id: EntityId.create('tag-0001'),
            name: TaxonomyName.create('TypeScript'),
            slug: Slug.create('typescript'),
            createdAt: now,
        });

        expect(category.status).toBe('active');
        expect(tag.status).toBe('active');
    });

    it('renames and archives taxonomy items', () => {
        const category = Category.create({
            id: EntityId.create('category-0001'),
            name: TaxonomyName.create('Engineering'),
            slug: Slug.create('engineering'),
            createdAt: now,
        });
        const updatedAt = UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z');

        category.rename({
            name: TaxonomyName.create('Product Engineering'),
            slug: Slug.create('product-engineering'),
            updatedAt,
        });
        category.archive(updatedAt);

        expect(category.name.toString()).toBe('Product Engineering');
        expect(category.status).toBe('archived');
    });
});
