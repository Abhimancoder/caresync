import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { USER_ROLES } from '../config/constants.js';
import {
  getTodayDoses,
  updateDoseStatus,
  generateDoseSchedule,
} from '../controllers/doseController.js';

const router = express.Router();

router.use(authenticate);

// View today's doses
router.get('/today', getTodayDoses);

// Update dose adherence: elderly and caretakers can mark taken/skipped
router.patch('/:id/status', requireRole([USER_ROLES.ELDERLY, USER_ROLES.CARETAKER]), updateDoseStatus);

// Pre-generate schedule doses: caretakers
router.post('/generate-schedule', requireRole([USER_ROLES.CARETAKER]), generateDoseSchedule);

export default router;
