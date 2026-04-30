import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';

import type { PasswordResetTokenStore } from '@codex-blog/application';
import {
    Email,
    EntityId,
    Session,
    type SecurityEvent,
    type SecurityEventRepository,
    type SecurityEventType,
    type SessionRepository,
    UtcDateTime,
    User,
    type UserRepository,
    type UserRole,
    type UserStatus,
} from '@codex-blog/domain';

interface UserRecord {
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

interface SessionRecord {
    id: string;
    userId: string;
    refreshTokenId: string;
    createdAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
    replacedBySessionId: string | null;
}

interface SecurityEventRecord {
    type: string;
    userId: string;
    occurredAt: Date;
    correlationId: string;
    metadataJson: string | null;
}

const toUser = (record: UserRecord): User =>
    User.rehydrate({
        id: EntityId.create(record.id),
        email: Email.create(record.email),
        displayName: record.displayName,
        role: record.role as UserRole,
        status: record.status as UserStatus,
        passwordHash: record.passwordHash,
        createdAt: UtcDateTime.create(record.createdAt),
        updatedAt: UtcDateTime.create(record.updatedAt),
    });

const toSession = (record: SessionRecord): Session => {
    const revokedAt = record.revokedAt === null ? undefined : UtcDateTime.create(record.revokedAt);
    const replacedBySessionId =
        record.replacedBySessionId === null ? undefined : EntityId.create(record.replacedBySessionId);

    return Session.rehydrate({
        id: EntityId.create(record.id),
        userId: EntityId.create(record.userId),
        refreshTokenId: record.refreshTokenId,
        createdAt: UtcDateTime.create(record.createdAt),
        expiresAt: UtcDateTime.create(record.expiresAt),
        ...(revokedAt === undefined ? {} : { revokedAt }),
        ...(replacedBySessionId === undefined ? {} : { replacedBySessionId }),
    });
};

const parseMetadata = (metadataJson: string | null): Readonly<Record<string, string>> | undefined => {
    if (metadataJson === null) {
        return undefined;
    }

    const parsed = JSON.parse(metadataJson) as unknown;

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return undefined;
    }

    const metadata: Record<string, string> = {};

    for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') {
            metadata[key] = value;
        }
    }

    return metadata;
};

const toSecurityEvent = (record: SecurityEventRecord): SecurityEvent => {
    const metadata = parseMetadata(record.metadataJson);

    return {
        type: record.type as SecurityEventType,
        userId: record.userId,
        occurredAt: UtcDateTime.create(record.occurredAt).toISOString(),
        correlationId: record.correlationId,
        ...(metadata === undefined ? {} : { metadata }),
    };
};

export class PrismaUserRepository implements UserRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public async save(user: User): Promise<void> {
        const props = user.toPrimitives();

        await this.prisma.user.upsert({
            where: {
                id: props.id.toString(),
            },
            create: {
                id: props.id.toString(),
                email: props.email.toString(),
                displayName: props.displayName,
                role: props.role,
                status: props.status,
                passwordHash: props.passwordHash,
                createdAt: props.createdAt.toDate(),
                updatedAt: props.updatedAt.toDate(),
            },
            update: {
                email: props.email.toString(),
                displayName: props.displayName,
                role: props.role,
                status: props.status,
                passwordHash: props.passwordHash,
                updatedAt: props.updatedAt.toDate(),
            },
        });
    }

    public async findById(id: string): Promise<User | null> {
        const record = await this.prisma.user.findUnique({
            where: {
                id,
            },
        });

        return record === null ? null : toUser(record);
    }

    public async findByEmail(email: string): Promise<User | null> {
        const record = await this.prisma.user.findUnique({
            where: {
                email,
            },
        });

        return record === null ? null : toUser(record);
    }

    public async list(): Promise<User[]> {
        const records = await this.prisma.user.findMany({
            orderBy: {
                createdAt: 'asc',
            },
        });

        return records.map((record) => toUser(record));
    }
}

export class PrismaSessionRepository implements SessionRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public async save(session: Session): Promise<void> {
        const props = session.toPrimitives();

        await this.prisma.session.upsert({
            where: {
                id: props.id.toString(),
            },
            create: {
                id: props.id.toString(),
                userId: props.userId.toString(),
                refreshTokenId: props.refreshTokenId,
                createdAt: props.createdAt.toDate(),
                expiresAt: props.expiresAt.toDate(),
                revokedAt: props.revokedAt?.toDate() ?? null,
                replacedBySessionId: props.replacedBySessionId?.toString() ?? null,
            },
            update: {
                refreshTokenId: props.refreshTokenId,
                expiresAt: props.expiresAt.toDate(),
                revokedAt: props.revokedAt?.toDate() ?? null,
                replacedBySessionId: props.replacedBySessionId?.toString() ?? null,
            },
        });
    }

    public async findById(id: string): Promise<Session | null> {
        const record = await this.prisma.session.findUnique({
            where: {
                id,
            },
        });

        return record === null ? null : toSession(record);
    }

    public async revokeAllForUser(userId: string, revokedAtIso: string): Promise<void> {
        await this.prisma.session.updateMany({
            where: {
                userId,
                revokedAt: null,
            },
            data: {
                revokedAt: UtcDateTime.fromISOString(revokedAtIso).toDate(),
            },
        });
    }
}

export class PrismaSecurityEventRepository implements SecurityEventRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public async append(event: SecurityEvent): Promise<void> {
        await this.prisma.securityEvent.create({
            data: {
                id: randomUUID(),
                type: event.type,
                userId: event.userId,
                occurredAt: UtcDateTime.fromISOString(event.occurredAt).toDate(),
                correlationId: event.correlationId,
                metadataJson: event.metadata === undefined ? null : JSON.stringify(event.metadata),
            },
        });
    }

    public async listByUserId(userId: string): Promise<SecurityEvent[]> {
        const records = await this.prisma.securityEvent.findMany({
            where: {
                userId,
            },
            orderBy: {
                occurredAt: 'asc',
            },
        });

        return records.map((record) => toSecurityEvent(record));
    }
}

export class PrismaPasswordResetTokenStore implements PasswordResetTokenStore {
    public constructor(private readonly prisma: PrismaClient) {}

    public async save(userId: string, token: string, expiresAt: string): Promise<void> {
        await this.prisma.passwordResetToken.upsert({
            where: {
                token,
            },
            create: {
                token,
                userId,
                expiresAt: UtcDateTime.fromISOString(expiresAt).toDate(),
            },
            update: {
                userId,
                expiresAt: UtcDateTime.fromISOString(expiresAt).toDate(),
            },
        });
    }

    public async findByToken(token: string): Promise<{ expiresAt: string; userId: string } | null> {
        const record = await this.prisma.passwordResetToken.findUnique({
            where: {
                token,
            },
        });

        if (record === null) {
            return null;
        }

        return {
            userId: record.userId,
            expiresAt: record.expiresAt.toISOString(),
        };
    }

    public async consume(token: string): Promise<{ expiresAt: string; userId: string } | null> {
        const record = await this.findByToken(token);

        if (record === null) {
            return null;
        }

        await this.prisma.passwordResetToken.delete({
            where: {
                token,
            },
        });

        return record;
    }

    public async deleteExpired(nowIso: string): Promise<void> {
        await this.prisma.passwordResetToken.deleteMany({
            where: {
                expiresAt: {
                    lte: UtcDateTime.fromISOString(nowIso).toDate(),
                },
            },
        });
    }
}
