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
    type createPrismaClient,
    HmacTokenService,
    InMemoryPasswordResetTokenStore,
    InMemorySecurityEventRepository,
    InMemorySessionRepository,
    InMemoryTransactionManager,
    InMemoryUserRepository,
    NoopLogger,
    PrismaPasswordResetTokenStore,
    PrismaSecurityEventRepository,
    PrismaSessionRepository,
    PrismaUserRepository,
    RandomIdGenerator,
    ScryptPasswordHasher,
    SystemClock,
} from '@codex-blog/infrastructure';

type PrismaClient = ReturnType<typeof createPrismaClient>;

class RequestCorrelationIdProvider implements CorrelationIdProvider {
    public constructor(private readonly getCurrentCorrelationId: () => string) {}

    public getCorrelationId(): string {
        return this.getCurrentCorrelationId();
    }
}

export const buildIdentityDependencies = (
    config: AppConfig,
    getCurrentCorrelationId: () => string,
    prisma?: PrismaClient
) => {
    const userRepository = prisma === undefined ? new InMemoryUserRepository() : new PrismaUserRepository(prisma);
    const sessionRepository =
        prisma === undefined ? new InMemorySessionRepository() : new PrismaSessionRepository(prisma);
    const securityEventRepository =
        prisma === undefined ? new InMemorySecurityEventRepository() : new PrismaSecurityEventRepository(prisma);
    const passwordResetTokenStore =
        prisma === undefined ? new InMemoryPasswordResetTokenStore() : new PrismaPasswordResetTokenStore(prisma);

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
        passwordResetTokenStore,
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
