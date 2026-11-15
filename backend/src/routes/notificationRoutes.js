import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  markNotificationAsRead,
} from '../controllers/cronController.js';
import { sendEmail, isSimulationMode } from '../config/emailConfig.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationAsRead);

/**
 * Diagnostic test email endpoint
 */
router.post('/test-email', async (req, res, next) => {
  try {
    const { email } = req.body;
    const targetEmail = email || req.user?.email || 'test@caresync.health';

    const result = await sendEmail({
      to: targetEmail,
      subject: '🧪 CareSync System Diagnostic: Test Email Notification',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e3a8a;">
          <h2>CareSync Diagnostic Test Notification</h2>
          <p>This email confirms that your CareSync notification dispatch service is functional.</p>
          <p><strong>Status:</strong> ${isSimulationMode ? 'Development Simulation Mode' : 'Connected to Live SMTP'}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: isSimulationMode
        ? 'Diagnostic email recorded in Development Simulation Mode.'
        : `Diagnostic email dispatched to ${targetEmail}.`,
      simulationMode: isSimulationMode,
      result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
