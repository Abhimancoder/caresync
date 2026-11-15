import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { USER_ROLES } from '../config/constants.js';
import {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
} from '../controllers/medicationController.js';

const router = express.Router();

router.use(authenticate);

// View medications: accessible to elderly, caretaker, and family
router.get('/', getMedications);

// Prescription alterations: restricted to authorized caretakers
router.post('/', requireRole([USER_ROLES.CARETAKER]), createMedication);
router.put('/:id', requireRole([USER_ROLES.CARETAKER]), updateMedication);
router.delete('/:id', requireRole([USER_ROLES.CARETAKER]), deleteMedication);

export default router;
