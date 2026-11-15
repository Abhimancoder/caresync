import { calculateAdherenceMetrics } from '../src/controllers/adherenceController.js';
import { DOSE_STATUS } from '../src/config/constants.js';

describe('CareSync Mathematical Adherence Engine Tests', () => {
  const referenceTime = new Date('2026-11-15T12:00:00.000Z');

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
});
