import request from 'supertest';
import app from '../src/server.js';
import { DOSE_STATUS } from '../src/config/constants.js';

describe('CareSync Healthcare Workflow & RBAC Integration Tests', () => {
  const caretakerAuth = 'Bearer demo-token-caretaker';
  const familyAuth = 'Bearer demo-token-family';
  const elderlyAuth = 'Bearer demo-token-elderly';

  describe('Prescription Management & RBAC Protection', () => {
    test('GET /api/medications allows authorized caretaker and family to view list', async () => {
      const res = await request(app)
        .get('/api/medications?profileId=demo-profile-robert')
        .set('Authorization', familyAuth);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('POST /api/medications rejects prescription creation when attempted by read-only family member', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', familyAuth)
        .send({
          profileId: 'demo-profile-robert',
          name: 'Hydrochlorothiazide',
          dosage: '25',
          unit: 'mg',
          scheduledTimes: ['09:00'],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    });

    test('POST /api/medications allows authorized caretaker to create a new prescription', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', caretakerAuth)
        .send({
          profileId: 'demo-profile-robert',
          name: 'Atorvastatin Calcium',
          dosage: '20',
          unit: 'mg',
          form: 'tablet',
          instructions: 'Take 1 tablet at bedtime.',
          prescribingDoctor: 'Dr. Angela Martinez',
          frequency: 'once_daily',
          scheduledTimes: ['21:00'],
          startDate: '2026-11-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Atorvastatin Calcium');
    });
  });

  describe('Dose Adherence & Intake Marking', () => {
    test('PATCH /api/doses/:id/status allows elderly patient to mark their scheduled dose as taken', async () => {
      // First fetch today's doses to get a valid dose ID
      const todayRes = await request(app)
        .get('/api/doses/today?profileId=demo-profile-robert')
        .set('Authorization', elderlyAuth);

      expect(todayRes.status).toBe(200);
      const firstDose = todayRes.body.data[0];
      expect(firstDose).toBeDefined();

      const patchRes = await request(app)
        .patch(`/api/doses/${firstDose.id}/status`)
        .set('Authorization', elderlyAuth)
        .send({ status: DOSE_STATUS.TAKEN, notes: 'Taken with breakfast' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.data.status).toBe(DOSE_STATUS.TAKEN);
    });

    test('PATCH /api/doses/:id/status rejects marking with invalid status value', async () => {
      const res = await request(app)
        .patch('/api/doses/some-dose-id/status')
        .set('Authorization', caretakerAuth)
        .send({ status: 'INVALID_STATUS_CODE' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Clinical Appointments & Audit Trail', () => {
    test('GET /api/appointments returns partitioned upcoming and past clinical visits', async () => {
      const res = await request(app)
        .get('/api/appointments?profileId=demo-profile-robert')
        .set('Authorization', familyAuth);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.upcoming)).toBe(true);
      expect(Array.isArray(res.body.past)).toBe(true);
    });

    test('GET /api/activity-logs returns chronological audit log of actions', async () => {
      const res = await request(app)
        .get('/api/activity-logs?profileId=demo-profile-robert&limit=10')
        .set('Authorization', caretakerAuth);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
