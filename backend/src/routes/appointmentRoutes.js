import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { USER_ROLES } from '../config/constants.js';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointmentController.js';

const router = express.Router();

router.use(authenticate);

// View appointments: elderly, caretaker, family
router.get('/', getAppointments);

// Appointment mutations: caretakers
router.post('/', requireRole([USER_ROLES.CARETAKER]), createAppointment);
router.put('/:id', requireRole([USER_ROLES.CARETAKER]), updateAppointment);
router.delete('/:id', requireRole([USER_ROLES.CARETAKER]), deleteAppointment);

export default router;
