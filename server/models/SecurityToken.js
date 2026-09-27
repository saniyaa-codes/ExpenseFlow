import mongoose from 'mongoose';
import crypto from 'crypto';

const securityTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Token must belong to a user.'],
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required.'],
    },
    type: {
      type: String,
      enum: ['EMAIL_VERIFICATION', 'PASSWORD_RESET'],
      required: [true, 'Token type is required.'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required.'],
    },
  },
  {
    timestamps: true,
  }
);

// TTL Index: Auto-deletes document when expiresAt timestamp is reached
securityTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
securityTokenSchema.index({ userId: 1, type: 1 });

// Helper to hash raw token
securityTokenSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

const SecurityToken = mongoose.model('SecurityToken', securityTokenSchema);
export default SecurityToken;
