import express from 'express';
import { processReminders } from '../controllers/cronController.js';

const router = express.Router();

/**
 * POST /api/cron/process-reminders
 * Webhook triggered periodically by Google Cloud Scheduler
 * Validates X-Cron-Secret header or query key
 */
router.post('/process-reminders', processReminders);

// Also accept GET for easy browser-based evaluation / manual health test
router.get('/process-reminders', processReminders);

export default router;
