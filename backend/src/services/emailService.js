import { sendEmail, isSimulationMode } from '../config/emailConfig.js';
import { db } from '../config/firebaseAdmin.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * CareSync Email Service
 * Renders high-accessibility, branded medical email notifications
 */

// Shared base styling for email templates
const emailStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  line-height: 1.6;
`;

/**
 * Wraps content in the official CareSync email layout
 */
function wrapTemplate(title, preheader, bodyHtml, footerNote = '') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f7ff; ${emailStyles}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f7ff; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(30, 58, 138, 0.08); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="background-color: #1e3a8a; padding: 24px 32px; text-align: left;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                      CareSync <span style="color: #14b8a6; font-size: 16px; font-weight: 500;">Health</span>
                    </h1>
                    <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 13px;">Elderly Care & Medication Management Platform</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
              <p style="margin: 0 0 8px 0;">This is an automated healthcare alert sent on behalf of your CareSync health team.</p>
              ${footerNote ? `<p style="margin: 0 0 8px 0; color: #0284c7;"><strong>Notice:</strong> ${footerNote}</p>` : ''}
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                CareSync is a medication management and schedule coordination tool, not an emergency medical dispatcher. In a medical emergency, please call your local emergency services (911/112) immediately.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 1. Upcoming Medication Dose Reminder
 */
export async function sendUpcomingDoseEmail({
  recipientEmail,
  elderlyName,
  medicationName,
  dosage,
  scheduledTime,
  instructions,
}) {
  const subject = `⏰ Medication Reminder: ${medicationName} (${dosage}) for ${elderlyName}`;
  const html = wrapTemplate(
    'Upcoming Medication Reminder',
    `Dose scheduled at ${scheduledTime}`,
    `
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.5px;">Upcoming Dose</span>
        <h2 style="margin: 6px 0 0 0; font-size: 20px; color: #1e3a8a;">${medicationName} - ${dosage}</h2>
      </div>

      <p style="font-size: 16px; margin: 0 0 16px 0;">
        Hello, this is a reminder that <strong>${elderlyName}</strong> is scheduled to take medication shortly:
      </p>

      <table width="100%" cellspacing="0" cellpadding="8" style="border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; font-size: 14px;">
        <tr style="background-color: #f8fafc;">
          <td style="color: #64748b; width: 35%;">Scheduled Time:</td>
          <td style="font-weight: 600; color: #0f172a;">${scheduledTime}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Medication:</td>
          <td style="font-weight: 600; color: #0f172a;">${medicationName} (${dosage})</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="color: #64748b;">Instructions:</td>
          <td style="color: #334155;">${instructions || 'Take as prescribed with water.'}</td>
        </tr>
      </table>

      <p style="font-size: 14px; color: #475569; margin: 0 0 24px 0;">
        Please log into CareSync to mark this dose as <strong>Taken</strong> once completed.
      </p>
    `
  );

  return sendEmail({ to: recipientEmail, subject, html });
}

/**
 * 2. Missed Medication Dose Alert
 */
export async function sendMissedDoseAlertEmail({
  recipientEmail,
  elderlyName,
  medicationName,
  dosage,
  scheduledTime,
}) {
  const subject = `⚠️ URGENT: Missed Medication Alert for ${elderlyName} (${medicationName})`;
  const html = wrapTemplate(
    'Missed Medication Alert',
    `Dose at ${scheduledTime} was not marked taken`,
    `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #b91c1c; letter-spacing: 0.5px;">Missed Dose Alert</span>
        <h2 style="margin: 6px 0 0 0; font-size: 20px; color: #991b1b;">${medicationName} (${dosage})</h2>
      </div>

      <p style="font-size: 16px; margin: 0 0 16px 0;">
        <strong>Attention Care Team:</strong> The scheduled dose of <strong>${medicationName}</strong> for <strong>${elderlyName}</strong> scheduled at <strong>${scheduledTime}</strong> was not marked as taken within the grace period.
      </p>

      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #9a3412;">
        <strong>Recommended Next Steps:</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 20px;">
          <li>Contact ${elderlyName} or the assigned primary caregiver to verify safety.</li>
          <li>Confirm whether the dose was taken but not yet logged on the platform.</li>
          <li>Update the dose status in CareSync accordingly.</li>
        </ul>
      </div>
    `
  );

  return sendEmail({ to: recipientEmail, subject, html });
}

/**
 * 3. Upcoming Doctor Appointment Reminder
 */
export async function sendAppointmentReminderEmail({
  recipientEmail,
  elderlyName,
  doctorName,
  specialty,
  hospitalClinic,
  appointmentDate,
  appointmentTime,
  notes,
}) {
  const subject = `🗓️ Upcoming Doctor Appointment for ${elderlyName}: ${doctorName}`;
  const html = wrapTemplate(
    'Doctor Appointment Reminder',
    `Scheduled for ${appointmentDate} at ${appointmentTime}`,
    `
      <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #047857; letter-spacing: 0.5px;">Upcoming Appointment</span>
        <h2 style="margin: 6px 0 0 0; font-size: 20px; color: #065f46;">${doctorName} ${specialty ? `(${specialty})` : ''}</h2>
      </div>

      <p style="font-size: 16px; margin: 0 0 16px 0;">
        This is a reminder for an upcoming medical visit for <strong>${elderlyName}</strong>:
      </p>

      <table width="100%" cellspacing="0" cellpadding="8" style="border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; font-size: 14px;">
        <tr style="background-color: #f8fafc;">
          <td style="color: #64748b; width: 35%;">Date & Time:</td>
          <td style="font-weight: 600; color: #0f172a;">${appointmentDate} at ${appointmentTime}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Doctor / Specialist:</td>
          <td style="font-weight: 600; color: #0f172a;">${doctorName}</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="color: #64748b;">Location / Clinic:</td>
          <td style="color: #334155;">${hospitalClinic}</td>
        </tr>
        ${notes ? `
        <tr>
          <td style="color: #64748b;">Notes / Preparation:</td>
          <td style="color: #334155;">${notes}</td>
        </tr>` : ''}
      </table>
    `
  );

  return sendEmail({ to: recipientEmail, subject, html });
}

export default {
  sendUpcomingDoseEmail,
  sendMissedDoseAlertEmail,
  sendAppointmentReminderEmail,
};
