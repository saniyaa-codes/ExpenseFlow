import React from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Badge from './Badge';
import {
  formatConfirmationPrompt,
  formatCurrencyDisplay,
  formatDateLabel,
} from '../../utils/transactionValidation';
import './TransactionConfirmModal.css';

export default function TransactionConfirmModal({
  isOpen,
  transaction,
  currency = 'INR',
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  if (!isOpen || !transaction) return null;

  const isIncome = (transaction.type || '').toLowerCase() === 'income';
  const confirmationPrompt = formatConfirmationPrompt({
    amount: transaction.amount,
    type: transaction.type,
    category: transaction.category,
    date: transaction.date,
    currency,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Confirm Transaction"
      maxWidth="460px"
      footer={
        <div className="ef-confirm-footer">
          <Button
            variant="ghost"
            size="md"
            onClick={onCancel}
            disabled={isLoading}
            id="tx-confirm-cancel-btn"
          >
            Cancel
          </Button>
          <Button
            variant={isIncome ? 'primary' : 'primary'}
            size="md"
            icon={Check}
            onClick={onConfirm}
            isLoading={isLoading}
            id="tx-confirm-save-btn"
          >
            Confirm
          </Button>
        </div>
      }
    >
      <div className="ef-confirm-box">
        <div className="ef-confirm-banner" id="tx-confirm-prompt-text">
          {confirmationPrompt}
        </div>
        <p className="ef-confirm-subtext">
          Please review the details below before saving this transaction.
        </p>
      </div>

      <div className="ef-confirm-details">
        <div className="ef-confirm-row">
          <span className="ef-confirm-label">Type</span>
          <Badge variant={isIncome ? 'income' : 'danger'} size="sm">
            {isIncome ? 'Income' : 'Expense'}
          </Badge>
        </div>

        <div className="ef-confirm-row">
          <span className="ef-confirm-label">Amount</span>
          <span
            className={`ef-confirm-value ef-confirm-amount-large ${
              isIncome ? 'text-income' : 'text-expense'
            }`}
          >
            {isIncome ? '+' : '-'}
            {formatCurrencyDisplay(transaction.amount, currency)}
          </span>
        </div>

        <div className="ef-confirm-row">
          <span className="ef-confirm-label">Category</span>
          <span className="ef-confirm-value">{transaction.category || 'General'}</span>
        </div>

        <div className="ef-confirm-row">
          <span className="ef-confirm-label">Date</span>
          <span className="ef-confirm-value">{formatDateLabel(transaction.date)}</span>
        </div>

        {transaction.merchantOrSource && (
          <div className="ef-confirm-row">
            <span className="ef-confirm-label">
              {isIncome ? 'Source' : 'Merchant'}
            </span>
            <span className="ef-confirm-value">{transaction.merchantOrSource}</span>
          </div>
        )}

        {transaction.paymentMethod && (
          <div className="ef-confirm-row">
            <span className="ef-confirm-label">Payment Method</span>
            <span className="ef-confirm-value">{transaction.paymentMethod}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
