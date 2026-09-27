import RecurringPlan from '../models/RecurringPlan.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { logAuditEvent } from '../services/auditService.js';
import { checkAndApplyUserRecurring } from '../services/recurringService.js';

/**
 * Get User's Recurring Financial Setup
 * GET /api/recurring
 */
export const getRecurringPlan = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // Auto-check and apply if due for current month
  await checkAndApplyUserRecurring(userId, false);

  const plan = await RecurringPlan.findOne({ userId });

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isAppliedThisMonth = plan?.lastProcessedMonth === currentMonthKey;

  res.status(200).json({
    success: true,
    data: {
      plan: plan || null,
      isAppliedThisMonth,
      currentMonthKey,
    },
  });
});

/**
 * Create or Update Recurring Financial Setup
 * POST /api/recurring
 */
export const setRecurringPlan = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const {
    incomeAmount,
    incomeSource,
    budgetAmount,
    dayOfMonth,
    startDate,
    endDate,
    isActive = true,
  } = req.body;

  if (!incomeAmount || Number(incomeAmount) <= 0) {
    return next(new AppError('Please specify a valid salary/income amount.', 400));
  }
  if (!budgetAmount || Number(budgetAmount) <= 0) {
    return next(new AppError('Please specify a valid monthly budget amount.', 400));
  }
  if (!dayOfMonth || Number(dayOfMonth) < 1 || Number(dayOfMonth) > 31) {
    return next(new AppError('Please specify a valid day of month between 1 and 31.', 400));
  }

  const parsedStartDate = startDate ? new Date(startDate) : new Date();
  const parsedEndDate = endDate ? new Date(endDate) : null;

  if (parsedEndDate && parsedEndDate < parsedStartDate) {
    return next(new AppError('End date must be on or after start date.', 400));
  }

  // Find existing plan or create new one
  let plan = await RecurringPlan.findOne({ userId });

  if (plan) {
    plan.incomeAmount = Number(incomeAmount);
    plan.incomeSource = (incomeSource || 'Salary').trim();
    plan.incomeCategory = 'Salary';
    plan.budgetAmount = Number(budgetAmount);
    plan.budgetCategory = 'Overall';
    plan.dayOfMonth = Number(dayOfMonth);
    plan.startDate = parsedStartDate;
    plan.endDate = parsedEndDate;
    plan.isActive = Boolean(isActive);
    plan.currency = req.user.currency || 'INR';
    await plan.save();
  } else {
    plan = await RecurringPlan.create({
      userId,
      incomeAmount: Number(incomeAmount),
      incomeSource: (incomeSource || 'Salary').trim(),
      incomeCategory: 'Salary',
      budgetAmount: Number(budgetAmount),
      budgetCategory: 'Overall',
      dayOfMonth: Number(dayOfMonth),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      isActive: Boolean(isActive),
      currency: req.user.currency || 'INR',
    });
  }

  await logAuditEvent({
    userId,
    action: 'RECURRING_PLAN_SAVED',
    req,
    status: 'SUCCESS',
    details: {
      incomeAmount: plan.incomeAmount,
      budgetAmount: plan.budgetAmount,
      dayOfMonth: plan.dayOfMonth,
      isActive: plan.isActive,
    },
  }).catch(() => {});

  // Check if it should be immediately applied for the current month
  let appliedResult = { applied: false };
  if (plan.isActive) {
    appliedResult = await checkAndApplyUserRecurring(userId, false);
  }

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  res.status(200).json({
    success: true,
    message: 'Recurring monthly setup saved successfully.',
    data: {
      plan,
      isAppliedThisMonth: plan.lastProcessedMonth === currentMonthKey,
      currentMonthKey,
      appliedResult,
    },
  });
});

/**
 * Pause / Resume Recurring Financial Setup
 * PATCH /api/recurring/toggle
 */
export const toggleRecurringPlan = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const plan = await RecurringPlan.findOne({ userId });
  if (!plan) {
    return next(new AppError('No recurring financial setup found to toggle.', 404));
  }

  plan.isActive = !plan.isActive;
  await plan.save();

  await logAuditEvent({
    userId,
    action: plan.isActive ? 'RECURRING_PLAN_RESUMED' : 'RECURRING_PLAN_PAUSED',
    req,
    status: 'SUCCESS',
  }).catch(() => {});

  // If resumed and due, apply for current month
  if (plan.isActive) {
    await checkAndApplyUserRecurring(userId, false);
  }

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  res.status(200).json({
    success: true,
    message: `Recurring setup ${plan.isActive ? 'resumed' : 'paused'} successfully.`,
    data: {
      plan,
      isAppliedThisMonth: plan.lastProcessedMonth === currentMonthKey,
    },
  });
});

/**
 * Delete Recurring Financial Setup
 * DELETE /api/recurring
 */
export const deleteRecurringPlan = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const plan = await RecurringPlan.findOneAndDelete({ userId });
  if (!plan) {
    return next(new AppError('No recurring financial setup found to delete.', 404));
  }

  await logAuditEvent({
    userId,
    action: 'RECURRING_PLAN_DELETED',
    req,
    status: 'SUCCESS',
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: 'Recurring financial setup removed successfully.',
  });
});

/**
 * Manually Force Process for Current Month
 * POST /api/recurring/trigger-now
 */
export const triggerRecurringNow = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const result = await checkAndApplyUserRecurring(userId, true);

  const plan = await RecurringPlan.findOne({ userId });
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  res.status(200).json({
    success: true,
    message: result.applied
      ? 'Recurring salary income and monthly budget applied for this month!'
      : (result.reason === 'ALREADY_PROCESSED_THIS_MONTH'
          ? 'Recurring setup is already applied for this month.'
          : `Could not apply: ${result.reason}`),
    data: {
      result,
      plan,
      isAppliedThisMonth: plan?.lastProcessedMonth === currentMonthKey,
    },
  });
});
