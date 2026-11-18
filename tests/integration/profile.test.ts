import request from 'supertest';
import { app } from '../../src/app';
import { mockSmsProvider } from '../../src/integrations/sms/mock-sms-provider';
import { generateTestPhone } from '../fixtures/test-helpers';

describe('User Profile Module (Integration)', () => {
  let token: string;
  const { national: userPhone, full: fullPhone } = generateTestPhone();

  beforeAll(async () => {
    // Signup user to get token
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

  it('USER-PROF-001: Should retrieve own profile with valid access token', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mobileNumber).toBe(fullPhone);
    expect(res.body.data.isProfileComplete).toBe(false);
  });

  it('USER-PROF-002: Should update allowed profile fields', async () => {
    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Rohit Verma',
        displayName: 'Rohit',
        gender: 'MALE',
        city: 'Bengaluru',
        country: 'India',
        timezone: 'Asia/Kolkata'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe('Rohit Verma');
    expect(res.body.data.gender).toBe('MALE');
    expect(res.body.data.city).toBe('Bengaluru');
    expect(res.body.data.isProfileComplete).toBe(true);
  });

  it('USER-PROF-003: Should reject mass assignment of privileged fields', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Rohit V',
        role: 'SUPER_ADMIN', // Injected field
        isMobileVerified: false // Injected field
      });

    // Zod strict() schema catches unexpected properties
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('USER-PROF-004: Should reject unauthenticated profile requests', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('USER-PROF-005: Should generate profile photo upload reference', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/profile-photo')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fileType: 'image/jpeg',
        fileSize: 1024 * 500
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.uploadUrl).toBeDefined();
    expect(res.body.data.publicUrl).toBeDefined();
  });

  it('USER-PROF-006: Should initiate and confirm email verification', async () => {
    const email = `user.${Date.now()}@example.com`;
    const initRes = await request(app)
      .post('/api/v1/users/me/email/verification/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ email });

    expect(initRes.status).toBe(200);
    const emailChallengeId = initRes.body.data.challengeId;
    const emailOtp = mockSmsProvider.getLatestOtpFor(email)!;

    const confirmRes = await request(app)
      .post('/api/v1/users/me/email/verification/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ challengeId: emailChallengeId, otp: emailOtp });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    expect(confirmRes.body.data.email).toBe(email);
    expect(confirmRes.body.data.isEmailVerified).toBe(true);
  });
});
