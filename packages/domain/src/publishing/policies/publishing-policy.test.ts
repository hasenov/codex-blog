import { describe, expect, it } from 'vitest';

import { DomainError } from '../../shared/errors/domain-error.js';
import { EntityId } from '../../shared/value-objects/entity-id.js';
import { Slug } from '../../shared/value-objects/slug.js';
import { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';
import { Post } from '../entities/post.js';
import {
    assertAuthorMatchesActor,
    assertCanCreatePost,
    assertCanManagePostLifecycle,
    assertCanUpdateDraftPost,
} from './publishing-policy.js';
import { PostTitle } from '../value-objects/post-title.js';
import { RichContent } from '../value-objects/rich-content.js';
import { SeoMetadata } from '../value-objects/seo-metadata.js';

const createPost = (): Post =>
    Post.createDraft({
        id: EntityId.create('post-0001'),
        authorId: EntityId.create('author-0001'),
        title: PostTitle.create('Initial title'),
        slug: Slug.create('initial-title'),
        excerpt: '',
        content: RichContent.create({
            version: 1,
            blocks: [{ type: 'paragraph', text: 'Hello' }],
        }),
        seo: SeoMetadata.create(),
        createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
        initialRevisionId: EntityId.create('revision-0001'),
    });

describe('publishing policy', () => {
    it('allows authors to create and update their own drafts', () => {
        const post = createPost();

        expect(() => assertCanCreatePost({ role: 'author', userId: 'author-0001' })).not.toThrow();
        expect(() => assertAuthorMatchesActor({ role: 'author', userId: 'author-0001' }, post.authorId)).not.toThrow();
        expect(() => assertCanUpdateDraftPost({ role: 'author', userId: 'author-0001' }, post)).not.toThrow();
    });

    it('rejects readers and authors managing other posts or lifecycle', () => {
        const post = createPost();

        expect(() => assertCanCreatePost({ role: 'reader', userId: 'reader-0001' })).toThrow(DomainError);
        expect(() => assertCanUpdateDraftPost({ role: 'author', userId: 'author-0002' }, post)).toThrow(DomainError);
        expect(() => assertCanManagePostLifecycle({ role: 'author', userId: 'author-0001' })).toThrow(DomainError);
    });

    it('allows editors and admins to manage lifecycle', () => {
        expect(() => assertCanManagePostLifecycle({ role: 'editor', userId: 'editor-0001' })).not.toThrow();
        expect(() => assertCanManagePostLifecycle({ role: 'admin', userId: 'admin-0001' })).not.toThrow();
    });
});
