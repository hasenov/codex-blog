import { DomainError } from '../../shared/errors/domain-error.js';
import type { UserRole, UserStatus } from '../identity.types.js';

const MANAGEABLE_ROLES: UserRole[] = ['reader', 'author', 'editor', 'admin'];
const MANAGEABLE_STATUSES: UserStatus[] = ['active', 'suspended', 'invited'];

export const assertCanManageUsers = (actorRole: UserRole): void => {
    if (actorRole !== 'admin') {
        throw new DomainError('Only admins can manage users.', 'INSUFFICIENT_ROLE');
    }
};

export const assertCanAssignRole = (actorRole: UserRole, nextRole: UserRole): void => {
    assertCanManageUsers(actorRole);

    if (!MANAGEABLE_ROLES.includes(nextRole)) {
        throw new DomainError('Role is not manageable.', 'INVALID_ROLE');
    }
};

export const assertCanChangeStatus = (actorRole: UserRole, nextStatus: UserStatus): void => {
    assertCanManageUsers(actorRole);

    if (!MANAGEABLE_STATUSES.includes(nextStatus)) {
        throw new DomainError('Status is not manageable.', 'INVALID_STATUS');
    }
};
