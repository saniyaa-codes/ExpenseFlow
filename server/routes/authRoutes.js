import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updatePreferences,
  updatePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Public Authentication Endpoints
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', protect, logout);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);

// Protected User Endpoints
router.get('/me', protect, getMe);
router.put('/preferences', protect, updatePreferences);
router.put('/update-password', protect, updatePassword);

export default router;
