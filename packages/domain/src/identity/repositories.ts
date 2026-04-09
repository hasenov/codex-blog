import type { Session } from './entities/session.js';
import type { User } from './entities/user.js';
import type { SecurityEventType } from './identity.types.js';

export interface SecurityEvent {
    type: SecurityEventType;
    userId: string;
    occurredAt: string;
    correlationId: string;
    metadata?: Readonly<Record<string, string>>;
}

export interface UserRepository {
    save(user: User): Promise<void>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    list(): Promise<User[]>;
}

export interface SessionRepository {
    save(session: Session): Promise<void>;
    findById(id: string): Promise<Session | null>;
    revokeAllForUser(userId: string, revokedAtIso: string): Promise<void>;
}

export interface SecurityEventRepository {
    append(event: SecurityEvent): Promise<void>;
    listByUserId(userId: string): Promise<SecurityEvent[]>;
}
