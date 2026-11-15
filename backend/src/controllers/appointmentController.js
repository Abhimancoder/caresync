import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/firebaseAdmin.js';
import { logActivity } from '../services/auditLogger.js';
import { AUDIT_ACTIONS, APPOINTMENT_STATUS } from '../config/constants.js';
import { validateAppointmentInput } from '../utils/validators.js';
import { apiSuccess, apiCreated, apiError } from '../utils/responseHelper.js';

// In-memory appointments for demo & evaluation
export const memoryAppointments = [
  {
    id: 'appt-demo-1',
    profileId: 'demo-profile-robert',
    doctorName: 'Dr. Angela Martinez',
    specialty: 'Cardiology',
    hospitalClinic: 'St. Jude Memorial Health Pavilion, Suite 402',
    appointmentDate: '2026-11-20',
    appointmentTime: '14:30',
    appointmentTimestamp: '2026-11-20T14:30:00.000Z',
    notes: 'Routine hypertension follow-up. Bring recent blood pressure logs and medication list.',
    status: APPOINTMENT_STATUS.UPCOMING,
    reminderSent: false,
    createdAt: '2026-11-10T10:00:00Z',
  },
  {
    id: 'appt-demo-2',
    profileId: 'demo-profile-robert',
    doctorName: 'Dr. Sarah Al-Mansoor',
    specialty: 'Endocrinology',
    hospitalClinic: 'Metro Diabetes & Wellness Center',
    appointmentDate: '2026-12-04',
    appointmentTime: '10:00',
    appointmentTimestamp: '2026-12-04T10:00:00.000Z',
    notes: 'Quarterly HbA1c lab review and Metformin tolerance assessment.',
    status: APPOINTMENT_STATUS.UPCOMING,
    reminderSent: false,
    createdAt: '2026-11-12T11:00:00Z',
  },
  {
    id: 'appt-demo-3',
    profileId: 'demo-profile-robert',
    doctorName: 'Dr. Kevin Zhao',
    specialty: 'Ophthalmology',
    hospitalClinic: 'ClearSight Eye Institute',
    appointmentDate: '2026-10-15',
    appointmentTime: '09:15',
    appointmentTimestamp: '2026-10-15T09:15:00.000Z',
    notes: 'Annual diabetic retinopathy screening and vision check. Dilated exam.',
    status: APPOINTMENT_STATUS.COMPLETED,
    reminderSent: true,
    createdAt: '2026-10-01T09:00:00Z',
  },
];

/**
 * GET /api/appointments
 * Retrieves upcoming and past appointments
 */
