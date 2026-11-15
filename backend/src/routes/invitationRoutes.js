import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { invitationVerificationLimiter } from '../middleware/rateLimiter.js';
import { USER_ROLES } from '../config/constants.js';
import {
  generateInvitation,
  verifyAndJoin,
  revokeInvitation,
} from '../controllers/invitationController.js';

const router = express.Router();

router.use(authenticate);

// Generate passcode: only elderly or caretaker
router.post('/generate', requireRole([USER_ROLES.ELDERLY, USER_ROLES.CARETAKER]), generateInvitation);

// Verify passcode & join care team: protected by rate limiting (max 5 tries per 15 min)
router.post('/verify-and-join', invitationVerificationLimiter, verifyAndJoin);

// Revoke invitation
router.delete('/:id', requireRole([USER_ROLES.ELDERLY, USER_ROLES.CARETAKER]), revokeInvitation);

export default router;
