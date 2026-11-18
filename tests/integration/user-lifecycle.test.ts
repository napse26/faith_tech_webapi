import request from 'supertest';
import { app } from '../../src/app';
import { mockSmsProvider } from '../../src/integrations/sms/mock-sms-provider';
import { generateTestPhone } from '../fixtures/test-helpers';

describe('User Lifecycle & Account Management (Integration)', () => {
  let token: string;
  const { national: userPhone, full: fullPhone } = generateTestPhone();
  const { national: newPhone, full: fullNewPhone } = generateTestPhone();

  beforeAll(async () => {
    const initRes = await request(app)
      .post('/api/v1/auth/signup/initiate')
      .send({ mobileNumber: userPhone, countryCode: '+91' });
    const challengeId = initRes.body.data.challengeId;
    const otp = mockSmsProvider.getLatestOtpFor(fullPhone)!;

    const verifyRes = await request(app)
      .post('/api/v1/auth/signup/verify-otp')
      .send({ challengeId, otp });
    token = verifyRes.body.data.tokens.accessToken;
  });

  it('USER-MOB-001: Should initiate mobile change and send OTP to new number', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/mobile/change/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ newMobileNumber: newPhone, countryCode: '+91' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const newOtp = mockSmsProvider.getLatestOtpFor(fullNewPhone);
    expect(newOtp).toBeDefined();

    // Confirm change
    const confirmRes = await request(app)
      .post('/api/v1/users/me/mobile/change/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ challengeId: res.body.data.challengeId, otp: newOtp });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    expect(confirmRes.body.data.mobileNumber).toBe(fullNewPhone);
  });

  it('USER-DEL-001: Should submit account deletion request with 30-day grace', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/deletion-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        reason: 'Privacy preferences',
        confirmText: 'DELETE MY ACCOUNT'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.daysRemaining).toBe(30);
  });

  it('USER-DEL-002: Subsequent requests with revoked token should fail', async () => {
    // All sessions were revoked on deletion request submission
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect([401, 403]).toContain(res.status); // Session revoked or DELETION_PENDING
  });
});
