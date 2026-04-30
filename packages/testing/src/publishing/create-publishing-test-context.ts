import type { Clock, IdGenerator, PostDto } from '@codex-blog/application';
import { Post, type PostRepository, type Slug } from '@codex-blog/domain';

import { InMemoryTransactionManager } from '@codex-blog/infrastructure';

export class InMemoryPostRepository implements PostRepository {
    private readonly posts = new Map<string, Post>();

    public existsBySlug(slug: Slug): Promise<boolean> {
        return Promise.resolve(Array.from(this.posts.values()).some((post) => post.slug.toString() === slug.toString()));
    }

    public findById(id: string): Promise<Post | null> {
        const post = this.posts.get(id);
        return Promise.resolve(post === undefined ? null : Post.rehydrate(post.toPrimitives()));
    }

    public findBySlug(slug: Slug): Promise<Post | null> {
        for (const post of this.posts.values()) {
            if (post.slug.toString() === slug.toString()) {
                return Promise.resolve(Post.rehydrate(post.toPrimitives()));
            }
        }

        return Promise.resolve(null);
    }

    public listPublished(): Promise<Post[]> {
        const posts = Array.from(this.posts.values())
            .filter((post) => post.status === 'published')
            .sort((left, right) => {
                const leftTime = left.publishedAt?.toDate().getTime() ?? 0;
                const rightTime = right.publishedAt?.toDate().getTime() ?? 0;
                return rightTime - leftTime;
            });

        return Promise.resolve(posts.map((post) => Post.rehydrate(post.toPrimitives())));
    }

    public save(post: Post): Promise<void> {
        this.posts.set(post.id.toString(), Post.rehydrate(post.toPrimitives()));
        return Promise.resolve();
    }
}

class FixedClock implements Clock {
    private current = new Date('2026-01-01T00:00:00.000Z');

    public now(): Date {
        return this.current;
    }

    public setCurrent(value: Date): void {
        this.current = value;
    }
}

class SequenceIdGenerator implements IdGenerator {
    private index = 0;

    public generate(): string {
        this.index += 1;
        return `generated-id-${this.index.toString().padStart(4, '0')}`;
    }
}

export const createPublishingTestContext = () => {
    const clock = new FixedClock();
    const postRepository = new InMemoryPostRepository();

    return {
        actor: {
            author: { role: 'author', userId: 'author-0001' },
            otherAuthor: { role: 'author', userId: 'author-0002' },
            editor: { role: 'editor', userId: 'editor-0001' },
            reader: { role: 'reader', userId: 'reader-0001' },
        } as const,
        clock,
        dependencies: {
            clock,
            idGenerator: new SequenceIdGenerator(),
            postRepository,
            transactionManager: new InMemoryTransactionManager(),
        },
        postRepository,
    };
};

export const createDraftInput = (overrides: Partial<Pick<PostDto, 'excerpt' | 'slug' | 'title'>> = {}) => ({
    title: overrides.title ?? 'Initial post title',
    slug: overrides.slug ?? 'initial-post-title',
    excerpt: overrides.excerpt ?? 'Initial excerpt',
    content: {
        version: 1 as const,
        blocks: [
            {
                type: 'paragraph' as const,
                text: 'Initial content',
            },
        ],
    },
    seo: {
        title: 'Initial SEO title',
    },
});
