import crypto from 'crypto';
import { env } from '../../config/env';

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Generates a random cryptographic hex salt.
 */
export function generateSalt(length = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Computes an HMAC-SHA256 digest of an OTP with salt and secret.
 */
export function hashOtp(otp: string, salt: string): string {
  const hmac = crypto.createHmac('sha256', env.OTP_HMAC_SECRET);
  hmac.update(`${otp}:${salt}`);
  return hmac.digest('hex');
}

/**
 * Verifies an OTP against a stored HMAC digest in constant time to prevent timing attacks.
 */
export function verifyOtpHash(otp: string, salt: string, storedHash: string): boolean {
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
