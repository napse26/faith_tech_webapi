import request from 'supertest';
import { app } from '../../src/app';
import { mockSmsProvider } from '../../src/integrations/sms/mock-sms-provider';
import { generateTestPhone } from '../fixtures/test-helpers';

describe('Authentication Flow (Integration)', () => {
  const { national: testNumber, full: fullPhone } = generateTestPhone();
  let signupChallengeId: string;
  let activeOtp: string;
  let accessToken: string;
  let refreshToken: string;

  it('AUTH-SU-001: Should initiate signup OTP flow', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup/initiate')
      .send({ mobileNumber: testNumber, countryCode: '+91' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.challengeId).toBeDefined();
    expect(res.body.data.cooldownSeconds).toBe(60);

    signupChallengeId = res.body.data.challengeId;

    const sentOtp = mockSmsProvider.getLatestOtpFor(fullPhone);
    expect(sentOtp).toBeDefined();
    expect(sentOtp).toHaveLength(6);
    activeOtp = sentOtp!;
  });

  it('AUTH-SU-002: Should reject signup with invalid number format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup/initiate')
      .send({ mobileNumber: '123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('AUTH-OTP-002: Should reject incorrect OTP verification', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup/verify-otp')
      .send({ challengeId: signupChallengeId, otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0].code).toBe('INVALID_OTP');
  });

  it('AUTH-SU-003: Should verify signup OTP and issue tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup/verify-otp')
      .send({
        challengeId: signupChallengeId,
        otp: activeOtp,
        platform: 'ANDROID',
        deviceName: 'Pixel 8'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.mobileNumber).toBe(fullPhone);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();

    accessToken = res.body.data.tokens.accessToken;
    refreshToken = res.body.data.tokens.refreshToken;
  });

  it('AUTH-OTP-004: Should reject replay of already consumed OTP', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup/verify-otp')
      .send({
        challengeId: signupChallengeId,
        otp: activeOtp
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('AUTH-TOKEN-001: Should rotate refresh token and issue new token pair', async () => {
    const res = await request(app)
      .post('/api/v1/auth/token/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(refreshToken);

    // Update with rotated tokens
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('AUTH-LOGOUT-001: Should logout current session', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
