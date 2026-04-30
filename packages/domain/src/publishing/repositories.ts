import type { Slug } from '../shared/value-objects/slug.js';
import type { Post } from './entities/post.js';

export interface ListPublishedPostsOptions {
    cursor?: string;
    limit: number;
}

export interface PostRepository {
    existsBySlug(slug: Slug): Promise<boolean>;
    findById(id: string): Promise<Post | null>;
    findBySlug(slug: Slug): Promise<Post | null>;
    listPublished(options: ListPublishedPostsOptions): Promise<Post[]>;
    save(post: Post): Promise<void>;
}
