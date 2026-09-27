import SavingsGoal from '../models/SavingsGoal.js';
import Notification from '../models/Notification.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { logAuditEvent } from '../services/auditService.js';
import { sendSavingsGoalAlertEmail } from '../services/emailService.js';

/**
 * Create Savings Goal
 * POST /api/goals
 */
export const createGoal = catchAsync(async (req, res, next) => {
  const { name, targetAmount, currentAmount, deadline, category, color } = req.body;

  if (!name || !targetAmount || !deadline) {
    return next(new AppError('Please provide goal name, target amount, and deadline date.', 400));
  }

  const goal = await SavingsGoal.create({
    userId: req.user._id,
    name: name.trim(),
    targetAmount: Number(targetAmount),
    currentAmount: Number(currentAmount || 0),
    currency: req.user.currency || 'INR',
    deadline: new Date(deadline),
    category: category || 'General',
    color: color || '#2563EB',
  });

  await logAuditEvent({
    userId: req.user._id,
    action: 'GOAL_CREATED',
    req,
    status: 'SUCCESS',
    details: { goalId: goal._id, name, targetAmount },
  });

  res.status(201).json({
    success: true,
    message: 'Savings goal created successfully.',
    data: { goal },
  });
});

/**
 * Get Goals with Velocity & Monthly Required Savings Calculations
 * GET /api/goals
 */
export const getGoals = catchAsync(async (req, res, next) => {
  const goals = await SavingsGoal.find({ userId: req.user._id }).sort('deadline');

  const now = new Date();

  const enrichedGoals = goals.map((g) => {
    const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);
    const progress = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));

    // Calculate months remaining
    const diffMs = new Date(g.deadline) - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const monthsRemaining = Math.max(1, Math.ceil(diffDays / 30));

    const requiredMonthlySavings = remainingAmount > 0 ? Math.round(remainingAmount / monthsRemaining) : 0;

    return {
      _id: g._id,
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      currency: g.currency,
      deadline: g.deadline,
      category: g.category,
      status: g.status,
      color: g.color,
      progress,
      remainingAmount,
      daysRemaining: diffDays,
      requiredMonthlySavings,
      isCompleted: g.currentAmount >= g.targetAmount,
    };
  });

  res.status(200).json({
    success: true,
    results: enrichedGoals.length,
    data: { goals: enrichedGoals },
  });
});

/**
 * Contribute Funds to Goal
 * POST /api/goals/:id/contribute
 */
export const contributeToGoal = catchAsync(async (req, res, next) => {
  const { amount } = req.body;
  if (!amount || Number(amount) <= 0) {
    return next(new AppError('Please provide a valid contribution amount.', 400));
  }

  const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id });
  if (!goal) {
    return next(new AppError('Savings goal not found.', 404));
  }

  goal.currentAmount += Number(amount);

  if (goal.currentAmount >= goal.targetAmount && goal.status !== 'completed') {
    goal.status = 'completed';

    // Create Milestone Notification
    await Notification.create({
      userId: req.user._id,
      title: `🎉 Goal Achieved: ${goal.name}!`,
      message: `Congratulations! You reached your savings target of ${goal.currency} ${goal.targetAmount.toLocaleString()} for ${goal.name}.`,
      type: 'goal_milestone',
      metadata: { goalId: goal._id, targetAmount: goal.targetAmount },
    });

    // Send Savings Goal Alert Email via Nodemailer
    sendSavingsGoalAlertEmail({
      user: req.user,
      goalName: goal.name,
      currentAmount: `${goal.currency} ${goal.currentAmount.toLocaleString()}`,
      targetAmount: `${goal.currency} ${goal.targetAmount.toLocaleString()}`,
      isAchieved: true,
    }).catch(() => {});
  }

  await goal.save();

  await logAuditEvent({
    userId: req.user._id,
    action: 'GOAL_CONTRIBUTION',
    req,
    status: 'SUCCESS',
    details: { goalId: goal._id, amountContributed: amount, currentAmount: goal.currentAmount },
  });

  res.status(200).json({
    success: true,
    message: 'Contribution added successfully.',
    data: { goal },
  });
});

/**
 * Delete Goal
 * DELETE /api/goals/:id
 */
export const deleteGoal = catchAsync(async (req, res, next) => {
  const goal = await SavingsGoal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!goal) {
    return next(new AppError('Savings goal not found.', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Savings goal deleted successfully.',
  });
});
