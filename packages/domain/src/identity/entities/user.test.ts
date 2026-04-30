import { describe, expect, it } from 'vitest';

import { Email } from '../../shared/value-objects/email.js';
import { EntityId } from '../../shared/value-objects/entity-id.js';
import { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';
import { User } from './user.js';

describe('User', () => {
    const createUser = (): User => {
        const now = UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z');

        return User.register({
            id: EntityId.create('user-0001'),
            email: Email.create('user@example.com'),
            displayName: 'Reader',
            passwordHash: 'hash',
            createdAt: now,
        });
    };

    it('registers reader with active status', () => {
        const user = createUser();

        expect(user.role).toBe('reader');
        expect(user.status).toBe('active');
    });

    it('blocks authentication when suspended', () => {
        const now = UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z');
        const user = User.register({
            id: EntityId.create('user-0002'),
            email: Email.create('user2@example.com'),
            displayName: 'Reader',
            passwordHash: 'hash',
            createdAt: now,
        });

        user.changeStatus('suspended', now);

        expect(() => user.ensureCanAuthenticate()).toThrowError(/not active/i);
    });

    it('changes password hash and timestamp', () => {
        const user = createUser();
        const changedAt = UtcDateTime.fromISOString('2026-01-03T00:00:00.000Z');

        user.changePassword('next-password-hash', changedAt);

        expect(user.passwordHash).toBe('next-password-hash');
        expect(user.updatedAt.toISOString()).toBe('2026-01-03T00:00:00.000Z');
    });
});
