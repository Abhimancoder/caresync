import { logActivity, getProfileLogs } from '../src/services/auditLogger.js';
import {
  processReminders,
  getNotifications,
  markNotificationAsRead,
  memoryNotifications,
} from '../src/controllers/cronController.js';
import {
  buildDoseId,
  ensureDosesForDate,
  memoryDoses,
} from '../src/controllers/doseController.js';
import { buildTrendData } from '../src/controllers/adherenceController.js';
import { DOSE_STATUS, AUDIT_ACTIONS } from '../src/config/constants.js';

describe('CareSync Core Services & Controllers Unit Test Suite', () => {
  describe('Audit Logger Service', () => {
    test('logActivity successfully logs and returns a formatted audit entry', async () => {
      const entry = await logActivity({
        profileId: 'test-profile-audit',
        actorUserId: 'test-user-1',
        actorName: 'Dr. Test',
        actorRole: 'caretaker',
        action: AUDIT_ACTIONS.MEDICATION_ADDED,
        entityType: 'medication',
        entityId: 'med-999',
        details: 'Prescription added for test validation',
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.profileId).toBe('test-profile-audit');
      expect(entry.timestamp).toBeDefined();
      expect(entry.action).toBe(AUDIT_ACTIONS.MEDICATION_ADDED);
    });

    test('getProfileLogs retrieves logs for the specified profileId', async () => {
      await logActivity({
        profileId: 'test-profile-audit-2',
        actorUserId: 'test-user-1',
        action: AUDIT_ACTIONS.DOSE_MARKED_TAKEN,
        entityType: 'dose',
        entityId: 'dose-1',
        details: 'Dose 1 taken',
      });

      await logActivity({
        profileId: 'test-profile-audit-2',
        actorUserId: 'test-user-1',
        action: AUDIT_ACTIONS.DOSE_MARKED_TAKEN,
        entityType: 'dose',
        entityId: 'dose-2',
        details: 'Dose 2 taken',
      });

      const logs = await getProfileLogs('test-profile-audit-2', 5);
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.some(l => l.details === 'Dose 1 taken')).toBe(true);
      expect(logs.some(l => l.details === 'Dose 2 taken')).toBe(true);
    });

    test('getProfileLogs respects custom limit parameter', async () => {
      const logs = await getProfileLogs('test-profile-audit-2', 1);
      expect(logs.length).toBe(1);
    });
  });

  describe('Dose Controller Utilities', () => {
    test('buildDoseId constructs clean, deterministic ID without colons', () => {
      const id = buildDoseId('prof-1', 'med-1', '2026-11-15', '08:30');
      expect(id).toBe('dose_prof-1_med-1_2026-11-15_0830');
      expect(id).not.toContain(':');
    });

    test('ensureDosesForDate populates doses deterministically and avoids duplicates', async () => {
      const dateStr = '2026-11-25';
      const firstRun = await ensureDosesForDate('demo-profile-robert', dateStr);
      expect(firstRun.length).toBeGreaterThan(0);

      // Second run for same date should find existing and generate 0 new doses
      const secondRun = await ensureDosesForDate('demo-profile-robert', dateStr);
      expect(secondRun.length).toBe(0);
    });
  });

  describe('Adherence Engine Trend Builder', () => {
    test('buildTrendData handles empty doses array cleanly without exceptions', () => {
      const trend = buildTrendData([], 7, new Date('2026-11-15'));
      expect(trend).toHaveLength(7);
      expect(trend[0].adherenceRate).toBe(100);
      expect(trend[0].taken).toBe(0);
      expect(trend[0].missed).toBe(0);
    });

    test('buildTrendData accurately aggregates taken and missed counts by date', () => {
      const doses = [
        {
          scheduledDate: '2026-11-14',
          status: DOSE_STATUS.TAKEN,
        },
        {
          scheduledDate: '2026-11-14',
          status: DOSE_STATUS.TAKEN,
        },
        {
          scheduledDate: '2026-11-14',
          status: DOSE_STATUS.MISSED,
        },
      ];

      const trend = buildTrendData(doses, 7, new Date('2026-11-15T12:00:00Z'));
      const dayData = trend.find(t => t.date === '2026-11-14');
      expect(dayData).toBeDefined();
      expect(dayData.taken).toBe(2);
      expect(dayData.missed).toBe(1);
      expect(dayData.adherenceRate).toBe(67); // 2/3 = 66.67% -> 67%
    });

    test('buildTrendData supports 30-day period calculation', () => {
      const trend = buildTrendData([], 30, new Date('2026-11-15'));
      expect(trend).toHaveLength(30);
    });
  });

  describe('Cron & In-App Notifications Controller', () => {
    test('getNotifications returns formatted unreadCount and array', async () => {
      const req = {
        query: { profileId: 'demo-profile-robert', limit: '10' },
      };
      let resJson = null;
      const res = {
        json: (data) => {
          resJson = data;
          return res;
        },
      };
      const next = (err) => { if (err) throw err; };

      await getNotifications(req, res, next);
      expect(resJson).toBeDefined();
      expect(resJson.success).toBe(true);
      expect(typeof resJson.unreadCount).toBe('number');
      expect(Array.isArray(resJson.data)).toBe(true);
    });

    test('markNotificationAsRead updates status correctly in memory', async () => {
      // Seed a test notification with sim_ prefix for memory simulation
      const testNotif = {
        id: 'sim_notif-test-read-1',
        profileId: 'demo-profile-robert',
        title: 'Test Reminder',
        isRead: false,
      };
      memoryNotifications.push(testNotif);

      const req = { params: { id: 'sim_notif-test-read-1' } };
      let resJson = null;
      const res = {
        json: (data) => {
          resJson = data;
          return res;
        },
      };
      const next = (err) => { if (err) throw err; };

      await markNotificationAsRead(req, res, next);
      expect(resJson.success).toBe(true);
      expect(testNotif.isRead).toBe(true);
    });
  });
});
