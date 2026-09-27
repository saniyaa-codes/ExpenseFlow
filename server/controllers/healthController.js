import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import SavingsGoal from '../models/SavingsGoal.js';
import RecurringPlan from '../models/RecurringPlan.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Calculate Algorithmic Financial Health Score (0-100)
 * GET /api/health/score
 */
export const getHealthScore = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  // 1) Fetch month transactions
  const aggregates = await Transaction.aggregate([
    {
      $match: {
        userId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
      },
    },
  ]);

  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  aggregates.forEach((agg) => {
    if (agg._id === 'income') monthlyIncome = agg.total;
    if (agg._id === 'expense') monthlyExpenses = agg.total;
  });

  // 2) Fetch budgets & evaluate adherence
  const budgets = await Budget.find({ userId, month: currentMonth, year: currentYear });
  let budgetScore = 20; // default baseline if no budgets
  let overBudgetCategories = 0;

  if (budgets.length > 0) {
    const expenseCategories = await Transaction.aggregate([
      { $match: { userId, type: 'expense', date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]);

    const catMap = {};
    expenseCategories.forEach((c) => { catMap[c._id] = c.total; });

    budgets.forEach((b) => {
      const spent = b.category === 'Overall' ? monthlyExpenses : (catMap[b.category] || 0);
      if (spent > b.limitAmount) overBudgetCategories += 1;
    });

    if (overBudgetCategories === 0) budgetScore = 25;
    else if (overBudgetCategories === 1) budgetScore = 15;
    else budgetScore = 5;
  }

  // 3) Savings Rate Score (Max 30 pts)
  let savingsRate = 0;
  let savingsScore = 5;
  if (monthlyIncome > 0) {
    savingsRate = Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100);
    if (savingsRate >= 30) savingsScore = 30;
    else if (savingsRate >= 20) savingsScore = 22;
    else if (savingsRate >= 10) savingsScore = 15;
    else if (savingsRate > 0) savingsScore = 8;
    else savingsScore = 0;
  }

  // 4) Goals Progress Score (Max 15 pts)
  const goals = await SavingsGoal.find({ userId, status: 'active' });
  let goalsScore = 5;
  if (goals.length > 0) {
    const avgProgress = goals.reduce((acc, g) => acc + (g.currentAmount / g.targetAmount), 0) / goals.length;
    if (avgProgress >= 0.5) goalsScore = 15;
    else if (avgProgress > 0) goalsScore = 10;
  }

  // 5) Total All-Time Balance & Cushion (Max 20 pts)
  const allTimeAgg = await Transaction.aggregate([
    { $match: { userId } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);

  let allIncome = 0;
  let allExpense = 0;
  allTimeAgg.forEach((a) => {
    if (a._id === 'income') allIncome = a.total;
    if (a._id === 'expense') allExpense = a.total;
  });
  const netCushion = allIncome - allExpense;

  let cushionScore = 5;
  if (monthlyExpenses > 0) {
    const monthsCushion = netCushion / monthlyExpenses;
    if (monthsCushion >= 3) cushionScore = 20;
    else if (monthsCushion >= 1) cushionScore = 14;
    else if (monthsCushion > 0) cushionScore = 8;
  } else if (netCushion > 0) {
    cushionScore = 15;
  }

  // 6) Recurring Burden Score (Max 10 pts)
  const recurringPlan = await RecurringPlan.findOne({ userId, isActive: true });
  let recurringScore = 10;
  if (recurringPlan && monthlyIncome > 0) {
    const burdenRatio = recurringPlan.budgetAmount / monthlyIncome;
    if (burdenRatio > 0.8) recurringScore = 4;
    else if (burdenRatio > 0.6) recurringScore = 7;
    else recurringScore = 10;
  }

  const finalScore = Math.min(100, savingsScore + budgetScore + cushionScore + goalsScore + recurringScore);

  let rating = 'Needs Attention';
  if (finalScore >= 80) rating = 'Excellent';
  else if (finalScore >= 65) rating = 'Good';
  else if (finalScore >= 50) rating = 'Fair';

  // Construct Contextual Recommendations
  const positiveHighlights = [];
  const actionRecommendations = [];

  if (savingsRate >= 20) positiveHighlights.push(`Strong savings rate of ${savingsRate}%.`);
  else actionRecommendations.push('Aim to save at least 20% of monthly income to build cash reserves.');

  if (overBudgetCategories === 0 && budgets.length > 0) positiveHighlights.push('All spending is within defined category budget caps.');
  else if (overBudgetCategories > 0) actionRecommendations.push(`${overBudgetCategories} category budgets exceeded this month.`);

  if (goals.length > 0) positiveHighlights.push(`${goals.length} active savings goals in progress.`);
  else actionRecommendations.push('Create a milestone savings goal for upcoming planned expenditures.');

  res.status(200).json({
    success: true,
    data: {
      score: finalScore,
      rating,
      monthlyIncome,
      monthlyExpenses,
      netSavings: monthlyIncome - monthlyExpenses,
      savingsRate,
      factorBreakdown: {
        savingsRate: { score: savingsScore, max: 30 },
        budgetAdherence: { score: budgetScore, max: 25 },
        emergencyCushion: { score: cushionScore, max: 20 },
        savingsGoals: { score: goalsScore, max: 15 },
        recurringBurden: { score: recurringScore, max: 10 },
      },
      positiveHighlights,
      actionRecommendations,
    },
  });
});
