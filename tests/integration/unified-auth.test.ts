import request from 'supertest';
import { app } from '../../src/app';
import { generateTestPhone } from '../fixtures/test-helpers';

describe('Unified Mobile Auth Flow with Sample Dev OTP (Integration)', () => {
  const { national: testPhone, full: fullPhone } = generateTestPhone();
  let firstChallengeId: string;
  let secondChallengeId: string;
  let firstAccessToken: string;
  let secondAccessToken: string;

  it('1. User enters mobile number: sends OTP, recognizes new user, and provides sample OTP', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ mobileNumber: testPhone, countryCode: '+91' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.challengeId).toBeDefined();
    expect(res.body.data.isExistingUser).toBe(false);
    expect(res.body.data.cooldownSeconds).toBe(60);

    // Development sample OTP
    expect(res.body.data.sampleOtp).toBe('123456');

    firstChallengeId = res.body.data.challengeId;
  });

  it('2. On verify-otp with new number: creates new user, marks isNewUser: true, and generates tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        challengeId: firstChallengeId,
        otp: '123456', // using development sample OTP
        platform: 'ANDROID',
        deviceName: 'Samsung Galaxy S24'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isNewUser).toBe(true);
    expect(res.body.data.user.mobileNumber).toBe(fullPhone);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();

    firstAccessToken = res.body.data.tokens.accessToken;

    // Verify token works to access profile
    const profileRes = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${firstAccessToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.mobileNumber).toBe(fullPhone);
  });

  it('3. User enters mobile number again: sends OTP and recognizes user already exists', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ mobileNumber: testPhone, countryCode: '+91' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.challengeId).toBeDefined();
    expect(res.body.data.isExistingUser).toBe(true);
    expect(res.body.data.sampleOtp).toBe('123456');

    secondChallengeId = res.body.data.challengeId;
  });

  it('4. On verify-otp with existing user: logs in user, marks isNewUser: false, and generates new tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        challengeId: secondChallengeId,
        otp: '123456', // using development sample OTP
        platform: 'IOS',
        deviceName: 'iPhone 16 Pro'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isNewUser).toBe(false);
    expect(res.body.data.user.mobileNumber).toBe(fullPhone);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();

    secondAccessToken = res.body.data.tokens.accessToken;

    // Verify authenticated access with second session
    const profileRes = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${secondAccessToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.mobileNumber).toBe(fullPhone);
  });
});
