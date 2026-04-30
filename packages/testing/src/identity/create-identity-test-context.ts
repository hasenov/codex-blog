import type { CorrelationIdProvider, Logger } from '@codex-blog/application';

import {
    HmacTokenService,
    InMemoryPasswordResetTokenStore,
    InMemorySecurityEventRepository,
    InMemorySessionRepository,
    InMemoryTransactionManager,
    InMemoryUserRepository,
    RandomIdGenerator,
    ScryptPasswordHasher,
} from '@codex-blog/infrastructure';

class FixedClock {
    private current = new Date('2026-01-01T00:00:00.000Z');

    public now(): Date {
        return this.current;
    }

    public setCurrent(value: Date): void {
        this.current = value;
    }
}

class FixedCorrelationIdProvider implements CorrelationIdProvider {
    public getCorrelationId(): string {
        return 'correlation-test-id';
    }
}

class TestLogger implements Logger {
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

class TestNotificationPort {
    public readonly sentPasswordResetInstructions: Array<{ email: string; token: string }> = [];

    public sendPasswordResetInstructions(email: string, token: string): Promise<void> {
        this.sentPasswordResetInstructions.push({ email, token });
        return Promise.resolve();
    }
}

export const createIdentityTestContext = () => {
    const clock = new FixedClock();
    const notificationPort = new TestNotificationPort();

    return {
        dependencies: {
            userRepository: new InMemoryUserRepository(),
            sessionRepository: new InMemorySessionRepository(),
            securityEventRepository: new InMemorySecurityEventRepository(),
            passwordHasher: new ScryptPasswordHasher(),
            tokenService: new HmacTokenService(
                'access-secret-1234567890-access',
                'refresh-secret-123456789-refresh',
                15,
                30
            ),
            idGenerator: new RandomIdGenerator(),
            clock,
            logger: new TestLogger(),
            correlationIdProvider: new FixedCorrelationIdProvider(),
            transactionManager: new InMemoryTransactionManager(),
            passwordResetTokenStore: new InMemoryPasswordResetTokenStore(),
            notificationPort,
            refreshTokenTtlDays: 30,
        },
        clock,
        notificationPort,
    };
};
