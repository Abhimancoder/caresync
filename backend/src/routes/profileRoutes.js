import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { USER_ROLES } from '../config/constants.js';
import {
  getAuthorizedProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  removeMember,
} from '../controllers/profileController.js';

const router = express.Router();

// All profile endpoints require authentication
router.use(authenticate);

router.get('/', getAuthorizedProfiles);
router.get('/:id', getProfileById);
router.post('/', requireRole([USER_ROLES.ELDERLY, USER_ROLES.CARETAKER]), createProfile);
router.put('/:id', requireRole([USER_ROLES.ELDERLY, USER_ROLES.CARETAKER]), updateProfile);
router.delete('/:id/members/:memberUserId', requireRole([USER_ROLES.ELDERLY, USER_ROLES.CARETAKER]), removeMember);

export default router;
