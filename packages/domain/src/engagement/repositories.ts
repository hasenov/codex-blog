import type { Comment } from './entities/comment.js';

export interface ListApprovedCommentsOptions {
    postId: string;
}

export interface CommentRepository {
    findById(id: string): Promise<Comment | null>;
    listApprovedByPostId(options: ListApprovedCommentsOptions): Promise<Comment[]>;
    save(comment: Comment): Promise<void>;
}
