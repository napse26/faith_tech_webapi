"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtp = generateOtp;
exports.generateSalt = generateSalt;
exports.hashOtp = hashOtp;
exports.verifyOtpHash = verifyOtpHash;
exports.generateOpaqueToken = generateOpaqueToken;
exports.hashToken = hashToken;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../config/env");
/**
 * Generates a cryptographically secure numeric OTP (default 4 digits per DharmaDarshan spec).
 */
function generateOtp(length = env_1.env.OTP_LENGTH || 4) {
    if (length === 4) {
        return crypto_1.default.randomInt(1000, 10000).toString();
    }
    if (length === 6) {
        return crypto_1.default.randomInt(100000, 1000000).toString();
    }
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length);
    return crypto_1.default.randomInt(min, max).toString();
}
/**
 * Generates a random cryptographic hex salt or challenge context.
 */
function generateSalt(length = 16) {
    return crypto_1.default.randomBytes(length).toString('hex');
}
/**
 * Computes an HMAC-SHA256 digest of an OTP with salt/context and server-side secret.
 */
function hashOtp(otp, salt) {
    const hmac = crypto_1.default.createHmac('sha256', env_1.env.OTP_HMAC_SECRET);
    hmac.update(`${otp}:${salt}`);
    return hmac.digest('hex');
}
/**
 * Verifies an OTP against a stored HMAC digest in constant time to prevent timing attacks.
 * In non-production environments with USE_SAMPLE_OTP enabled, also accepts DEV_SAMPLE_OTP.
 */
function verifyOtpHash(otp, salt, storedHash) {
    if (env_1.env.USE_SAMPLE_OTP && env_1.env.NODE_ENV !== 'production' && otp === env_1.env.DEV_SAMPLE_OTP) {
        return true;
    }
    const computedHash = hashOtp(otp, salt);
    const computedBuffer = Buffer.from(computedHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (computedBuffer.length !== storedBuffer.length) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(computedBuffer, storedBuffer);
}
/**
 * Generates a high-entropy opaque random string for refresh tokens.
 */
function generateOpaqueToken(byteLength = 32) {
    return crypto_1.default.randomBytes(byteLength).toString('hex');
}
/**
 * Hashes a token using SHA-256 for secure storage at rest.
 */
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
