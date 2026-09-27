import React, { useState, useEffect } from 'react';
import { Plus, TrendingDown, Trash2, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import TransactionConfirmModal from '../../components/common/TransactionConfirmModal';
import { validateTransaction } from '../../utils/transactionValidation';
import { handleTransactionBudgetAlerts } from '../../utils/mobileNotification';
import '../Transactions/Transactions.css';

export default function Expenses() {
  const { formatAmount, currency } = useCurrency();
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [stagedTx, setStagedTx] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: 'Food',
    merchantOrSource: '',
    paymentMethod: 'UPI',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/transactions', {
        params: { type: 'expense', category: categoryFilter || undefined },
      });
      if (res.success) {
        const txs = res.data.transactions || [];
        setExpenses(txs);
        setTotalExpenses(txs.reduce((sum, item) => sum + item.amount, 0));
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();

    const handleTxUpdate = () => fetchExpenses();
    window.addEventListener('transaction-updated', handleTxUpdate);
    return () => window.removeEventListener('transaction-updated', handleTxUpdate);
  }, [categoryFilter]);

  const [formError, setFormError] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormError('');
    setFormData({
      type: 'expense',
      amount: '',
      category: 'Food',
      merchantOrSource: '',
      paymentMethod: 'UPI',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx) => {
    setEditingId(tx._id);
    setFormError('');
    setFormData({
      type: 'expense',
      amount: tx.amount,
      category: tx.category,
      merchantOrSource: tx.merchantOrSource || '',
      paymentMethod: tx.paymentMethod || 'UPI',
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
        const res = await api.post('/transactions', stagedTx);
        if (res.data?.budgetAlerts?.length > 0) {
          handleTransactionBudgetAlerts(res.data.budgetAlerts);
        }
      }
      setIsConfirmOpen(false);
      setIsModalOpen(false);
      setStagedTx(null);
      fetchExpenses();
      window.dispatchEvent(new CustomEvent('transaction-updated'));
      setSuccessMessage(editingId ? 'Expense updated successfully!' : 'Expense saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setFormError(err.message || 'Error saving expense.');
      setIsConfirmOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchExpenses();
      window.dispatchEvent(new Event('transaction-updated'));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="ef-page-container">
      <div className="ef-page-head">
        <div>
          <h2 className="ef-page-title">Expenses</h2>
          <p className="ef-page-subtitle">Track outflow across food, housing, bills, shopping, and lifestyle.</p>
        </div>
        <Button variant="primary" size="md" icon={Plus} onClick={handleOpenAdd}>
          Add Expense
        </Button>
      </div>

      {successMessage && (
        <div className="ef-auth-alert ef-auth-alert--success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{successMessage}</span>
        </div>
      )}

      <div className="surface-card ef-metric-card">
        <div className="ef-metric-head">
          <span className="ef-metric-label">Total Outflow</span>
          <TrendingDown size={18} className="text-expense" />
        </div>
        <div className="ef-metric-val text-expense">-{formatAmount(totalExpenses)}</div>
      </div>

      <div className="surface-card ef-filter-bar">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="ef-filter-select"
        >
          <option value="">All Expense Categories</option>
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

      <div className="surface-card ef-table-card">
        {isLoading ? (
          <div className="ef-table-loading">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="ef-empty-state">
            <p>No expenses found in this category.</p>
            <Button size="sm" variant="outline" onClick={handleOpenAdd}>
              Log First Expense
            </Button>
          </div>
        ) : (
          <div className="ef-table-responsive">
            <table className="ef-data-table">
              <thead>
                <tr>
                  <th className="ef-col-date">Date</th>
                  <th className="ef-col-desc">Merchant / Description</th>
                  <th className="ef-col-category">Category</th>
                  <th className="ef-col-method">Payment Method</th>
                  <th className="ef-col-amount" style={{ textAlign: 'right' }}>Amount</th>
                  <th className="ef-col-actions" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((tx) => (
                  <tr key={tx._id}>
                    <td className="ef-col-date">
                      {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="ef-col-desc">
                      <strong>{tx.merchantOrSource || tx.category}</strong>
                      {tx.notes && <span className="ef-td-notes">{tx.notes}</span>}
                    </td>
                    <td className="ef-col-category"><Badge variant="neutral" size="sm">{tx.category}</Badge></td>
                    <td className="ef-col-method">{tx.paymentMethod}</td>
                    <td className="ef-col-amount text-expense">-{formatAmount(tx.amount)}</td>
                    <td className="ef-col-actions">
                      <div className="ef-row-actions">
                        <button
                          type="button"
                          className="ef-action-btn"
                          onClick={() => handleOpenEdit(tx)}
                          title="Edit expense"
                          aria-label="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="ef-action-btn ef-action-btn--danger"
                          onClick={() => handleDelete(tx._id)}
                          title="Delete expense"
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
        title={editingId ? 'Edit Expense Record' : 'Log Expense Outflow'}
      >
        <form className="ef-quick-add-form" onSubmit={handleSubmit}>
          <Input
            label="Expense Amount"
            type="number"
            placeholder="0.00"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            autoFocus
          />
          <div className="ef-input-group">
            <label className="ef-input-label">Category</label>
            <select
              className="ef-select-field"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Food">Food & Dining</option>
              <option value="Transport">Transportation</option>
              <option value="Rent">Rent & Housing</option>
              <option value="Bills">Bills & Utilities</option>
              <option value="Shopping">Shopping</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Education">Education</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <Input
            label="Date"
            type="date"
            max={new Date().toISOString().split('T')[0]}
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <Input
            label="Merchant / Description"
            type="text"
            placeholder="e.g. Supermarket / Amazon"
            value={formData.merchantOrSource}
            onChange={(e) => setFormData({ ...formData, merchantOrSource: e.target.value })}
          />
          <div className="ef-input-group">
            <label className="ef-input-label">Payment Method</label>
            <select
              className="ef-select-field"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
              <option value="UPI">UPI</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
            </select>
          </div>
          <Input
            label="Optional Notes"
            type="text"
            placeholder="e.g. Shared with roommates"
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
              {editingId ? 'Save Changes' : 'Save Expense'}
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
