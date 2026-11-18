import request from 'supertest';
import { app } from '../../src/app';

describe('Health & Readiness Endpoints (Integration)', () => {
  it('GET /health should return 200 with service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
    expect(res.body.traceId).toBeDefined();
  });

  it('GET /ready should return 200 with database readiness', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database).toBe('CONNECTED');
    expect(res.body.data.status).toBe('READY');
  });

  it('GET /non-existent-route should return 404 with standard envelope', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0].code).toBe('ROUTE_NOT_FOUND');
  });
});
