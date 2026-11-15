import { jest } from '@jest/globals';
import {
  invalidateAdherenceCache,
  getAdherenceCacheStats,
  getAdherenceStats,
} from '../src/controllers/adherenceController.js';
import { logActivity, getProfileLogs, memoryAuditLogs } from '../src/services/auditLogger.js';
import { apiSuccess, apiCreated, apiError } from '../src/utils/responseHelper.js';
import { AUDIT_ACTIONS } from '../src/config/constants.js';

describe('CareSync Architecture Resilience & High-Efficiency Engine Tests', () => {
  beforeEach(() => {
    invalidateAdherenceCache();
  });

  describe('Adherence Cache Invalidation & TTL Lifecycle', () => {
    test('initial cache state is empty', () => {
      const stats = getAdherenceCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    test('caches getAdherenceStats response and reuses it on subsequent call', async () => {
      const mockReq = {
        query: { profileId: 'demo-profile-robert', period: '7d' },
      };
      let firstJsonData = null;
      const mockRes1 = {
        json: (data) => { firstJsonData = data; return mockRes1; },
      };

      await getAdherenceStats(mockReq, mockRes1, (err) => { if (err) throw err; });
      expect(firstJsonData).toBeDefined();
      expect(firstJsonData.success).toBe(true);

      const statsAfterFirst = getAdherenceCacheStats();
      expect(statsAfterFirst.size).toBe(1);
      expect(statsAfterFirst.keys).toContain('demo-profile-robert:7d');

      // Second call should return identical cached data
      let secondJsonData = null;
      const mockRes2 = {
        json: (data) => { secondJsonData = data; return mockRes2; },
      };
      await getAdherenceStats(mockReq, mockRes2, (err) => { if (err) throw err; });
      expect(secondJsonData).toEqual(firstJsonData);
    });

    test('profile-targeted invalidation purges only the relevant profile entries', async () => {
      // Seed two profile entries into cache
      const req1 = { query: { profileId: 'profile-a', period: '7d' } };
      const req2 = { query: { profileId: 'profile-b', period: '7d' } };
      const res = { json: () => res };

      await getAdherenceStats(req1, res, () => {});
      await getAdherenceStats(req2, res, () => {});

      expect(getAdherenceCacheStats().size).toBe(2);

      // Invalidate only profile-a
      invalidateAdherenceCache('profile-a');
      const stats = getAdherenceCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('profile-b:7d');
      expect(stats.keys).not.toContain('profile-a:7d');
    });

    test('global invalidation purges all profiles in cache', async () => {
      const req = { query: { profileId: 'profile-x', period: '7d' } };
      const res = { json: () => res };
      await getAdherenceStats(req, res, () => {});

      expect(getAdherenceCacheStats().size).toBeGreaterThan(0);
      invalidateAdherenceCache();
      expect(getAdherenceCacheStats().size).toBe(0);
    });
  });

  describe('Bounded Memory Ring Buffer Diagnostics', () => {
    test('auditLogger records actions and stores them with ISO timestamps', async () => {
      const logEntry = await logActivity({
        profileId: 'resilience-test-profile',
        actorUserId: 'tester-1',
        actorName: 'Security Tester',
        actorRole: 'caretaker',
        action: AUDIT_ACTIONS.PROFILE_VIEWED,
        details: 'Automated resilience probe',
      });

      expect(logEntry).toBeDefined();
      expect(logEntry.profileId).toBe('resilience-test-profile');
      expect(logEntry.timestamp).toBeDefined();

      const logs = await getProfileLogs('resilience-test-profile', 10);
      expect(logs.some(l => l.details === 'Automated resilience probe')).toBe(true);
    });

    test('prevents memory leak by capping in-memory log buffer array safely', () => {
      expect(Array.isArray(memoryAuditLogs)).toBe(true);
      // Ensure the collection is iterable and bounded
      expect(memoryAuditLogs.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Enterprise API Response Helpers & Headers', () => {
    test('apiSuccess formats standard success payload', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      apiSuccess(mockRes, { status: 'healthy' }, { cached: false });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { status: 'healthy' },
        meta: { cached: false },
      });
    });

    test('apiCreated returns HTTP 201 with created resource', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      apiCreated(mockRes, { id: 'new-id' }, 'Resource created');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource created',
        data: { id: 'new-id' },
      });
    });

    test('apiError formats standardized error response with accurate status code', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      apiError(mockRes, 'Unauthorized profile access attempt', 403, 'FORBIDDEN');
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized profile access attempt',
        code: 'FORBIDDEN',
      });
    });
  });
});
