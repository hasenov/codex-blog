import type { TaxonomyStatus } from '../taxonomy.types.js';
import type { TaxonomyName } from '../value-objects/taxonomy-name.js';
import type { EntityId } from '../../shared/value-objects/entity-id.js';
import type { Slug } from '../../shared/value-objects/slug.js';
import type { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';

export interface CreateCategoryProps {
    createdAt: UtcDateTime;
    id: EntityId;
    name: TaxonomyName;
    slug: Slug;
}

export interface CategoryProps {
    archivedAt?: UtcDateTime;
    createdAt: UtcDateTime;
    id: EntityId;
    name: TaxonomyName;
    slug: Slug;
    status: TaxonomyStatus;
    updatedAt: UtcDateTime;
}

export interface RenameCategoryProps {
    name: TaxonomyName;
    slug: Slug;
    updatedAt: UtcDateTime;
}

export class Category {
    private constructor(private props: CategoryProps) {}

    public static create(props: CreateCategoryProps): Category {
        return new Category({
            id: props.id,
            name: props.name,
            slug: props.slug,
            status: 'active',
            createdAt: props.createdAt,
            updatedAt: props.createdAt,
        });
    }

    public static rehydrate(props: CategoryProps): Category {
        return new Category(props);
    }

    public get archivedAt(): UtcDateTime | undefined {
        return this.props.archivedAt;
    }

    public get createdAt(): UtcDateTime {
        return this.props.createdAt;
    }

    public get id(): EntityId {
        return this.props.id;
    }

    public get name(): TaxonomyName {
        return this.props.name;
    }

    public get slug(): Slug {
        return this.props.slug;
    }

    public get status(): TaxonomyStatus {
        return this.props.status;
    }

    public get updatedAt(): UtcDateTime {
        return this.props.updatedAt;
    }

    public archive(archivedAt: UtcDateTime): void {
        if (this.props.status === 'archived') {
            return;
        }

        this.props = {
            ...this.props,
            status: 'archived',
            archivedAt,
            updatedAt: archivedAt,
        };
    }

    public rename(props: RenameCategoryProps): void {
        this.props = {
            ...this.props,
            name: props.name,
            slug: props.slug,
            updatedAt: props.updatedAt,
        };
    }

    public toPrimitives(): CategoryProps {
        return this.props;
    }
}
