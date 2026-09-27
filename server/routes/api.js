import express from 'express';
import authRoutes from './authRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import budgetRoutes from './budgetRoutes.js';
import goalRoutes from './goalRoutes.js';
import healthRoutes from './healthRoutes.js';
import aiRoutes from './aiRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import reportRoutes from './reportRoutes.js';
import recurringRoutes from './recurringRoutes.js';
import { apiLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Apply general rate limiter across all API sub-routes
router.use(apiLimiter);

// Mount Sub-Routes
router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budgets', budgetRoutes);
router.use('/recurring', recurringRoutes);
router.use('/goals', goalRoutes);
router.use('/health', healthRoutes);
router.use('/ai', aiRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);

export default router;
