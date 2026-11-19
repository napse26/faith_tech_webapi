import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional().default(''),

  JWT_ISSUER: z.string().default('dharmadarshan-api'),
  JWT_AUDIENCE: z.string().default('dharmadarshan-mobile'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.string().transform(Number).default('30'),

  OTP_LENGTH: z.string().optional().transform((v) => (v ? Number(v) : 4)).default('4'),
  OTP_TTL_SECONDS: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 300))
    .default('300'),
  OTP_EXPIRY_SECONDS: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 300))
    .default('300'),
  OTP_MAX_ATTEMPTS: z.string().transform(Number).default('5'),
  OTP_RESEND_COOLDOWN_SECONDS: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 90))
    .default('90'),
  OTP_RESEND_COOLDOWN: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 90))
    .default('90'),
  OTP_HMAC_SECRET: z.string().min(32, 'OTP_HMAC_SECRET must be at least 32 characters'),
  DEV_SAMPLE_OTP: z.string().default('1234'),
  USE_SAMPLE_OTP: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? v === 'true' || v === '1' : true))
    .default('true'),

  SMS_PROVIDER: z.enum(['mock', 'twilio', 'gupshup', 'msg91', 'exotel']).default('mock'),
  SMS_API_KEY: z.string().optional().default(''),
  SMS_SENDER_ID: z.string().default('DHARMA'),
  MSG91_AUTH_KEY: z.string().optional().default(''),
  MSG91_TEMPLATE_ID: z.string().optional().default(''),

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
