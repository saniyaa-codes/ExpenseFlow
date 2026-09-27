import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Repeat,
  Play,
  Pause,
  Edit3,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  PieChart,
} from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import './Budgets.css';

export default function Budgets() {
  const { formatAmount } = useCurrency();
  const [budgets, setBudgets] = useState([]);
  const [totalOverallSpent, setTotalOverallSpent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Standard Budget Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formCategory, setFormCategory] = useState('Food');
  const [formLimit, setFormLimit] = useState('');

  // Recurring Income & Budget State
  const [recurringPlan, setRecurringPlan] = useState(null);
  const [isAppliedThisMonth, setIsAppliedThisMonth] = useState(false);
  const [isRecurringLoading, setIsRecurringLoading] = useState(true);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isRecurringSubmitting, setIsRecurringSubmitting] = useState(false);
  const [recurringFeedback, setRecurringFeedback] = useState('');

  // Recurring Form State
  const [recurringForm, setRecurringForm] = useState({
    incomeAmount: '',
    incomeSource: 'Salary',
    budgetAmount: '',
    dayOfMonth: 1,
    startDate: new Date().toISOString().split('T')[0],
    indefinite: true,
    endDate: '',
  });

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const fetchBudgets = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/budgets', { params: { month, year } });
      if (res.success) {
        setBudgets(res.data.budgets || []);
        setTotalOverallSpent(res.data.totalOverallSpent || 0);
      }
    } catch (err) {
      console.error('Failed to load budgets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecurringPlan = async () => {
    setIsRecurringLoading(true);
    try {
      const res = await api.get('/recurring');
      if (res.success && res.data) {
        setRecurringPlan(res.data.plan || null);
        setIsAppliedThisMonth(Boolean(res.data.isAppliedThisMonth));
      }
    } catch (err) {
      console.error('Failed to load recurring plan:', err);
    } finally {
      setIsRecurringLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
    fetchRecurringPlan();
  }, []);

  const [syncWithRecurring, setSyncWithRecurring] = useState(false);

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!formLimit || Number(formLimit) <= 0) return;

    try {
      await api.post('/budgets', {
        month,
        year,
        category: formCategory,
        limitAmount: Number(formLimit),
      });

      if (formCategory === 'Overall' && syncWithRecurring && recurringPlan) {
        await api.post('/recurring', {
          incomeAmount: recurringPlan.incomeAmount,
          incomeSource: recurringPlan.incomeSource || 'Salary',
          budgetAmount: Number(formLimit),
          dayOfMonth: recurringPlan.dayOfMonth,
          startDate: recurringPlan.startDate,
          endDate: recurringPlan.endDate,
          isActive: recurringPlan.isActive,
        });
        await fetchRecurringPlan();
      }

      setIsModalOpen(false);
      setFormLimit('');
      setSyncWithRecurring(false);
      fetchBudgets();
    } catch (err) {
      alert(`Error saving budget: ${err.message}`);
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Delete this budget limit?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      fetchBudgets();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Open Recurring Setup Modal (New or Edit)
  const openRecurringModal = () => {
    if (recurringPlan) {
      setRecurringForm({
        incomeAmount: recurringPlan.incomeAmount || '',
        incomeSource: recurringPlan.incomeSource || 'Salary',
        budgetAmount: recurringPlan.budgetAmount || '',
        dayOfMonth: recurringPlan.dayOfMonth || 1,
        startDate: recurringPlan.startDate ? new Date(recurringPlan.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        indefinite: !recurringPlan.endDate,
        endDate: recurringPlan.endDate ? new Date(recurringPlan.endDate).toISOString().split('T')[0] : '',
      });
    } else {
      setRecurringForm({
        incomeAmount: '',
        incomeSource: 'Salary',
        budgetAmount: '',
        dayOfMonth: 1,
        startDate: new Date().toISOString().split('T')[0],
        indefinite: true,
        endDate: '',
      });
    }
    setRecurringFeedback('');
    setIsRecurringModalOpen(true);
  };

  // Save Recurring Setup (Create or Update)
  const handleSaveRecurring = async (e) => {
    e.preventDefault();
    if (!recurringForm.incomeAmount || Number(recurringForm.incomeAmount) <= 0) {
      setRecurringFeedback('Please provide a valid salary amount.');
      return;
    }
    if (!recurringForm.budgetAmount || Number(recurringForm.budgetAmount) <= 0) {
      setRecurringFeedback('Please provide a valid monthly budget amount.');
      return;
    }

    setIsRecurringSubmitting(true);
    setRecurringFeedback('');

    try {
      const payload = {
        incomeAmount: Number(recurringForm.incomeAmount),
        incomeSource: recurringForm.incomeSource.trim() || 'Salary',
        budgetAmount: Number(recurringForm.budgetAmount),
        dayOfMonth: Number(recurringForm.dayOfMonth),
        startDate: recurringForm.startDate,
        endDate: recurringForm.indefinite ? null : (recurringForm.endDate || null),
        isActive: true,
      };

      const res = await api.post('/recurring', payload);
      if (res.success) {
        setIsRecurringModalOpen(false);
        await Promise.all([fetchRecurringPlan(), fetchBudgets()]);
      }
    } catch (err) {
      setRecurringFeedback(err.message || 'Failed to save recurring plan.');
    } finally {
      setIsRecurringSubmitting(false);
    }
  };

  // Toggle Active / Pause State
  const handleToggleRecurring = async () => {
    if (!recurringPlan) return;
    try {
      const res = await api.patch('/recurring/toggle');
      if (res.success) {
        await Promise.all([fetchRecurringPlan(), fetchBudgets()]);
      }
    } catch (err) {
      alert(`Could not toggle recurring setup: ${err.message}`);
    }
  };

  // Delete Recurring Setup
  const handleDeleteRecurring = async () => {
    if (!window.confirm('Are you sure you want to remove your recurring monthly income & budget setup? Existing transactions and budgets will remain intact.')) {
      return;
    }
    try {
      const res = await api.delete('/recurring');
      if (res.success) {
        setRecurringPlan(null);
        setIsAppliedThisMonth(false);
      }
    } catch (err) {
      alert(`Could not delete recurring setup: ${err.message}`);
    }
  };

  // Manual Trigger / Sync for Current Month
  const handleTriggerNow = async () => {
    try {
      const res = await api.post('/recurring/trigger-now');
      if (res.success) {
        alert(res.message);
        await Promise.all([fetchRecurringPlan(), fetchBudgets()]);
      }
    } catch (err) {
      alert(`Could not sync: ${err.message}`);
    }
  };

  return (
    <div className="ef-page-container">
      {/* Top Header */}
      <div className="ef-page-head">
        <div>
          <h2 className="ef-page-title">Budgets</h2>
          <p className="ef-page-subtitle">Set monthly spending limits, automate recurring income & budgets, and track threshold alerts.</p>
        </div>
        <div className="ef-page-actions">
          <Button variant="primary" size="md" icon={Plus} onClick={() => setIsModalOpen(true)}>
            Set Category Budget
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RECURRING MONTHLY INCOME & BUDGET PANEL */}
      {/* ------------------------------------------------------------- */}
      <section className="surface-card ef-recurring-section">
        <div className="ef-recurring-head">
          <div className="ef-recurring-title-wrap">
            <div className="ef-recurring-icon">
              <Repeat size={20} />
            </div>
            <div>
              <div className="ef-recurring-title-row">
                <h3 className="ef-recurring-title">Recurring Monthly Income & Budget</h3>
                {recurringPlan && (
                  <Badge variant={recurringPlan.isActive ? 'success' : 'neutral'} size="sm">
                    {recurringPlan.isActive ? 'Active' : 'Paused'}
                  </Badge>
                )}
                {recurringPlan && isAppliedThisMonth && (
                  <Badge variant="info" size="sm">
                    <CheckCircle2 size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Applied for {now.toLocaleString('default', { month: 'short' })}
                  </Badge>
                )}
              </div>
              <p className="ef-recurring-desc">
                Automatically adds fixed salary and allocates your recurring monthly budget on your chosen day.
              </p>
            </div>
          </div>

          <div className="ef-recurring-top-actions">
            {recurringPlan ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={recurringPlan.isActive ? Pause : Play}
                  onClick={handleToggleRecurring}
                  title={recurringPlan.isActive ? 'Pause automated monthly runs' : 'Resume automated monthly runs'}
                >
                  {recurringPlan.isActive ? 'Pause' : 'Resume'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={RefreshCw}
                  onClick={handleTriggerNow}
                  title="Run or verify for the current month immediately"
                >
                  Sync Now
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Edit3}
                  onClick={openRecurringModal}
                >
                  Edit Setup
                </Button>
                <button
                  type="button"
                  className="ef-action-btn ef-action-btn--danger"
                  onClick={handleDeleteRecurring}
                  title="Delete recurring setup"
                  aria-label="Delete recurring setup"
                >
                  <Trash2 size={16} />
                </button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={openRecurringModal}
              >
                Set Up Recurring
              </Button>
            )}
          </div>
        </div>

        {recurringPlan ? (
          <div className="ef-recurring-details-grid">
            <div className="ef-recurring-detail-item">
              <span className="ef-detail-label">Monthly Salary</span>
              <strong className="ef-detail-value ef-detail-income">
                +{formatAmount(recurringPlan.incomeAmount)}
              </strong>
              <span className="ef-detail-sub">{recurringPlan.incomeSource || 'Salary'}</span>
            </div>

            <div className="ef-recurring-detail-item">
              <span className="ef-detail-label">Monthly Budget</span>
              <strong className="ef-detail-value">
                {formatAmount(recurringPlan.budgetAmount)}
              </strong>
              <span className="ef-detail-sub">Overall Monthly Limit</span>
            </div>

            <div className="ef-recurring-detail-item">
              <span className="ef-detail-label">Scheduled Day</span>
              <strong className="ef-detail-value">
                Day {recurringPlan.dayOfMonth}
              </strong>
              <span className="ef-detail-sub">Of every month</span>
            </div>

            <div className="ef-recurring-detail-item">
              <span className="ef-detail-label">Plan Duration</span>
              <strong className="ef-detail-value" style={{ fontSize: '14px' }}>
                {recurringPlan.endDate
                  ? `Until ${new Date(recurringPlan.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
                  : 'Active Indefinitely'}
              </strong>
              <span className="ef-detail-sub">
                Started {new Date(recurringPlan.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        ) : (
          <div className="ef-recurring-empty-state">
            <Sparkles size={24} className="text-primary" />
            <div className="ef-recurring-empty-content">
              <strong>Automate your fixed monthly finances</strong>
              <p>
                Receive a regular salary on the 1st or another day of the month? Set it up once, and ExpenseFlow will automatically log your income and create your monthly budget every single month.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* BUDGETS LIST GRID */}
      {/* ------------------------------------------------------------- */}
      <div className="ef-section-divider">
        <h3 className="ef-section-title">Current Month Budgets ({now.toLocaleString('default', { month: 'long' })} {year})</h3>
      </div>

      {isLoading ? (
        <div className="ef-table-loading">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <div className="surface-card ef-empty-budgets-card">
          <PieChart size={36} className="text-muted" />
          <h4>No budgets set for this month yet</h4>
          <p>Create a category budget above or configure a recurring monthly budget to keep spending in check.</p>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
            Create First Budget
          </Button>
        </div>
      ) : (
        <div className="ef-budgets-grid">
          {budgets.map((b) => (
            <div key={b._id} className="surface-card ef-budget-card">
              <div className="ef-bcard-head">
                <div>
                  <h3 className="ef-bcard-title">{b.category}</h3>
                  <span className="ef-bcard-meta">Monthly Limit</span>
                </div>
                <Badge
                  variant={b.status === 'exceeded' ? 'danger' : b.status === 'warning' ? 'warning' : 'success'}
                  size="sm"
                >
                  {b.percentage}% Consumed
                </Badge>
              </div>

              <div className="ef-bcard-amounts">
                <div className="ef-bcard-spent">
                  <span>Spent</span>
                  <strong>{formatAmount(b.spent)}</strong>
                </div>
                <div className="ef-bcard-limit">
                  <span>Limit</span>
                  <strong>{formatAmount(b.limitAmount)}</strong>
                </div>
              </div>

              <div className="ef-budget-track">
                <div
                  className={`ef-budget-fill ${b.status === 'exceeded' ? 'ef-budget-fill--exceeded' : b.status === 'warning' ? 'ef-budget-fill--warning' : ''}`}
                  style={{ width: `${Math.min(100, b.percentage)}%` }}
                />
              </div>

              <div className="ef-bcard-footer">
                <span>
                  {b.isExceeded
                    ? `Exceeded by ${formatAmount(b.spent - b.limitAmount)}`
                    : `${formatAmount(b.remaining)} remaining`}
                </span>
                <button
                  type="button"
                  className="ef-action-btn ef-action-btn--danger"
                  onClick={() => handleDeleteBudget(b._id)}
                  title="Delete budget"
                  aria-label={`Delete ${b.category} budget`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SET SINGLE BUDGET MODAL */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Set Category Monthly Budget"
      >
        <form className="ef-quick-add-form" onSubmit={handleSaveBudget}>
          <div className="ef-input-group">
            <label className="ef-input-label">Category</label>
            <select
              className="ef-select-field"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
            >
              <option value="Overall">Overall Monthly Budget</option>
              <option value="Food">Food & Dining</option>
              <option value="Transport">Transportation</option>
              <option value="Rent">Rent & Housing</option>
              <option value="Bills">Bills & Utilities</option>
              <option value="Shopping">Shopping</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Education">Education</option>
              <option value="Healthcare">Healthcare</option>
            </select>
          </div>

          <Input
            label="Monthly Limit Amount"
            type="number"
            placeholder="e.g. 5000"
            value={formLimit}
            onChange={(e) => setFormLimit(e.target.value)}
            required
            autoFocus
          />

          {formCategory === 'Overall' && recurringPlan && (
            <div style={{ margin: '8px 0 14px' }}>
              <label className="ef-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={syncWithRecurring}
                  onChange={(e) => setSyncWithRecurring(e.target.checked)}
                />
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Also update recurring monthly schedule limit ({formatAmount(recurringPlan.budgetAmount)}) to match
                </span>
              </label>
            </div>
          )}

          <div className="ef-modal-actions">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Budget Limit
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* RECURRING SETUP MODAL */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        title={recurringPlan ? 'Edit Recurring Income & Budget' : 'Configure Recurring Monthly Setup'}
      >
        <form className="ef-quick-add-form" onSubmit={handleSaveRecurring}>
          {recurringFeedback && (
            <div className="ef-auth-alert ef-auth-alert--error" style={{ marginBottom: '14px' }}>
              <AlertCircle size={16} />
              <span>{recurringFeedback}</span>
            </div>
          )}

          <div className="ef-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Salary / Income Amount"
              type="number"
              placeholder="e.g. 30000"
              value={recurringForm.incomeAmount}
              onChange={(e) => setRecurringForm((prev) => ({ ...prev, incomeAmount: e.target.value }))}
              required
              autoFocus
            />

            <Input
              label="Income Source Name"
              type="text"
              placeholder="e.g. Salary, Company"
              value={recurringForm.incomeSource}
              onChange={(e) => setRecurringForm((prev) => ({ ...prev, incomeSource: e.target.value }))}
              required
            />
          </div>

          <div className="ef-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Monthly Budget Limit"
              type="number"
              placeholder="e.g. 20000"
              value={recurringForm.budgetAmount}
              onChange={(e) => setRecurringForm((prev) => ({ ...prev, budgetAmount: e.target.value }))}
              required
            />

            <div className="ef-input-group">
              <label className="ef-input-label">Date of Month to Add</label>
              <select
                className="ef-select-field"
                value={recurringForm.dayOfMonth}
                onChange={(e) => setRecurringForm((prev) => ({ ...prev, dayOfMonth: Number(e.target.value) }))}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day === 1 ? '1st of month' : day === 2 ? '2nd of month' : day === 3 ? '3rd of month' : `${day}th of month`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ef-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Start Date"
              type="date"
              value={recurringForm.startDate}
              onChange={(e) => setRecurringForm((prev) => ({ ...prev, startDate: e.target.value }))}
              required
            />

            <div>
              <Input
                label="End Date (Optional)"
                type="date"
                value={recurringForm.endDate}
                onChange={(e) => setRecurringForm((prev) => ({ ...prev, endDate: e.target.value }))}
                disabled={recurringForm.indefinite}
              />
            </div>
          </div>

          <div style={{ margin: '8px 0 16px' }}>
            <label className="ef-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={recurringForm.indefinite}
                onChange={(e) => setRecurringForm((prev) => ({ ...prev, indefinite: e.target.checked, endDate: e.target.checked ? '' : prev.endDate }))}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Keep active indefinitely (no end date)
              </span>
            </label>
          </div>

          <div className="ef-info-banner" style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            💡 <strong>How it works:</strong> Every month on your selected date, ExpenseFlow will automatically add your salary as an income transaction and create your monthly spending limit without duplicate entries.
          </div>

          <div className="ef-modal-actions">
            <Button variant="ghost" onClick={() => setIsRecurringModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isRecurringSubmitting}>
              Save Recurring Setup
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
