import express from 'express';
import { getHealthScore } from '../controllers/healthController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/score', getHealthScore);

export default router;
