import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import Notification from '../models/Notification.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { logAuditEvent } from '../services/auditService.js';
import { sendBudgetAlertEmail, sendUnusualSpendingEmail } from '../services/emailService.js';
import { getMultiMonthAnalysis } from '../services/aiTools.js';

/**
 * Check and trigger unusual spending alert when an expense is logged
 */
const checkUnusualSpending = async (userId, user, expense) => {
  try {
    const analysis = await getMultiMonthAnalysis(userId, 6);
    if (analysis && analysis.abnormalSpending && analysis.abnormalSpending.length > 0) {
      const match = analysis.abnormalSpending.find((item) => item.category === expense.category);
      if (match) {
        await sendUnusualSpendingEmail({
          user,
          category: match.category,
          currentSpending: `${user.currency || '₹'} ${match.currentSpend.toLocaleString()}`,
          usualSpending: `${user.currency || '₹'} ${match.avgPrevious.toLocaleString()}`,
        });
      }
    }
  } catch (err) {
    console.error('[Unusual Spending Alert Error]', err.message);
  }
};

/**
 * Check and trigger budget threshold alerts when an expense is logged
 */
const checkBudgetThresholds = async (userId, user, expense) => {
  const triggeredAlerts = [];
  try {
    const expenseDate = new Date(expense.date);
    const month = expenseDate.getMonth() + 1;
    const year = expenseDate.getFullYear();

    // Find category-specific budget or overall monthly budget
    const budgets = await Budget.find({
      userId,
      month,
      year,
      category: { $in: [expense.category, 'Overall'] },
    });

    for (const budget of budgets) {
      // Calculate total category spending for this month
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      const matchFilter = {
        userId,
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth },
      };

      if (budget.category !== 'Overall') {
        matchFilter.category = budget.category;
      }

      const spendingAgg = await Transaction.aggregate([
        { $match: matchFilter },
        { $group: { _id: null, totalSpent: { $sum: '$amount' } } },
      ]);

      const totalSpent = spendingAgg.length > 0 ? spendingAgg[0].totalSpent : 0;
      const percentage = Math.round((totalSpent / budget.limitAmount) * 100);

      // Check thresholds: 50%, 75%, 90%, 100%
      const thresholds = [50, 75, 90, 100];
      for (const threshold of thresholds) {
        if (percentage >= threshold && !budget.alertsTriggered.includes(threshold)) {
          budget.alertsTriggered.push(threshold);
          await budget.save();

          const alertTitle = `Budget Alert: ${budget.category} reached ${threshold}%`;
          const alertMessage = `You have spent ${user.currency || '₹'} ${totalSpent.toLocaleString()} of your ${user.currency || '₹'} ${budget.limitAmount.toLocaleString()} ${budget.category} budget.`;

          // Create In-App Notification
          await Notification.create({
            userId,
            title: alertTitle,
            message: alertMessage,
            type: 'budget_alert',
            metadata: { budgetId: budget._id, category: budget.category, percentage, totalSpent },
          });

          triggeredAlerts.push({
            title: alertTitle,
            message: alertMessage,
            threshold,
            percentage,
            category: budget.category,
            totalSpent,
            limitAmount: budget.limitAmount,
          });

          // Send Email to phone for all thresholds (50%, 75%, 90%, 100%) so user gets instant mobile notification
          if (user.notificationPreferences?.emailAlerts !== false) {
            await sendBudgetAlertEmail({
              user,
              category: budget.category,
              spent: `${user.currency || '₹'} ${totalSpent.toLocaleString()}`,
              limit: `${user.currency || '₹'} ${budget.limitAmount.toLocaleString()}`,
              percentage: threshold,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('[Budget Alert Error]', error);
  }
  return triggeredAlerts;
};

/**
 * Create New Transaction
 * POST /api/transactions
 */
export const createTransaction = catchAsync(async (req, res, next) => {
  const { type, amount, category, merchantOrSource, paymentMethod, date, notes, isRecurring } = req.body;

  if (!type || !amount || !category) {
    return next(new AppError('Please specify type, amount, and category.', 400));
  }

  const parsedDate = date ? new Date(date) : new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  if (parsedDate > endOfToday) {
    return next(new AppError('Future dates are not allowed. Please select today or an earlier date.', 400));
  }

  const transaction = await Transaction.create({
    userId: req.user._id,
    type,
    amount: Number(amount),
    currency: req.user.currency || 'INR',
    category,
    merchantOrSource: merchantOrSource || '',
    paymentMethod: paymentMethod || 'UPI',
    date: parsedDate,
    notes: notes || '',
    isRecurring: Boolean(isRecurring),
  });

  // If expense, check budget thresholds and unusual spending
  let budgetAlerts = [];
  if (type === 'expense') {
    budgetAlerts = (await checkBudgetThresholds(req.user._id, req.user, transaction)) || [];
    checkUnusualSpending(req.user._id, req.user, transaction);
  }

  await logAuditEvent({
    userId: req.user._id,
    action: 'TRANSACTION_CREATED',
    req,
    status: 'SUCCESS',
    details: { transactionId: transaction._id, type, amount, category },
  });

  res.status(201).json({
    success: true,
    message: 'Transaction recorded successfully.',
    data: { transaction, budgetAlerts },
  });
});

/**
 * Get Filtered & Paginated Transactions
 * GET /api/transactions
 */
export const getTransactions = catchAsync(async (req, res, next) => {
  const { type, category, startDate, endDate, month, year, search, sort, page = 1, limit = 50 } = req.query;

  const query = { userId: req.user._id };

  if (type && ['expense', 'income'].includes(type)) {
    query.type = type;
  }

  if (category) {
    query.category = category;
  }

  if (month && year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    query.date = {
      $gte: new Date(y, m - 1, 1, 0, 0, 0, 0),
      $lte: new Date(y, m, 0, 23, 59, 59, 999),
    };
  } else if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { category: { $regex: search, $options: 'i' } },
      { merchantOrSource: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const sortBy = sort || '-date';

  const [transactions, total] = await Promise.all([
    Transaction.find(query).sort(sortBy).skip(skip).limit(limitNum),
    Transaction.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    results: transactions.length,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    data: { transactions },
  });
});

/**
 * Get Single Transaction
 * GET /api/transactions/:id
 */
export const getTransaction = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!transaction) {
    return next(new AppError('Transaction not found.', 404));
  }

  res.status(200).json({
    success: true,
    data: { transaction },
  });
});

/**
 * Update Transaction
 * PUT /api/transactions/:id
 */
export const updateTransaction = catchAsync(async (req, res, next) => {
  if (req.body.date) {
    const parsedDate = new Date(req.body.date);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    if (parsedDate > endOfToday) {
      return next(new AppError('Future dates are not allowed. Please select today or an earlier date.', 400));
    }
  }

  const transaction = await Transaction.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!transaction) {
    return next(new AppError('Transaction not found.', 404));
  }

  await logAuditEvent({
    userId: req.user._id,
    action: 'TRANSACTION_UPDATED',
    req,
    status: 'SUCCESS',
    details: { transactionId: transaction._id },
  });

  res.status(200).json({
    success: true,
    message: 'Transaction updated successfully.',
    data: { transaction },
  });
});

/**
 * Delete Transaction
 * DELETE /api/transactions/:id
 */
export const deleteTransaction = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!transaction) {
    return next(new AppError('Transaction not found.', 404));
  }

  await logAuditEvent({
    userId: req.user._id,
    action: 'TRANSACTION_DELETED',
    req,
    status: 'SUCCESS',
    details: { transactionId: req.params.id },
  });

  res.status(200).json({
    success: true,
    message: 'Transaction deleted successfully.',
  });
});

