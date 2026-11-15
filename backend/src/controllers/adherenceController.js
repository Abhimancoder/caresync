import { db } from '../config/firebaseAdmin.js';
import { DOSE_STATUS } from '../config/constants.js';
import { memoryDoses, ensureDosesForDate } from './doseController.js';

/**
 * CareSync Mathematical Adherence Engine
 * Evaluates compliance accurately: future doses are NEVER counted as missed or in denominator
 */

/**
 * Computes adherence metrics from a collection of dose records.
 * Follows clinical adherence standards: future doses are never penalized as missed,
 * and valid clinical skips are excluded from the denominator.
 * 
 * @param {Array<Object>} doses - List of medication dose records
 * @param {Date} [referenceTime=new Date()] - Evaluation timestamp
 * @returns {{
 *   adherenceRate: number,
 *   punctualityRate: number,
 *   totalTaken: number,
 *   totalMissed: number,
 *   totalSkipped: number,
 *   totalUpcoming: number,
 *   totalPastDoses: number,
 *   onTimeTaken: number
 * }} Calculated compliance and punctuality metrics
 */
export function calculateAdherenceMetrics(doses = [], referenceTime = new Date()) {
  const nowIso = referenceTime.toISOString();

  let takenCount = 0;
  let missedCount = 0;
  let skippedCount = 0;
  let upcomingCount = 0;
  let onTimeTakenCount = 0;

  for (const dose of doses) {
    const isFuture = dose.scheduledTimestamp > nowIso;

    if (dose.status === DOSE_STATUS.TAKEN) {
      takenCount++;
      // Check punctuality: taken within 45 mins of scheduled time
      if (dose.takenAt && dose.scheduledTimestamp) {
        const diffMs = Math.abs(new Date(dose.takenAt) - new Date(dose.scheduledTimestamp));
        if (diffMs <= 45 * 60 * 1000) {
          onTimeTakenCount++;
        }
      }
    } else if (dose.status === DOSE_STATUS.SKIPPED) {
      skippedCount++;
    } else if (dose.status === DOSE_STATUS.MISSED) {
      missedCount++;
    } else if (isFuture) {
      // Future scheduled dose: remains upcoming
      upcomingCount++;
    } else {
      // Scheduled in the past, but still marked as 'upcoming'
      // If grace period (60 min) has passed, it is considered past due / missed
      const scheduledDate = new Date(dose.scheduledTimestamp);
      const gracePeriodMs = 60 * 60 * 1000;
      if (referenceTime - scheduledDate > gracePeriodMs) {
        missedCount++;
      } else {
        upcomingCount++; // Still within grace period
      }
    }
  }

  // Denominator: Total past expected doses (Taken + Missed)
  // Valid clinical skips do not penalize adherence
  const totalPastRelevantDoses = takenCount + missedCount;
  const adherenceRate = totalPastRelevantDoses > 0
    ? Math.round((takenCount / totalPastRelevantDoses) * 1000) / 10
    : 100.0; // Default to 100% if no past doses due yet

  const punctualityRate = takenCount > 0
    ? Math.round((onTimeTakenCount / takenCount) * 1000) / 10
    : 100.0;

  return {
    adherenceRate,
    punctualityRate,
    totalTaken: takenCount,
    totalMissed: missedCount,
    totalSkipped: skippedCount,
    totalUpcoming: upcomingCount,
    totalPastDoses: totalPastRelevantDoses,
    onTimeTaken: onTimeTakenCount,
  };
}

/**
 * Builds 7-day or 30-day daily breakdown for Chart.js.
 * Optimized with O(N) pre-bucketing to prevent redundant array scans.
 * 
 * @param {Array<Object>} doses - Dose history array
 * @param {number} [daysCount=7] - Number of days to calculate
 * @param {Date} [referenceDate=new Date()] - Reference date
 * @returns {Array<{date: string, label: string, adherenceRate: number, taken: number, missed: number, skipped: number, totalDoses: number}>}
 */
