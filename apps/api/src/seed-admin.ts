import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { loadConfig } from '@codex-blog/config';
import { Email, EntityId, UtcDateTime, User } from '@codex-blog/domain';
import { createPrismaClient, PrismaUserRepository, ScryptPasswordHasher } from '@codex-blog/infrastructure';

const adminSeedSchema = z.object({
    ADMIN_DISPLAY_NAME: z.string().min(2).max(120),
    ADMIN_EMAIL: z.string().email(),
    ADMIN_PASSWORD: z.string().min(8).max(255),
});

const seedAdmin = async (): Promise<void> => {
    const config = loadConfig();

    if (config.DATA_SOURCE !== 'prisma') {
        throw new Error('Admin seed requires DATA_SOURCE=prisma.');
    }

    const seed = adminSeedSchema.parse(process.env);
    const prisma = createPrismaClient(config.DATABASE_URL);

    try {
        await prisma.$connect();
        const userRepository = new PrismaUserRepository(prisma);
        const email = Email.create(seed.ADMIN_EMAIL);
        const existingUser = await userRepository.findByEmail(email.toString());

        if (existingUser !== null) {
            throw new Error(`Admin seed skipped: user ${email.toString()} already exists.`);
        }

        const now = UtcDateTime.create(new Date());
        const passwordHash = await new ScryptPasswordHasher().hash(seed.ADMIN_PASSWORD);
        const user = User.register({
            id: EntityId.create(randomUUID()),
            email,
            displayName: seed.ADMIN_DISPLAY_NAME,
            passwordHash,
            createdAt: now,
        });

        user.changeRole('admin', now);
        await userRepository.save(user);
        console.info(`Admin user created: ${email.toString()}`);
    } finally {
        await prisma.$disconnect();
    }
};

seedAdmin().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown admin seed error.';
    console.error(message);
    process.exitCode = 1;
});
