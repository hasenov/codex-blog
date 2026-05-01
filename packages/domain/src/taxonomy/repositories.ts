import type { Slug } from '../shared/value-objects/slug.js';
import type { Category } from './entities/category.js';
import type { Tag } from './entities/tag.js';

export interface CategoryRepository {
    existsBySlug(slug: Slug, excludeId?: string): Promise<boolean>;
    findById(id: string): Promise<Category | null>;
    findBySlug(slug: Slug): Promise<Category | null>;
    listActive(): Promise<Category[]>;
    save(category: Category): Promise<void>;
}

export interface TagRepository {
    existsBySlug(slug: Slug, excludeId?: string): Promise<boolean>;
    findById(id: string): Promise<Tag | null>;
    findBySlug(slug: Slug): Promise<Tag | null>;
    listActive(): Promise<Tag[]>;
    save(tag: Tag): Promise<void>;
}
