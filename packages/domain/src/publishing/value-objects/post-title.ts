import { DomainError } from '../../shared/errors/domain-error.js';

export class PostTitle {
    private constructor(private readonly value: string) {}

    public static create(value: string): PostTitle {
        const normalizedValue = value.trim();

        if (normalizedValue.length < 3) {
            throw new DomainError('Post title must be at least 3 characters long.', 'INVALID_POST_TITLE');
        }

        if (normalizedValue.length > 160) {
            throw new DomainError('Post title must be at most 160 characters long.', 'INVALID_POST_TITLE');
        }

        return new PostTitle(normalizedValue);
    }

    public toString(): string {
        return this.value;
    }
}
