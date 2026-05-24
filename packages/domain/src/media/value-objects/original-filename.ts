import { DomainError } from '../../shared/errors/domain-error.js';

export class OriginalFilename {
    private constructor(private readonly value: string) {}

    public static create(value: string): OriginalFilename {
        const normalizedValue = value.trim();

        if (normalizedValue.length === 0 || normalizedValue.length > 255) {
            throw new DomainError('Original filename is invalid.', 'INVALID_MEDIA_ORIGINAL_FILENAME');
        }

        return new OriginalFilename(normalizedValue);
    }

    public toString(): string {
        return this.value;
    }
}
