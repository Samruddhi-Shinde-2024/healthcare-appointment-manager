import 'dotenv/config';

import { z } from 'zod';

const environmentSchema = z.object({
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  EMAIL_FROM: z.preprocess(emptyStringToUndefined, z.string().email().optional()),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  OPENAI_API_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  OPENAI_MODEL: z.preprocess(emptyStringToUndefined, z.string().min(1).default('gpt-4o-mini')),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  REDIS_URL: z.string().url(),
  SMTP_HOST: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  SMTP_PASSWORD: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
  SMTP_USER: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
});

function emptyStringToUndefined(value: unknown): unknown {
  return value === '' ? undefined : value;
}

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const environment = Object.freeze(parsedEnvironment.data);
