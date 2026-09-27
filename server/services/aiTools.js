import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import SavingsGoal from '../models/SavingsGoal.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Sandboxed Read-Only Analytical Tools for ExpenseFlow AI
 */

export const getUserFinancialSummary = async (userId) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const [monthAgg, allTimeAgg, budgets, goals] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { userId } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
    Budget.find({ userId, month, year }),
    SavingsGoal.find({ userId, status: 'active' }),
  ]);

  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  monthAgg.forEach((a) => {
    if (a._id === 'income') monthlyIncome = a.total;
    if (a._id === 'expense') monthlyExpenses = a.total;
  });

  let allTimeIncome = 0;
  let allTimeExpense = 0;
  allTimeAgg.forEach((a) => {
    if (a._id === 'income') allTimeIncome = a.total;
    if (a._id === 'expense') allTimeExpense = a.total;
  });

  return {
    currentMonth: { month, year, monthlyIncome, monthlyExpenses, monthlySurplus: monthlyIncome - monthlyExpenses },
    allTime: { allTimeIncome, allTimeExpense, netAvailableBalance: allTimeIncome - allTimeExpense },
    activeBudgetsCount: budgets.length,
    activeGoalsCount: goals.length,
  };
};

export const getCategorySpending = async (userId, month, year) => {
  const m = month || (new Date().getMonth() + 1);
  const y = year || new Date().getFullYear();

  const startOfMonth = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

  return await Transaction.aggregate([
    {
      $match: {
        userId,
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: '$category',
        totalSpent: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalSpent: -1 } },
  ]);
};

export const getBudgetStatus = async (userId, month, year) => {
  const m = month || (new Date().getMonth() + 1);
  const y = year || new Date().getFullYear();

  const budgets = await Budget.find({ userId, month: m, year: y });
  const categorySpend = await getCategorySpending(userId, m, y);

  const spendMap = {};
  categorySpend.forEach((c) => { spendMap[c._id] = c.totalSpent; });

  return budgets.map((b) => ({
    category: b.category,
    limit: b.limitAmount,
    spent: spendMap[b.category] || 0,
    remaining: Math.max(0, b.limitAmount - (spendMap[b.category] || 0)),
    percentage: Math.round(((spendMap[b.category] || 0) / b.limitAmount) * 100),
  }));
};

/**
 * 4–6 Month Multi-Month Spending & Pattern Analysis Engine
 */
