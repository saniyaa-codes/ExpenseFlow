import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendTestAlertEmail,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.post('/test-email', sendTestAlertEmail);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

export default router;
