import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Download,
  Mic,
} from 'lucide-react';
import api, { downloadTransactionsCSV } from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import TransactionConfirmModal from '../../components/common/TransactionConfirmModal';
import { validateTransaction } from '../../utils/transactionValidation';
import { handleTransactionBudgetAlerts } from '../../utils/mobileNotification';
import './Transactions.css';

export default function Transactions() {
  const { formatAmount, currency } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal State
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

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/transactions', { params });
      if (res.success) {
        setTransactions(res.data.transactions || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    const handleTxUpdate = () => fetchTransactions();
    window.addEventListener('transaction-updated', handleTxUpdate);
    return () => window.removeEventListener('transaction-updated', handleTxUpdate);
  }, [typeFilter, categoryFilter, search]);

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
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      merchantOrSource: tx.merchantOrSource || '',
      paymentMethod: tx.paymentMethod || 'UPI',
      date: new Date(tx.date).toISOString().split('T')[0],
      notes: tx.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchTransactions();
      window.dispatchEvent(new CustomEvent('transaction-deleted'));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
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
      fetchTransactions();
      window.dispatchEvent(new CustomEvent('transaction-updated'));
      setSuccessMessage(editingId ? 'Transaction updated successfully!' : 'Transaction added successfully!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setFormError(err.message || 'Save failed.');
      setIsConfirmOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await downloadTransactionsCSV();
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="ef-page-container">
      {/* Top Header */}
      <div className="ef-page-head">
        <div>
          <h2 className="ef-page-title">Transactions</h2>
          <p className="ef-page-subtitle">Track, filter, and organize all financial records.</p>
        </div>
        <div className="ef-head-actions">
          <Button
            variant="outline"
            size="md"
            icon={Mic}
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: { voice: true } }))}
            title="Log transaction using voice speech"
          >
            Voice Entry
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={Download}
            onClick={handleExportCSV}
            isLoading={isExporting}
          >
            Export CSV
          </Button>
          <Button variant="primary" size="md" icon={Plus} onClick={handleOpenAdd}>
            Add Transaction
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="ef-auth-alert ef-auth-alert--success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="surface-card ef-filter-bar">
        <div className="ef-search-box">
          <Search size={18} className="ef-search-icon" />
          <input
            type="text"
            placeholder="Search by merchant, notes, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ef-search-input"
          />
        </div>

        <div className="ef-filter-group">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="ef-filter-select"
          >
            <option value="">All Types</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Income Only</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="ef-filter-select"
          >
            <option value="">All Categories</option>
            <option value="Food">Food & Dining</option>
            <option value="Transport">Transportation</option>
            <option value="Rent">Rent & Housing</option>
            <option value="Bills">Bills & Utilities</option>
            <option value="Shopping">Shopping</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Salary">Salary</option>
            <option value="Freelancing">Freelancing</option>
            <option value="Investment">Investment</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="surface-card ef-table-card">
        {isLoading ? (
          <div className="ef-table-loading">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="ef-empty-state">
            <p>No transactions match your search criteria.</p>
            <Button size="sm" variant="outline" onClick={handleOpenAdd}>
              Add Transaction
            </Button>
          </div>
        ) : (
          <div className="ef-table-responsive">
            <table className="ef-data-table">
              <thead>
                <tr>
                  <th className="ef-col-date">Date</th>
                  <th className="ef-col-desc">Description / Merchant</th>
                  <th className="ef-col-category">Category</th>
                  <th className="ef-col-method">Payment Method</th>
                  <th className="ef-col-amount" style={{ textAlign: 'right' }}>Amount</th>
                  <th className="ef-col-actions" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td className="ef-col-date">
                      {new Date(tx.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="ef-col-desc">
                      <strong>{tx.merchantOrSource || tx.category}</strong>
                      {tx.notes && <span className="ef-td-notes">{tx.notes}</span>}
                    </td>
                    <td className="ef-col-category">
                      <Badge variant="neutral" size="sm">
                        {tx.category}
                      </Badge>
                    </td>
                    <td className="ef-col-method">{tx.paymentMethod}</td>
                    <td className={`ef-col-amount ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)}
                    </td>
                    <td className="ef-col-actions">
                      <div className="ef-row-actions">
                        <button
                          type="button"
                          className="ef-action-btn"
                          onClick={() => handleOpenEdit(tx)}
                          title="Edit transaction"
                          aria-label="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="ef-action-btn ef-action-btn--danger"
                          onClick={() => handleDelete(tx._id)}
                          title="Delete transaction"
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

      {/* Add / Edit Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Transaction' : 'Add Transaction'}
      >
        <form className="ef-quick-add-form" onSubmit={handleSubmit}>
          <div className="ef-type-toggle">
            <button
              type="button"
              className={`ef-toggle-btn ${formData.type === 'expense' ? 'ef-toggle-btn--expense' : ''}`}
              onClick={() => setFormData({ ...formData, type: 'expense' })}
            >
              Expense
            </button>
            <button
              type="button"
              className={`ef-toggle-btn ${formData.type === 'income' ? 'ef-toggle-btn--income' : ''}`}
              onClick={() => setFormData({ ...formData, type: 'income' })}
            >
              Income
            </button>
          </div>

          <Input
            label="Amount"
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
              {formData.type === 'expense' ? (
                <>
                  <option value="Food">Food & Dining</option>
                  <option value="Transport">Transportation</option>
                  <option value="Rent">Rent & Housing</option>
                  <option value="Bills">Bills & Utilities</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Education">Education</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Other">Other</option>
                </>
              ) : (
                <>
                  <option value="Salary">Salary</option>
                  <option value="Freelancing">Freelancing</option>
                  <option value="Investment">Investment</option>
                  <option value="Stipend">Stipend</option>
                  <option value="Gift">Gift</option>
                  <option value="Other">Other</option>
                </>
              )}
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
            label={formData.type === 'expense' ? 'Merchant / Description' : 'Source / Description'}
            type="text"
            placeholder="e.g. Supermarket / TechCorp"
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
            label="Notes (Optional)"
            type="text"
            placeholder="Additional details..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          {formError && (
            <div className="ef-auth-alert ef-auth-alert--error" style={{ marginBottom: '12px' }}>
              <span>{formError}</span>
            </div>
          )}

          <div className="ef-modal-actions">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingId ? 'Update Transaction' : 'Save Transaction'}
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
