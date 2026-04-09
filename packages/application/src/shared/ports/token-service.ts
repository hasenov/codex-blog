export interface AccessTokenPayload {
    kind: 'access';
    userId: string;
    sessionId: string;
    role: string;
}

export interface RefreshTokenPayload {
    kind: 'refresh';
    userId: string;
    sessionId: string;
}

export interface IssuedToken {
    token: string;
    expiresAt: Date;
}

export interface TokenService {
    issueAccessToken(payload: AccessTokenPayload): Promise<IssuedToken>;
    issueRefreshToken(payload: RefreshTokenPayload): Promise<IssuedToken>;
    verifyAccessToken(token: string): Promise<AccessTokenPayload>;
    verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
}
