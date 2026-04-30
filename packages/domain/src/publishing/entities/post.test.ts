import { describe, expect, it } from 'vitest';

import { DomainError } from '../../shared/errors/domain-error.js';
import { EntityId } from '../../shared/value-objects/entity-id.js';
import { Slug } from '../../shared/value-objects/slug.js';
import { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';
import { Post } from './post.js';
import { PostTitle } from '../value-objects/post-title.js';
import { RichContent } from '../value-objects/rich-content.js';
import { SeoMetadata } from '../value-objects/seo-metadata.js';

const createContent = (text = 'Hello world'): RichContent =>
    RichContent.create({
        version: 1,
        blocks: [
            {
                type: 'paragraph',
                text,
            },
        ],
    });

const createPost = (): Post =>
    Post.createDraft({
        id: EntityId.create('post-0001'),
        authorId: EntityId.create('author-0001'),
        title: PostTitle.create('Initial title'),
        slug: Slug.create('initial-title'),
        excerpt: 'Initial excerpt',
        content: createContent(),
        seo: SeoMetadata.create({
            title: 'Initial SEO title',
        }),
        createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
        initialRevisionId: EntityId.create('revision-0001'),
    });

describe('Post', () => {
    it('creates a draft with an initial revision', () => {
        const post = createPost();

        expect(post.status).toBe('draft');
        expect(post.revisions).toHaveLength(1);
        expect(post.revisions[0]?.number).toBe(1);
        expect(post.title.toString()).toBe('Initial title');
    });

    it('updates drafts and creates revisions', () => {
        const post = createPost();

        post.updateDraft({
            title: PostTitle.create('Updated title'),
            excerpt: 'Updated excerpt',
            content: createContent('Updated content'),
            seo: SeoMetadata.create({
                description: 'Updated SEO description',
            }),
            revisionId: EntityId.create('revision-0002'),
            updatedAt: UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'),
            updatedByUserId: EntityId.create('author-0001'),
        });

        expect(post.title.toString()).toBe('Updated title');
        expect(post.revisions).toHaveLength(2);
        expect(post.revisions[1]?.number).toBe(2);
        expect(post.updatedAt.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    });

    it('publishes, schedules, and archives valid lifecycle transitions', () => {
        const scheduledPost = createPost();
        scheduledPost.schedule(
            UtcDateTime.fromISOString('2026-01-03T00:00:00.000Z'),
            UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z')
        );
        scheduledPost.publish(UtcDateTime.fromISOString('2026-01-03T00:00:00.000Z'));

        const publishedPost = createPost();
        publishedPost.publish(UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));
        publishedPost.archive(UtcDateTime.fromISOString('2026-01-04T00:00:00.000Z'));

        expect(scheduledPost.status).toBe('published');
        expect(scheduledPost.scheduledFor).toBeUndefined();
        expect(publishedPost.status).toBe('archived');
        expect(publishedPost.archivedAt?.toISOString()).toBe('2026-01-04T00:00:00.000Z');
    });

    it('rejects invalid lifecycle transitions', () => {
        const post = createPost();
        post.publish(UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));

        expect(() =>
            post.updateDraft({
                title: PostTitle.create('Updated title'),
                excerpt: '',
                content: createContent('Updated content'),
                seo: SeoMetadata.create(),
                revisionId: EntityId.create('revision-0002'),
                updatedAt: UtcDateTime.fromISOString('2026-01-03T00:00:00.000Z'),
                updatedByUserId: EntityId.create('author-0001'),
            })
        ).toThrow(DomainError);
        expect(() =>
            post.schedule(
                UtcDateTime.fromISOString('2026-01-04T00:00:00.000Z'),
                UtcDateTime.fromISOString('2026-01-03T00:00:00.000Z')
            )
        ).toThrow(DomainError);
    });

    it('restores an existing revision into the current draft', () => {
        const post = createPost();
        post.updateDraft({
            title: PostTitle.create('Updated title'),
            excerpt: 'Updated excerpt',
            content: createContent('Updated content'),
            seo: SeoMetadata.create(),
            revisionId: EntityId.create('revision-0002'),
            updatedAt: UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'),
            updatedByUserId: EntityId.create('author-0001'),
        });

        post.restoreRevision({
            restoredRevisionId: EntityId.create('revision-0001'),
            revisionId: EntityId.create('revision-0003'),
            restoredAt: UtcDateTime.fromISOString('2026-01-03T00:00:00.000Z'),
            restoredByUserId: EntityId.create('author-0001'),
        });

        expect(post.title.toString()).toBe('Initial title');
        expect(post.revisions).toHaveLength(3);
        expect(post.revisions[2]?.number).toBe(3);
    });
});
