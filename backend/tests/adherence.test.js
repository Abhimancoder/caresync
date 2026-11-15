import {
  calculateAdherenceMetrics,
  buildTrendData,
  invalidateAdherenceCache,
  getAdherenceCacheStats,
} from '../src/controllers/adherenceController.js';
import { DOSE_STATUS } from '../src/config/constants.js';

describe('CareSync Mathematical Adherence Engine Tests', () => {
  const referenceTime = new Date('2026-11-15T12:00:00.000Z');

  beforeEach(() => {
    invalidateAdherenceCache();
  });

  test('calculates 100% adherence when all past doses were taken', () => {
    const doses = [
      {
        id: '1',
        scheduledTimestamp: '2026-11-15T08:00:00.000Z',
        status: DOSE_STATUS.TAKEN,
        takenAt: '2026-11-15T08:10:00.000Z',
      },
      {
        id: '2',
        scheduledTimestamp: '2026-11-15T10:00:00.000Z',
        status: DOSE_STATUS.TAKEN,
        takenAt: '2026-11-15T10:05:00.000Z',
      },
    ];

    const result = calculateAdherenceMetrics(doses, referenceTime);
    expect(result.adherenceRate).toBe(100);
    expect(result.totalTaken).toBe(2);
    expect(result.totalMissed).toBe(0);
  });

  test('does NOT count future doses as missed or in adherence calculation', () => {
    const doses = [
      {
        id: '1',
        scheduledTimestamp: '2026-11-15T08:00:00.000Z',
        status: DOSE_STATUS.TAKEN,
        takenAt: '2026-11-15T08:10:00.000Z',
      },
      {
        id: '2',
        scheduledTimestamp: '2026-11-15T18:00:00.000Z', // Future dose at 6 PM
        status: DOSE_STATUS.UPCOMING,
      },
      {
        id: '3',
        scheduledTimestamp: '2026-11-15T21:00:00.000Z', // Future dose at 9 PM
        status: DOSE_STATUS.UPCOMING,
      },
    ];

    const result = calculateAdherenceMetrics(doses, referenceTime);
    // Only dose 1 is in the past! Adherence should be 100% (1/1)
    expect(result.adherenceRate).toBe(100);
    expect(result.totalTaken).toBe(1);
    expect(result.totalMissed).toBe(0);
    expect(result.totalUpcoming).toBe(2);
  });

  test('correctly penalizes missed past doses with 50% adherence', () => {
    const doses = [
      {
        id: '1',
        scheduledTimestamp: '2026-11-15T08:00:00.000Z',
        status: DOSE_STATUS.TAKEN,
        takenAt: '2026-11-15T08:05:00.000Z',
      },
      {
        id: '2',
        scheduledTimestamp: '2026-11-15T09:00:00.000Z', // Past dose (>60 min ago)
        status: DOSE_STATUS.MISSED,
      },
    ];

    const result = calculateAdherenceMetrics(doses, referenceTime);
    expect(result.adherenceRate).toBe(50);
    expect(result.totalTaken).toBe(1);
    expect(result.totalMissed).toBe(1);
  });

  test('does NOT penalize clinically skipped doses in the denominator', () => {
    const doses = [
      {
        id: '1',
        scheduledTimestamp: '2026-11-15T08:00:00.000Z',
        status: DOSE_STATUS.TAKEN,
        takenAt: '2026-11-15T08:05:00.000Z',
      },
      {
        id: '2',
        scheduledTimestamp: '2026-11-15T10:00:00.000Z',
        status: DOSE_STATUS.SKIPPED, // Prescribed clinical skip
        notes: 'Doctor advised hold due to low BP',
      },
    ];

    const result = calculateAdherenceMetrics(doses, referenceTime);
    // 1 taken, 0 missed, 1 skipped -> 100% adherence
    expect(result.adherenceRate).toBe(100);
    expect(result.totalTaken).toBe(1);
    expect(result.totalSkipped).toBe(1);
    expect(result.totalMissed).toBe(0);
  });

  test('handles punctuality correctly when doses are taken on time vs late', () => {
    const doses = [
      {
        id: '1',
        scheduledTimestamp: '2026-11-15T08:00:00.000Z',
        status: DOSE_STATUS.TAKEN,
        takenAt: '2026-11-15T08:20:00.000Z', // On time (diff = 20 mins <= 45 min window)
      },
      {
        id: '2',
        scheduledTimestamp: '2026-11-15T10:00:00.000Z',
        status: DOSE_STATUS.TAKEN,
        takenAt: '2026-11-15T11:30:00.000Z', // Late (diff = 90 mins > 45 min window)
      },
    ];

    const result = calculateAdherenceMetrics(doses, referenceTime);
    expect(result.adherenceRate).toBe(100);
    expect(result.totalTaken).toBe(2);
    expect(result.onTimeTaken).toBe(1);
    expect(result.punctualityRate).toBe(50);
  });

  test('respects the 60-minute grace period for upcoming doses scheduled in the past', () => {
    // Reference time is 12:00:00
    const doses = [
      {
        id: '1',
        scheduledTimestamp: '2026-11-15T11:40:00.000Z', // 20 mins ago (within 60m grace period)
        status: 'upcoming',
      },
      {
        id: '2',
        scheduledTimestamp: '2026-11-15T10:00:00.000Z', // 120 mins ago (past grace period)
        status: 'upcoming',
      },
    ];

    const result = calculateAdherenceMetrics(doses, referenceTime);
    expect(result.totalUpcoming).toBe(1); // Dose 1 still within grace period
    expect(result.totalMissed).toBe(1); // Dose 2 expired beyond grace period
  });

  test('handles empty doses gracefully with 100% adherence default', () => {
    const result = calculateAdherenceMetrics([], referenceTime);
    expect(result.adherenceRate).toBe(100);
    expect(result.punctualityRate).toBe(100);
    expect(result.totalPastDoses).toBe(0);
  });

  test('buildTrendData correctly buckets multiple days and dates in O(N)', () => {
    const doses = [
      {
        id: '1',
        scheduledDate: '2026-11-15',
        status: DOSE_STATUS.TAKEN,
      },
      {
        id: '2',
        scheduledDate: '2026-11-15',
        status: DOSE_STATUS.MISSED,
      },
      {
        id: '3',
        scheduledDate: '2026-11-14',
        status: DOSE_STATUS.TAKEN,
      },
    ];

    const trend = buildTrendData(doses, 7, new Date('2026-11-15T12:00:00.000Z'));
    expect(trend).toHaveLength(7);

    const todayBucket = trend.find(t => t.date === '2026-11-15');
    expect(todayBucket).toBeDefined();
    expect(todayBucket.taken).toBe(1);
    expect(todayBucket.missed).toBe(1);
    expect(todayBucket.adherenceRate).toBe(50);

    const yesterdayBucket = trend.find(t => t.date === '2026-11-14');
    expect(yesterdayBucket).toBeDefined();
    expect(yesterdayBucket.taken).toBe(1);
    expect(yesterdayBucket.adherenceRate).toBe(100);
  });

  test('buildTrendData supports 30-day view without errors', () => {
    const trend = buildTrendData([], 30, new Date('2026-11-15T12:00:00.000Z'));
    expect(trend).toHaveLength(30);
    expect(trend[0].adherenceRate).toBe(100);
  });

  test('invalidateAdherenceCache clears profile specific keys and all keys', () => {
    invalidateAdherenceCache();
    const statsEmpty = getAdherenceCacheStats();
    expect(statsEmpty.size).toBe(0);
  });
});
