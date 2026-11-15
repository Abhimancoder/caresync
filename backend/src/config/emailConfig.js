import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * CareSync Email Transporter & Notification Engine
 * Supports real SMTP credentials or graceful Development Simulation Mode
 */

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

export const isSimulationMode = !SMTP_HOST || !SMTP_USER || !SMTP_PASS;

let transporter = null;

if (!isSimulationMode) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️ [CareSync Email] SMTP connection verification failed. Falling back to Simulation Mode:', error.message);
    } else {
      console.log('✅ [CareSync Email] Real SMTP Transporter verified and ready.');
    }
  });
} else {
  console.log('ℹ️ [CareSync Email] Running in DEVELOPMENT SIMULATION MODE (No SMTP credentials configured).');
}

/**
 * Sends an email or records a simulated delivery
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - Rich HTML content
 * @param {string} [options.text] - Plain text alternative
 * @returns {Promise<{success: boolean, messageId: string, simulated: boolean}>}
 */
export async function sendEmail({ to, subject, html, text }) {
  const from = SMTP_FROM || '"CareSync Health" <no-reply@caresync.health>';

  if (isSimulationMode || !transporter) {
    const simulatedId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log(`\n======================================================`);
    console.log(`📧 [DEVELOPMENT SIMULATION - EMAIL DISPATCHED]`);
    console.log(`ID:       ${simulatedId}`);
    console.log(`To:       ${to}`);
    console.log(`Subject:  ${subject}`);
    console.log(`Timestamp:${new Date().toISOString()}`);
    console.log(`Notice:   This is a simulated email for testing/demo purposes.`);
    console.log(`======================================================\n`);

    return {
      success: true,
      messageId: simulatedId,
      simulated: true,
      recipient: to,
      subject,
    };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: text || subject,
      html,
    });

    console.log(`✅ [CareSync Email] Sent live email to ${to} (MessageID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
      simulated: false,
      recipient: to,
      subject,
    };
  } catch (err) {
    console.error(`❌ [CareSync Email] Failed to send email to ${to}:`, err.message);
    throw err;
  }
}

export default {
  sendEmail,
  isSimulationMode,
};
