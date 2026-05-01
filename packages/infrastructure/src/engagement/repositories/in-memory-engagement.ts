import { Comment, type CommentRepository, type ListApprovedCommentsOptions } from '@codex-blog/domain';

export class InMemoryCommentRepository implements CommentRepository {
    private readonly comments = new Map<string, Comment>();

    public findById(id: string): Promise<Comment | null> {
        const comment = this.comments.get(id);
        return Promise.resolve(comment === undefined ? null : Comment.rehydrate(comment.toPrimitives()));
    }

    public listApprovedByPostId(options: ListApprovedCommentsOptions): Promise<Comment[]> {
        const comments = Array.from(this.comments.values())
            .filter((comment) => comment.postId.toString() === options.postId && comment.status === 'approved')
            .sort((left, right) => {
                const leftTime = left.createdAt.toDate().getTime();
                const rightTime = right.createdAt.toDate().getTime();

                if (leftTime !== rightTime) {
                    return leftTime - rightTime;
                }

                return left.id.toString().localeCompare(right.id.toString());
            })
            .map((comment) => Comment.rehydrate(comment.toPrimitives()));

        return Promise.resolve(comments);
    }

    public save(comment: Comment): Promise<void> {
        this.comments.set(comment.id.toString(), Comment.rehydrate(comment.toPrimitives()));
        return Promise.resolve();
    }
}
