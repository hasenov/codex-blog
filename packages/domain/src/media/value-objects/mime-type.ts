import { DomainError } from '../../shared/errors/domain-error.js';

const MIME_TYPE_PATTERN = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;

export class MimeType {
    private constructor(private readonly value: string) {}

    public static create(value: string): MimeType {
        const normalizedValue = value.trim().toLowerCase();

        if (!MIME_TYPE_PATTERN.test(normalizedValue)) {
            throw new DomainError('MIME type is invalid.', 'INVALID_MEDIA_MIME_TYPE');
        }

        return new MimeType(normalizedValue);
    }

    public toString(): string {
        return this.value;
    }
}
