import RecurringPlan from '../models/RecurringPlan.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import Notification from '../models/Notification.js';

/**
 * Check and apply recurring income transaction and budget for a specific user.
 * Duplicate-proof: Idempotent checks against current month YYYY-MM, Budget unique index,
 * and Transaction recurringId + month range.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {boolean} [forceRun=false] If true, forces processing even if today is earlier than dayOfMonth
 * @returns {Promise<Object>} Execution result summary
 */
export const checkAndApplyUserRecurring = async (userId, forceRun = false) => {
  const plan = await RecurringPlan.findOne({ userId, isActive: true });
  if (!plan) {
    return { applied: false, reason: 'NO_ACTIVE_PLAN' };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();
  const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // Check start date
  if (plan.startDate && new Date(plan.startDate) > now) {
    return { applied: false, reason: 'PLAN_NOT_YET_STARTED', currentMonthKey };
  }

  // Check end date
  if (plan.endDate && now > new Date(plan.endDate)) {
    plan.isActive = false;
    await plan.save();
    return { applied: false, reason: 'PLAN_EXPIRED', currentMonthKey };
  }

  // Check if already processed for this calendar month
  if (plan.lastProcessedMonth === currentMonthKey) {
    return {
      applied: false,
      reason: 'ALREADY_PROCESSED_THIS_MONTH',
      currentMonthKey,
      lastProcessedAt: plan.lastProcessedAt,
      plan,
    };
  }

  // Check scheduled day of month (unless forceRun is requested)
  if (!forceRun && currentDay < plan.dayOfMonth) {
    return {
      applied: false,
      reason: 'SCHEDULED_LATER_THIS_MONTH',
      dayOfMonth: plan.dayOfMonth,
      currentDay,
      currentMonthKey,
      plan,
    };
  }

  // 1. Create or update Monthly Budget for the user (duplicate-safe via upsert)
  const budgetCategory = plan.budgetCategory || 'Overall';
  const budget = await Budget.findOneAndUpdate(
    {
      userId,
      month: currentMonth,
      year: currentYear,
      category: budgetCategory,
    },
    {
      limitAmount: plan.budgetAmount,
      currency: plan.currency || 'INR',
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  // 2. Create Income Transaction if not already created for this month and recurring plan
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  let existingTx = await Transaction.findOne({
    userId,
    type: 'income',
    recurringId: plan._id,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  let createdTx = null;
  if (!existingTx) {
    // Transaction date: scheduled day of month (or today if earlier)
    const targetDay = Math.min(plan.dayOfMonth, currentDay, 28);
    const txDate = new Date(currentYear, currentMonth - 1, targetDay, 10, 0, 0);

    createdTx = await Transaction.create({
      userId,
      type: 'income',
      amount: plan.incomeAmount,
      currency: plan.currency || 'INR',
      category: plan.incomeCategory || 'Salary',
      merchantOrSource: plan.incomeSource || 'Salary',
      paymentMethod: 'Bank Transfer',
      date: txDate,
      notes: `Automated recurring monthly salary from ${plan.incomeSource || 'Salary'}`,
      isRecurring: true,
      recurringId: plan._id,
    });
  }

  // 3. Mark plan as processed for this month
  plan.lastProcessedMonth = currentMonthKey;
  plan.lastProcessedAt = new Date();
  await plan.save();

  // 4. Create in-app notification
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const currSymbol = plan.currency === 'USD' ? '$' : plan.currency === 'EUR' ? '€' : '₹';
  await Notification.create({
    userId,
    title: 'Recurring Salary & Budget Applied',
    message: `${currSymbol}${plan.incomeAmount.toLocaleString()} income (${plan.incomeSource}) and ${currSymbol}${plan.budgetAmount.toLocaleString()} monthly budget automatically applied for ${monthName} ${currentYear}.`,
    type: 'system',
  }).catch(() => {});

  return {
    applied: true,
    currentMonthKey,
    budget,
    transaction: createdTx || existingTx,
    plan,
  };
};

/**
 * Background processor for recurring setups across all active users
 */
export const processAllDueRecurringPlans = async () => {
  try {
    const activePlans = await RecurringPlan.find({ isActive: true });
    let processedCount = 0;

    for (const plan of activePlans) {
      try {
        const result = await checkAndApplyUserRecurring(plan.userId, false);
        if (result.applied) {
          processedCount++;
        }
      } catch (err) {
        console.error(`[Recurring Service] Error processing plan for user ${plan.userId}:`, err.message);
      }
    }

    if (processedCount > 0) {
      console.log(`[Recurring Service] Successfully applied ${processedCount} recurring monthly setups.`);
    }
  } catch (error) {
    console.error('[Recurring Service] Background check error:', error.message);
  }
};
