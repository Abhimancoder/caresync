import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getProfileLogs } from '../services/auditLogger.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/activity-logs
 * Retrieves chronological audit logs
 */
router.get('/', async (req, res, next) => {
  try {
    const profileId = req.query.profileId || req.activeProfileId || 'demo-profile-robert';
    const limit = Number(req.query.limit) || 50;

    const logs = await getProfileLogs(profileId, limit);

    res.json({
      success: true,
      profileId,
      count: logs.length,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
