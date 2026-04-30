export const USER_ROLES = ['admin', 'editor', 'author', 'reader'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'suspended', 'invited'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const SECURITY_EVENT_TYPES = [
    'login',
    'refresh',
    'logout',
    'register',
    'role_changed',
    'status_changed',
    'password_reset',
] as const;
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];
