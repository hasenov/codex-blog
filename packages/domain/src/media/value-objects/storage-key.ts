import { DomainError } from '../../shared/errors/domain-error.js';

export class StorageKey {
    private constructor(private readonly value: string) {}

    public static create(value: string): StorageKey {
        const normalizedValue = value.trim();

        if (normalizedValue.length === 0 || normalizedValue.length > 500) {
            throw new DomainError('Storage key is invalid.', 'INVALID_MEDIA_STORAGE_KEY');
        }

        return new StorageKey(normalizedValue);
    }

    public toString(): string {
        return this.value;
    }
}
