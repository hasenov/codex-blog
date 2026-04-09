import {
    Session,
    type SecurityEvent,
    type SecurityEventRepository,
    type SessionRepository,
    UtcDateTime,
    User,
    type UserRepository,
} from '@codex-blog/domain';

import type { PasswordResetTokenStore } from '@codex-blog/application';

export class InMemoryUserRepository implements UserRepository {
    private readonly users = new Map<string, User>();

    public save(user: User): Promise<void> {
        this.users.set(user.id.toString(), User.rehydrate(user.toPrimitives()));
        return Promise.resolve();
    }

    public findById(id: string): Promise<User | null> {
        const user = this.users.get(id);
        return Promise.resolve(user === undefined ? null : User.rehydrate(user.toPrimitives()));
    }

    public findByEmail(email: string): Promise<User | null> {
        for (const user of this.users.values()) {
            if (user.email.toString() === email) {
                return Promise.resolve(User.rehydrate(user.toPrimitives()));
            }
        }

        return Promise.resolve(null);
    }

    public list(): Promise<User[]> {
        return Promise.resolve(Array.from(this.users.values(), (user) => User.rehydrate(user.toPrimitives())));
    }
}

export class InMemorySessionRepository implements SessionRepository {
    private readonly sessions = new Map<string, Session>();

    public save(session: Session): Promise<void> {
        this.sessions.set(session.id.toString(), Session.rehydrate(session.toPrimitives()));
        return Promise.resolve();
    }

    public findById(id: string): Promise<Session | null> {
        const session = this.sessions.get(id);
        return Promise.resolve(session === undefined ? null : Session.rehydrate(session.toPrimitives()));
    }

    public revokeAllForUser(userId: string, revokedAtIso: string): Promise<void> {
        const revokedAt = UtcDateTime.fromISOString(revokedAtIso);

        for (const session of this.sessions.values()) {
            if (session.userId.toString() === userId) {
                session.revoke(revokedAt);
                this.sessions.set(session.id.toString(), Session.rehydrate(session.toPrimitives()));
            }
        }

        return Promise.resolve();
    }
}

export class InMemorySecurityEventRepository implements SecurityEventRepository {
    private readonly events: SecurityEvent[] = [];

    public append(event: SecurityEvent): Promise<void> {
        this.events.push(event);
        return Promise.resolve();
    }

    public listByUserId(userId: string): Promise<SecurityEvent[]> {
        return Promise.resolve(this.events.filter((event) => event.userId === userId));
    }
}

export class InMemoryPasswordResetTokenStore implements PasswordResetTokenStore {
    private readonly tokens = new Map<string, { expiresAt: string; userId: string }>();

    public save(userId: string, token: string, expiresAt: string): Promise<void> {
        this.tokens.set(token, { expiresAt, userId });
        return Promise.resolve();
    }

    public get(token: string): { expiresAt: string; userId: string } | null {
        return this.tokens.get(token) ?? null;
    }
}
