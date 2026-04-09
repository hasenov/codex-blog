import { DomainError } from '../../shared/errors/domain-error.js';
import type { Email } from '../../shared/value-objects/email.js';
import type { EntityId } from '../../shared/value-objects/entity-id.js';
import type { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';
import type { UserRole, UserStatus } from '../identity.types.js';

export interface UserProps {
    id: EntityId;
    email: Email;
    displayName: string;
    role: UserRole;
    status: UserStatus;
    passwordHash: string;
    createdAt: UtcDateTime;
    updatedAt: UtcDateTime;
}

export interface RegisterUserProps {
    id: EntityId;
    email: Email;
    displayName: string;
    passwordHash: string;
    createdAt: UtcDateTime;
}

export class User {
    private constructor(private props: UserProps) {}

    public static register(props: RegisterUserProps): User {
        User.ensureDisplayName(props.displayName);

        return new User({
            ...props,
            role: 'reader',
            status: 'active',
            updatedAt: props.createdAt,
        });
    }

    public static rehydrate(props: UserProps): User {
        User.ensureDisplayName(props.displayName);
        return new User(props);
    }

    public get id(): EntityId {
        return this.props.id;
    }

    public get email(): Email {
        return this.props.email;
    }

    public get displayName(): string {
        return this.props.displayName;
    }

    public get role(): UserRole {
        return this.props.role;
    }

    public get status(): UserStatus {
        return this.props.status;
    }

    public get passwordHash(): string {
        return this.props.passwordHash;
    }

    public get createdAt(): UtcDateTime {
        return this.props.createdAt;
    }

    public get updatedAt(): UtcDateTime {
        return this.props.updatedAt;
    }

    public ensureCanAuthenticate(): void {
        if (this.props.status !== 'active') {
            throw new DomainError('User account is not active.', 'USER_NOT_ACTIVE');
        }
    }

    public changeRole(role: UserRole, changedAt: UtcDateTime): void {
        if (this.props.role === role) {
            return;
        }

        this.props = {
            ...this.props,
            role,
            updatedAt: changedAt,
        };
    }

    public changeStatus(status: UserStatus, changedAt: UtcDateTime): void {
        if (this.props.status === status) {
            return;
        }

        this.props = {
            ...this.props,
            status,
            updatedAt: changedAt,
        };
    }

    public toPrimitives(): UserProps {
        return this.props;
    }

    private static ensureDisplayName(value: string): void {
        if (value.trim().length < 2) {
            throw new DomainError('Display name must be at least 2 characters long.', 'INVALID_DISPLAY_NAME');
        }
    }
}
