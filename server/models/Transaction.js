import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must belong to a user.'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['expense', 'income'],
        message: 'Transaction type must be either expense or income.',
      },
      required: [true, 'Please specify transaction type.'],
    },
    amount: {
      type: Number,
      required: [true, 'Please specify the transaction amount.'],
      min: [0.01, 'Amount must be greater than 0.'],
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR'],
      default: 'INR',
    },
    category: {
      type: String,
      required: [true, 'Please specify a category.'],
      trim: true,
    },
    merchantOrSource: {
      type: String,
      trim: true,
      default: '',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Bank Transfer', 'Other'],
      default: 'UPI',
    },
    date: {
      type: Date,
      required: [true, 'Please provide a valid date.'],
      default: Date.now,
      validate: {
        validator: function (val) {
          if (!val) return true;
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);
          return val <= endOfToday;
        },
        message: 'Future dates are not allowed. Please select today or an earlier date.',
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters.'],
      default: '',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringPlan',
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for fast sorting, analytics, and date filtering
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
