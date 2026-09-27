import mongoose from 'mongoose';

const recurringPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recurring plan must belong to a user.'],
      unique: true, // One primary monthly recurring plan per user
      index: true,
    },
    incomeAmount: {
      type: Number,
      required: [true, 'Please specify the salary/income amount.'],
      min: [1, 'Salary amount must be greater than 0.'],
    },
    incomeSource: {
      type: String,
      required: [true, 'Please specify the income source name (e.g. Salary).'],
      trim: true,
      default: 'Salary',
    },
    incomeCategory: {
      type: String,
      trim: true,
      default: 'Salary',
    },
    budgetAmount: {
      type: Number,
      required: [true, 'Please specify the monthly budget amount.'],
      min: [1, 'Budget amount must be greater than 0.'],
    },
    budgetCategory: {
      type: String,
      trim: true,
      default: 'Overall',
    },
    dayOfMonth: {
      type: Number,
      required: [true, 'Please specify the day of the month (1-31).'],
      min: [1, 'Day must be between 1 and 31.'],
      max: [31, 'Day must be between 1 and 31.'],
      default: 1,
    },
    startDate: {
      type: Date,
      required: [true, 'Please specify the start date.'],
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null, // null means active indefinitely
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR'],
      default: 'INR',
    },
    lastProcessedMonth: {
      type: String, // format "YYYY-MM" (e.g. "2026-09")
      default: null,
    },
    lastProcessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

recurringPlanSchema.index({ userId: 1, isActive: 1 });

const RecurringPlan = mongoose.model('RecurringPlan', recurringPlanSchema);
export default RecurringPlan;
