import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import Button from '../components/common/Button';
import './RootLayout.css';

export default function RootLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className={`ef-root-layout ${isHomePage ? 'ef-root-layout--home' : ''}`}>
      <header className="ef-root-nav">
        <div className="ef-root-nav__inner container">
          <Link to="/" className="ef-brand">
            <div className="ef-brand__icon">
              <Wallet size={20} />
            </div>
            <span className="ef-brand__name">ExpenseFlow</span>
          </Link>

          <div className="ef-nav-actions">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="ef-root-content">
        <Outlet />
      </main>

      <footer className="ef-root-footer ef-root-footer--slim">
        <div className="ef-footer-bottom container">
          <p>© {new Date().getFullYear()} ExpenseFlow · JWT sessions, hashed passwords, private by default</p>
        </div>
      </footer>
    </div>
  );
}
