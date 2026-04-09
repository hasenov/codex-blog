import {
    assertCanManageUsers,
    assertCanAssignRole,
    assertCanChangeStatus,
    DomainError,
    Email,
    EntityId,
    Session,
    type SecurityEventRepository,
    type SessionRepository,
    UtcDateTime,
    User,
    type UserRepository,
    type UserRole,
    type UserStatus,
} from '@codex-blog/domain';

import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../shared/errors/application-error.js';
import type {
    Clock,
    CorrelationIdProvider,
    IdGenerator,
    Logger,
    NotificationPort,
    PasswordHasher,
    TransactionManager,
} from '../shared/ports/core.js';
import type { TokenService } from '../shared/ports/token-service.js';
import type { AuthenticatedUserDto, SessionTokensDto, UserDto } from './dto.js';
import { toUserDto } from './mappers.js';
import type { PasswordResetTokenStore } from './ports/password-reset-token-store.js';

interface IdentityUseCaseDependencies {
    userRepository: UserRepository;
    sessionRepository: SessionRepository;
    securityEventRepository: SecurityEventRepository;
    passwordHasher: PasswordHasher;
    tokenService: TokenService;
    idGenerator: IdGenerator;
    clock: Clock;
    logger: Logger;
    correlationIdProvider: CorrelationIdProvider;
    transactionManager: TransactionManager;
    passwordResetTokenStore: PasswordResetTokenStore;
    notificationPort: NotificationPort;
    refreshTokenTtlDays: number;
}

interface ActorContext {
    userId: string;
    role: UserRole;
}

interface RegisterUserInput {
    email: string;
    displayName: string;
    password: string;
}

interface LoginInput {
    email: string;
    password: string;
}

interface RefreshInput {
    refreshToken: string;
}

interface LogoutInput {
    refreshToken: string;
}

interface ForgotPasswordInput {
    email: string;
}

interface ResetPasswordInput {
    token: string;
    nextPassword: string;
}

interface ChangeUserRoleInput {
    actor: ActorContext;
    targetUserId: string;
    nextRole: UserRole;
}

interface ChangeUserStatusInput {
    actor: ActorContext;
    targetUserId: string;
    nextStatus: UserStatus;
}

interface GetCurrentUserInput {
    userId: string;
}

const ensurePasswordStrength = (password: string): void => {
    if (password.trim().length < 8) {
        throw new UnauthorizedError('Password must be at least 8 characters long.', 'WEAK_PASSWORD');
    }
};

const toEventMetadata = (metadata: Readonly<Record<string, string>>): Readonly<Record<string, string>> => metadata;

export class RegisterUserUseCase {
    public constructor(private readonly dependencies: IdentityUseCaseDependencies) {}

    public async execute(input: RegisterUserInput): Promise<AuthenticatedUserDto> {
        ensurePasswordStrength(input.password);

        return this.dependencies.transactionManager.runInTransaction(async () => {
            const email = Email.create(input.email);
            const existingUser = await this.dependencies.userRepository.findByEmail(email.toString());

            if (existingUser !== null) {
                throw new ConflictError('User with this email already exists.', 'USER_ALREADY_EXISTS');
            }

            const now = UtcDateTime.create(this.dependencies.clock.now());
            const passwordHash = await this.dependencies.passwordHasher.hash(input.password);
            const user = User.register({
                id: EntityId.create(this.dependencies.idGenerator.generate()),
                email,
                displayName: input.displayName,
                passwordHash,
                createdAt: now,
            });

            await this.dependencies.userRepository.save(user);
            await this.recordSecurityEvent('register', user.id.toString(), now, {
                email: user.email.toString(),
            });

            return this.createAuthenticatedResult(user, now);
        });
    }

    private async createAuthenticatedResult(user: User, now: UtcDateTime): Promise<AuthenticatedUserDto> {
        const session = Session.create({
            id: EntityId.create(this.dependencies.idGenerator.generate()),
            userId: user.id,
            refreshTokenId: this.dependencies.idGenerator.generate(),
            createdAt: now,
            expiresAt: UtcDateTime.create(
                new Date(now.toDate().getTime() + this.dependencies.refreshTokenTtlDays * 24 * 60 * 60 * 1000)
            ),
        });

        await this.dependencies.sessionRepository.save(session);
        const tokens = await issueSessionTokens(this.dependencies.tokenService, user, session);

        return {
            user: toUserDto(user),
            tokens,
        };
    }

    private async recordSecurityEvent(
        type: 'register',
        userId: string,
        occurredAt: UtcDateTime,
        metadata: Readonly<Record<string, string>>
    ): Promise<void> {
        await this.dependencies.securityEventRepository.append({
            type,
            userId,
            occurredAt: occurredAt.toISOString(),
            correlationId: this.dependencies.correlationIdProvider.getCorrelationId(),
            metadata: toEventMetadata(metadata),
        });
    }
}

