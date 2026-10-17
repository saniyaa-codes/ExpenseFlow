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
import { Maximize2, Minimize2 } from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import './Analytics.css';

const CATEGORY_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#6366F1'];

export default function Analytics() {
  const { formatAmount } = useCurrency();
  const [summary, setSummary] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [rangeMonths, setRangeMonths] = useState(6);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedChart, setExpandedChart] = useState(null); // 'trend' | 'cashflow' | 'category' | null

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

  // Handle ESC key to exit full screen chart modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && expandedChart) {
        setExpandedChart(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedChart]);

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
  const totalExpenseAmount = summary?.totalExpenses || 0;

  // Aggregate Trends Totals over Selected Range
  const trendTotals = useMemo(() => {
    if (!trendData || trendData.length === 0) {
      return { totalIncome: 0, totalExpenses: 0, netSavings: 0, avgMonthly: 0 };
    }
    const totalIncome = trendData.reduce((acc, m) => acc + (m.income || 0), 0);
    const totalExpenses = trendData.reduce((acc, m) => acc + (m.expenses || 0), 0);
    const netSavings = totalIncome - totalExpenses;
    const avgMonthly = Math.round(totalExpenses / trendData.length);
    return { totalIncome, totalExpenses, netSavings, avgMonthly };
  }, [trendData]);

  // High-contrast custom tooltip style
  const tooltipContentStyle = {
    backgroundColor: 'var(--bg-surface, #ffffff)',
    borderColor: 'var(--border-main, #d4d4d4)',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-main, #171717)',
  };

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
          <div className="ef-chart-card ef-chart-card--full">
            <div className="ef-chart-card-header">
              <div className="ef-chart-header-left">
                <h3 className="ef-chart-title">Monthly Financial Trends</h3>
                <span className="ef-chart-subtitle">Comparison of Income, Expenses, and Net Savings over time</span>
              </div>
              <div className="ef-chart-header-right">
                <span className="ef-kpi-badge ef-kpi-badge--income">Inflow: {formatAmount(trendTotals.totalIncome)}</span>
                <span className="ef-kpi-badge ef-kpi-badge--expense">Outflow: {formatAmount(trendTotals.totalExpenses)}</span>
                <span className="ef-kpi-badge ef-kpi-badge--savings">Saved: {formatAmount(trendTotals.netSavings)}</span>
                <button
                  type="button"
                  className="ef-chart-expand-btn"
                  onClick={() => setExpandedChart('trend')}
                  title="Expand to Full Screen"
                >
                  <Maximize2 size={13} />
                  <span>Full Screen</span>
                </button>
              </div>
            </div>

            <div className="ef-chart-wrapper ef-chart-wrapper--trend">
              {trendData.length === 0 ? (
                <div className="ef-empty-state" style={{ height: '100%', justifyContent: 'center' }}>
                  <p>No transaction history recorded for this period.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 20, right: 30, left: 15, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle, #e5e5e5)" />
                    <XAxis
                      dataKey="shortName"
                      stroke="var(--text-secondary, #525252)"
                      fontSize={13}
                      fontWeight={500}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--text-secondary, #525252)"
                      fontSize={13}
                      fontWeight={500}
                      tickLine={false}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                    />
                    <Tooltip
                      formatter={(value, name) => [formatAmount(value), name]}
                      contentStyle={tooltipContentStyle}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '14px', fontSize: '13px', fontWeight: 600 }}
                      iconType="circle"
                      iconSize={10}
                    />
                    <Line
                      type="monotone"
                      name="Income"
                      dataKey="income"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      name="Expenses"
                      dataKey="expenses"
                      stroke="#EF4444"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#EF4444', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      name="Net Savings"
                      dataKey="netSavings"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#3B82F6', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="ef-chart-caption">
              Displays your monthly income (green), expenses (red), and net savings (blue). Updates automatically when transactions change. Click "Full Screen" for enlarged inspection.
            </p>
          </div>

          {/* 2. Cashflow Comparison Chart */}
          <div className="ef-chart-card">
            <div className="ef-chart-card-header">
              <div className="ef-chart-header-left">
                <h3 className="ef-chart-title">Current Month Cashflow</h3>
                <span className="ef-chart-subtitle">Income vs Expenses vs Net Savings</span>
              </div>
              <div className="ef-chart-header-right">
                <span className="ef-kpi-badge ef-kpi-badge--savings">
                  {summary?.savingsRate || 0}% Savings Rate
                </span>
                <button
                  type="button"
                  className="ef-chart-expand-btn"
                  onClick={() => setExpandedChart('cashflow')}
                  title="Expand to Full Screen"
                >
                  <Maximize2 size={13} />
                  <span>Full Screen</span>
                </button>
              </div>
            </div>

            <div className="ef-chart-wrapper ef-chart-wrapper--half">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle, #e5e5e5)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary, #525252)" fontSize={13} fontWeight={500} tickLine={false} />
                  <YAxis
                    stroke="var(--text-secondary, #525252)"
                    fontSize={13}
                    fontWeight={500}
                    tickLine={false}
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  />
                  <Tooltip
                    formatter={(value) => [formatAmount(value), 'Amount']}
                    contentStyle={tooltipContentStyle}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="ef-chart-caption">
              Total income: <strong>{formatAmount(summary?.totalIncome || 0)}</strong> | Total expenses: <strong>{formatAmount(summary?.totalExpenses || 0)}</strong> ({summary?.savingsRate || 0}% savings rate).
            </p>
          </div>

          {/* 3. Category Distribution Donut Chart */}
          <div className="ef-chart-card">
            <div className="ef-chart-card-header">
              <div className="ef-chart-header-left">
                <h3 className="ef-chart-title">Category Breakdown</h3>
                <span className="ef-chart-subtitle">Current month expense distribution</span>
              </div>
              <div className="ef-chart-header-right">
                {topCategory && (
                  <span className="ef-kpi-badge ef-kpi-badge--expense">
                    Top: {topCategory.category}
                  </span>
                )}
                <button
                  type="button"
                  className="ef-chart-expand-btn"
                  onClick={() => setExpandedChart('category')}
                  title="Expand to Full Screen"
                >
                  <Maximize2 size={13} />
                  <span>Full Screen</span>
                </button>
              </div>
            </div>

            <div className="ef-chart-wrapper ef-chart-wrapper--half">
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
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${formatAmount(value)} (${totalExpenseAmount > 0 ? Math.round((value / totalExpenseAmount) * 100) : 0}%)`,
                        name,
                      ]}
                      contentStyle={tooltipContentStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Clear, High-Visibility Category Breakdown Grid */}
            {pieData.length > 0 && (
              <div className="ef-category-legend-grid">
                {pieData.map((item, idx) => {
                  const pct = totalExpenseAmount > 0 ? Math.round((item.value / totalExpenseAmount) * 100) : 0;
                  return (
                    <div key={idx} className="ef-category-legend-item">
                      <span className="ef-category-legend-name">
                        <span className="ef-category-legend-dot" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="ef-category-legend-val">
                        {formatAmount(item.value)} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="ef-chart-caption">
              {topCategory
                ? `Your highest category is ${topCategory.category} (${formatAmount(topCategory.total)}), accounting for ${Math.round((topCategory.total / (summary?.totalExpenses || 1)) * 100)}% of expenses.`
                : 'Log transactions to see category distribution.'}
            </p>
          </div>
        </div>
      )}

      {/* =========================================================
          DEDICATED FULLSCREEN MODAL VIEW
          ========================================================= */}
      {expandedChart && (
        <div className="ef-chart-fullscreen-overlay" onClick={() => setExpandedChart(null)}>
          <div className="ef-chart-fullscreen-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ef-chart-fullscreen-header">
              <div className="ef-fullscreen-title-box">
                <h3>
                  {expandedChart === 'trend' && 'Monthly Financial Trends — Full Screen View'}
                  {expandedChart === 'cashflow' && 'Current Month Cashflow — Full Screen View'}
                  {expandedChart === 'category' && 'Category Distribution Breakdown — Full Screen View'}
                </h3>
                <p>
                  {expandedChart === 'trend' && `Multi-month trend analysis over the last ${rangeMonths} months`}
                  {expandedChart === 'cashflow' && 'Comprehensive income vs expense vs savings breakdown'}
                  {expandedChart === 'category' && 'Complete category expense distribution and percentages'}
                </p>
              </div>

              <button
                type="button"
                className="ef-fullscreen-close-btn"
                onClick={() => setExpandedChart(null)}
              >
                <Minimize2 size={16} />
                <span>Exit Full Screen (ESC)</span>
              </button>
            </div>

            <div className="ef-chart-fullscreen-body">
              {/* Fullscreen Line Chart */}
              {expandedChart === 'trend' && (
                <>
                  <div className="ef-chart-fullscreen-canvas">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 25, right: 35, left: 20, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle, #e5e5e5)" />
                        <XAxis
                          dataKey="shortName"
                          stroke="var(--text-main, #171717)"
                          fontSize={14}
                          fontWeight={600}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="var(--text-main, #171717)"
                          fontSize={14}
                          fontWeight={600}
                          tickLine={false}
                          tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                        />
                        <Tooltip
                          formatter={(value, name) => [formatAmount(value), name]}
                          contentStyle={{ ...tooltipContentStyle, fontSize: '14px', padding: '12px 18px' }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: '16px', fontSize: '14px', fontWeight: 700 }}
                          iconType="circle"
                          iconSize={12}
                        />
                        <Line
                          type="monotone"
                          name="Income"
                          dataKey="income"
                          stroke="#10B981"
                          strokeWidth={4}
                          dot={{ r: 6, fill: '#10B981', strokeWidth: 2, stroke: '#ffffff' }}
                          activeDot={{ r: 9 }}
                        />
                        <Line
                          type="monotone"
                          name="Expenses"
                          dataKey="expenses"
                          stroke="#EF4444"
                          strokeWidth={4}
                          dot={{ r: 6, fill: '#EF4444', strokeWidth: 2, stroke: '#ffffff' }}
                          activeDot={{ r: 9 }}
                        />
                        <Line
                          type="monotone"
                          name="Net Savings"
                          dataKey="netSavings"
                          stroke="#3B82F6"
                          strokeWidth={4}
                          dot={{ r: 6, fill: '#3B82F6', strokeWidth: 2, stroke: '#ffffff' }}
                          activeDot={{ r: 9 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="ef-fullscreen-kpis">
                    <div className="ef-fullscreen-kpi-card">
                      <span>Total Income ({rangeMonths} Mo)</span>
                      <strong style={{ color: '#10B981' }}>{formatAmount(trendTotals.totalIncome)}</strong>
                    </div>
                    <div className="ef-fullscreen-kpi-card">
                      <span>Total Expenses ({rangeMonths} Mo)</span>
                      <strong style={{ color: '#EF4444' }}>{formatAmount(trendTotals.totalExpenses)}</strong>
                    </div>
                    <div className="ef-fullscreen-kpi-card">
                      <span>Net Savings Accumulated</span>
                      <strong style={{ color: '#3B82F6' }}>{formatAmount(trendTotals.netSavings)}</strong>
                    </div>
                    <div className="ef-fullscreen-kpi-card">
                      <span>Average Monthly Outflow</span>
                      <strong>{formatAmount(trendTotals.avgMonthly)}</strong>
                    </div>
                  </div>
                </>
              )}

              {/* Fullscreen Cashflow Chart */}
              {expandedChart === 'cashflow' && (
                <>
                  <div className="ef-chart-fullscreen-canvas">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 25, right: 35, left: 20, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle, #e5e5e5)" />
                        <XAxis dataKey="name" stroke="var(--text-main, #171717)" fontSize={15} fontWeight={600} tickLine={false} />
                        <YAxis
                          stroke="var(--text-main, #171717)"
                          fontSize={14}
                          fontWeight={600}
                          tickLine={false}
                          tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                        />
                        <Tooltip
                          formatter={(value) => [formatAmount(value), 'Amount']}
                          contentStyle={{ ...tooltipContentStyle, fontSize: '14px', padding: '12px 18px' }}
                        />
                        <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={90}>
                          {barData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="ef-fullscreen-kpis">
                    <div className="ef-fullscreen-kpi-card">
                      <span>Current Month Income</span>
                      <strong style={{ color: '#10B981' }}>{formatAmount(summary?.totalIncome || 0)}</strong>
                    </div>
                    <div className="ef-fullscreen-kpi-card">
                      <span>Current Month Expenses</span>
                      <strong style={{ color: '#EF4444' }}>{formatAmount(summary?.totalExpenses || 0)}</strong>
                    </div>
                    <div className="ef-fullscreen-kpi-card">
                      <span>Net Balance / Surplus</span>
                      <strong style={{ color: '#3B82F6' }}>{formatAmount(summary?.netBalance || 0)}</strong>
                    </div>
                    <div className="ef-fullscreen-kpi-card">
                      <span>Savings Rate</span>
                      <strong>{summary?.savingsRate || 0}%</strong>
                    </div>
                  </div>
                </>
              )}

              {/* Fullscreen Category Breakdown */}
              {expandedChart === 'category' && (
                <>
                  <div className="ef-chart-fullscreen-canvas">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={110}
                          outerRadius={180}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [
                            `${formatAmount(value)} (${totalExpenseAmount > 0 ? Math.round((value / totalExpenseAmount) * 100) : 0}%)`,
                            name,
                          ]}
                          contentStyle={{ ...tooltipContentStyle, fontSize: '14px', padding: '12px 18px' }}
                        />
                        <Legend iconSize={12} wrapperStyle={{ fontSize: '14px', fontWeight: 600, paddingTop: '16px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="ef-fullscreen-kpis">
                    <div className="ef-fullscreen-kpi-card">
                      <span>Total Categorized Spending</span>
                      <strong style={{ color: '#EF4444' }}>{formatAmount(totalExpenseAmount)}</strong>
                    </div>
                    <div className="ef-fullscreen-kpi-card">
                      <span>Active Categories</span>
                      <strong>{pieData.length}</strong>
                    </div>
                    <div className="ef-fullscreen-kpi-card">
                      <span>Top Spending Category</span>
                      <strong style={{ color: '#3B82F6' }}>{topCategory ? `${topCategory.category}` : 'None'}</strong>
                    </div>
                    <div className="ef-fullscreen-kpi-card">
                      <span>Top Category Amount</span>
                      <strong>{topCategory ? formatAmount(topCategory.total) : '₹0'}</strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
