import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Wallet, ArrowLeft } from 'lucide-react';
import './AuthLayout.css';

export default function AuthLayout() {
  return (
    <div className="ef-auth-layout">
      <header className="ef-auth-nav">
        <Link to="/" className="ef-auth-nav__brand">
          <div className="ef-brand__icon">
            <Wallet size={20} />
          </div>
          <span className="ef-brand__name">ExpenseFlow</span>
        </Link>

        <Link to="/" className="ef-auth-nav__back">
          <ArrowLeft size={16} />
          <span>Home</span>
        </Link>
      </header>

      <main className="ef-auth-container">
        <div className="ef-auth-form-card">
          <Outlet />
        </div>
      </main>

      <footer className="ef-auth-footer">
        <span>ExpenseFlow — Personal Finance & Expense Tracker</span>
      </footer>
    </div>
  );
}

