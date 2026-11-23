"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.string().transform(Number).default('3000'),
    API_BASE_URL: zod_1.z.string().url().default('http://localhost:3000'),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: zod_1.z.string().optional().default(''),
    JWT_ISSUER: zod_1.z.string().default('dharmadarshan-api'),
    JWT_AUDIENCE: zod_1.z.string().default('dharmadarshan-mobile'),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_ACCESS_TOKEN_TTL: zod_1.z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: zod_1.z.string().transform(Number).default('30'),
    OTP_LENGTH: zod_1.z.string().optional().transform((v) => (v ? Number(v) : 4)).default('4'),
    OTP_TTL_SECONDS: zod_1.z
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : 300))
        .default('300'),
    OTP_EXPIRY_SECONDS: zod_1.z
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : 300))
        .default('300'),
    OTP_MAX_ATTEMPTS: zod_1.z.string().transform(Number).default('5'),
    OTP_RESEND_COOLDOWN_SECONDS: zod_1.z
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : 90))
        .default('90'),
    OTP_RESEND_COOLDOWN: zod_1.z
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : 90))
        .default('90'),
    OTP_HMAC_SECRET: zod_1.z.string().min(32, 'OTP_HMAC_SECRET must be at least 32 characters'),
    DEV_SAMPLE_OTP: zod_1.z.string().default('1234'),
    USE_SAMPLE_OTP: zod_1.z
        .string()
        .optional()
        .transform((v) => (v !== undefined ? v === 'true' || v === '1' : true))
        .default('true'),
    SMS_PROVIDER: zod_1.z.enum(['mock', 'twilio', 'gupshup', 'msg91', 'exotel']).default('mock'),
    SMS_API_KEY: zod_1.z.string().optional().default(''),
    SMS_SENDER_ID: zod_1.z.string().default('DHARMA'),
    MSG91_AUTH_KEY: zod_1.z.string().optional().default(''),
    MSG91_TEMPLATE_ID: zod_1.z.string().optional().default(''),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
    process.exit(1);
}
exports.env = parsedEnv.data;
