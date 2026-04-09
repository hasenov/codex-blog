import type { CorrelationIdProvider } from '@codex-blog/application';
import {
    ChangeUserRoleUseCase,
    ChangeUserStatusUseCase,
    ForgotPasswordUseCase,
    GetCurrentUserUseCase,
    GetUserByIdUseCase,
    ListUsersUseCase,
    LoginUseCase,
    LogoutUseCase,
    RefreshSessionUseCase,
    RegisterUserUseCase,
    ResetPasswordUseCase,
} from '@codex-blog/application';
import type { AppConfig } from '@codex-blog/config';
import {
    ConsoleNotificationPort,
    HmacTokenService,
    InMemoryPasswordResetTokenStore,
    InMemorySecurityEventRepository,
    InMemorySessionRepository,
    InMemoryTransactionManager,
    InMemoryUserRepository,
    NoopLogger,
    RandomIdGenerator,
    ScryptPasswordHasher,
    SystemClock,
} from '@codex-blog/infrastructure';

class RequestCorrelationIdProvider implements CorrelationIdProvider {
    public constructor(private readonly getCurrentCorrelationId: () => string) {}

    public getCorrelationId(): string {
        return this.getCurrentCorrelationId();
    }
}

export const buildIdentityDependencies = (config: AppConfig, getCurrentCorrelationId: () => string) => {
    const userRepository = new InMemoryUserRepository();
    const sessionRepository = new InMemorySessionRepository();
    const securityEventRepository = new InMemorySecurityEventRepository();

    const commonDependencies = {
        userRepository,
        sessionRepository,
        securityEventRepository,
        passwordHasher: new ScryptPasswordHasher(),
        tokenService: new HmacTokenService(
            config.JWT_ACCESS_SECRET,
            config.JWT_REFRESH_SECRET,
            config.ACCESS_TOKEN_TTL_MINUTES,
            config.REFRESH_TOKEN_TTL_DAYS
        ),
        idGenerator: new RandomIdGenerator(),
        clock: new SystemClock(),
        logger: new NoopLogger(),
        correlationIdProvider: new RequestCorrelationIdProvider(getCurrentCorrelationId),
        transactionManager: new InMemoryTransactionManager(),
        passwordResetTokenStore: new InMemoryPasswordResetTokenStore(),
        notificationPort: new ConsoleNotificationPort(),
        refreshTokenTtlDays: config.REFRESH_TOKEN_TTL_DAYS,
    };

    return {
        tokenService: commonDependencies.tokenService,
        registerUser: new RegisterUserUseCase(commonDependencies),
        login: new LoginUseCase(commonDependencies),
        refreshSession: new RefreshSessionUseCase(commonDependencies),
        logout: new LogoutUseCase(commonDependencies),
        getCurrentUser: new GetCurrentUserUseCase(commonDependencies),
        getUserById: new GetUserByIdUseCase(commonDependencies),
        listUsers: new ListUsersUseCase(commonDependencies),
        changeUserRole: new ChangeUserRoleUseCase(commonDependencies),
        changeUserStatus: new ChangeUserStatusUseCase(commonDependencies),
        forgotPassword: new ForgotPasswordUseCase(commonDependencies),
        resetPassword: new ResetPasswordUseCase(commonDependencies),
    };
};
