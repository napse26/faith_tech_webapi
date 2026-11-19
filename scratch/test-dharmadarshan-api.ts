import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/database';

async function runE2ETests() {
  console.log('🚀 Running DharmaDarshan OTP Authentication E2E Integration Tests...');

  const testPhone = '+919876543299';

  // Cleanup any leftover test data
  console.log('Cleaning up previous test data...');
  const existingUser = await prisma.users.findUnique({ where: { mobile_no: testPhone } });
  if (existingUser) {
    await prisma.users.delete({ where: { user_id: existingUser.user_id } });
  }
  await prisma.otp_verification.deleteMany({ where: { phone_number: testPhone } });

  let challengeId = '';
  let accessToken = '';
  let refreshToken = '';
  let sessionId = '';
  let customerId = 0;

  // TEST 1: Send OTP for New Customer
  console.log('\n--- TEST 1: Send OTP ---');
  const sendRes = await request(app)
    .post('/api/v1/auth/send-otp')
    .send({
      phoneNumber: testPhone,
      countryCode: '+91',
      purpose: 'LOGIN'
    });

  console.log('Send OTP Status:', sendRes.status);
  console.log('Send OTP Body:', JSON.stringify(sendRes.body, null, 2));

  if (sendRes.status !== 200 || !sendRes.body.data.challengeId) {
    throw new Error('TEST 1 FAILED: Could not send OTP');
  }
  challengeId = sendRes.body.data.challengeId;
  console.log('✅ TEST 1 PASSED: OTP Challenge created:', challengeId);

  // TEST 2: Verify OTP with Invalid OTP
  console.log('\n--- TEST 2: Verify OTP with Invalid OTP ---');
  const invalidRes = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({
      challengeId,
      otp: '9999',
      device: { deviceId: 'test-device-1', platform: 'ANDROID' }
    });

  console.log('Invalid OTP Status:', invalidRes.status);
  console.log('Invalid OTP Body:', JSON.stringify(invalidRes.body, null, 2));

  if (invalidRes.status !== 400 || invalidRes.body.error?.code !== 'INVALID_OTP') {
    throw new Error('TEST 2 FAILED: Expected 400 INVALID_OTP');
  }
  console.log('✅ TEST 2 PASSED: Invalid OTP rejected.');

  // TEST 3: Verify OTP with Valid Dev Sample OTP (New User Registration)
  console.log('\n--- TEST 3: Verify OTP with Valid Sample OTP (New User) ---');
  const verifyRes = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({
      challengeId,
      otp: '1234',
      device: { deviceId: 'test-device-1', platform: 'ANDROID', appVersion: '1.0.0' }
    });

  console.log('Verify OTP Status:', verifyRes.status);
  console.log('Verify OTP Body:', JSON.stringify(verifyRes.body, null, 2));

  if (verifyRes.status !== 200 || !verifyRes.body.data.accessToken) {
    throw new Error('TEST 3 FAILED: Expected 200 and access token');
  }
  if (verifyRes.body.data.isNewUser !== true) {
    throw new Error('TEST 3 FAILED: Expected isNewUser to be true');
  }
  if (verifyRes.body.data.user.role !== 'CUSTOMER') {
    throw new Error('TEST 3 FAILED: Expected role CUSTOMER');
  }

  accessToken = verifyRes.body.data.accessToken;
  refreshToken = verifyRes.body.data.refreshToken;
  customerId = verifyRes.body.data.user.customerId;
  console.log('✅ TEST 3 PASSED: New user verified & tokens issued. Customer ID:', customerId);

  // TEST 4: Get Current User Profile (/me)
  console.log('\n--- TEST 4: GET /me ---');
  const meRes = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${accessToken}`);

  console.log('GET /me Status:', meRes.status);
  console.log('GET /me Body:', JSON.stringify(meRes.body, null, 2));

  if (meRes.status !== 200 || meRes.body.data.customerId !== customerId) {
    throw new Error('TEST 4 FAILED: GET /me did not return correct user');
  }
  console.log('✅ TEST 4 PASSED: Profile fetched successfully.');

  // TEST 5: Get Active Sessions
  console.log('\n--- TEST 5: GET /sessions ---');
  const sessionsRes = await request(app)
    .get('/api/v1/auth/sessions')
    .set('Authorization', `Bearer ${accessToken}`);

  console.log('Sessions Status:', sessionsRes.status);
  console.log('Sessions Body:', JSON.stringify(sessionsRes.body, null, 2));

  if (sessionsRes.status !== 200 || !sessionsRes.body.data.length) {
    throw new Error('TEST 5 FAILED: No active sessions returned');
  }
  sessionId = sessionsRes.body.data[0].sessionId;
  console.log('✅ TEST 5 PASSED: Active sessions retrieved. Session ID:', sessionId);

  // TEST 6: Refresh Token Rotation
  console.log('\n--- TEST 6: POST /refresh-token ---');
  const oldRefreshToken = refreshToken;
  const refreshRes = await request(app)
    .post('/api/v1/auth/refresh-token')
    .send({ refreshToken: oldRefreshToken });

  console.log('Refresh Status:', refreshRes.status);
  console.log('Refresh Body:', JSON.stringify(refreshRes.body, null, 2));

  if (refreshRes.status !== 200 || !refreshRes.body.data.accessToken) {
    throw new Error('TEST 6 FAILED: Token refresh failed');
  }
  const newAccessToken = refreshRes.body.data.accessToken;
  const newRefreshToken = refreshRes.body.data.refreshToken;
  console.log('✅ TEST 6 PASSED: Refresh token rotated successfully.');

  // TEST 7: Token Reuse Detection
  console.log('\n--- TEST 7: Token Reuse Detection ---');
  // Wait a small moment and then attempt using the previous token
  // Notice in our rotateRefreshToken, the old token was replaced.
  // If we try oldRefreshToken, it should fail with INVALID_REFRESH_TOKEN or TOKEN_REUSE_DETECTED
  const reuseRes = await request(app)
    .post('/api/v1/auth/refresh-token')
    .send({ refreshToken: oldRefreshToken });

  console.log('Reuse Status:', reuseRes.status);
  console.log('Reuse Body:', JSON.stringify(reuseRes.body, null, 2));
  if (reuseRes.status !== 401) {
    throw new Error('TEST 7 FAILED: Expected 401 on reused refresh token');
  }
  console.log('✅ TEST 7 PASSED: Old refresh token rejected.');

  // TEST 8: Existing User Login Flow
  console.log('\n--- TEST 8: Existing User Login (isNewUser: false) ---');
  const sendRes2 = await request(app)
    .post('/api/v1/auth/send-otp')
    .send({ phoneNumber: testPhone });

  const challengeId2 = sendRes2.body.data.challengeId;
  const verifyRes2 = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({
      challengeId: challengeId2,
      otp: '1234',
      device: { deviceId: 'test-device-2', platform: 'IOS' }
    });

  console.log('Existing User Verify Status:', verifyRes2.status);
  console.log('Existing User Verify Body:', JSON.stringify(verifyRes2.body, null, 2));

  if (verifyRes2.body.data.isNewUser !== false) {
    throw new Error('TEST 8 FAILED: Expected isNewUser to be false for existing customer');
  }
  if (verifyRes2.body.data.user.customerId !== customerId) {
    throw new Error('TEST 8 FAILED: Existing customer ID mismatch');
  }
  console.log('✅ TEST 8 PASSED: Existing user identified correctly (isNewUser: false).');

  // TEST 9: Resend OTP Cooldown Active
  console.log('\n--- TEST 9: Resend OTP Cooldown Check ---');
  const sendRes3 = await request(app)
    .post('/api/v1/auth/send-otp')
    .send({ phoneNumber: testPhone });
  const challengeId3 = sendRes3.body.data.challengeId;

  const resendRes = await request(app)
    .post('/api/v1/auth/resend-otp')
    .send({ challengeId: challengeId3 });

  console.log('Resend Cooldown Status:', resendRes.status);
  console.log('Resend Cooldown Body:', JSON.stringify(resendRes.body, null, 2));

  if (resendRes.status !== 429 || resendRes.body.error?.code !== 'RESEND_COOLDOWN_ACTIVE') {
    throw new Error('TEST 9 FAILED: Expected 429 RESEND_COOLDOWN_ACTIVE');
  }
  console.log('✅ TEST 9 PASSED: Resend cooldown enforced.');

  // TEST 10: Logout
  console.log('\n--- TEST 10: Logout ---');
  const logoutRes = await request(app)
    .post('/api/v1/auth/logout')
    .set('Authorization', `Bearer ${newAccessToken}`);

  console.log('Logout Status:', logoutRes.status);
  console.log('Logout Body:', JSON.stringify(logoutRes.body, null, 2));

  if (logoutRes.status !== 200 || logoutRes.body.success !== true) {
    throw new Error('TEST 10 FAILED: Logout failed');
  }
  console.log('✅ TEST 10 PASSED: Logout successful.');

  // TEST 11: Access protected API with revoked session token
  console.log('\n--- TEST 11: Protected API Access after Logout ---');
  const revokedAccessRes = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${newAccessToken}`);

  console.log('Revoked Access Status:', revokedAccessRes.status);
  console.log('Revoked Access Body:', JSON.stringify(revokedAccessRes.body, null, 2));

  if (revokedAccessRes.status !== 401 || revokedAccessRes.body.error?.code !== 'SESSION_REVOKED') {
    throw new Error('TEST 11 FAILED: Expected 401 SESSION_REVOKED');
  }
  console.log('✅ TEST 11 PASSED: Revoked session properly rejected.');

  // Cleanup test user
  console.log('\nCleaning up test user from Supabase...');
  await prisma.users.delete({ where: { user_id: BigInt(customerId) } });
  await prisma.otp_verification.deleteMany({ where: { phone_number: testPhone } });
  console.log('✅ Cleaned up successfully.');

  console.log('\n🎉 ALL 11 DHARMADARSHAN TESTS PASSED SUCCESSFULLY! 🎉');
  await prisma.$disconnect();
}

runE2ETests().catch(async (err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  await prisma.$disconnect();
  process.exit(1);
});
