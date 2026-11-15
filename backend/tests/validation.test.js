import {
  isValidEmail,
  isValidDateStr,
  isValidTimeStr,
  validateMedicationInput,
  validateAppointmentInput,
} from '../src/utils/validators.js';

describe('CareSync Input Validation & Clinical Sanitization Tests', () => {
  describe('Email and Format Validators', () => {
    test('validates correct email addresses', () => {
      expect(isValidEmail('sarah.jenkins@hospital.org')).toBe(true);
      expect(isValidEmail('caregiver@caresync.health')).toBe(true);
    });

    test('rejects malformed email addresses', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@missinguser.com')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });

    test('validates standard ISO YYYY-MM-DD dates', () => {
      expect(isValidDateStr('2026-11-15')).toBe(true);
      expect(isValidDateStr('2027-01-01')).toBe(true);
    });

    test('rejects malformed dates', () => {
      expect(isValidDateStr('15-11-2026')).toBe(false);
      expect(isValidDateStr('2026/11/15')).toBe(false);
      expect(isValidDateStr('invalid-date')).toBe(false);
      expect(isValidDateStr(null)).toBe(false);
      expect(isValidDateStr(123)).toBe(false);
    });

    test('validates 24-hour HH:MM time strings', () => {
      expect(isValidTimeStr('08:00')).toBe(true);
      expect(isValidTimeStr('19:30')).toBe(true);
      expect(isValidTimeStr('23:59')).toBe(true);
    });

    test('rejects invalid time formats', () => {
      expect(isValidTimeStr('25:00')).toBe(false);
      expect(isValidTimeStr('8:00')).toBe(false);
      expect(isValidTimeStr('noon')).toBe(false);
      expect(isValidTimeStr(null)).toBe(false);
      expect(isValidTimeStr(123)).toBe(false);
    });
  });

  describe('Medication Clinical Payload Validation', () => {
    test('accepts valid prescription payload', () => {
      const payload = {
        name: 'Lisinopril',
        dosage: '10',
        unit: 'mg',
        scheduledTimes: ['08:00'],
        startDate: '2026-11-01',
        endDate: '2027-11-01',
      };
      const result = validateMedicationInput(payload);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('rejects empty medication name', () => {
      const payload = {
        name: '   ',
        dosage: '10',
        scheduledTimes: ['08:00'],
      };
      const result = validateMedicationInput(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Medication name is required');
    });

    test('rejects missing or empty scheduledTimes array', () => {
      const payload = {
        name: 'Metformin',
        dosage: '500',
        scheduledTimes: [],
      };
      const result = validateMedicationInput(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('scheduled intake time'))).toBe(true);
    });

    test('rejects chronological conflict where startDate is after endDate', () => {
      const payload = {
        name: 'Amlodipine',
        dosage: '5',
        scheduledTimes: ['09:00'],
        startDate: '2027-01-01',
        endDate: '2026-01-01',
      };
      const result = validateMedicationInput(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('startDate cannot be after endDate'))).toBe(true);
    });

    test('rejects non-object medication payload', () => {
      expect(validateMedicationInput(null).isValid).toBe(false);
      expect(validateMedicationInput('invalid-payload').isValid).toBe(false);
    });

    test('rejects missing dosage and invalid time/date format', () => {
      const payload = {
        name: 'Aspirin',
        scheduledTimes: ['25:00'],
        startDate: 'bad-date',
        endDate: 'bad-date',
      };
      const result = validateMedicationInput(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Dosage is required'))).toBe(true);
      expect(result.errors.some(e => e.includes('Invalid time format'))).toBe(true);
      expect(result.errors.some(e => e.includes('Invalid startDate'))).toBe(true);
      expect(result.errors.some(e => e.includes('Invalid endDate'))).toBe(true);
    });
  });

  describe('Doctor Appointment Payload Validation', () => {
    test('accepts valid appointment details', () => {
      const payload = {
        doctorName: 'Dr. Angela Martinez',
        appointmentDate: '2026-11-20',
        appointmentTime: '14:30',
        hospitalClinic: 'St. Jude Pavilion',
      };
      const result = validateAppointmentInput(payload);
      expect(result.isValid).toBe(true);
    });

    test('rejects non-object appointment payload', () => {
      expect(validateAppointmentInput(null).isValid).toBe(false);
      expect(validateAppointmentInput('invalid').isValid).toBe(false);
    });

    test('rejects missing doctor name and invalid date/time', () => {
      const payload = {
        doctorName: '',
        appointmentDate: 'not-a-date',
        appointmentTime: 'not-a-time',
      };
      const result = validateAppointmentInput(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
