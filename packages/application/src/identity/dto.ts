import type { UserRole, UserStatus } from '@codex-blog/domain';

export interface UserDto {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
    status: UserStatus;
    createdAt: string;
    updatedAt: string;
}

export interface SessionTokensDto {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
}

export interface AuthenticatedUserDto {
    user: UserDto;
    tokens: SessionTokensDto;
}
