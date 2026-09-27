import express from 'express';
import { chatWithAI, parseVoiceTransaction } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Require authentication for all AI interactions
router.use(protect);

router.post('/chat', aiLimiter, chatWithAI);
router.post('/parse-voice', aiLimiter, parseVoiceTransaction);

export default router;
