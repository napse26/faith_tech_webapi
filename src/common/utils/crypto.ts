import crypto from 'crypto';
import { env } from '../../config/env';

/**
 * Generates a cryptographically secure numeric OTP (default 4 digits per DharmaDarshan spec).
 */
export function generateOtp(length = env.OTP_LENGTH || 4): string {
  if (length === 4) {
    return crypto.randomInt(1000, 10000).toString();
  }
  if (length === 6) {
    return crypto.randomInt(100000, 1000000).toString();
  }
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length);
  return crypto.randomInt(min, max).toString();
}

/**
 * Generates a random cryptographic hex salt or challenge context.
 */
export function generateSalt(length = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Computes an HMAC-SHA256 digest of an OTP with salt/context and server-side secret.
 */
export function hashOtp(otp: string, salt: string): string {
  const hmac = crypto.createHmac('sha256', env.OTP_HMAC_SECRET);
  hmac.update(`${otp}:${salt}`);
  return hmac.digest('hex');
}

/**
 * Verifies an OTP against a stored HMAC digest in constant time to prevent timing attacks.
 * In non-production environments with USE_SAMPLE_OTP enabled, also accepts DEV_SAMPLE_OTP.
 */
export function verifyOtpHash(otp: string, salt: string, storedHash: string): boolean {
  if (env.USE_SAMPLE_OTP && env.NODE_ENV !== 'production' && otp === env.DEV_SAMPLE_OTP) {
    return true;
  }

  const computedHash = hashOtp(otp, salt);
  const computedBuffer = Buffer.from(computedHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (computedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, storedBuffer);
}

/**
 * Generates a high-entropy opaque random string for refresh tokens.
 */
export function generateOpaqueToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Hashes a token using SHA-256 for secure storage at rest.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
