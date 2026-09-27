import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const { user, updatePreferences } = useAuth();
  const [currency, setCurrency] = useState(user?.currency || 'INR');

  useEffect(() => {
    if (user?.currency) {
      setCurrency(user.currency);
    }
  }, [user]);

  const changeCurrency = async (newCurrency) => {
    setCurrency(newCurrency);
    if (user) {
      try {
        await updatePreferences({ currency: newCurrency });
      } catch (err) {
        console.error('Failed to sync currency preference:', err);
      }
    }
  };

  const formatAmount = (amount) => {
    const num = Number(amount) || 0;
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${symbol} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, changeCurrency, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
