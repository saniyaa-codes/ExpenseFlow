import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { logAuditEvent } from '../services/auditService.js';

/**
 * Create or Update Budget (Upsert)
 * POST /api/budgets
 */
export const setBudget = catchAsync(async (req, res, next) => {
  const { month, year, category, limitAmount } = req.body;

  if (!month || !year || !category || !limitAmount) {
    return next(new AppError('Please provide month, year, category, and limit amount.', 400));
  }

  const budget = await Budget.findOneAndUpdate(
    {
      userId: req.user._id,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      category: category.trim(),
    },
    {
      limitAmount: Number(limitAmount),
      currency: req.user.currency || 'INR',
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  await logAuditEvent({
    userId: req.user._id,
    action: 'BUDGET_SAVED',
    req,
    status: 'SUCCESS',
    details: { category, limitAmount, month, year },
  });

  res.status(200).json({
    success: true,
    message: 'Budget saved successfully.',
    data: { budget },
  });
});

/**
 * Get Budgets with Live Spending Calculations
 * GET /api/budgets
 */
export const getBudgets = catchAsync(async (req, res, next) => {
  const currentDate = new Date();
  const month = parseInt(req.query.month || currentDate.getMonth() + 1, 10);
  const year = parseInt(req.query.year || currentDate.getFullYear(), 10);

  const budgets = await Budget.find({
    userId: req.user._id,
    month,
    year,
  });

  // Calculate actual spending for each category in this month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const expenseAgg = await Transaction.aggregate([
    {
      $match: {
        userId: req.user._id,
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: '$category',
        totalSpent: { $sum: '$amount' },
      },
    },
  ]);

  const spentMap = {};
  let totalOverallSpent = 0;
  expenseAgg.forEach((item) => {
    spentMap[item._id] = item.totalSpent;
    totalOverallSpent += item.totalSpent;
  });

  const budgetsWithProgress = budgets.map((b) => {
    const spent = b.category === 'Overall' ? totalOverallSpent : (spentMap[b.category] || 0);
    const percentage = Math.round((spent / b.limitAmount) * 100);
    const remaining = Math.max(0, b.limitAmount - spent);
    const isExceeded = spent > b.limitAmount;

    return {
      _id: b._id,
      category: b.category,
      limitAmount: b.limitAmount,
      currency: b.currency,
      month: b.month,
      year: b.year,
      spent,
      remaining,
      percentage,
      isExceeded,
      status: percentage >= 100 ? 'exceeded' : percentage >= 75 ? 'warning' : 'safe',
    };
  });

  res.status(200).json({
    success: true,
    data: {
      month,
      year,
      totalOverallSpent,
      budgets: budgetsWithProgress,
    },
  });
});

/**
 * Delete Budget
 * DELETE /api/budgets/:id
 */
export const deleteBudget = catchAsync(async (req, res, next) => {
  const budget = await Budget.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!budget) {
    return next(new AppError('Budget not found.', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Budget removed successfully.',
  });
});
