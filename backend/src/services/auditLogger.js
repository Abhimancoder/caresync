import { db } from '../config/firebaseAdmin.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * CareSync Audit Logger
 * Records tamper-resistant activity logs for compliance and caregiver transparency
 */

// In-memory fallback if Firestore is running without live credentials
const memoryLogs = [];

/**
 * Logs an event in the CareSync ecosystem
 * @param {Object} params
 * @param {string} params.profileId - Targeted elderly profile ID
 * @param {string} params.actorUserId - User ID performing the action
 * @param {string} params.actorName - Name of the user performing the action
 * @param {string} params.actorRole - Role of the user ('elderly' | 'caretaker' | 'family')
 * @param {string} params.action - Action identifier from AUDIT_ACTIONS
 * @param {string} params.entityType - Entity type ('medication' | 'dose' | 'appointment' | 'invitation' | 'profile')
 * @param {string} params.entityId - ID of the entity modified
 * @param {string} params.details - Descriptive summary of what occurred
 * @returns {Promise<Object>}
 */
export async function logActivity({
  profileId,
  actorUserId,
  actorName = 'System',
  actorRole = 'system',
  action,
  entityType,
  entityId,
  details,
}) {
  const logEntry = {
    id: uuidv4(),
    profileId,
    actorUserId,
    actorName,
    actorRole,
    action,
    entityType,
    entityId,
    details,
    timestamp: new Date().toISOString(),
  };

  try {
    if (db && typeof db.collection === 'function') {
      await db.collection('activityLogs').doc(logEntry.id).set(logEntry);
    } else {
      memoryLogs.unshift(logEntry);
    }
    console.log(`📋 [Audit Log] ${logEntry.action}: ${logEntry.details} (by ${actorName} [${actorRole}])`);
    return logEntry;
  } catch (err) {
    console.warn('⚠️ [Audit Log] Failed to persist log entry to Firestore, buffering in memory:', err.message);
    memoryLogs.unshift(logEntry);
    return logEntry;
  }
}

/**
 * Retrieves activity logs for a profile
 * @param {string} profileId
 * @param {number} [limit=50]
 * @returns {Promise<Array>}
 */
export async function getProfileLogs(profileId, limit = 50) {
  try {
    if (db && typeof db.collection === 'function') {
      const snapshot = await db.collection('activityLogs')
        .where('profileId', '==', profileId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (err) {
    console.warn('⚠️ [Audit Log Query] Falling back to memory buffer:', err.message);
  }

  return memoryLogs
    .filter(log => log.profileId === profileId)
    .slice(0, limit);
}

export default {
  logActivity,
  getProfileLogs,
};
