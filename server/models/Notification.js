import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must belong to a user.'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required.'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required.'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['budget_alert', 'goal_milestone', 'security', 'ai_insight', 'system'],
      required: [true, 'Notification type is required.'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '30d', // 30-Day TTL automatic cleanup
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
