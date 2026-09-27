import Notification from '../models/Notification.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Get User Notifications (Unread Count + List)
 * GET /api/notifications
 */
export const getNotifications = catchAsync(async (req, res, next) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user._id }).sort('-createdAt').limit(30),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      unreadCount,
      notifications,
    },
  });
});

/**
 * Mark Single Notification as Read
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: { notification },
  });
});

/**
 * Mark All Notifications as Read
 * PATCH /api/notifications/read-all
 */
export const markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read.',
  });
});

/**
 * Send Live Test Email Alert via SMTP
 * POST /api/notifications/test-email
 */
export const sendTestAlertEmail = catchAsync(async (req, res, next) => {
  const { sendBudgetAlertEmail } = await import('../services/emailService.js');
  
  const result = await sendBudgetAlertEmail({
    user: req.user,
    category: 'Dining & Entertainment',
    spent: `${req.user.currency || 'INR'} 7,450`,
    limit: `${req.user.currency || 'INR'} 8,000`,
    percentage: 93,
  });

  const notification = await Notification.create({
    userId: req.user._id,
    title: 'Test Budget Alert Dispatched',
    message: `A test alert notification was triggered and processed for ${req.user.email}.`,
    type: 'budget_alert',
  });

  res.status(200).json({
    success: true,
    message: `Test alert email successfully dispatched to ${req.user.email}! Check your server console or inbox.`,
    data: {
      notification,
      messageId: result?.messageId || 'sent',
    },
  });
});
