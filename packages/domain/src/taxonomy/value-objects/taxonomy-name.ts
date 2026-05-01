import { DomainError } from '../../shared/errors/domain-error.js';

export class TaxonomyName {
    private constructor(private readonly value: string) {}

    public static create(value: string): TaxonomyName {
        const normalizedValue = value.trim().replace(/\s+/g, ' ');

        if (normalizedValue.length < 2) {
            throw new DomainError('Taxonomy name must be at least 2 characters long.', 'INVALID_TAXONOMY_NAME');
        }

        if (normalizedValue.length > 80) {
            throw new DomainError('Taxonomy name must be at most 80 characters long.', 'INVALID_TAXONOMY_NAME');
        }

        return new TaxonomyName(normalizedValue);
    }

    public toString(): string {
        return this.value;
    }
}
