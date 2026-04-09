import { createHmac, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

import type {
    AccessTokenPayload,
    Clock,
    CorrelationIdProvider,
    IdGenerator,
    IssuedToken,
    Logger,
    NotificationPort,
    PasswordHasher,
    RefreshTokenPayload,
    TokenService,
    TransactionManager,
} from '@codex-blog/application';

interface SignedTokenPayload {
    exp: number;
    kind: 'access' | 'refresh';
    role?: string;
    sid: string;
    sub: string;
}

const encodeBase64Url = (value: string): string => Buffer.from(value).toString('base64url');
const decodeBase64Url = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

const signPayload = (payload: SignedTokenPayload, secret: string): string => {
    const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = createHmac('sha256', secret).update(`${header}.${encodedPayload}`).digest('base64url');

    return `${header}.${encodedPayload}.${signature}`;
};

const verifyToken = (token: string, secret: string): SignedTokenPayload => {
    const [header, payload, signature] = token.split('.');

    if (header === undefined || payload === undefined || signature === undefined) {
        throw new Error('Token format is invalid.');
    }

    const expectedSignature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
        throw new Error('Token signature is invalid.');
    }

    if (!timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
        throw new Error('Token signature is invalid.');
    }

    const parsedPayload = JSON.parse(decodeBase64Url(payload)) as SignedTokenPayload;

    if (parsedPayload.exp * 1000 <= Date.now()) {
        throw new Error('Token has expired.');
    }

    return parsedPayload;
};

export class SystemClock implements Clock {
    public now(): Date {
        return new Date();
    }
}

export class RandomIdGenerator implements IdGenerator {
    public generate(): string {
        return randomUUID();
    }
}

export class ScryptPasswordHasher implements PasswordHasher {
    public hash(value: string): Promise<string> {
        const salt = randomUUID();
        const derivedKey = scryptSync(value, salt, 64).toString('hex');
        return Promise.resolve(`${salt}:${derivedKey}`);
    }

    public verify(value: string, hash: string): Promise<boolean> {
        const [salt, storedHash] = hash.split(':');

        if (salt === undefined || storedHash === undefined) {
            return Promise.resolve(false);
        }

        const candidateHash = scryptSync(value, salt, 64).toString('hex');
        return Promise.resolve(timingSafeEqual(Buffer.from(candidateHash), Buffer.from(storedHash)));
    }
}

export class HmacTokenService implements TokenService {
    public constructor(
        private readonly accessSecret: string,
        private readonly refreshSecret: string,
        private readonly accessTtlMinutes: number,
        private readonly refreshTtlDays: number
    ) {}

    public issueAccessToken(payload: AccessTokenPayload): Promise<IssuedToken> {
        const expiresAt = new Date(Date.now() + this.accessTtlMinutes * 60 * 1000);
        return Promise.resolve({
            token: signPayload(
                {
                    exp: Math.floor(expiresAt.getTime() / 1000),
                    kind: payload.kind,
                    role: payload.role,
                    sid: payload.sessionId,
                    sub: payload.userId,
                },
                this.accessSecret
            ),
            expiresAt,
        });
    }

    public issueRefreshToken(payload: RefreshTokenPayload): Promise<IssuedToken> {
        const expiresAt = new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
        return Promise.resolve({
            token: signPayload(
                {
                    exp: Math.floor(expiresAt.getTime() / 1000),
                    kind: payload.kind,
                    sid: payload.sessionId,
                    sub: payload.userId,
                },
                this.refreshSecret
            ),
            expiresAt,
        });
    }

    public verifyAccessToken(token: string): Promise<AccessTokenPayload> {
        const payload = verifyToken(token, this.accessSecret);

        if (payload.kind !== 'access' || payload.role === undefined) {
            throw new Error('Access token kind is invalid.');
        }

        return Promise.resolve({
            kind: 'access',
            userId: payload.sub,
            sessionId: payload.sid,
            role: payload.role,
        });
    }

    public verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
        const payload = verifyToken(token, this.refreshSecret);

        if (payload.kind !== 'refresh') {
            throw new Error('Refresh token kind is invalid.');
        }

        return Promise.resolve({
            kind: 'refresh',
            userId: payload.sub,
            sessionId: payload.sid,
        });
    }
}

export class NoopLogger implements Logger {
    public info(message: string, metadata?: Readonly<Record<string, string>>): void {
        void message;
        void metadata;
    }

    public warn(message: string, metadata?: Readonly<Record<string, string>>): void {
        void message;
        void metadata;
    }

    public error(message: string, metadata?: Readonly<Record<string, string>>): void {
        void message;
        void metadata;
    }
}

export class StaticCorrelationIdProvider implements CorrelationIdProvider {
    public constructor(private readonly correlationId: string) {}

    public getCorrelationId(): string {
        return this.correlationId;
    }
}

export class InMemoryTransactionManager implements TransactionManager {
    public async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
        return work();
    }
}

export class ConsoleNotificationPort implements NotificationPort {
    public sendPasswordResetInstructions(email: string, token: string): Promise<void> {
        console.info(`Password reset requested for ${email}: ${token}`);
        return Promise.resolve();
    }
}
