import { Post, type PostRepository, type Slug } from '@codex-blog/domain';

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
