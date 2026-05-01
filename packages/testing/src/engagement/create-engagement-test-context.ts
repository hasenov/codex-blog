import type { Clock, IdGenerator } from '@codex-blog/application';
import {
    Comment,
    EntityId,
    Post,
    PostTitle,
    RichContent,
    SeoMetadata,
    Slug,
    UtcDateTime,
    type CommentRepository,
    type ListApprovedCommentsOptions,
    type ListPublishedPostsOptions,
    type PostRepository,
} from '@codex-blog/domain';
import { InMemoryTransactionManager } from '@codex-blog/infrastructure';

export class InMemoryCommentRepository implements CommentRepository {
    private readonly comments = new Map<string, Comment>();

    public findById(id: string): Promise<Comment | null> {
        const comment = this.comments.get(id);
        return Promise.resolve(comment === undefined ? null : Comment.rehydrate(comment.toPrimitives()));
    }

    public listApprovedByPostId(options: ListApprovedCommentsOptions): Promise<Comment[]> {
        const comments = Array.from(this.comments.values())
            .filter((comment) => comment.postId.toString() === options.postId && comment.status === 'approved')
            .map((comment) => Comment.rehydrate(comment.toPrimitives()));

        return Promise.resolve(comments);
    }

    public save(comment: Comment): Promise<void> {
        this.comments.set(comment.id.toString(), Comment.rehydrate(comment.toPrimitives()));
        return Promise.resolve();
    }
}

export class InMemoryEngagementPostRepository implements PostRepository {
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

    public listPublished(options: ListPublishedPostsOptions): Promise<Post[]> {
        const posts = Array.from(this.posts.values()).filter((post) => post.status === 'published');
        return Promise.resolve(posts.slice(0, options.limit).map((post) => Post.rehydrate(post.toPrimitives())));
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
        return `generated-comment-${this.index.toString().padStart(4, '0')}`;
    }
}

const createContent = (): RichContent =>
    RichContent.create({
        version: 1,
        blocks: [
            {
                type: 'paragraph',
                text: 'Published content',
            },
        ],
    });

export const createPublishedPost = (): Post => {
    const post = Post.createDraft({
        id: EntityId.create('post-0001'),
        authorId: EntityId.create('author-0001'),
        title: PostTitle.create('Published post'),
        slug: Slug.create('published-post'),
        excerpt: 'Published excerpt',
        content: createContent(),
        seo: SeoMetadata.create(),
        createdAt: UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z'),
        initialRevisionId: EntityId.create('revision-0001'),
    });
    post.publish(UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z'));
    return post;
};

export const createEngagementTestContext = () => {
    const clock = new FixedClock();
    const commentRepository = new InMemoryCommentRepository();
    const postRepository = new InMemoryEngagementPostRepository();

    return {
        actor: {
            admin: { role: 'admin', userId: 'admin-0001' },
            author: { role: 'author', userId: 'author-0001' },
            editor: { role: 'editor', userId: 'editor-0001' },
            reader: { role: 'reader', userId: 'reader-0001' },
            otherReader: { role: 'reader', userId: 'reader-0002' },
        } as const,
        clock,
        commentRepository,
        dependencies: {
            clock,
            commentRepository,
            idGenerator: new SequenceIdGenerator(),
            postRepository,
            transactionManager: new InMemoryTransactionManager(),
        },
        postRepository,
    };
};
