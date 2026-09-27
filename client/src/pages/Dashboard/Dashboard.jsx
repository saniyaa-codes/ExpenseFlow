import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  Compass,
  Lightbulb,
  AlertTriangle,
  Plus,
  Mic,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import Button from '../../components/common/Button';
import TransactionConfirmModal from '../../components/common/TransactionConfirmModal';
import { validateTransaction } from '../../utils/transactionValidation';
import { handleTransactionBudgetAlerts } from '../../utils/mobileNotification';
import './Dashboard.css';

export default function Dashboard() {
  const { formatAmount, currency } = useCurrency();

  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    savingsRate: 0,
  });

  const [multiMonthData, setMultiMonthData] = useState({
    monthlyTrends: [],
    prediction: { text: '' },
    suggestions: [],
    abnormalSpending: [],
  });

  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [monthsCount, setMonthsCount] = useState(6);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Add Transaction Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [stagedTx, setStagedTx] = useState(null);
  const [dashboardSuccessMsg, setDashboardSuccessMsg] = useState('');
  const [modalForm, setModalForm] = useState({
    type: 'expense',
    amount: '',
    category: 'Food',
    merchantOrSource: '',
    paymentMethod: 'UPI',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [summaryRes, multiRes, budgetsRes, goalsRes] = await Promise.all([
        api.get('/transactions/summary', { params: { month: currentMonth, year: currentYear } }),
        api.get('/transactions/multi-month-analysis', { params: { months: monthsCount } }),
        api.get('/budgets'),
        api.get('/goals'),
      ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (multiRes.success) setMultiMonthData(multiRes.data);
      if (budgetsRes.success) setBudgets(budgetsRes.data?.budgets || []);
      if (goalsRes.success) setGoals(goalsRes.data?.goals || []);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleDataRefresh = () => fetchDashboardData();
    window.addEventListener('transaction-added', handleDataRefresh);
    window.addEventListener('transaction-updated', handleDataRefresh);
    window.addEventListener('transaction-deleted', handleDataRefresh);

    return () => {
      window.removeEventListener('transaction-added', handleDataRefresh);
      window.removeEventListener('transaction-updated', handleDataRefresh);
      window.removeEventListener('transaction-deleted', handleDataRefresh);
    };
  }, [monthsCount]);

  // Quick Add Transaction submission
  const handleModalSubmit = (e) => {
    e.preventDefault();
    setModalError('');

    const validation = validateTransaction(modalForm);
    if (!validation.isValid) {
      setModalError(validation.error);
      return;
    }

    setStagedTx({ ...modalForm });
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!stagedTx) return;
    setIsSubmitting(true);
    try {
      const res = await api.post('/transactions', stagedTx);
      if (res.data?.budgetAlerts?.length > 0) {
        handleTransactionBudgetAlerts(res.data.budgetAlerts);
      }
      setIsConfirmOpen(false);
      setIsModalOpen(false);
      setStagedTx(null);
      setModalForm({
        type: 'expense',
        amount: '',
        category: 'Food',
        merchantOrSource: '',
        paymentMethod: 'UPI',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      fetchDashboardData();
      window.dispatchEvent(new CustomEvent('transaction-added'));
      window.dispatchEvent(new CustomEvent('transaction-updated'));
      setDashboardSuccessMsg('Transaction added successfully!');
      setTimeout(() => setDashboardSuccessMsg(''), 3500);
    } catch (err) {
      setModalError(err.message || 'Error saving transaction.');
      setIsConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Monthly trends for BarChart
  const monthlyChartData = useMemo(() => {
    if (!multiMonthData.monthlyTrends || multiMonthData.monthlyTrends.length === 0) {
      return [];
    }
    return multiMonthData.monthlyTrends.map((item) => ({
      name: item.shortName || item.monthName,
      Income: item.income,
      Expense: item.expenses,
    }));
  }, [multiMonthData.monthlyTrends]);

  // Remaining budget
  const totalBudgetLimit = useMemo(() => {
    return budgets.reduce((acc, b) => acc + (b.limitAmount || 0), 0);
  }, [budgets]);

  const remainingBudget = useMemo(() => {
    if (totalBudgetLimit <= 0) return null;
    return Math.max(0, totalBudgetLimit - summary.totalExpenses);
  }, [totalBudgetLimit, summary.totalExpenses]);

  const openAIChat = (voice = false) => {
    window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: { voice } }));
  };

  return (
    <div className="ef-dash-page">
      {/* 1. TOP HEADER */}
      <div className="ef-dash-topbar">
        <div>
          <h1 className="ef-dash-title">Dashboard</h1>
          <p className="ef-dash-subtitle">Overview of your cashflow and predictive insights.</p>
        </div>

        <div className="ef-dash-btn-group">
          <Button
            variant="outline"
            size="sm"
            icon={Mic}
            onClick={() => openAIChat(true)}
            title="Log or delete transaction by voice"
          >
            Voice Entry
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={Sparkles}
            onClick={() => openAIChat(false)}
            title="Ask AI about finances"
          >
            Ask AI
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsModalOpen(true)}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {dashboardSuccessMsg && (
        <div className="ef-auth-alert ef-auth-alert--success" style={{ padding: '6px 12px', fontSize: '12px', margin: 0 }}>
          <span>{dashboardSuccessMsg}</span>
        </div>
      )}

      {/* 2. COMPACT AI PREDICTIONS & SUGGESTIONS */}
      <div className="ef-dash-top-intel">
        {multiMonthData.abnormalSpending && multiMonthData.abnormalSpending.length > 0 && (
          <div className="ef-alert-banner">
            <AlertTriangle size={15} className="ef-alert-icon" />
            <div className="ef-alert-content">
              <strong>Unusual Spending Alert:</strong>
              <span>{multiMonthData.abnormalSpending[0].message}</span>
            </div>
          </div>
        )}

        <div className="ef-intel-split-card">
          {/* Spending Prediction */}
          <div className="ef-intel-pane ef-intel-pane--prediction">
            <div className="ef-intel-head">
              <Compass size={15} className="text-accent" />
              <h3>Spending Prediction</h3>
            </div>
            <p className="ef-prediction-text">
              {multiMonthData.prediction?.text || 'Add regular transactions across weeks to see spending predictions.'}
            </p>
          </div>

          {/* Personalized Suggestions */}
          <div className="ef-intel-pane ef-intel-pane--suggestions">
            <div className="ef-intel-head">
              <Lightbulb size={15} className="text-accent" />
              <h3>Personalized Suggestions</h3>
            </div>
            {multiMonthData.suggestions && multiMonthData.suggestions.length > 0 ? (
              <ul className="ef-suggestions-list">
                {multiMonthData.suggestions.slice(0, 2).map((sugg, idx) => (
                  <li key={idx}>
                    <span className="ef-sugg-bullet">•</span>
                    <span>{sugg}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ef-empty-hint">Track regular expenses to unlock tailored suggestions.</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. ESSENTIAL FINANCIAL SUMMARY METRICS */}
      <div className="ef-financial-summary">
        <div className="ef-sum-card ef-sum-card--income">
          <div className="ef-sum-head">
            <span className="ef-sum-label">Total Income</span>
            <TrendingUp size={14} className="text-income" />
          </div>
          <div className="ef-sum-value text-income">+{formatAmount(summary.totalIncome)}</div>
          <span className="ef-sum-hint">This month</span>
        </div>

        <div className="ef-sum-card ef-sum-card--expense">
          <div className="ef-sum-head">
            <span className="ef-sum-label">Total Expenses</span>
            <TrendingDown size={14} className="text-expense" />
          </div>
          <div className="ef-sum-value text-expense">-{formatAmount(summary.totalExpenses)}</div>
          <span className="ef-sum-hint">This month</span>
        </div>

        <div className="ef-sum-card ef-sum-card--balance">
          <div className="ef-sum-head">
            <span className="ef-sum-label">Current Savings</span>
            <Wallet size={14} className="text-accent" />
          </div>
          <div className="ef-sum-value">{formatAmount(summary.netBalance)}</div>
          <span className="ef-sum-hint">Savings rate: {summary.savingsRate}%</span>
        </div>

        <div className="ef-sum-card ef-sum-card--budget">
          <div className="ef-sum-head">
            <span className="ef-sum-label">
              {remainingBudget !== null ? 'Remaining Budget' : 'Savings Goals'}
            </span>
            <Calendar size={14} />
          </div>
          <div className="ef-sum-value">
            {remainingBudget !== null
              ? formatAmount(remainingBudget)
              : `${goals.length} Active`}
          </div>
          <span className="ef-sum-hint">
            {remainingBudget !== null
              ? `From ${formatAmount(totalBudgetLimit)} budget`
              : 'Target savings in progress'}
          </span>
        </div>
      </div>

      {/* 4. INCOME & EXPENSE COMPARISON GRAPH */}
      <div className="surface-card ef-chart-section">
        <div className="ef-chart-section-header">
          <div>
            <h2 className="ef-chart-title">Income & Expense Comparison</h2>
            <span className="ef-chart-subtitle">
              Monthly cashflow comparison over the last {monthsCount} months.
            </span>
          </div>

          <div className="ef-period-toggle">
            {[4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                className={`ef-period-btn ${monthsCount === num ? 'ef-period-btn--active' : ''}`}
                onClick={() => setMonthsCount(num)}
              >
                {num} Months
              </button>
            ))}
          </div>
        </div>

        <div className="ef-chart-wrapper">
          {monthlyChartData.length === 0 ? (
            <div className="ef-empty-chart">
              <p>No transaction history available for the selected period.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyChartData}
                margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  dy={4}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  width={42}
                />
                <Tooltip
                  formatter={(val, name) => [formatAmount(val), name]}
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-main)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '6px', lineHeight: '1.2' }}
                  iconSize={9}
                />
                <Bar dataKey="Income" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Expense" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* QUICK ADD TRANSACTION MODAL */}
      {isModalOpen && (
        <div className="ef-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="surface-card ef-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ef-modal-header">
              <h3>Quick Add Transaction</h3>
              <button
                type="button"
                className="ef-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="ef-modal-form">
              {modalError && <div className="ef-auth-alert ef-auth-alert--error">{modalError}</div>}

              <div className="ef-type-segmented">
                <button
                  type="button"
                  className={`ef-seg-btn ${modalForm.type === 'expense' ? 'ef-seg-btn--active-exp' : ''}`}
                  onClick={() => setModalForm((prev) => ({ ...prev, type: 'expense' }))}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={`ef-seg-btn ${modalForm.type === 'income' ? 'ef-seg-btn--active-inc' : ''}`}
                  onClick={() => setModalForm((prev) => ({ ...prev, type: 'income' }))}
                >
                  Income
                </button>
              </div>

              <div className="ef-input-group">
                <label className="ef-input-label">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="ef-text-input"
                  placeholder="0.00"
                  value={modalForm.amount}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="ef-modal-grid-2">
                <div className="ef-input-group">
                  <label className="ef-input-label">Category</label>
                  <select
                    className="ef-select-field"
                    value={modalForm.category}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    {modalForm.type === 'expense' ? (
                      <>
                        <option value="Food">Food & Dining</option>
                        <option value="Transport">Transportation</option>
                        <option value="Rent">Rent & Housing</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Bills">Bills & Utilities</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Education">Education</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Other">Other Expense</option>
                      </>
                    ) : (
                      <>
                        <option value="Salary">Salary / Stipend</option>
                        <option value="Freelancing">Freelancing</option>
                        <option value="Investment">Investments</option>
                        <option value="Other">Other Income</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="ef-input-group">
                  <label className="ef-input-label">Payment Method</label>
                  <select
                    className="ef-select-field"
                    value={modalForm.paymentMethod}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="ef-modal-grid-2">
                <div className="ef-input-group">
                  <label className="ef-input-label">
                    {modalForm.type === 'expense' ? 'Merchant / Store' : 'Source'}
                  </label>
                  <input
                    type="text"
                    className="ef-text-input"
                    placeholder={modalForm.type === 'expense' ? 'e.g., Grocery Store' : 'e.g., Company Name'}
                    value={modalForm.merchantOrSource}
                    onChange={(e) =>
                      setModalForm((prev) => ({ ...prev, merchantOrSource: e.target.value }))
                    }
                  />
                </div>

                <div className="ef-input-group">
                  <label className="ef-input-label">Date</label>
                  <input
                    type="date"
                    className="ef-text-input"
                    max={new Date().toISOString().split('T')[0]}
                    value={modalForm.date}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="ef-modal-actions">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                  Save Transaction
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Step Modal */}
      <TransactionConfirmModal
        isOpen={isConfirmOpen}
        transaction={stagedTx}
        currency={currency}
        isLoading={isSubmitting}
        onConfirm={handleConfirmSave}
        onCancel={() => {
          setIsConfirmOpen(false);
          setStagedTx(null);
        }}
      />
    </div>
  );
}
