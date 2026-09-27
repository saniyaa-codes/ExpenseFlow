/**
 * Transaction Validation & Confirmation Helper Utilities
 * Provides consistent validation and prompt generation across Manual & Voice flows.
 */

/**
 * Format date string into human-friendly label (e.g., "Today", "Yesterday", or "12 Sep 2026")
 */
export function formatDateLabel(dateInput) {
  if (!dateInput) return 'Today';

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Today';

  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format currency with symbol (defaults to ₹)
 */
export function formatCurrencyDisplay(amount, currency = 'INR') {
  const num = Number(amount) || 0;
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
  return `${symbol}${num.toLocaleString('en-IN')}`;
}

/**
 * Validate a transaction before saving (amount, type, category, date)
 * Returns { isValid, error, missingField }
 */
export function validateTransaction(tx) {
  if (!tx) {
    return { isValid: false, error: 'Transaction details are missing.', missingField: 'all' };
  }

  // 1. Amount validation
  const numAmount = Number(tx.amount);
  if (tx.amount === undefined || tx.amount === null || tx.amount === '' || isNaN(numAmount)) {
    return {
      isValid: false,
      error: 'Please enter a valid transaction amount.',
      missingField: 'amount',
    };
  }
  if (numAmount <= 0) {
    return {
      isValid: false,
      error: 'Transaction amount must be greater than zero.',
      missingField: 'amount',
    };
  }

  // 2. Type validation
  const type = (tx.type || '').toLowerCase();
  if (type !== 'expense' && type !== 'income') {
    return {
      isValid: false,
      error: 'Transaction type must be either Expense or Income.',
      missingField: 'type',
    };
  }

  // 3. Category validation
  const category = (tx.category || '').trim();
  if (!category) {
    return {
      isValid: false,
      error: 'Please select or specify a category.',
      missingField: 'category',
    };
  }

  // 4. Date validation
  if (tx.date) {
    const parsedDate = new Date(tx.date);
    if (isNaN(parsedDate.getTime())) {
      return {
        isValid: false,
        error: 'Please provide a valid date.',
        missingField: 'date',
      };
    }

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    if (parsedDate > endOfToday) {
      return {
        isValid: false,
        error: 'Future dates are not allowed. Please choose today or an earlier date.',
        missingField: 'date',
      };
    }
  }

  return { isValid: true, error: null, missingField: null };
}

/**
 * Generate standardized confirmation prompt:
 * Example: "Add ₹500 Expense → Food → Today?"
 */
export function formatConfirmationPrompt({ amount, type, category, date, currency = 'INR' }) {
  const formattedAmt = formatCurrencyDisplay(amount, currency);
  const typeLabel = (type || 'expense').toLowerCase() === 'income' ? 'Income' : 'Expense';
  const catLabel = category || 'General';
  const dateLabel = formatDateLabel(date);

  return `Add ${formattedAmt} ${typeLabel} → ${catLabel} → ${dateLabel}?`;
}
