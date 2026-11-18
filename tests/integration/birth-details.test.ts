import request from 'supertest';
import { app } from '../../src/app';
import { mockSmsProvider } from '../../src/integrations/sms/mock-sms-provider';
import { generateTestPhone } from '../fixtures/test-helpers';

describe('Astrology Birth Details Module (Integration)', () => {
  let token: string;
  const { national: userPhone, full: fullPhone } = generateTestPhone();

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

  it('ASTRO-BD-001: Should create valid astrology birth details', async () => {
    const res = await request(app)
      .put('/api/v1/users/me/birth-details')
      .set('Authorization', `Bearer ${token}`)
      .send({
        birthDate: '1995-08-15',
        birthTime: '14:30:00',
        timeAccuracy: 'EXACT',
        birthPlaceName: 'Varanasi, Uttar Pradesh, India',
        latitude: 25.3176,
        longitude: 82.9739,
        timezone: 'Asia/Kolkata'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.birthDate).toBe('1995-08-15');
    expect(res.body.data.birthTime).toBe('14:30:00');
    expect(res.body.data.timeAccuracy).toBe('EXACT');
    expect(res.body.data.timezone).toBe('Asia/Kolkata');
  });

  it('ASTRO-BD-002: Should retrieve saved astrology birth details', async () => {
    const res = await request(app)
      .get('/api/v1/users/me/birth-details')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.birthPlaceName).toBe('Varanasi, Uttar Pradesh, India');
    expect(res.body.data.latitude).toBeCloseTo(25.3176);
  });

  it('ASTRO-BD-003: Should save unknown birth time without converting to midnight', async () => {
    const res = await request(app)
      .put('/api/v1/users/me/birth-details')
      .set('Authorization', `Bearer ${token}`)
      .send({
        birthDate: '1990-01-01',
        timeAccuracy: 'UNKNOWN',
        birthPlaceName: 'Jaipur, Rajasthan, India',
        latitude: 26.9124,
        longitude: 75.7873,
        timezone: 'Asia/Kolkata'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.timeAccuracy).toBe('UNKNOWN');
    expect(res.body.data.birthTime).toBeNull(); // Never silently converted to 00:00:00!
  });

  it('ASTRO-BD-004: Should reject invalid timezone', async () => {
    const res = await request(app)
      .put('/api/v1/users/me/birth-details')
      .set('Authorization', `Bearer ${token}`)
      .send({
        birthDate: '1995-08-15',
        timeAccuracy: 'EXACT',
        birthPlaceName: 'Pune',
        latitude: 18.5204,
        longitude: 73.8567,
        timezone: 'Invalid/Timezone_Name'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('ASTRO-BD-005: Should reject out-of-range coordinates', async () => {
    const res = await request(app)
      .put('/api/v1/users/me/birth-details')
      .set('Authorization', `Bearer ${token}`)
      .send({
        birthDate: '1995-08-15',
        timeAccuracy: 'EXACT',
        birthPlaceName: 'North Pole',
        latitude: 95.0, // Invalid latitude (> 90)
        longitude: 73.8567,
        timezone: 'Asia/Kolkata'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('ASTRO-BD-006: Should reject future birth date', async () => {
    const res = await request(app)
      .put('/api/v1/users/me/birth-details')
      .set('Authorization', `Bearer ${token}`)
      .send({
        birthDate: '2099-12-31', // Future date
        timeAccuracy: 'EXACT',
        birthPlaceName: 'Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
