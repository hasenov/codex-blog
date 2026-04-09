import { describe, expect, it } from 'vitest';

import { EntityId } from '../../shared/value-objects/entity-id.js';
import { UtcDateTime } from '../../shared/value-objects/utc-date-time.js';
import { Session } from './session.js';

describe('Session', () => {
    it('becomes inactive after revoke', () => {
        const createdAt = UtcDateTime.fromISOString('2026-01-01T00:00:00.000Z');
        const expiresAt = UtcDateTime.fromISOString('2026-01-02T00:00:00.000Z');
        const revokedAt = UtcDateTime.fromISOString('2026-01-01T12:00:00.000Z');
        const session = Session.create({
            id: EntityId.create('session-001'),
            userId: EntityId.create('user-0001'),
            refreshTokenId: 'refresh-001',
            createdAt,
            expiresAt,
        });

        session.revoke(revokedAt);

        expect(session.isActive(UtcDateTime.fromISOString('2026-01-01T13:00:00.000Z'))).toBe(false);
    });
});
