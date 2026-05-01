import {
    Category,
    Tag,
    type CategoryRepository,
    type Slug,
    type TagRepository,
} from '@codex-blog/domain';

export class InMemoryCategoryRepository implements CategoryRepository {
    private readonly categories = new Map<string, Category>();

    public existsBySlug(slug: Slug, excludeId?: string): Promise<boolean> {
        return Promise.resolve(
            Array.from(this.categories.values()).some(
                (category) => category.slug.toString() === slug.toString() && category.id.toString() !== excludeId
            )
        );
    }

    public findById(id: string): Promise<Category | null> {
        const category = this.categories.get(id);
        return Promise.resolve(category === undefined ? null : Category.rehydrate(category.toPrimitives()));
    }

    public findBySlug(slug: Slug): Promise<Category | null> {
        for (const category of this.categories.values()) {
            if (category.slug.toString() === slug.toString()) {
                return Promise.resolve(Category.rehydrate(category.toPrimitives()));
            }
        }

        return Promise.resolve(null);
    }

    public listActive(): Promise<Category[]> {
        return Promise.resolve(
            Array.from(this.categories.values())
                .filter((category) => category.status === 'active')
                .sort((left, right) => left.name.toString().localeCompare(right.name.toString()))
                .map((category) => Category.rehydrate(category.toPrimitives()))
        );
    }

    public save(category: Category): Promise<void> {
        this.categories.set(category.id.toString(), Category.rehydrate(category.toPrimitives()));
        return Promise.resolve();
    }
}

export class InMemoryTagRepository implements TagRepository {
    private readonly tags = new Map<string, Tag>();

    public existsBySlug(slug: Slug, excludeId?: string): Promise<boolean> {
        return Promise.resolve(
            Array.from(this.tags.values()).some(
                (tag) => tag.slug.toString() === slug.toString() && tag.id.toString() !== excludeId
            )
        );
    }

    public findById(id: string): Promise<Tag | null> {
        const tag = this.tags.get(id);
        return Promise.resolve(tag === undefined ? null : Tag.rehydrate(tag.toPrimitives()));
    }

    public findBySlug(slug: Slug): Promise<Tag | null> {
        for (const tag of this.tags.values()) {
            if (tag.slug.toString() === slug.toString()) {
                return Promise.resolve(Tag.rehydrate(tag.toPrimitives()));
            }
        }

        return Promise.resolve(null);
    }

    public listActive(): Promise<Tag[]> {
        return Promise.resolve(
            Array.from(this.tags.values())
                .filter((tag) => tag.status === 'active')
                .sort((left, right) => left.name.toString().localeCompare(right.name.toString()))
                .map((tag) => Tag.rehydrate(tag.toPrimitives()))
        );
    }

    public save(tag: Tag): Promise<void> {
        this.tags.set(tag.id.toString(), Tag.rehydrate(tag.toPrimitives()));
        return Promise.resolve();
    }
}
