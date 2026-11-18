import { normalizePhoneNumber } from '../../src/common/utils/phone';

describe('Phone Number Normalization (Unit)', () => {
  it('should normalize valid Indian mobile numbers to E.164 format', () => {
    const res1 = normalizePhoneNumber('9876543210', '+91');
    expect(res1.e164).toBe('+919876543210');
    expect(res1.countryCode).toBe('+91');

    const res2 = normalizePhoneNumber('+919876543210');
    expect(res2.e164).toBe('+919876543210');
  });

  it('should normalize international mobile numbers', () => {
    const res = normalizePhoneNumber('+14155552671');
    expect(res.e164).toBe('+14155552671');
    expect(res.countryCode).toBe('+1');
  });

  it('should reject invalid phone numbers', () => {
    expect(() => normalizePhoneNumber('123', '+91')).toThrow();
    expect(() => normalizePhoneNumber('not-a-number', '+91')).toThrow();
  });
});
