import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional().default(''),

  JWT_ISSUER: z.string().default('faithtech-astrology-api'),
  JWT_AUDIENCE: z.string().default('faithtech-astrology-mobile'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.string().transform(Number).default('30'),

  OTP_TTL_SECONDS: z.string().transform(Number).default('300'),
  OTP_MAX_ATTEMPTS: z.string().transform(Number).default('5'),
  OTP_RESEND_COOLDOWN_SECONDS: z.string().transform(Number).default('60'),
  OTP_HMAC_SECRET: z.string().min(32, 'OTP_HMAC_SECRET must be at least 32 characters'),
  DEV_SAMPLE_OTP: z.string().default('123456'),
  USE_SAMPLE_OTP: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? v === 'true' || v === '1' : true))
    .default('true'),

  SMS_PROVIDER: z.enum(['mock', 'twilio', 'gupshup']).default('mock'),
  SMS_API_KEY: z.string().optional().default(''),
  SMS_SENDER_ID: z.string().default('ASTRO'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = typeof env;
