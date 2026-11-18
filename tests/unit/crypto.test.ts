import {
  generateOtp,
  generateSalt,
  hashOtp,
  verifyOtpHash,
  generateOpaqueToken,
  hashToken
} from '../../src/common/utils/crypto';

describe('Cryptographic Utilities (Unit)', () => {
  it('should generate a 6-digit numeric OTP', () => {
    const otp = generateOtp();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('should correctly hash and verify OTP using constant-time comparison', () => {
    const otp = '482915';
    const salt = generateSalt();
    const hash = hashOtp(otp, salt);

    expect(hash).toHaveLength(64); // SHA-256 produces 64 hex chars
    expect(verifyOtpHash(otp, salt, hash)).toBe(true);
    expect(verifyOtpHash('000000', salt, hash)).toBe(false);
  });

  it('should generate high entropy opaque tokens and hash them consistently', () => {
    const token1 = generateOpaqueToken();
    const token2 = generateOpaqueToken();

    expect(token1).not.toBe(token2);
    expect(hashToken(token1)).toBe(hashToken(token1));
    expect(hashToken(token1)).not.toBe(hashToken(token2));
  });
});
