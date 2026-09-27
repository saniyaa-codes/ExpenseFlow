import React, { useState, useEffect } from 'react';
import { Plus, Target, Calendar, DollarSign, CheckCircle2, Trash2, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import './SavingsGoals.css';

export default function SavingsGoals() {
  const { formatAmount } = useCurrency();
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Goal Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    category: 'General',
    color: '#2563EB',
  });

  // Deposit Modal State
  const [depositGoal, setDepositGoal] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/goals');
      if (res.success) {
        setGoals(res.data.goals || []);
      }
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.targetAmount || !createForm.deadline) return;

    try {
      await api.post('/goals', createForm);
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        targetAmount: '',
        currentAmount: '',
        deadline: '',
        category: 'General',
        color: '#2563EB',
      });
      fetchGoals();
    } catch (err) {
      alert(`Error creating goal: ${err.message}`);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0 || !depositGoal) return;

    try {
      await api.post(`/goals/${depositGoal._id}/contribute`, { amount: Number(depositAmount) });
      setDepositGoal(null);
      setDepositAmount('');
      fetchGoals();
    } catch (err) {
      alert(`Deposit failed: ${err.message}`);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      fetchGoals();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="ef-page-container">
      <div className="ef-page-head">
        <div>
          <h2 className="ef-page-title">Savings Goals</h2>
          <p className="ef-page-subtitle">Define targets, monitor velocity, and reach milestones.</p>
        </div>
        <Button variant="primary" size="md" icon={Plus} onClick={() => setIsCreateOpen(true)}>
          Create Savings Goal
        </Button>
      </div>

      {isLoading ? (
        <div className="ef-table-loading">Loading savings goals...</div>
      ) : goals.length === 0 ? (
        <div className="surface-card ef-empty-state" style={{ padding: '48px 24px' }}>
          <Target size={36} className="text-accent" />
          <h3>No Savings Goals Yet</h3>
          <p>Create a milestone goal (like Emergency Fund, Vacation, or Tech) to track progress.</p>
          <Button size="md" variant="primary" onClick={() => setIsCreateOpen(true)}>
            Create First Goal
          </Button>
        </div>
      ) : (
        <div className="ef-goals-grid">
          {goals.map((g) => (
            <div key={g._id} className="surface-card ef-goal-card">
              <div className="ef-gcard-top">
                <div>
                  <h3 className="ef-gcard-title">{g.name}</h3>
                  <span className="ef-gcard-category">{g.category}</span>
                </div>
                <Badge variant={g.isCompleted ? 'success' : 'accent'} size="sm">
                  {g.isCompleted ? 'Completed 🎉' : `${g.progress}%`}
                </Badge>
              </div>

              <div className="ef-gcard-amounts">
                <div>
                  <span>Saved</span>
                  <strong>{formatAmount(g.currentAmount)}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span>Target</span>
                  <strong>{formatAmount(g.targetAmount)}</strong>
                </div>
              </div>

              <div className="ef-goal-track">
                <div
                  className="ef-goal-fill"
                  style={{
                    width: `${g.progress}%`,
                    backgroundColor: g.color || 'var(--color-accent)',
                  }}
                />
              </div>

              <div className="ef-gcard-meta-box">
                <div className="ef-gmeta-row">
                  <span>Target Date:</span>
                  <strong>
                    {new Date(g.deadline).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                </div>
                {!g.isCompleted && (
                  <div className="ef-gmeta-row">
                    <span>Required Velocity:</span>
                    <strong className="text-accent">{formatAmount(g.requiredMonthlySavings)} / month</strong>
                  </div>
                )}
              </div>

              <div className="ef-gcard-actions">
                {!g.isCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={ArrowUpRight}
                    onClick={() => setDepositGoal(g)}
                  >
                    Deposit Funds
                  </Button>
                )}
                <button
                  type="button"
                  className="ef-action-btn ef-action-btn--danger"
                  onClick={() => handleDeleteGoal(g._id)}
                  title="Delete goal"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Goal Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Savings Goal"
      >
        <form className="ef-quick-add-form" onSubmit={handleCreateGoal}>
          <Input
            label="Goal Name"
            type="text"
            placeholder="e.g. New Laptop M3 / Emergency Fund"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            required
            autoFocus
          />

          <Input
            label="Target Amount"
            type="number"
            placeholder="0.00"
            step="0.01"
            value={createForm.targetAmount}
            onChange={(e) => setCreateForm({ ...createForm, targetAmount: e.target.value })}
            required
          />

          <Input
            label="Initial Deposit (Optional)"
            type="number"
            placeholder="0.00"
            value={createForm.currentAmount}
            onChange={(e) => setCreateForm({ ...createForm, currentAmount: e.target.value })}
          />

          <Input
            label="Target Deadline Date"
            type="date"
            value={createForm.deadline}
            onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
            required
          />

          <div className="ef-input-group">
            <label className="ef-input-label">Category</label>
            <select
              className="ef-select-field"
              value={createForm.category}
              onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
            >
              <option value="General">General</option>
              <option value="Technology">Technology</option>
              <option value="Safety">Safety & Emergency</option>
              <option value="Travel">Travel & Vacation</option>
              <option value="Education">Education</option>
              <option value="Vehicle">Vehicle</option>
            </select>
          </div>

          <div className="ef-modal-actions">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deposit Modal */}
      <Modal
        isOpen={Boolean(depositGoal)}
        onClose={() => setDepositGoal(null)}
        title={`Deposit Funds to ${depositGoal?.name}`}
      >
        <form className="ef-quick-add-form" onSubmit={handleDeposit}>
          <Input
            label="Contribution Amount"
            type="number"
            placeholder="0.00"
            step="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            required
            autoFocus
          />

          <div className="ef-modal-actions">
            <Button variant="ghost" onClick={() => setDepositGoal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Deposit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
