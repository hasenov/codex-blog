import { DomainError } from '../../shared/errors/domain-error.js';
import type { EntityId } from '../../shared/value-objects/entity-id.js';
import type { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';

export interface SessionProps {
    id: EntityId;
    userId: EntityId;
    refreshTokenId: string;
    createdAt: UtcDateTime;
    expiresAt: UtcDateTime;
    revokedAt?: UtcDateTime;
    replacedBySessionId?: EntityId;
}

export interface CreateSessionProps {
    id: EntityId;
    userId: EntityId;
    refreshTokenId: string;
    createdAt: UtcDateTime;
    expiresAt: UtcDateTime;
}

export class Session {
    private constructor(private props: SessionProps) {}

    public static create(props: CreateSessionProps): Session {
        if (!props.expiresAt.isAfter(props.createdAt)) {
            throw new DomainError('Session expiration must be after creation time.', 'INVALID_SESSION_EXPIRATION');
        }

        return new Session(props);
    }

    public static rehydrate(props: SessionProps): Session {
        return new Session(props);
    }

    public get id(): EntityId {
        return this.props.id;
    }

    public get userId(): EntityId {
        return this.props.userId;
    }

    public get refreshTokenId(): string {
        return this.props.refreshTokenId;
    }

    public get expiresAt(): UtcDateTime {
        return this.props.expiresAt;
    }

    public isActive(now: UtcDateTime): boolean {
        return this.props.revokedAt === undefined && this.props.expiresAt.isAfter(now);
    }

    public revoke(revokedAt: UtcDateTime, replacedBySessionId?: EntityId): void {
        if (this.props.revokedAt !== undefined) {
            return;
        }

        this.props = replacedBySessionId === undefined
            ? {
                  ...this.props,
                  revokedAt,
              }
            : {
                  ...this.props,
                  revokedAt,
                  replacedBySessionId,
              };
    }

    public toPrimitives(): SessionProps {
        return this.props;
    }
}
