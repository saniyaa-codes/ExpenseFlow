import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Generate Comprehensive Monthly Report
 * GET /api/reports/monthly
 */
export const getMonthlyReport = catchAsync(async (req, res, next) => {
  const currentDate = new Date();
  const month = parseInt(req.query.month || currentDate.getMonth() + 1, 10);
  const year = parseInt(req.query.year || currentDate.getFullYear(), 10);

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const [transactions, budgets] = await Promise.all([
    Transaction.find({
      userId: req.user._id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort('date'),
    Budget.find({ userId: req.user._id, month, year }),
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap = {};

  transactions.forEach((tx) => {
    if (tx.type === 'income') totalIncome += tx.amount;
    if (tx.type === 'expense') {
      totalExpense += tx.amount;
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
    }
  });

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      month,
      year,
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      transactionCount: transactions.length,
      categoryBreakdown: Object.entries(categoryMap).map(([category, amount]) => ({ category, amount })),
      budgets,
    },
  });
});

/**
 * Export User Transactions as CSV
 * GET /api/reports/export-csv
 */
export const exportTransactionsCSV = catchAsync(async (req, res, next) => {
  const transactions = await Transaction.find({ userId: req.user._id }).sort('-date');

  let csvContent = 'Date,Type,Category,Merchant/Source,Amount,Currency,Payment Method,Notes\n';

  transactions.forEach((tx) => {
    const formattedDate = new Date(tx.date).toISOString().split('T')[0];
    const cleanNotes = (tx.notes || '').replace(/"/g, '""');
    const cleanMerchant = (tx.merchantOrSource || '').replace(/"/g, '""');
    csvContent += `"${formattedDate}","${tx.type}","${tx.category}","${cleanMerchant}",${tx.amount},"${tx.currency}","${tx.paymentMethod}","${cleanNotes}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="ExpenseFlow_Transactions.csv"');
  res.status(200).send(csvContent);
});
