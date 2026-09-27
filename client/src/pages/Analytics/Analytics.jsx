import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import './Analytics.css';

const CATEGORY_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#6B7280'];

export default function Analytics() {
  const { formatAmount } = useCurrency();
  const [summary, setSummary] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [rangeMonths, setRangeMonths] = useState(6);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [sumRes, multiRes] = await Promise.all([
        api.get('/transactions/summary'),
        api.get(`/transactions/multi-month-analysis?months=${rangeMonths}`),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (multiRes.success && multiRes.data?.monthlyTrends) {
        setTrendData(multiRes.data.monthlyTrends);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [rangeMonths]);

  useEffect(() => {
    fetchAnalytics();

    // Auto-update graph when new transactions are added, edited, or deleted
    const handleTransactionChange = () => {
      fetchAnalytics();
    };

    window.addEventListener('transaction-updated', handleTransactionChange);
    window.addEventListener('transaction-added', handleTransactionChange);
    window.addEventListener('transaction-deleted', handleTransactionChange);

    return () => {
      window.removeEventListener('transaction-updated', handleTransactionChange);
      window.removeEventListener('transaction-added', handleTransactionChange);
      window.removeEventListener('transaction-deleted', handleTransactionChange);
    };
  }, [fetchAnalytics]);

  const barData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: 'Income', amount: summary.totalIncome || 0, fill: '#10B981' },
      { name: 'Expenses', amount: summary.totalExpenses || 0, fill: '#EF4444' },
      { name: 'Net Savings', amount: Math.max(0, summary.netBalance || 0), fill: '#3B82F6' },
    ];
  }, [summary]);

  const pieData = useMemo(() => {
    if (!summary?.categoryBreakdown) return [];
    return summary.categoryBreakdown.map((item, idx) => ({
      name: item.category,
      value: item.total,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [summary]);

  const topCategory = summary?.categoryBreakdown?.[0];

  return (
    <div className="ef-page-container">
      <div className="ef-page-head">
        <div>
          <h2 className="ef-page-title">Spending Analytics</h2>
          <p className="ef-page-subtitle">Monthly financial trends and category distributions from your transactions.</p>
        </div>

        <div className="ef-range-filter">
          <label htmlFor="analytics-range" className="ef-range-label">Range:</label>
          <select
            id="analytics-range"
            value={rangeMonths}
            onChange={(e) => setRangeMonths(Number(e.target.value))}
            className="ef-select-field ef-select-field--sm"
          >
            <option value={3}>Last 3 Months</option>
            <option value={6}>Last 6 Months</option>
            <option value={12}>Last 12 Months</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="ef-table-loading">Loading financial analytics...</div>
      ) : (
        <div className="ef-analytics-grid">
          {/* 1. Monthly Financial Trends Line Graph */}
          <div className="surface-card ef-chart-card ef-chart-card--full">
            <div className="ef-card-header">
              <div className="ef-card-header-title">
                <h3>Monthly Financial Trends</h3>
                <span className="ef-card-subtitle">Comparison of Income, Expenses, and Net Savings over time</span>
              </div>
            </div>

            <div className="ef-chart-wrapper" style={{ height: 300 }}>
              {trendData.length === 0 ? (
                <div className="ef-empty-state" style={{ height: '100%', justifyContent: 'center' }}>
                  <p>No transaction history recorded for this period.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 15, right: 25, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis
                      dataKey="shortName"
                      stroke="var(--text-muted)"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                    />
                    <Tooltip
                      formatter={(value, name) => [formatAmount(value), name]}
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-main)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                      iconType="circle"
                    />
                    <Line
                      type="monotone"
                      name="Income"
                      dataKey="income"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#10B981' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      name="Expenses"
                      dataKey="expenses"
                      stroke="#EF4444"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#EF4444' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      name="Net Savings"
                      dataKey="netSavings"
                      stroke="#3B82F6"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#3B82F6' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="ef-chart-caption">
              Displays your monthly income (green), expenses (red), and net savings (blue). Updates automatically when transactions change.
            </p>
          </div>

          {/* 2. Cashflow Comparison Chart */}
          <div className="surface-card ef-chart-card">
            <div className="ef-card-header">
              <div className="ef-card-header-title">
                <h3>Current Month Cashflow</h3>
                <span className="ef-card-subtitle">Income vs Expenses vs Net Savings</span>
              </div>
            </div>
            <div className="ef-chart-wrapper" style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <Tooltip formatter={(value) => [formatAmount(value), 'Amount']} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="ef-chart-caption">
              Total monthly income: <strong>{formatAmount(summary?.totalIncome || 0)}</strong> | Total expenses: <strong>{formatAmount(summary?.totalExpenses || 0)}</strong> ({summary?.savingsRate || 0}% savings rate).
            </p>
          </div>

          {/* 3. Category Distribution Donut Chart */}
          <div className="surface-card ef-chart-card">
            <div className="ef-card-header">
              <div className="ef-card-header-title">
                <h3>Category Breakdown</h3>
                <span className="ef-card-subtitle">Current month expense distribution</span>
              </div>
            </div>
            <div className="ef-chart-wrapper" style={{ height: 250 }}>
              {pieData.length === 0 ? (
                <div className="ef-empty-state" style={{ height: '100%', justifyContent: 'center' }}>
                  <p>No expense transactions logged for this month.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatAmount(value), 'Spent']} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="ef-chart-caption">
              {topCategory
                ? `Your highest category is ${topCategory.category} (${formatAmount(topCategory.total)}), accounting for ${Math.round((topCategory.total / (summary?.totalExpenses || 1)) * 100)}% of expenses.`
                : 'Log transactions to see category distribution.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