export class LoginUseCase {
    public constructor(private readonly dependencies: IdentityUseCaseDependencies) {}

    public async execute(input: LoginInput): Promise<AuthenticatedUserDto> {
        const user = await this.dependencies.userRepository.findByEmail(Email.create(input.email).toString());

        if (user === null) {
            throw new UnauthorizedError('Invalid credentials.', 'INVALID_CREDENTIALS');
        }

        user.ensureCanAuthenticate();
        const isPasswordValid = await this.dependencies.passwordHasher.verify(input.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid credentials.', 'INVALID_CREDENTIALS');
        }

        const now = UtcDateTime.create(this.dependencies.clock.now());
        const session = Session.create({
            id: EntityId.create(this.dependencies.idGenerator.generate()),
            userId: user.id,
            refreshTokenId: this.dependencies.idGenerator.generate(),
            createdAt: now,
            expiresAt: UtcDateTime.create(
                new Date(now.toDate().getTime() + this.dependencies.refreshTokenTtlDays * 24 * 60 * 60 * 1000)
            ),
        });

        await this.dependencies.sessionRepository.save(session);
        await this.dependencies.securityEventRepository.append({
            type: 'login',
            userId: user.id.toString(),
            occurredAt: now.toISOString(),
            correlationId: this.dependencies.correlationIdProvider.getCorrelationId(),
        });

        this.dependencies.logger.info('User logged in.', {
            userId: user.id.toString(),
            correlationId: this.dependencies.correlationIdProvider.getCorrelationId(),
        });

        return {
            user: toUserDto(user),
            tokens: await issueSessionTokens(this.dependencies.tokenService, user, session),
        };
    }
}

export class RefreshSessionUseCase {
    public constructor(private readonly dependencies: IdentityUseCaseDependencies) {}

    public async execute(input: RefreshInput): Promise<AuthenticatedUserDto> {
        const payload = await this.dependencies.tokenService.verifyRefreshToken(input.refreshToken);
        const session = await this.dependencies.sessionRepository.findById(payload.sessionId);

        if (session === null) {
            throw new UnauthorizedError('Refresh session was not found.', 'SESSION_NOT_FOUND');
        }

        const now = UtcDateTime.create(this.dependencies.clock.now());

        if (!session.isActive(now)) {
            throw new UnauthorizedError('Refresh session is not active.', 'SESSION_INACTIVE');
        }

        const user = await this.dependencies.userRepository.findById(payload.userId);

        if (user === null) {
            throw new UnauthorizedError('User was not found for this session.', 'USER_NOT_FOUND');
        }

        user.ensureCanAuthenticate();

        const rotatedSession = Session.create({
            id: EntityId.create(this.dependencies.idGenerator.generate()),
            userId: user.id,
            refreshTokenId: this.dependencies.idGenerator.generate(),
            createdAt: now,
            expiresAt: UtcDateTime.create(
                new Date(now.toDate().getTime() + this.dependencies.refreshTokenTtlDays * 24 * 60 * 60 * 1000)
            ),
        });

        session.revoke(now, rotatedSession.id);
        await this.dependencies.sessionRepository.save(session);
        await this.dependencies.sessionRepository.save(rotatedSession);
        await this.dependencies.securityEventRepository.append({
            type: 'refresh',
            userId: user.id.toString(),
            occurredAt: now.toISOString(),
            correlationId: this.dependencies.correlationIdProvider.getCorrelationId(),
        });

        return {
            user: toUserDto(user),
            tokens: await issueSessionTokens(this.dependencies.tokenService, user, rotatedSession),
        };
    }
}

export class LogoutUseCase {
    public constructor(private readonly dependencies: IdentityUseCaseDependencies) {}

    public async execute(input: LogoutInput): Promise<void> {
        const payload = await this.dependencies.tokenService.verifyRefreshToken(input.refreshToken);
        const session = await this.dependencies.sessionRepository.findById(payload.sessionId);

        if (session === null) {
            return;
        }

        const now = UtcDateTime.create(this.dependencies.clock.now());
        session.revoke(now);
        await this.dependencies.sessionRepository.save(session);
        await this.dependencies.securityEventRepository.append({
            type: 'logout',
            userId: payload.userId,
            occurredAt: now.toISOString(),
            correlationId: this.dependencies.correlationIdProvider.getCorrelationId(),
        });
    }
}

export class GetCurrentUserUseCase {
    public constructor(private readonly dependencies: IdentityUseCaseDependencies) {}

    public async execute(input: GetCurrentUserInput): Promise<UserDto> {
        const user = await this.dependencies.userRepository.findById(input.userId);

        if (user === null) {
            throw new NotFoundError('User was not found.', 'USER_NOT_FOUND');
        }

        return toUserDto(user);
    }
}

