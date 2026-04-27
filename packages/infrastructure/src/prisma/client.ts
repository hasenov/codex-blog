import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

const defaultSqliteDatabaseUrl = `file:${fileURLToPath(new URL('../../prisma/dev.db', import.meta.url))}`;

const resolveDatabaseUrl = (databaseUrl: string): string =>
    databaseUrl === 'file:./dev.db' ? defaultSqliteDatabaseUrl : databaseUrl;

export const createPrismaClient = (databaseUrl: string): PrismaClient =>
    new PrismaClient({
        datasources: {
            db: {
                url: resolveDatabaseUrl(databaseUrl),
            },
        },
    });
