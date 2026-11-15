/**
 * Input Validation & Sanitization Utility for CareSync
 * Protects clinical workflows against malformed payloads, injection, and invalid schedules
 */

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidDateStr(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

export function isValidTimeStr(timeStr) {
  if (typeof timeStr !== 'string') return false;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(timeStr.trim());
}

export function validateMedicationInput(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object.'] };
  }

  const { name, dosage, scheduledTimes, startDate, endDate } = payload;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Medication name is required and must be a non-empty string.');
  }

  if (!dosage || (typeof dosage !== 'string' && typeof dosage !== 'number')) {
    errors.push('Dosage is required (e.g., 10, "500").');
  }

  if (!Array.isArray(scheduledTimes) || scheduledTimes.length === 0) {
    errors.push('At least one scheduled intake time (HH:MM) is required.');
  } else {
    for (const t of scheduledTimes) {
      if (!isValidTimeStr(t)) {
        errors.push(`Invalid time format "${t}". Expected 24-hour format HH:MM (e.g. "08:00").`);
      }
    }
  }

  if (startDate && !isValidDateStr(startDate)) {
    errors.push(`Invalid startDate format "${startDate}". Expected YYYY-MM-DD.`);
  }

  if (endDate && !isValidDateStr(endDate)) {
    errors.push(`Invalid endDate format "${endDate}". Expected YYYY-MM-DD.`);
  }

  if (startDate && endDate && startDate > endDate) {
    errors.push('startDate cannot be after endDate.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateAppointmentInput(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object.'] };
  }

  const { doctorName, appointmentDate, appointmentTime } = payload;

  if (!doctorName || typeof doctorName !== 'string' || doctorName.trim().length === 0) {
    errors.push('Doctor name is required.');
  }

  if (!appointmentDate || !isValidDateStr(appointmentDate)) {
    errors.push('Valid appointmentDate is required in YYYY-MM-DD format.');
  }

  if (!appointmentTime || !isValidTimeStr(appointmentTime)) {
    errors.push('Valid appointmentTime is required in HH:MM format.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default {
  isValidEmail,
  isValidDateStr,
  isValidTimeStr,
  validateMedicationInput,
  validateAppointmentInput,
};
