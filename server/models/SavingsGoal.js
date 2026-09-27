import mongoose from 'mongoose';

const savingsGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Goal must belong to a user.'],
    },
    name: {
      type: String,
      required: [true, 'Please provide a savings goal name.'],
      trim: true,
      maxlength: [100, 'Goal name cannot exceed 100 characters.'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Please specify a target savings amount.'],
      min: [1, 'Target amount must be at least 1.'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative.'],
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR'],
      default: 'INR',
    },
    deadline: {
      type: Date,
      required: [true, 'Please provide a target deadline date.'],
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active',
    },
    color: {
      type: String,
      default: '#2563EB',
    },
  },
  {
    timestamps: true,
  }
);

savingsGoalSchema.index({ userId: 1, status: 1, deadline: 1 });

const SavingsGoal = mongoose.model('SavingsGoal', savingsGoalSchema);
export default SavingsGoal;
