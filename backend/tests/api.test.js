import request from 'supertest';
import app from '../src/server.js';

describe('CareSync API Endpoints Tests', () => {
  test('GET /api/health returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.platform).toContain('CareSync');
  });

  test('GET /api/auth/me rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('AUTH_TOKEN_MISSING');
  });

  test('GET /api/auth/me accepts demo token and returns user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer demo-token-caretaker');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('caretaker');
  });

  test('GET /api/doses/today returns today doses for demo profile', async () => {
    const res = await request(app)
      .get('/api/doses/today?profileId=demo-profile-robert')
      .set('Authorization', 'Bearer demo-token-elderly');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/adherence/stats returns valid adherence percentages', async () => {
    const res = await request(app)
      .get('/api/adherence/stats?profileId=demo-profile-robert')
      .set('Authorization', 'Bearer demo-token-caretaker');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics.adherenceRate).toBeGreaterThanOrEqual(0);
    expect(res.body.metrics.adherenceRate).toBeLessThanOrEqual(100);
  });

  test('GET /api/medications rejects request without profileId query param', async () => {
    const res = await request(app)
      .get('/api/medications')
      .set('Authorization', 'Bearer demo-token-caretaker');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('profileId query parameter is required');
  });

  test('PUT /api/medications/:id allows caretaker to update prescription instructions', async () => {
    const res = await request(app)
      .put('/api/medications/med-demo-1')
      .set('Authorization', 'Bearer demo-token-caretaker')
      .send({ instructions: 'Take 1 tablet with warm water after breakfast' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/medications/:id allows caretaker to discontinue medication', async () => {
    const res = await request(app)
      .delete('/api/medications/med-demo-3')
      .set('Authorization', 'Bearer demo-token-caretaker');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/appointments returns upcoming and past appointments', async () => {
    const res = await request(app)
      .get('/api/appointments?profileId=demo-profile-robert')
      .set('Authorization', 'Bearer demo-token-family');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.upcoming)).toBe(true);
    expect(Array.isArray(res.body.past)).toBe(true);
  });

  test('PATCH /api/doses/:id/status rejects invalid status with 400', async () => {
    const res = await request(app)
      .patch('/api/doses/dose-any/status')
      .set('Authorization', 'Bearer demo-token-caretaker')
      .send({ status: 'invalid_status_code' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/activity-logs returns audit logs for profile', async () => {
    const res = await request(app)
      .get('/api/activity-logs?profileId=demo-profile-robert&limit=10')
      .set('Authorization', 'Bearer demo-token-caretaker');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/notifications returns in-app alerts', async () => {
    const res = await request(app)
      .get('/api/notifications?profileId=demo-profile-robert')
      .set('Authorization', 'Bearer demo-token-caretaker');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.unreadCount).toBe('number');
  });

  test('POST /api/notifications/test-email sends diagnostic email in simulation mode', async () => {
    const res = await request(app)
      .post('/api/notifications/test-email')
      .set('Authorization', 'Bearer demo-token-caretaker')
      .send({ email: 'test@caresync.health' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.simulationMode).toBe(true);
  });
});
