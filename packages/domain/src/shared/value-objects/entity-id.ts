import { DomainError } from '../errors/domain-error.js';

export class EntityId {
    private constructor(private readonly value: string) {}

    public static create(value: string): EntityId {
        const normalizedValue = value.trim();

        if (normalizedValue.length < 8) {
            throw new DomainError('Entity id must be at least 8 characters long.', 'INVALID_ENTITY_ID');
        }

        return new EntityId(normalizedValue);
    }

    public toString(): string {
        return this.value;
    }

    public equals(other: EntityId): boolean {
        return this.value === other.value;
    }
}
