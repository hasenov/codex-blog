import { DomainError } from '../errors/domain-error.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class Slug {
    private constructor(private readonly value: string) {}

    public static create(value: string): Slug {
        const normalizedValue = value.trim().toLowerCase();

        if (!SLUG_PATTERN.test(normalizedValue)) {
            throw new DomainError(
                'Slug must contain lowercase letters, numbers, and dashes only.',
                'INVALID_SLUG'
            );
        }

        return new Slug(normalizedValue);
    }

    public toString(): string {
        return this.value;
    }
}
