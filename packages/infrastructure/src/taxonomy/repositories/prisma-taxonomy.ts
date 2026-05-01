import type { PrismaClient } from '@prisma/client';

import {
    Category,
    EntityId,
    Slug,
    Tag,
    TaxonomyName,
    UtcDateTime,
    type CategoryRepository,
    type TaxonomyStatus,
    type TagRepository,
} from '@codex-blog/domain';

interface TaxonomyRecord {
    archivedAt: Date | null;
    createdAt: Date;
    id: string;
    name: string;
    slug: string;
    status: string;
    updatedAt: Date;
}

const toCategory = (record: TaxonomyRecord): Category => {
    const archivedAt = record.archivedAt === null ? undefined : UtcDateTime.create(record.archivedAt);

    return Category.rehydrate({
        id: EntityId.create(record.id),
        name: TaxonomyName.create(record.name),
        slug: Slug.create(record.slug),
        status: record.status as TaxonomyStatus,
        createdAt: UtcDateTime.create(record.createdAt),
        updatedAt: UtcDateTime.create(record.updatedAt),
        ...(archivedAt === undefined ? {} : { archivedAt }),
    });
};

const toTag = (record: TaxonomyRecord): Tag => {
    const archivedAt = record.archivedAt === null ? undefined : UtcDateTime.create(record.archivedAt);

    return Tag.rehydrate({
        id: EntityId.create(record.id),
        name: TaxonomyName.create(record.name),
        slug: Slug.create(record.slug),
        status: record.status as TaxonomyStatus,
        createdAt: UtcDateTime.create(record.createdAt),
        updatedAt: UtcDateTime.create(record.updatedAt),
        ...(archivedAt === undefined ? {} : { archivedAt }),
    });
};

export class PrismaCategoryRepository implements CategoryRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public async existsBySlug(slug: Slug, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.category.count({
            where: {
                slug: slug.toString(),
                ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
            },
        });

        return count > 0;
    }

    public async findById(id: string): Promise<Category | null> {
        const record = await this.prisma.category.findUnique({ where: { id } });
        return record === null ? null : toCategory(record);
    }

    public async findBySlug(slug: Slug): Promise<Category | null> {
        const record = await this.prisma.category.findUnique({ where: { slug: slug.toString() } });
        return record === null ? null : toCategory(record);
    }

    public async listActive(): Promise<Category[]> {
        const records = await this.prisma.category.findMany({
            where: {
                status: 'active',
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
        });

        return records.map((record) => toCategory(record));
    }

    public async save(category: Category): Promise<void> {
        const props = category.toPrimitives();

        await this.prisma.category.upsert({
            where: {
                id: props.id.toString(),
            },
            create: {
                id: props.id.toString(),
                name: props.name.toString(),
                slug: props.slug.toString(),
                status: props.status,
                archivedAt: props.archivedAt?.toDate() ?? null,
                createdAt: props.createdAt.toDate(),
                updatedAt: props.updatedAt.toDate(),
            },
            update: {
                name: props.name.toString(),
                slug: props.slug.toString(),
                status: props.status,
                archivedAt: props.archivedAt?.toDate() ?? null,
                updatedAt: props.updatedAt.toDate(),
            },
        });
    }
}

export class PrismaTagRepository implements TagRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public async existsBySlug(slug: Slug, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.tag.count({
            where: {
                slug: slug.toString(),
                ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
            },
        });

        return count > 0;
    }

    public async findById(id: string): Promise<Tag | null> {
        const record = await this.prisma.tag.findUnique({ where: { id } });
        return record === null ? null : toTag(record);
    }

    public async findBySlug(slug: Slug): Promise<Tag | null> {
        const record = await this.prisma.tag.findUnique({ where: { slug: slug.toString() } });
        return record === null ? null : toTag(record);
    }

    public async listActive(): Promise<Tag[]> {
        const records = await this.prisma.tag.findMany({
            where: {
                status: 'active',
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
        });

        return records.map((record) => toTag(record));
    }

    public async save(tag: Tag): Promise<void> {
        const props = tag.toPrimitives();

        await this.prisma.tag.upsert({
            where: {
                id: props.id.toString(),
            },
            create: {
                id: props.id.toString(),
                name: props.name.toString(),
                slug: props.slug.toString(),
                status: props.status,
                archivedAt: props.archivedAt?.toDate() ?? null,
                createdAt: props.createdAt.toDate(),
                updatedAt: props.updatedAt.toDate(),
            },
            update: {
                name: props.name.toString(),
                slug: props.slug.toString(),
                status: props.status,
                archivedAt: props.archivedAt?.toDate() ?? null,
                updatedAt: props.updatedAt.toDate(),
            },
        });
    }
}