/**
 * Get Financial Summary (Totals, Net Balance, Category Breakdown)
 * GET /api/transactions/summary
 */
export const getTransactionSummary = catchAsync(async (req, res, next) => {
  const now = new Date();
  const targetMonth = req.query.month ? parseInt(req.query.month, 10) : now.getMonth() + 1;
  const targetYear = req.query.year ? parseInt(req.query.year, 10) : now.getFullYear();

  const startOfMonth = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

  const [monthlyAgg, allTimeAgg, categoryAgg, incomeCategoryAgg] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: req.user._id, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'expense', date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'income', date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  monthlyAgg.forEach((agg) => {
    if (agg._id === 'income') monthlyIncome = agg.total;
    if (agg._id === 'expense') monthlyExpenses = agg.total;
  });

  let allTimeIncome = 0;
  let allTimeExpenses = 0;
  allTimeAgg.forEach((agg) => {
    if (agg._id === 'income') allTimeIncome = agg.total;
    if (agg._id === 'expense') allTimeExpenses = agg.total;
  });

  const monthlyBalance = monthlyIncome - monthlyExpenses;
  const allTimeBalance = allTimeIncome - allTimeExpenses;
  const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      month: targetMonth,
      year: targetYear,
      totalIncome: monthlyIncome,
      totalExpenses: monthlyExpenses,
      netBalance: monthlyBalance,
      allTimeIncome,
      allTimeExpenses,
      allTimeBalance,
      savingsRate: Math.max(0, savingsRate),
      categoryBreakdown: categoryAgg.map((c) => ({ category: c._id, total: c.total, count: c.count })),
      incomeCategoryBreakdown: incomeCategoryAgg.map((c) => ({ category: c._id, total: c.total, count: c.count })),
    },
  });
});

/**
 * Get 4–6 Month Multi-Month Spending & Pattern Analysis
 * GET /api/transactions/multi-month-analysis
 */
export const getMultiMonthAnalysisController = catchAsync(async (req, res, next) => {
  const months = req.query.months || 6;
  const analysis = await getMultiMonthAnalysis(req.user._id, months);

  res.status(200).json({
    success: true,
    data: analysis,
  });
});