export class GetUserByIdUseCase {
    public constructor(private readonly dependencies: IdentityUseCaseDependencies) {}

    public async execute(actor: ActorContext, userId: string): Promise<UserDto> {
        assertCanManageUsers(actor.role);
        const user = await this.dependencies.userRepository.findById(userId);

        if (user === null) {
            throw new NotFoundError('User was not found.', 'USER_NOT_FOUND');
        }

        return toUserDto(user);
    }
}

export class ListUsersUseCase {
    public constructor(private readonly dependencies: IdentityUseCaseDependencies) {}

    public async execute(actor: ActorContext): Promise<UserDto[]> {
        assertCanManageUsers(actor.role);
        const users = await this.dependencies.userRepository.list();
        return users.map((user) => toUserDto(user));
    }
}

export class ChangeUserRoleUseCase {
    public constructor(private readonly dependencies: IdentityUseCaseDependencies) {}

    public async execute(input: ChangeUserRoleInput): Promise<UserDto> {
        try {
            assertCanAssignRole(input.actor.role, input.nextRole);
        } catch (error) {
            throw mapDomainError(error);
        }

        const user = await this.dependencies.userRepository.findById(input.targetUserId);

        if (user === null) {
            throw new NotFoundError('User was not found.', 'USER_NOT_FOUND');
        }

        const now = UtcDateTime.create(this.dependencies.clock.now());
        user.changeRole(input.nextRole, now);
        await this.dependencies.userRepository.save(user);
        await this.dependencies.securityEventRepository.append({
            type: 'role_changed',
            userId: user.id.toString(),
            occurredAt: now.toISOString(),
            correlationId: this.dependencies.correlationIdProvider.getCorrelationId(),
            metadata: {
                actorUserId: input.actor.userId,
                nextRole: input.nextRole,
            },
        });

        return toUserDto(user);
    }
}

export class ChangeUserStatusUseCase {
    public constructor(private readonly dependencies: IdentityUseCaseDependencies) {}

    public async execute(input: ChangeUserStatusInput): Promise<UserDto> {
        try {
            assertCanChangeStatus(input.actor.role, input.nextStatus);
        } catch (error) {
            throw mapDomainError(error);
        }

        const user = await this.dependencies.userRepository.findById(input.targetUserId);

        if (user === null) {
            throw new NotFoundError('User was not found.', 'USER_NOT_FOUND');
        }

        const now = UtcDateTime.create(this.dependencies.clock.now());
        user.changeStatus(input.nextStatus, now);
        await this.dependencies.userRepository.save(user);
        await this.dependencies.securityEventRepository.append({
            type: 'status_changed',
            userId: user.id.toString(),
            occurredAt: now.toISOString(),
            correlationId: this.dependencies.correlationIdProvider.getCorrelationId(),
            metadata: {
                actorUserId: input.actor.userId,
                nextStatus: input.nextStatus,
            },
        });

        return toUserDto(user);
    }
}

export class ForgotPasswordUseCase {
    public constructor(private readonly dependencies: IdentityUseCaseDependencies) {}

    public async execute(input: ForgotPasswordInput): Promise<void> {
        const user = await this.dependencies.userRepository.findByEmail(Email.create(input.email).toString());

        if (user === null) {
            return;
        }

        const now = this.dependencies.clock.now();
        const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
        const token = this.dependencies.idGenerator.generate();

        await this.dependencies.passwordResetTokenStore.save(user.id.toString(), token, expiresAt.toISOString());
        await this.dependencies.notificationPort.sendPasswordResetInstructions(user.email.toString(), token);
    }
}

export class ResetPasswordUseCase {
    public constructor(private readonly _dependencies: IdentityUseCaseDependencies) {}

    public execute(input: ResetPasswordInput): Promise<void> {
        void input;
        throw new ForbiddenError(
            'Reset password token verification is reserved for a later infrastructure milestone.',
            'RESET_PASSWORD_NOT_READY'
        );
    }
}

const issueSessionTokens = async (
    tokenService: TokenService,
    user: User,
    session: Session
): Promise<SessionTokensDto> => {
    const accessToken = await tokenService.issueAccessToken({
        kind: 'access',
        userId: user.id.toString(),
        sessionId: session.id.toString(),
        role: user.role,
    });
    const refreshToken = await tokenService.issueRefreshToken({
        kind: 'refresh',
        userId: user.id.toString(),
        sessionId: session.id.toString(),
    });

    return {
        accessToken: accessToken.token,
        refreshToken: refreshToken.token,
        accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
        refreshTokenExpiresAt: refreshToken.expiresAt.toISOString(),
    };
};

const mapDomainError = (error: unknown): Error => {
    if (error instanceof DomainError) {
        return new ForbiddenError(error.message, error.code);
    }

    return error instanceof Error ? error : new Error('Unknown error');
};
