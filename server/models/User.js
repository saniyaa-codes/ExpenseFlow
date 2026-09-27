import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [50, 'Name cannot exceed 50 characters.'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address.'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please provide a valid email address.'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password.'],
      minlength: [8, 'Password must be at least 8 characters long.'],
      select: false, // Never return password in normal queries
    },
    role: {
      type: String,
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR'],
      default: 'INR',
    },
    notificationPreferences: {
      budgetAlerts: { type: Boolean, default: true },
      goalMilestones: { type: Boolean, default: true },
      emailAlerts: { type: Boolean, default: true },
    },
    passwordChangedAt: Date,
    lastLogin: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Blocked'],
      default: 'Active',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lastFailedLogin: Date,
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware: Hash password using bcrypt (12 rounds) if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  // Set passwordChangedAt timestamp (subtract 1s to account for token issuance latency)
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
  next();
});

// Instance Method: Compare candidate password with hashed password
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance Method: Check if password was changed after token issuance
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const User = mongoose.model('User', userSchema);
export default User;
