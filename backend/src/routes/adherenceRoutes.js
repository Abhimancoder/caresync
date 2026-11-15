import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getAdherenceStats } from '../controllers/adherenceController.js';

const router = express.Router();

router.use(authenticate);

// Adherence statistics with 7-day and 30-day trends
router.get('/stats', getAdherenceStats);

export default router;
