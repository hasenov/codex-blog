import { DomainError } from '../../shared/errors/domain-error.js';

export class CommentBody {
    private constructor(private readonly value: string) {}

    public static create(value: string): CommentBody {
        const normalizedValue = value.trim();

        if (normalizedValue.length < 1) {
            throw new DomainError('Comment body cannot be empty.', 'INVALID_COMMENT_BODY');
        }

        if (normalizedValue.length > 2000) {
            throw new DomainError('Comment body must be at most 2000 characters long.', 'INVALID_COMMENT_BODY');
        }

        return new CommentBody(normalizedValue);
    }

    public toString(): string {
        return this.value;
    }
}