export const getMultiMonthAnalysis = async (userId, monthsCount = 6) => {
  const count = Math.min(12, Math.max(3, parseInt(monthsCount, 10) || 6));
  const now = new Date();
  const currentMonthIdx = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();

  // Generate ordered list of month/year slots (oldest to newest)
  const monthSlots = [];
  for (let i = count - 1; i >= 0; i--) {
    let d = new Date(currentYear, currentMonthIdx - i, 1);
    monthSlots.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      monthName: MONTH_NAMES[d.getMonth()],
      shortName: MONTH_NAMES[d.getMonth()].substring(0, 3),
      startDate: new Date(d.getFullYear(), d.getMonth(), 1),
      endDate: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
    });
  }

  const overallStartDate = monthSlots[0].startDate;
  const overallEndDate = monthSlots[monthSlots.length - 1].endDate;

  // Aggregate monthly totals
  const monthlyTypeAgg = await Transaction.aggregate([
    {
      $match: {
        userId,
        date: { $gte: overallStartDate, $lte: overallEndDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          type: '$type',
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Aggregate category spending per month
  const categoryMonthAgg = await Transaction.aggregate([
    {
      $match: {
        userId,
        type: 'expense',
        date: { $gte: overallStartDate, $lte: overallEndDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          category: '$category',
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Map aggregated data into clean chronological slots
  const monthlyTrends = monthSlots.map((slot) => {
    let income = 0;
    let expenses = 0;

    monthlyTypeAgg.forEach((item) => {
      if (item._id.year === slot.year && item._id.month === slot.month) {
        if (item._id.type === 'income') income = item.total;
        if (item._id.type === 'expense') expenses = item.total;
      }
    });

    const netSavings = income - expenses;
    const savingsRate = income > 0 ? Math.round((Math.max(0, netSavings) / income) * 100) : 0;

    return {
      month: slot.month,
      year: slot.year,
      monthName: slot.monthName,
      shortName: slot.shortName,
      income,
      expenses,
      netSavings,
      savingsRate,
    };
  });

  // Category trends map: { [category]: { [monthKey]: amount } }
  const categoryHistory = {};
  categoryMonthAgg.forEach((item) => {
    const cat = item._id.category;
    const key = `${item._id.year}-${item._id.month}`;
    if (!categoryHistory[cat]) {
      categoryHistory[cat] = {};
    }
    categoryHistory[cat][key] = item.total;
  });

  // Current month vs historical average analysis
  const currentSlot = monthSlots[monthSlots.length - 1];
  const previousSlots = monthSlots.slice(0, monthSlots.length - 1);
  const currentKey = `${currentSlot.year}-${currentSlot.month}`;

  const abnormalSpending = [];
  const categoryAnalysis = [];

  Object.keys(categoryHistory).forEach((category) => {
    const currentSpend = categoryHistory[category][currentKey] || 0;
    let prevSum = 0;
    let prevCount = 0;

    previousSlots.forEach((slot) => {
      const key = `${slot.year}-${slot.month}`;
      if (categoryHistory[category][key] !== undefined) {
        prevSum += categoryHistory[category][key];
        prevCount++;
      }
    });

    const avgPrevious = prevCount > 0 ? Math.round(prevSum / prevCount) : 0;
    const diff = currentSpend - avgPrevious;
    const pctDiff = avgPrevious > 0 ? Math.round((diff / avgPrevious) * 100) : (currentSpend > 0 ? 100 : 0);

    categoryAnalysis.push({
      category,
      currentSpend,
      avgPrevious,
      diff,
      pctDiff,
    });

    // Rule for abnormal spending: >30% jump AND absolute increase >= ₹500
    if (avgPrevious > 0 && currentSpend > avgPrevious && pctDiff >= 30 && diff >= 500) {
      abnormalSpending.push({
        category,
        currentSpend,
        avgPrevious,
        percentageIncrease: pctDiff,
        message: `${category} spending is higher than your usual monthly average (₹${currentSpend.toLocaleString()} vs ₹${avgPrevious.toLocaleString()} avg).`,
      });
    }
  });

  categoryAnalysis.sort((a, b) => b.currentSpend - a.currentSpend);

  // 5. Spending Habits Breakdown
  const activeMonths = monthlyTrends.filter((m) => m.expenses > 0 || m.income > 0);
  const avgMonthlyExpenses = activeMonths.length > 0
    ? Math.round(activeMonths.reduce((sum, m) => sum + m.expenses, 0) / activeMonths.length)
    : 0;
  const avgMonthlyIncome = activeMonths.length > 0
    ? Math.round(activeMonths.reduce((sum, m) => sum + m.income, 0) / activeMonths.length)
    : 0;

  // Identify increasing and decreasing categories
  let increasingCategory = null;
  let decreasingCategory = null;

  for (const cat of categoryAnalysis) {
    if (cat.avgPrevious > 0) {
      if (cat.diff > 0 && (!increasingCategory || cat.diff > increasingCategory.diff)) {
        increasingCategory = cat;
      } else if (cat.diff < 0 && (!decreasingCategory || cat.diff < decreasingCategory.diff)) {
        decreasingCategory = cat;
      }
    }
  }

  // 6. Spending Prediction Calculation (4-6 months weighted analysis)
  let predictionText = '';
  let estimatedNextExpense = null;

  if (activeMonths.length >= 4) {
    // Weighted estimation based on actual past months
    const totalWeights = activeMonths.reduce((sum, _, idx) => sum + (idx + 1), 0);
    const weightedSum = activeMonths.reduce((sum, m, idx) => sum + (m.expenses * (idx + 1)), 0);
    estimatedNextExpense = Math.round(weightedSum / totalWeights);
    predictionText = `Based on your recent spending, your expenses may be around ₹${estimatedNextExpense.toLocaleString()} next month.`;
  } else if (activeMonths.length >= 2) {
    estimatedNextExpense = avgMonthlyExpenses;
    predictionText = `Based on your recent spending, your expenses may be around ₹${estimatedNextExpense.toLocaleString()} next month. Add more transactions to get a more accurate prediction.`;
  } else {
    predictionText = 'Add more transactions to get a more accurate prediction.';
  }

  // 7. Spending Patterns Detection
  const currentMonthData = monthlyTrends[monthlyTrends.length - 1] || { expenses: 0, income: 0, savingsRate: 0 };
  const prevMonthData = monthlyTrends.length > 1 ? monthlyTrends[monthlyTrends.length - 2] : null;

  const patterns = [];
  if (prevMonthData && prevMonthData.expenses > 0) {
    const expDiff = currentMonthData.expenses - prevMonthData.expenses;
    if (expDiff > 0) {
      patterns.push(`Your spending increased compared with last month (+₹${Math.abs(expDiff).toLocaleString()}).`);
    } else if (expDiff < 0) {
      patterns.push(`Your spending decreased compared with last month (-₹${Math.abs(expDiff).toLocaleString()}).`);
    }
  }

  if (categoryAnalysis.length > 0 && categoryAnalysis[0].currentSpend > 0) {
    patterns.push(`${categoryAnalysis[0].category} is currently your highest spending category (₹${categoryAnalysis[0].currentSpend.toLocaleString()}).`);
  }

  if (prevMonthData && prevMonthData.income > 0) {
    const incDiff = currentMonthData.income - prevMonthData.income;
    if (incDiff > 0) {
      patterns.push('Your income increased compared with last month.');
    }
  }

  if (currentMonthData.expenses > avgMonthlyExpenses && avgMonthlyExpenses > 0) {
    patterns.push('You are spending more than your monthly average.');
  }

  // 8. Personalized Suggestions (Strictly 2 to 4 relevant items)
  const suggestions = [];

  // Check Food spending
  const foodCat = categoryAnalysis.find((c) => c.category === 'Food');
  if (foodCat && foodCat.currentSpend > 0) {
    if (foodCat === categoryAnalysis[0] || (foodCat.avgPrevious > 0 && foodCat.pctDiff >= 20)) {
      suggestions.push('Food is one of your highest expenses. Consider setting a smaller food budget.');
    }
  }

  // Check Shopping spending
  const shoppingCat = categoryAnalysis.find((c) => c.category === 'Shopping');
  if (shoppingCat && shoppingCat.avgPrevious > 0 && shoppingCat.diff > 0) {
    suggestions.push('Your shopping expenses have increased compared with previous months. Consider limiting non-essential purchases.');
  }

  // Check Savings
  if (currentMonthData.income > 0 && currentMonthData.savingsRate < 15) {
    suggestions.push('Try setting aside a fixed amount after receiving your income.');
  }

  // Check Income increase
  if (prevMonthData && currentMonthData.income > prevMonthData.income) {
    suggestions.push('Your income has increased. Consider putting part of the additional income toward your saving goal.');
  }

  // Fallback if needed
  if (suggestions.length === 0 && categoryAnalysis.length > 0) {
    suggestions.push(`You may save approximately ₹${Math.round(categoryAnalysis[0].currentSpend * 0.1).toLocaleString()} if you reduce unnecessary spending on ${categoryAnalysis[0].category}.`);
  }
  if (suggestions.length === 0) {
    suggestions.push('Setting monthly limits on your largest categories will help build consistent savings.');
  }

  return {
    monthsCount: count,
    monthlyTrends,
    categoryAnalysis,
    abnormalSpending,
    patterns: patterns.slice(0, 4),
    suggestions: suggestions.slice(0, 4),
    prediction: {
      text: predictionText,
      estimatedExpense: estimatedNextExpense,
      hasEnoughData: activeMonths.length >= 4,
    },
    spendingHabits: {
      highestCategory: categoryAnalysis.length > 0 && categoryAnalysis[0].currentSpend > 0 ? categoryAnalysis[0].category : 'N/A',
      highestCategoryAmount: categoryAnalysis.length > 0 ? categoryAnalysis[0].currentSpend : 0,
      increasingCategory: increasingCategory ? increasingCategory.category : null,
      decreasingCategory: decreasingCategory ? decreasingCategory.category : null,
      avgMonthlySpending: avgMonthlyExpenses,
      avgMonthlyIncome: avgMonthlyIncome,
      savingsTrend: currentMonthData.netSavings >= 0 ? 'Positive Surplus' : 'Deficit',
      unusualSpendingCount: abnormalSpending.length,
    },
  };
};

export const calculateAffordability = (summary, itemCost, timelineMonths = 1) => {
  const monthlySurplus = summary.currentMonth.monthlySurplus;
  const netBalance = summary.allTime.netAvailableBalance;

  const cost = Number(itemCost);
  const months = Number(timelineMonths) || 1;
  const requiredPerMonth = Math.round(cost / months);

  const isAffordableOutright = netBalance >= cost;
  const isAffordableFromSurplus = monthlySurplus > 0 && (monthlySurplus * months) >= cost;
  const surplusAllocationPercentage = monthlySurplus > 0 ? Math.round((requiredPerMonth / monthlySurplus) * 100) : 0;

  return {
    itemCost: cost,
    timelineMonths: months,
    requiredPerMonth,
    monthlySurplus,
    netBalance,
    isAffordableOutright,
    isAffordableFromSurplus,
    surplusAllocationPercentage,
    recommendedMonths: monthlySurplus > 0 ? Math.ceil(cost / (monthlySurplus * 0.6)) : 'N/A',
  };
};
