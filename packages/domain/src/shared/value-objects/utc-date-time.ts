import { DomainError } from '../errors/domain-error.js';

export class UtcDateTime {
    private constructor(private readonly value: Date) {}

    public static create(value: Date): UtcDateTime {
        if (Number.isNaN(value.getTime())) {
            throw new DomainError('Date value is invalid.', 'INVALID_DATE_TIME');
        }

        return new UtcDateTime(new Date(value.toISOString()));
    }

    public static fromISOString(value: string): UtcDateTime {
        return UtcDateTime.create(new Date(value));
    }

    public toDate(): Date {
        return new Date(this.value.toISOString());
    }

    public toISOString(): string {
        return this.value.toISOString();
    }

    public isBefore(other: UtcDateTime): boolean {
        return this.value.getTime() < other.value.getTime();
    }

    public isAfter(other: UtcDateTime): boolean {
        return this.value.getTime() > other.value.getTime();
    }
}
