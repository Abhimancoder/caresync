import { db } from '../config/firebaseAdmin.js';
import { logActivity } from '../services/auditLogger.js';
import { AUDIT_ACTIONS, DOSE_STATUS } from '../config/constants.js';
import { memoryMedications } from './medicationController.js';

// In-memory dose records for demo evaluation
export const memoryDoses = [];

/**
 * Helper to build deterministic dose ID to prevent duplicate dose generation
 */
export function buildDoseId(profileId, medId, dateStr, timeStr) {
  const cleanTime = timeStr.replace(':', '');
  return `dose_${profileId}_${medId}_${dateStr}_${cleanTime}`;
}

/**
 * Generates dose records for a given date from active medications
 */
export async function ensureDosesForDate(profileId, dateStr) {
  let activeMeds = [];

  if (db && typeof db.collection === 'function' && !profileId.startsWith('demo-')) {
    const snap = await db.collection('medications')
      .where('profileId', '==', profileId)
      .where('isActive', '==', true)
      .get();
    activeMeds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } else {
    activeMeds = memoryMedications.filter(m => m.profileId === profileId && m.isActive !== false);
  }

  const generated = [];

  for (const med of activeMeds) {
    // Check medication date range
    if (med.startDate && dateStr < med.startDate) continue;
    if (med.endDate && dateStr > med.endDate) continue;

    for (const timeStr of (med.scheduledTimes || [])) {
      const doseId = buildDoseId(profileId, med.id, dateStr, timeStr);
      const scheduledIso = `${dateStr}T${timeStr}:00.000Z`;

      // Check if dose already exists
      let exists = false;
      if (db && typeof db.collection === 'function' && !profileId.startsWith('demo-')) {
        const doseDoc = await db.collection('medicationDoses').doc(doseId).get();
        exists = doseDoc.exists;
      } else {
        exists = memoryDoses.some(d => d.id === doseId);
      }

      if (!exists) {
        const newDose = {
          id: doseId,
          profileId,
          medicationId: med.id,
          medicationName: med.name,
          dosage: `${med.dosage} ${med.unit}`,
          form: med.form || 'tablet',
          instructions: med.instructions || '',
          scheduledDate: dateStr,
          scheduledTime: timeStr,
          scheduledTimestamp: scheduledIso,
          status: DOSE_STATUS.UPCOMING,
          takenAt: null,
          takenByUserId: null,
          takenByRole: null,
          notes: '',
          reminderSent: false,
          missedAlertSent: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (db && typeof db.collection === 'function' && !profileId.startsWith('demo-')) {
          await db.collection('medicationDoses').doc(doseId).set(newDose);
        } else {
          memoryDoses.push(newDose);
        }
        generated.push(newDose);
      }
    }
  }

  return generated;
}

/**
 * GET /api/doses/today
 * Retrieves doses for today, generating them if not yet created
 */
export async function getTodayDoses(req, res, next) {
  try {
    const profileId = req.query.profileId || req.activeProfileId || 'demo-profile-robert';
    const todayStr = new Date().toISOString().split('T')[0];

    // Ensure today's doses are populated
    await ensureDosesForDate(profileId, todayStr);

    let doses = [];
    if (db && typeof db.collection === 'function' && !profileId.startsWith('demo-')) {
      const snap = await db.collection('medicationDoses')
        .where('profileId', '==', profileId)
        .where('scheduledDate', '==', todayStr)
        .get();
      doses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      doses = memoryDoses.filter(d => d.profileId === profileId && d.scheduledDate === todayStr);
    }

    // Sort chronologically by scheduledTime
    doses.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    res.json({
      success: true,
      date: todayStr,
      count: doses.length,
      data: doses,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/doses/:id/status
 * Updates a dose's status (taken, missed, skipped)
 */
export async function updateDoseStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes = '' } = req.body;

    if (!Object.values(DOSE_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status '${status}'. Must be one of: [${Object.values(DOSE_STATUS).join(', ')}]`,
      });
    }

    const nowIso = new Date().toISOString();
    const userId = req.user?.uid || 'user';
    const userName = req.user?.displayName || 'User';
    const userRole = req.user?.role || 'caretaker';

    let doseData = null;

    if (db && typeof db.collection === 'function' && !id.startsWith('dose_demo-')) {
      const doseRef = db.collection('medicationDoses').doc(id);
      const snap = await doseRef.get();
      if (!snap.exists) {
        return res.status(404).json({ success: false, error: 'Dose record not found.' });
      }
      doseData = snap.data();

      const updatePayload = {
        status,
        notes,
        updatedAt: nowIso,
      };

      if (status === DOSE_STATUS.TAKEN) {
        updatePayload.takenAt = nowIso;
        updatePayload.takenByUserId = userId;
        updatePayload.takenByRole = userRole;
      }

      await doseRef.update(updatePayload);
      doseData = { ...doseData, ...updatePayload };
    } else {
      const dose = memoryDoses.find(d => d.id === id);
      if (!dose) {
        return res.status(404).json({ success: false, error: 'Dose record not found.' });
      }
      dose.status = status;
      dose.notes = notes;
      dose.updatedAt = nowIso;
      if (status === DOSE_STATUS.TAKEN) {
        dose.takenAt = nowIso;
        dose.takenByUserId = userId;
        dose.takenByRole = userRole;
      }
      doseData = dose;
    }

    // Map action for audit log
    let auditAction = AUDIT_ACTIONS.DOSE_MARKED_TAKEN;
    if (status === DOSE_STATUS.MISSED) auditAction = AUDIT_ACTIONS.DOSE_MARKED_MISSED;
    if (status === DOSE_STATUS.SKIPPED) auditAction = AUDIT_ACTIONS.DOSE_MARKED_SKIPPED;

    await logActivity({
      profileId: doseData.profileId,
      actorUserId: userId,
      actorName: userName,
      actorRole: userRole,
      action: auditAction,
      entityType: 'dose',
      entityId: id,
      details: `Marked dose of ${doseData.medicationName} (${doseData.dosage}) as ${status.toUpperCase()}${notes ? ` (Note: ${notes})` : ''}.`,
    });

    res.json({
      success: true,
      message: `Dose marked as ${status}.`,
      data: doseData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/doses/generate-schedule
 * Pre-generates schedule doses for next N days
 */
export async function generateDoseSchedule(req, res, next) {
  try {
    const { profileId, days = 7 } = req.body;

    if (!profileId) {
      return res.status(400).json({ success: false, error: 'profileId is required.' });
    }

    const today = new Date();
    let totalGenerated = 0;

    for (let i = 0; i < Number(days); i++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      const newlyCreated = await ensureDosesForDate(profileId, dateStr);
      totalGenerated += newlyCreated.length;
    }

    res.json({
      success: true,
      message: `Generated ${totalGenerated} dose records across ${days} days.`,
      daysCovered: days,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getTodayDoses,
  updateDoseStatus,
  generateDoseSchedule,
  ensureDosesForDate,
};
