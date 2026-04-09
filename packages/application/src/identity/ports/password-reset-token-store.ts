export interface PasswordResetTokenStore {
    save(userId: string, token: string, expiresAt: string): Promise<void>;
}
