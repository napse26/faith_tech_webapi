import request from 'supertest';
import { app } from '../../src/app';
import { mockSmsProvider } from '../../src/integrations/sms/mock-sms-provider';
import { generateTestPhone } from '../fixtures/test-helpers';

describe('VAPT & Security Vulnerability Tests (Security)', () => {
  let userAToken: string;
  let userARefreshToken: string;
  let userBToken: string;
  const { national: userAPhone, full: fullPhoneA } = generateTestPhone();
  const { national: userBPhone, full: fullPhoneB } = generateTestPhone();

  beforeAll(async () => {
    // Create User A
    const resAInit = await request(app)
      .post('/api/v1/auth/signup/initiate')
      .send({ mobileNumber: userAPhone, countryCode: '+91' });
    const otpA = mockSmsProvider.getLatestOtpFor(fullPhoneA)!;
    const resAVerify = await request(app)
      .post('/api/v1/auth/signup/verify-otp')
      .send({ challengeId: resAInit.body.data.challengeId, otp: otpA });
    userAToken = resAVerify.body.data.tokens.accessToken;
    userARefreshToken = resAVerify.body.data.tokens.refreshToken;

    // Create User B
    const resBInit = await request(app)
      .post('/api/v1/auth/signup/initiate')
      .send({ mobileNumber: userBPhone, countryCode: '+91' });
    const otpB = mockSmsProvider.getLatestOtpFor(fullPhoneB)!;
    const resBVerify = await request(app)
      .post('/api/v1/auth/signup/verify-otp')
      .send({ challengeId: resBInit.body.data.challengeId, otp: otpB });
    userBToken = resBVerify.body.data.tokens.accessToken;
  });

  it('SEC-BOLA-001: User A cannot read or mutate User B data via client-supplied IDs', async () => {
    // Attempting to inject target userId in profile update
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        userId: 'some-other-uuid',
        fullName: 'Hacked Name'
      });

    // Request is either rejected by strict validation or server derives ID only from JWT
    expect(res.status).toBe(400); // Strict schema rejects unknown 'userId' property
  });

  it('SEC-AUTH-001: Rejected tampered JWT access token', async () => {
    const tamperedToken = userAToken.substring(0, userAToken.length - 6) + 'abcdef';
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${tamperedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('SEC-AUTH-002: Token reuse detection revokes compromised family', async () => {
    // 1st Refresh: succeeds and rotates token
    const refresh1 = await request(app)
      .post('/api/v1/auth/token/refresh')
      .send({ refreshToken: userARefreshToken });

    expect(refresh1.status).toBe(200);
    const newRefreshToken = refresh1.body.data.refreshToken;

    // ATTACK: Malicious actor or network interceptor presents OLD (already rotated) refresh token!
    const reuseAttack = await request(app)
      .post('/api/v1/auth/token/refresh')
      .send({ refreshToken: userARefreshToken });

    expect(reuseAttack.status).toBe(401);
    expect(reuseAttack.body.errors[0].code).toBe('TOKEN_REUSE_DETECTED');

    // VERIFICATION: Legitimate new token should now ALSO be revoked because family was compromised!
    const followUpLegitRefresh = await request(app)
      .post('/api/v1/auth/token/refresh')
      .send({ refreshToken: newRefreshToken });

    expect(followUpLegitRefresh.status).toBe(401);
  });

  it('SEC-LOG-001: Verification responses must never leak OTP or secrets', async () => {
    const { national: freshPhone } = generateTestPhone();
    const res = await request(app)
      .post('/api/v1/auth/signup/initiate')
      .send({ mobileNumber: freshPhone, countryCode: '+91' });

    const rawResponse = JSON.stringify(res.body);
    expect(rawResponse).not.toMatch(/(\b\d{6}\b)/); // Does not contain 6-digit OTP
    expect(rawResponse).not.toContain('otpHash');
    expect(rawResponse).not.toContain('salt');
    expect(rawResponse).not.toContain('secret');
  });
});
