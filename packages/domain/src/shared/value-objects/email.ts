import { DomainError } from '../errors/domain-error.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
    private constructor(private readonly value: string) {}

    public static create(value: string): Email {
        const normalizedValue = value.trim().toLowerCase();

        if (!EMAIL_PATTERN.test(normalizedValue)) {
            throw new DomainError('Email format is invalid.', 'INVALID_EMAIL');
        }

        return new Email(normalizedValue);
    }

    public toString(): string {
        return this.value;
    }

    public equals(other: Email): boolean {
        return this.value === other.value;
    }
}
