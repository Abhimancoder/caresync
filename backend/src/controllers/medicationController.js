import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/firebaseAdmin.js';
import { logActivity } from '../services/auditLogger.js';
import { AUDIT_ACTIONS, DOSE_STATUS } from '../config/constants.js';
import { removeUpcomingDosesForMedication } from './doseController.js';
import { validateMedicationInput } from '../utils/validators.js';
import { apiSuccess, apiCreated, apiError } from '../utils/responseHelper.js';

// In-memory store fallback for demo & evaluation
export const memoryMedications = [
  {
    id: 'med-demo-1',
    profileId: 'demo-profile-robert',
    name: 'Lisinopril',
    dosage: '10',
    unit: 'mg',
    form: 'tablet',
    instructions: 'Take 1 tablet every morning with a glass of water after breakfast.',
    prescribingDoctor: 'Dr. Angela Martinez, MD (Cardiology)',
    frequency: 'once_daily',
    scheduledTimes: ['08:00'],
    startDate: '2026-11-01',
    endDate: '2027-11-01',
    isActive: true,
    createdAt: '2026-11-01T08:00:00Z',
  },
  {
    id: 'med-demo-2',
    profileId: 'demo-profile-robert',
    name: 'Metformin',
    dosage: '500',
    unit: 'mg',
    form: 'tablet',
    instructions: 'Take 1 tablet twice daily with meals.',
    prescribingDoctor: 'Dr. Sarah Al-Mansoor, MD (Endocrinology)',
    frequency: 'twice_daily',
    scheduledTimes: ['08:30', '19:30'],
    startDate: '2026-11-01',
    endDate: '2027-11-01',
    isActive: true,
    createdAt: '2026-11-01T08:00:00Z',
  },
  {
    id: 'med-demo-3',
    profileId: 'demo-profile-robert',
    name: 'Atorvastatin',
    dosage: '20',
    unit: 'mg',
    form: 'tablet',
    instructions: 'Take 1 tablet at bedtime.',
    prescribingDoctor: 'Dr. Angela Martinez, MD (Cardiology)',
    frequency: 'once_daily',
    scheduledTimes: ['21:00'],
    startDate: '2026-11-01',
    endDate: '2027-11-01',
    isActive: true,
    createdAt: '2026-11-01T08:00:00Z',
  },
];

/**
 * GET /api/medications
 * Retrieves all medications for an authorized profile
 */
export async function getMedications(req, res, next) {
  try {
    const profileId = req.query.profileId || req.activeProfileId;

    if (!profileId) {
      return res.status(400).json({ success: false, error: 'profileId query parameter is required.' });
    }

    if (db && typeof db.collection === 'function' && !profileId.startsWith('demo-')) {
      const snapshot = await db.collection('medications')
        .where('profileId', '==', profileId)
        .where('isActive', '==', true)
        .get();

      const medications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json({ success: true, count: medications.length, data: medications });
    }

    // Memory fallback
    const filtered = memoryMedications.filter(m => m.profileId === profileId && m.isActive !== false);
    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/medications
 * Adds a new medication and schedules its doses
 */
export async function createMedication(req, res, next) {
  try {
    const {
      profileId,
      name,
      dosage,
      unit = 'mg',
      form = 'tablet',
      instructions = '',
      prescribingDoctor = '',
      frequency = 'once_daily',
      scheduledTimes = ['08:00'],
      startDate,
      endDate,
    } = req.body;

    if (!profileId) {
      return apiError(res, 'Target profileId is required to schedule medication.', 400, 'MISSING_PROFILE_ID');
    }

    const validation = validateMedicationInput(req.body);
    if (!validation.isValid) {
      return apiError(res, validation.errors.join(' '), 400, 'INVALID_MEDICATION_INPUT', validation.errors);
    }

    const medId = uuidv4();
    const newMedication = {
      id: medId,
      profileId,
      name: name.trim(),
      dosage: String(dosage).trim(),
      unit,
      form,
      instructions: instructions.trim(),
      prescribingDoctor: prescribingDoctor.trim(),
      frequency,
      scheduledTimes: Array.isArray(scheduledTimes) ? scheduledTimes : [scheduledTimes],
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (db && typeof db.collection === 'function' && !profileId.startsWith('demo-')) {
      await db.collection('medications').doc(medId).set(newMedication);
    } else {
      memoryMedications.push(newMedication);
    }

    await logActivity({
      profileId,
      actorUserId: req.user?.uid || 'user',
      actorName: req.user?.displayName || 'User',
      actorRole: req.user?.role || 'caretaker',
      action: AUDIT_ACTIONS.MEDICATION_ADDED,
      entityType: 'medication',
      entityId: medId,
      details: `Added new prescription: ${newMedication.name} (${newMedication.dosage} ${newMedication.unit}), ${newMedication.scheduledTimes.join(', ')}.`,
    });

    res.status(201).json({
      success: true,
      message: 'Medication added successfully.',
      data: newMedication,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/medications/:id
 * Updates an existing medication prescription
 */
export async function updateMedication(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedUpdates = [
      'name', 'dosage', 'unit', 'form', 'instructions',
      'prescribingDoctor', 'frequency', 'scheduledTimes', 'startDate', 'endDate', 'isActive'
    ];

    const cleanUpdates = { updatedAt: new Date().toISOString() };
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        cleanUpdates[key] = updates[key];
      }
    }

    let profileId = null;

    if (db && typeof db.collection === 'function' && !id.startsWith('med-demo-')) {
      const docRef = db.collection('medications').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Medication not found.' });
      }
      profileId = doc.data().profileId;
      await docRef.update(cleanUpdates);
    } else {
      const med = memoryMedications.find(m => m.id === id);
      if (!med) {
        return res.status(404).json({ success: false, error: 'Medication not found.' });
      }
      profileId = med.profileId;
      Object.assign(med, cleanUpdates);
    }

    await logActivity({
      profileId: profileId || 'unknown',
      actorUserId: req.user?.uid || 'user',
      actorName: req.user?.displayName || 'User',
      actorRole: req.user?.role || 'caretaker',
      action: AUDIT_ACTIONS.MEDICATION_UPDATED,
      entityType: 'medication',
      entityId: id,
      details: `Updated prescription details for ${updates.name || 'medication'}.`,
    });

    res.json({ success: true, message: 'Medication updated successfully.', data: cleanUpdates });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/medications/:id
 * Archives / soft-deletes a medication
 */
export async function deleteMedication(req, res, next) {
  try {
    const { id } = req.params;
    let medName = 'medication';
    let profileId = null;

    if (db && typeof db.collection === 'function' && !id.startsWith('med-demo-')) {
      const docRef = db.collection('medications').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Medication not found.' });
      }
      medName = doc.data().name;
      profileId = doc.data().profileId;
      await docRef.update({ isActive: false, updatedAt: new Date().toISOString() });
    } else {
      const med = memoryMedications.find(m => m.id === id);
      if (med) {
        medName = med.name;
        profileId = med.profileId;
        med.isActive = false;
        removeUpcomingDosesForMedication(id);
      }
    }

    await logActivity({
      profileId: profileId || 'unknown',
      actorUserId: req.user?.uid || 'user',
      actorName: req.user?.displayName || 'User',
      actorRole: req.user?.role || 'caretaker',
      action: AUDIT_ACTIONS.MEDICATION_DELETED,
      entityType: 'medication',
      entityId: id,
      details: `Deactivated medication prescription: ${medName}.`,
    });

    res.json({ success: true, message: `Medication '${medName}' deactivated successfully.` });
  } catch (err) {
    next(err);
  }
}

export default {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
};
