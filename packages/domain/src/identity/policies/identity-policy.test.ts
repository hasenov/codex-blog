import { describe, expect, it } from 'vitest';

import { DomainError } from '../../shared/errors/domain-error.js';
import { assertCanAssignRole, assertCanChangeStatus, assertCanManageUsers } from './identity-policy.js';

describe('identity policy', () => {
    it('allows admins to manage users', () => {
        expect(() => assertCanManageUsers('admin')).not.toThrow();
    });

    it('rejects non-admin user management', () => {
        expect(() => assertCanManageUsers('editor')).toThrow(DomainError);
        expect(() => assertCanAssignRole('author', 'editor')).toThrow(DomainError);
        expect(() => assertCanChangeStatus('reader', 'suspended')).toThrow(DomainError);
    });

    it('allows admins to assign roles and change statuses', () => {
        expect(() => assertCanAssignRole('admin', 'editor')).not.toThrow();
        expect(() => assertCanChangeStatus('admin', 'suspended')).not.toThrow();
    });
});
