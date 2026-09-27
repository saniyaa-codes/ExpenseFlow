import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, Search, Trash2, Edit2, Repeat } from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import TransactionConfirmModal from '../../components/common/TransactionConfirmModal';
import { validateTransaction } from '../../utils/transactionValidation';
import '../Transactions/Transactions.css';

export default function Income() {
  const { formatAmount, currency } = useCurrency();
  const [incomes, setIncomes] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [recurringPlan, setRecurringPlan] = useState(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [stagedTx, setStagedTx] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    category: 'Salary',
    merchantOrSource: '',
    paymentMethod: 'Bank Transfer',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchIncome = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/transactions', {
        params: { type: 'income', search: search.trim() || undefined },
      });
      if (res.success) {
        const txs = res.data.transactions || [];
        setIncomes(txs);
        setTotalIncome(txs.reduce((sum, item) => sum + item.amount, 0));
      }
    } catch (err) {
      console.error('Failed to load income:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecurring = async () => {
    try {
      const res = await api.get('/recurring');
      if (res.success && res.data?.plan) {
        setRecurringPlan(res.data.plan);
      }
    } catch (err) {
      // Non-critical, ignore
    }
  };

  useEffect(() => {
    fetchIncome();
    fetchRecurring();

    const handleTxUpdate = () => {
      fetchIncome();
      fetchRecurring();
    };
    window.addEventListener('transaction-updated', handleTxUpdate);
    return () => window.removeEventListener('transaction-updated', handleTxUpdate);
  }, [search]);

  const [formError, setFormError] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormError('');
    setFormData({
      type: 'income',
      amount: '',
      category: 'Salary',
      merchantOrSource: '',
      paymentMethod: 'Bank Transfer',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx) => {
    setEditingId(tx._id);
    setFormError('');
    setFormData({
      type: 'income',
      amount: tx.amount,
      category: tx.category,
      merchantOrSource: tx.merchantOrSource || '',
      paymentMethod: tx.paymentMethod || 'Bank Transfer',
      date: new Date(tx.date).toISOString().split('T')[0],
      notes: tx.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    const validation = validateTransaction(formData);
    if (!validation.isValid) {
      setFormError(validation.error);
      return;
    }

    setStagedTx({ ...formData });
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!stagedTx) return;
    setIsSaving(true);
    try {
      if (editingId) {
        await api.put(`/transactions/${editingId}`, stagedTx);
      } else {
        await api.post('/transactions', stagedTx);
      }
      setIsConfirmOpen(false);
      setIsModalOpen(false);
      setStagedTx(null);
      fetchIncome();
      window.dispatchEvent(new CustomEvent('transaction-updated'));
      setSuccessMessage(editingId ? 'Income updated successfully!' : 'Income recorded successfully!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setFormError(err.message || 'Error saving income.');
      setIsConfirmOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this income record?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchIncome();
      window.dispatchEvent(new Event('transaction-updated'));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="ef-page-container">
      <div className="ef-page-head">
        <div>
          <h2 className="ef-page-title">Income Sources</h2>
          <p className="ef-page-subtitle">Track recurring salaries, contracts, dividends, and variable earnings.</p>
        </div>
        <Button variant="primary" size="md" icon={Plus} onClick={handleOpenAdd}>
          Add Income
        </Button>
      </div>

      {successMessage && (
        <div className="ef-auth-alert ef-auth-alert--success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{successMessage}</span>
        </div>
      )}

      {recurringPlan && recurringPlan.isActive && (
        <div
          className="surface-card ef-recurring-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            marginBottom: '16px',
            borderRadius: '8px',
            borderLeft: '4px solid var(--color-success)',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Repeat size={20} className="text-income" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>Automated Recurring Salary Active</strong>
                <Badge variant="success" size="sm">Day {recurringPlan.dayOfMonth} Monthly</Badge>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                +{formatAmount(recurringPlan.incomeAmount)} ({recurringPlan.incomeSource}) scheduled automatically every month.
              </p>
            </div>
          </div>
          <Link to="/budgets" style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm" icon={Repeat}>
              Manage Recurring
            </Button>
          </Link>
        </div>
      )}

      <div className="surface-card ef-metric-card">
        <div className="ef-metric-head">
          <span className="ef-metric-label">Total Verified Income</span>
          <TrendingUp size={18} className="text-income" />
        </div>
        <div className="ef-metric-val text-income">+{formatAmount(totalIncome)}</div>
      </div>

      <div className="surface-card ef-table-card">
        {isLoading ? (
          <div className="ef-table-loading">Loading income records...</div>
        ) : incomes.length === 0 ? (
          <div className="ef-empty-state">
            <p>No income records logged yet.</p>
            <Button size="sm" variant="outline" onClick={handleOpenAdd}>
              Add First Income
            </Button>
          </div>
        ) : (
          <div className="ef-table-responsive">
            <table className="ef-data-table">
              <thead>
                <tr>
                  <th className="ef-col-date">Date</th>
                  <th className="ef-col-desc">Source / Description</th>
                  <th className="ef-col-category">Category</th>
                  <th className="ef-col-method">Payment Method</th>
                  <th className="ef-col-amount" style={{ textAlign: 'right' }}>Amount</th>
                  <th className="ef-col-actions" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((tx) => (
                  <tr key={tx._id}>
                    <td className="ef-col-date">
                      {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="ef-col-desc">
                      <strong>{tx.merchantOrSource || tx.category}</strong>
                      {tx.notes && <span className="ef-td-notes">{tx.notes}</span>}
                    </td>
                    <td className="ef-col-category"><Badge variant="success" size="sm">{tx.category}</Badge></td>
                    <td className="ef-col-method">{tx.paymentMethod}</td>
                    <td className="ef-col-amount text-income">+{formatAmount(tx.amount)}</td>
                    <td className="ef-col-actions">
                      <div className="ef-row-actions">
                        <button
                          type="button"
                          className="ef-action-btn"
                          onClick={() => handleOpenEdit(tx)}
                          title="Edit income"
                          aria-label="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="ef-action-btn ef-action-btn--danger"
                          onClick={() => handleDelete(tx._id)}
                          title="Delete income"
                          aria-label="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Income Record' : 'Log Income Source'}
      >
        <form className="ef-quick-add-form" onSubmit={handleSubmit}>
          <Input
            label="Income Amount"
            type="number"
            placeholder="0.00"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            autoFocus
          />
          <div className="ef-input-group">
            <label className="ef-input-label">Income Category</label>
            <select
              className="ef-select-field"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Salary">Salary</option>
              <option value="Freelancing">Freelancing</option>
              <option value="Investment">Investment / Dividend</option>
              <option value="Stipend">Stipend</option>
              <option value="Gift">Gift</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="ef-input-group">
            <label className="ef-input-label">Payment Method</label>
            <select
              className="ef-select-field"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
              <option value="Bank Transfer">Bank Transfer / NEFT</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <Input
            label="Date Received"
            type="date"
            max={new Date().toISOString().split('T')[0]}
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <Input
            label="Source / Company Name"
            type="text"
            placeholder="e.g. TechCorp / Upwork"
            value={formData.merchantOrSource}
            onChange={(e) => setFormData({ ...formData, merchantOrSource: e.target.value })}
          />
          <Input
            label="Optional Notes"
            type="text"
            placeholder="Reference number or description"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          {formError && (
            <div className="ef-auth-alert ef-auth-alert--error" style={{ marginBottom: '12px' }}>
              <span>{formError}</span>
            </div>
          )}
          <div className="ef-modal-actions">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">
              {editingId ? 'Save Changes' : 'Record Income'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Step Modal */}
      <TransactionConfirmModal
        isOpen={isConfirmOpen}
        transaction={stagedTx}
        currency={currency}
        isLoading={isSaving}
        onConfirm={handleConfirmSave}
        onCancel={() => {
          setIsConfirmOpen(false);
          setStagedTx(null);
        }}
      />
    </div>
  );
}
