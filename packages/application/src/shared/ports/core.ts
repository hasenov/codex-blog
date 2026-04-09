export interface Clock {
    now(): Date;
}

export interface IdGenerator {
    generate(): string;
}

export interface PasswordHasher {
    hash(value: string): Promise<string>;
    verify(value: string, hash: string): Promise<boolean>;
}

export interface Logger {
    info(message: string, metadata?: Readonly<Record<string, string>>): void;
    warn(message: string, metadata?: Readonly<Record<string, string>>): void;
    error(message: string, metadata?: Readonly<Record<string, string>>): void;
}

export interface CorrelationIdProvider {
    getCorrelationId(): string;
}

export interface TransactionManager {
    runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}

export interface NotificationPort {
    sendPasswordResetInstructions(email: string, token: string): Promise<void>;
}
