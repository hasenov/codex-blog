import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    APP_NAME: z.string().min(1).default('codex-blog-api'),
    API_PREFIX: z.string().min(1).default('/v1'),
    JWT_ACCESS_SECRET: z.string().min(32).default('dev-access-secret-dev-access-secret'),
    JWT_REFRESH_SECRET: z.string().min(32).default('dev-refresh-secret-dev-refresh-secret'),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    DATABASE_URL: z.string().min(1).default('file:./dev.db'),
    DATA_SOURCE: z.enum(['memory', 'prisma']).default('memory'),
});

export type AppConfig = z.infer<typeof envSchema>;

export const loadConfig = (input: NodeJS.ProcessEnv = process.env): AppConfig => envSchema.parse(input);
