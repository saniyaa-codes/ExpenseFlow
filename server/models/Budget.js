import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Budget must belong to a user.'],
    },
    month: {
      type: Number,
      required: [true, 'Please specify the budget month (1-12).'],
      min: [1, 'Month must be between 1 and 12.'],
      max: [12, 'Month must be between 1 and 12.'],
    },
    year: {
      type: Number,
      required: [true, 'Please specify the budget year.'],
      min: [2020, 'Year must be 2020 or later.'],
      max: [2100, 'Year must be reasonable.'],
    },
    category: {
      type: String,
      required: [true, 'Please specify a category (or "Overall").'],
      trim: true,
    },
    limitAmount: {
      type: Number,
      required: [true, 'Please specify the spending limit amount.'],
      min: [1, 'Limit amount must be at least 1.'],
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR'],
      default: 'INR',
    },
    alertsTriggered: {
      type: [Number], // e.g. [50, 75, 90, 100]
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: Prevents duplicate budgets for same user, month, year, and category
budgetSchema.index({ userId: 1, month: 1, year: 1, category: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);
export default Budget;
