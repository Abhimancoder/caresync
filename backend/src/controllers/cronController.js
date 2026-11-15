import { db } from '../config/firebaseAdmin.js';
import { memoryDoses } from './doseController.js';
import { memoryAppointments } from './appointmentController.js';
import {
  sendUpcomingDoseEmail,
  sendMissedDoseAlertEmail,
  sendAppointmentReminderEmail,
} from '../services/emailService.js';
import { logActivity } from '../services/auditLogger.js';
import { AUDIT_ACTIONS, DOSE_STATUS, NOTIFICATION_TYPES } from '../config/constants.js';
import { v4 as uuidv4 } from 'uuid';

// In-memory notifications fallback for demo
export const memoryNotifications = [];

/**
 * Creates an in-app notification record
 */
async function createInAppNotification({
  profileId,
  recipientUserId = 'caregiver',
  recipientEmail = 'caretaker@caresync.health',
  type,
  title,
  message,
}) {
  const notif = {
    id: uuidv4(),
    profileId,
    recipientUserId,
    recipientEmail,
    type,
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  if (db && typeof db.collection === 'function' && !profileId.startsWith('demo-')) {
    await db.collection('notifications').doc(notif.id).set(notif);
  } else {
    memoryNotifications.unshift(notif);
  }

  return notif;
}

/**
 * POST /api/cron/process-reminders
 * Executed periodically by Google Cloud Scheduler
 */
export async function processReminders(req, res, next) {
  try {
    const cronSecretHeader = req.headers['x-cron-secret'] || req.query.secret;
    const expectedSecret = process.env.CRON_SECRET || 'caresync-cloud-scheduler-secret-2026';

    // Verify secret for security
    if (process.env.NODE_ENV === 'production' && cronSecretHeader !== expectedSecret) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized cron trigger. Invalid X-Cron-Secret header.',
        code: 'CRON_UNAUTHORIZED',
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const todayStr = nowIso.split('T')[0];

    let upcomingRemindersSent = 0;
    let missedAlertsSent = 0;
    let appointmentRemindersSent = 0;

    // 1. Process Upcoming Doses (Within next 45 minutes)
    const fortyFiveMinutesLater = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

    const candidateDoses = memoryDoses.filter(d =>
      d.scheduledDate === todayStr &&
      d.scheduledTimestamp >= nowIso &&
      d.scheduledTimestamp <= fortyFiveMinutesLater &&
      !d.reminderSent &&
      d.status === DOSE_STATUS.UPCOMING
    );

    for (const dose of candidateDoses) {
      await sendUpcomingDoseEmail({
        recipientEmail: 'sarah.jenkins@caresync.health',
        elderlyName: 'Robert Harrison',
        medicationName: dose.medicationName,
        dosage: dose.dosage,
        scheduledTime: dose.scheduledTime,
        instructions: dose.instructions,
      });

      await createInAppNotification({
        profileId: dose.profileId,
        type: NOTIFICATION_TYPES.UPCOMING_DOSE,
        title: `Upcoming Dose: ${dose.medicationName}`,
        message: `${dose.medicationName} (${dose.dosage}) is scheduled at ${dose.scheduledTime}.`,
      });

      dose.reminderSent = true;
      upcomingRemindersSent++;
    }

    // 2. Process Overdue / Missed Doses (>60 mins past scheduled time)
    const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const overdueDoses = memoryDoses.filter(d =>
      d.scheduledTimestamp < sixtyMinutesAgo &&
      d.status === DOSE_STATUS.UPCOMING &&
      !d.missedAlertSent
    );

    for (const dose of overdueDoses) {
      dose.status = DOSE_STATUS.MISSED;
      dose.missedAlertSent = true;

      await sendMissedDoseAlertEmail({
        recipientEmail: 'sarah.jenkins@caresync.health',
        elderlyName: 'Robert Harrison',
        medicationName: dose.medicationName,
        dosage: dose.dosage,
        scheduledTime: dose.scheduledTime,
      });

      await createInAppNotification({
        profileId: dose.profileId,
        type: NOTIFICATION_TYPES.MISSED_DOSE,
        title: `Missed Dose Alert: ${dose.medicationName}`,
        message: `Robert Harrison did not record taking ${dose.medicationName} (${dose.dosage}) scheduled at ${dose.scheduledTime}.`,
      });

      await logActivity({
        profileId: dose.profileId,
        actorUserId: 'system-scheduler',
        actorName: 'Google Cloud Scheduler',
        actorRole: 'system',
        action: AUDIT_ACTIONS.DOSE_MARKED_MISSED,
        entityType: 'dose',
        entityId: dose.id,
        details: `Automated rule flagged ${dose.medicationName} as MISSED after 60-min grace period and alerted care team.`,
      });

      missedAlertsSent++;
    }

    // 3. Process Doctor Appointments (Scheduled in next 24 hours)
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const upcomingAppointments = memoryAppointments.filter(a =>
      a.appointmentTimestamp >= nowIso &&
      a.appointmentTimestamp <= twentyFourHoursLater &&
      !a.reminderSent
    );

    for (const appt of upcomingAppointments) {
      await sendAppointmentReminderEmail({
        recipientEmail: 'sarah.jenkins@caresync.health',
        elderlyName: 'Robert Harrison',
        doctorName: appt.doctorName,
        specialty: appt.specialty,
        hospitalClinic: appt.hospitalClinic,
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
        notes: appt.notes,
      });

      await createInAppNotification({
        profileId: appt.profileId,
        type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
        title: `Appointment Tomorrow: ${appt.doctorName}`,
        message: `Scheduled visit at ${appt.hospitalClinic} on ${appt.appointmentDate} at ${appt.appointmentTime}.`,
      });

      appt.reminderSent = true;
      appointmentRemindersSent++;
    }

    res.json({
      success: true,
      timestamp: nowIso,
      summary: {
        upcomingRemindersSent,
        missedAlertsSent,
        appointmentRemindersSent,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications
 * Retrieves in-app notifications
 */
export async function getNotifications(req, res, next) {
  try {
    const profileId = req.query.profileId || req.activeProfileId || 'demo-profile-robert';
    const limit = Number(req.query.limit) || 20;

    let notifs = [];
    if (db && typeof db.collection === 'function' && !profileId.startsWith('demo-')) {
      const snap = await db.collection('notifications')
        .where('profileId', '==', profileId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      notifs = memoryNotifications.filter(n => n.profileId === profileId).slice(0, limit);
    }

    const unreadCount = notifs.filter(n => !n.isRead).length;

    res.json({
      success: true,
      unreadCount,
      count: notifs.length,
      data: notifs,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Marks a notification as read
 */
export async function markNotificationAsRead(req, res, next) {
  try {
    const { id } = req.params;

    if (db && typeof db.collection === 'function' && !id.startsWith('sim_')) {
      await db.collection('notifications').doc(id).update({ isRead: true });
    } else {
      const notif = memoryNotifications.find(n => n.id === id);
      if (notif) notif.isRead = true;
    }

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
}

export default {
  processReminders,
  getNotifications,
  markNotificationAsRead,
};
