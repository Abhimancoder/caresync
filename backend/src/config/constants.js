/**
 * CareSync System Constants
 * Centralized enumeration of roles, statuses, and action types
 */

export const USER_ROLES = {
  ELDERLY: 'elderly',
  CARETAKER: 'caretaker',
  FAMILY: 'family',
};

export const DOSE_STATUS = {
  UPCOMING: 'upcoming',
  TAKEN: 'taken',
  MISSED: 'missed',
  SKIPPED: 'skipped',
};

export const APPOINTMENT_STATUS = {
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const NOTIFICATION_TYPES = {
  UPCOMING_DOSE: 'upcoming_dose',
  MISSED_DOSE: 'missed_dose',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  MEMBER_INVITED: 'member_invited',
  SYSTEM: 'system',
};

export const AUDIT_ACTIONS = {
  PROFILE_CREATED: 'PROFILE_CREATED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  MEDICATION_ADDED: 'MEDICATION_ADDED',
  MEDICATION_UPDATED: 'MEDICATION_UPDATED',
  MEDICATION_DELETED: 'MEDICATION_DELETED',
  DOSE_MARKED_TAKEN: 'DOSE_MARKED_TAKEN',
  DOSE_MARKED_MISSED: 'DOSE_MARKED_MISSED',
  DOSE_MARKED_SKIPPED: 'DOSE_MARKED_SKIPPED',
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED: 'APPOINTMENT_UPDATED',
  APPOINTMENT_DELETED: 'APPOINTMENT_DELETED',
  INVITATION_GENERATED: 'INVITATION_GENERATED',
  INVITATION_ACCEPTED: 'INVITATION_ACCEPTED',
  INVITATION_REVOKED: 'INVITATION_REVOKED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
};

export const MEDICATION_FORMS = [
  'tablet',
  'capsule',
  'liquid',
  'inhaler',
  'injection',
  'drops',
  'patch',
];

export const FREQUENCIES = {
  ONCE_DAILY: 'once_daily',
  TWICE_DAILY: 'twice_daily',
  THREE_TIMES_DAILY: 'three_times_daily',
  FOUR_TIMES_DAILY: 'four_times_daily',
  AS_NEEDED: 'as_needed',
};
