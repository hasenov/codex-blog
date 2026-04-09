import type { User } from '@codex-blog/domain';

import type { UserDto } from './dto.js';

export const toUserDto = (user: User): UserDto => ({
    id: user.id.toString(),
    email: user.email.toString(),
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
});
