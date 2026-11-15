import request from 'supertest';
import express from 'express';
import { apiSuccess, apiCreated, apiError } from '../src/utils/responseHelper.js';
import { authenticate } from '../src/middleware/authMiddleware.js';

describe('Response Helper & Auth Middleware Unit Tests', () => {
  describe('responseHelper.js', () => {
    let app;

    beforeAll(() => {
      app = express();
      app.use(express.json());

      app.get('/test/success', (req, res) => {
        return apiSuccess(res, { item: 'sample' }, { total: 1 });
      });

      app.post('/test/created', (req, res) => {
        return apiCreated(res, { id: 'new-123' }, 'Item successfully created');
      });

      app.get('/test/error', (req, res) => {
        return apiError(res, 'Custom error message', 422, 'UNPROCESSABLE_ENTITY', ['Field A is invalid']);
      });

      app.get('/test/default-error', (req, res) => {
        return apiError(res, 'Default server failure');
      });
    });

    test('apiSuccess returns 200 with data and meta', async () => {
      const res = await request(app).get('/test/success');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.item).toBe('sample');
      expect(res.body.meta.total).toBe(1);
    });

    test('apiCreated returns 201 with message and data', async () => {
      const res = await request(app).post('/test/created');
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Item successfully created');
      expect(res.body.data.id).toBe('new-123');
    });

    test('apiError returns custom statusCode, code, and details', async () => {
      const res = await request(app).get('/test/error');
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Custom error message');
      expect(res.body.code).toBe('UNPROCESSABLE_ENTITY');
      expect(res.body.details).toContain('Field A is invalid');
    });

    test('apiError defaults to 500 and INTERNAL_ERROR', async () => {
      const res = await request(app).get('/test/default-error');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('authMiddleware.js', () => {
    let authApp;

    beforeAll(() => {
      authApp = express();
      authApp.use(authenticate);
      authApp.get('/test/protected', (req, res) => {
        res.json({ success: true, user: req.user });
      });
    });

    test('rejects request with missing Authorization header in test environment', async () => {
      const res = await request(authApp).get('/test/protected');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING');
    });

    test('authenticates valid demo elderly token', async () => {
      const res = await request(authApp)
        .get('/test/protected')
        .set('Authorization', 'Bearer demo-token-elderly');

      expect(res.status).toBe(200);
      expect(res.body.user.uid).toBe('demo-elderly-robert');
      expect(res.body.user.role).toBe('elderly');
    });

    test('authenticates valid demo caretaker token', async () => {
      const res = await request(authApp)
        .get('/test/protected')
        .set('Authorization', 'Bearer demo-token-caretaker');

      expect(res.status).toBe(200);
      expect(res.body.user.uid).toBe('demo-caretaker-sarah');
      expect(res.body.user.role).toBe('caretaker');
    });

    test('authenticates valid demo family token', async () => {
      const res = await request(authApp)
        .get('/test/protected')
        .set('Authorization', 'Bearer demo-token-family');

      expect(res.status).toBe(200);
      expect(res.body.user.uid).toBe('demo-family-michael');
      expect(res.body.user.role).toBe('family');
    });

    test('authenticates synthetic unverified demo token', async () => {
      const res = await request(authApp)
        .get('/test/protected')
        .set('Authorization', 'Bearer demo-token-unverified');

      expect(res.status).toBe(200);
      expect(res.body.user.uid).toBe('demo-unverified-intruder');
    });
  });
});