export async function getAppointments(req, res, next) {
  try {
    const profileId = req.query.profileId || req.activeProfileId || 'demo-profile-robert';
    const nowIso = new Date().toISOString();

    let allAppointments = [];

    if (db && typeof db.collection === 'function' && !profileId.startsWith('demo-')) {
      const snap = await db.collection('appointments')
        .where('profileId', '==', profileId)
        .get();
      allAppointments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      allAppointments = memoryAppointments.filter(a => a.profileId === profileId);
    }

    // Partition into upcoming and past
    const upcoming = [];
    const past = [];

    allAppointments.forEach(appt => {
      const isPast = appt.appointmentTimestamp < nowIso || appt.status === APPOINTMENT_STATUS.COMPLETED;
      if (isPast) {
        past.push(appt);
      } else {
        upcoming.push(appt);
      }
    });

    // Sort upcoming ascending (soonest first)
    upcoming.sort((a, b) => a.appointmentTimestamp.localeCompare(b.appointmentTimestamp));
    // Sort past descending (most recent first)
    past.sort((a, b) => b.appointmentTimestamp.localeCompare(a.appointmentTimestamp));

    res.json({
      success: true,
      profileId,
      counts: {
        total: allAppointments.length,
        upcoming: upcoming.length,
        past: past.length,
      },
      upcoming,
      past,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/appointments
 * Creates a new doctor appointment
 */
export async function createAppointment(req, res, next) {
  try {
    const {
      profileId,
      doctorName,
      specialty = '',
      hospitalClinic,
      appointmentDate,
      appointmentTime,
      notes = '',
    } = req.body;

    if (!profileId) {
      return apiError(res, 'Target profileId is required to schedule appointment.', 400, 'MISSING_PROFILE_ID');
    }

    const validation = validateAppointmentInput(req.body);
    if (!validation.isValid) {
      return apiError(res, validation.errors.join(' '), 400, 'INVALID_APPOINTMENT_INPUT', validation.errors);
    }

    if (!hospitalClinic) {
      return apiError(res, 'Hospital or clinic location is required.', 400, 'MISSING_HOSPITAL_CLINIC');
    }

    const apptId = uuidv4();
    const appointmentTimestamp = `${appointmentDate}T${appointmentTime}:00.000Z`;

    const newAppointment = {
      id: apptId,
      profileId,
      doctorName: doctorName.trim(),
      specialty: specialty.trim(),
      hospitalClinic: hospitalClinic.trim(),
      appointmentDate,
      appointmentTime,
      appointmentTimestamp,
      notes: notes.trim(),
      status: APPOINTMENT_STATUS.UPCOMING,
      reminderSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (db && typeof db.collection === 'function' && !profileId.startsWith('demo-')) {
      await db.collection('appointments').doc(apptId).set(newAppointment);
    } else {
      memoryAppointments.push(newAppointment);
    }

    await logActivity({
      profileId,
      actorUserId: req.user?.uid || 'user',
      actorName: req.user?.displayName || 'User',
      actorRole: req.user?.role || 'caretaker',
      action: AUDIT_ACTIONS.APPOINTMENT_CREATED,
      entityType: 'appointment',
      entityId: apptId,
      details: `Scheduled doctor appointment with ${newAppointment.doctorName} on ${appointmentDate} at ${appointmentTime}.`,
    });

    res.status(201).json({
      success: true,
      message: 'Doctor appointment scheduled successfully.',
      data: newAppointment,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/appointments/:id
 * Updates an existing doctor appointment
 */
export async function updateAppointment(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowed = ['doctorName', 'specialty', 'hospitalClinic', 'appointmentDate', 'appointmentTime', 'notes', 'status'];
    const cleanUpdates = { updatedAt: new Date().toISOString() };

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        cleanUpdates[key] = updates[key];
      }
    }

    if (cleanUpdates.appointmentDate && cleanUpdates.appointmentTime) {
      cleanUpdates.appointmentTimestamp = `${cleanUpdates.appointmentDate}T${cleanUpdates.appointmentTime}:00.000Z`;
    }

    let profileId = null;

    if (db && typeof db.collection === 'function' && !id.startsWith('appt-demo-')) {
      const ref = db.collection('appointments').doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        return res.status(404).json({ success: false, error: 'Appointment not found.' });
      }
      profileId = snap.data().profileId;
      await ref.update(cleanUpdates);
    } else {
      const appt = memoryAppointments.find(a => a.id === id);
      if (!appt) {
        return res.status(404).json({ success: false, error: 'Appointment not found.' });
      }
      profileId = appt.profileId;
      Object.assign(appt, cleanUpdates);
    }

    await logActivity({
      profileId: profileId || 'unknown',
      actorUserId: req.user?.uid || 'user',
      actorName: req.user?.displayName || 'User',
      actorRole: req.user?.role || 'caretaker',
      action: AUDIT_ACTIONS.APPOINTMENT_UPDATED,
      entityType: 'appointment',
      entityId: id,
      details: `Updated appointment with ${updates.doctorName || 'doctor'}.`,
    });

    res.json({
      success: true,
      message: 'Appointment updated successfully.',
      data: cleanUpdates,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/appointments/:id
 * Cancels or deletes an appointment
 */
export async function deleteAppointment(req, res, next) {
  try {
    const { id } = req.params;
    let profileId = null;
    let doctorName = 'doctor';

    if (db && typeof db.collection === 'function' && !id.startsWith('appt-demo-')) {
      const ref = db.collection('appointments').doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        return res.status(404).json({ success: false, error: 'Appointment not found.' });
      }
      profileId = snap.data().profileId;
      doctorName = snap.data().doctorName;
      await ref.delete();
    } else {
      const index = memoryAppointments.findIndex(a => a.id === id);
      if (index !== -1) {
        profileId = memoryAppointments[index].profileId;
        doctorName = memoryAppointments[index].doctorName;
        memoryAppointments.splice(index, 1);
      }
    }

    await logActivity({
      profileId: profileId || 'unknown',
      actorUserId: req.user?.uid || 'user',
      actorName: req.user?.displayName || 'User',
      actorRole: req.user?.role || 'caretaker',
      action: AUDIT_ACTIONS.APPOINTMENT_DELETED,
      entityType: 'appointment',
      entityId: id,
      details: `Cancelled appointment with ${doctorName}.`,
    });

    res.json({ success: true, message: 'Appointment removed successfully.' });
  } catch (err) {
    next(err);
  }
}

export default {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
