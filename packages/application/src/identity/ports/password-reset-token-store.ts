export interface PasswordResetTokenRecord {
    expiresAt: string;
    userId: string;
}

export interface PasswordResetTokenStore {
    save(userId: string, token: string, expiresAt: string): Promise<void>;
    findByToken(token: string): Promise<PasswordResetTokenRecord | null>;
    consume(token: string): Promise<PasswordResetTokenRecord | null>;
    deleteExpired(nowIso: string): Promise<void>;
}