export function buildTrendData(doses = [], daysCount = 7, referenceDate = new Date()) {
  // Pre-aggregate doses by scheduledDate in a single O(N) pass
  const dosesByDate = new Map();
  for (const dose of doses) {
    if (!dose || !dose.scheduledDate) continue;
    let bucket = dosesByDate.get(dose.scheduledDate);
    if (!bucket) {
      bucket = { taken: 0, missed: 0, skipped: 0, total: 0 };
      dosesByDate.set(dose.scheduledDate, bucket);
    }
    bucket.total++;
    if (dose.status === DOSE_STATUS.TAKEN) {
      bucket.taken++;
    } else if (dose.status === DOSE_STATUS.MISSED) {
      bucket.missed++;
    } else if (dose.status === DOSE_STATUS.SKIPPED) {
      bucket.skipped++;
    }
  }

  const trend = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

    const bucket = dosesByDate.get(dateStr) || { taken: 0, missed: 0, skipped: 0, total: 0 };
    const pastDayTotal = bucket.taken + bucket.missed;
    const dayRate = pastDayTotal > 0
      ? Math.round((bucket.taken / pastDayTotal) * 100)
      : 100; // If no missed doses, default to 100% compliance

    trend.push({
      date: dateStr,
      label: dayLabel,
      adherenceRate: dayRate,
      taken: bucket.taken,
      missed: bucket.missed,
      skipped: bucket.skipped,
      totalDoses: bucket.total,
    });
  }

  return trend;
}

/**
 * GET /api/adherence/stats
 * Retrieves comprehensive adherence statistics for charts and dashboard
 */
export async function getAdherenceStats(req, res, next) {
  try {
    const profileId = req.query.profileId || req.activeProfileId || 'demo-profile-robert';
    const period = req.query.period || '7d'; // '7d' or '30d'
    const daysCount = period === '30d' ? 30 : 7;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Compute start date window to leverage Firestore compound index (profileId + scheduledDate)
    const startDateObj = new Date(today);
    startDateObj.setDate(startDateObj.getDate() - (daysCount + 1));
    const startDateStr = startDateObj.toISOString().split('T')[0];

    // Ensure today's doses are populated in the store
    await ensureDosesForDate(profileId, todayStr);

    let doses = [];

    if (db && typeof db.collection === 'function' && !profileId.startsWith('demo-')) {
      const snap = await db.collection('medicationDoses')
        .where('profileId', '==', profileId)
        .where('scheduledDate', '>=', startDateStr)
        .get();
      doses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      doses = memoryDoses.filter(d => d.profileId === profileId && (!d.scheduledDate || d.scheduledDate >= startDateStr));

      // If memory doses are empty, generate realistic seed dose data for evaluation
      if (doses.length === 0) {
        const today = new Date();
        for (let i = 14; i >= 0; i--) {
          const dateObj = new Date(today);
          dateObj.setDate(dateObj.getDate() - i);
          const dStr = dateObj.toISOString().split('T')[0];
          
          // Seed morning dose
          doses.push({
            id: `seed_lisinopril_${dStr}`,
            profileId,
            medicationName: 'Lisinopril',
            dosage: '10 mg',
            scheduledDate: dStr,
            scheduledTime: '08:00',
            scheduledTimestamp: `${dStr}T08:00:00.000Z`,
            status: i === 0 ? DOSE_STATUS.TAKEN : (i === 3 ? DOSE_STATUS.MISSED : DOSE_STATUS.TAKEN),
            takenAt: i === 3 ? null : `${dStr}T08:15:00.000Z`,
          });

          // Seed evening dose
          doses.push({
            id: `seed_metformin_${dStr}`,
            profileId,
            medicationName: 'Metformin',
            dosage: '500 mg',
            scheduledDate: dStr,
            scheduledTime: '19:30',
            scheduledTimestamp: `${dStr}T19:30:00.000Z`,
            status: i === 0 ? DOSE_STATUS.UPCOMING : (i === 5 ? DOSE_STATUS.SKIPPED : DOSE_STATUS.TAKEN),
            takenAt: (i === 0 || i === 5) ? null : `${dStr}T19:40:00.000Z`,
          });
        }
      }
    }

    const metrics = calculateAdherenceMetrics(doses);
    const trend = buildTrendData(doses, daysCount);

    res.json({
      success: true,
      profileId,
      period,
      metrics,
      trend,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  calculateAdherenceMetrics,
  buildTrendData,
  getAdherenceStats,
};
