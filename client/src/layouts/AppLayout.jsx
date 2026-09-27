import React, { useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import {
  Wallet,
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  PieChart,
  Target,
  BarChart3,
  FileText,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import AIChatDrawer from '../components/ai/AIChatDrawer';
import './AppLayout.css';

export default function AppLayout() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { user, logout } = useAuth();
  const { currency, changeCurrency } = useCurrency();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { label: 'Income', path: '/income', icon: TrendingUp },
    { label: 'Expenses', path: '/expenses', icon: TrendingDown },
    { label: 'Budgets', path: '/budgets', icon: PieChart },
    { label: 'Savings Goals', path: '/savings-goals', icon: Target },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const getPageTitle = () => {
    const active = navItems.find((item) => item.path === location.pathname);
    return active ? active.label : 'ExpenseFlow';
  };

  const openAIChat = () => {
    window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: { voice: false } }));
  };

  return (
    <div className="ef-app-layout">
      {/* Sidebar Navigation */}
      <aside className={`ef-sidebar ${isMobileNavOpen ? 'ef-sidebar--open' : ''}`}>
        <div className="ef-sidebar__header">
          <Link to="/dashboard" className="ef-brand">
            <div className="ef-brand__icon">
              <Wallet size={20} />
            </div>
            <span className="ef-brand__name">ExpenseFlow</span>
          </Link>
          <button
            type="button"
            className="ef-sidebar__close-btn"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="ef-sidebar__nav">
          <span className="ef-sidebar__section-title">MAIN MENU</span>
          <ul className="ef-sidebar__list">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `ef-sidebar__link ${isActive ? 'ef-sidebar__link--active' : ''}`
                    }
                    onClick={() => setIsMobileNavOpen(false)}
                  >
                    <Icon size={18} className="ef-sidebar__link-icon" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ef-sidebar__footer">
          <div className="ef-user-profile-strip">
            <div className="ef-user-avatar">
              <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
            </div>
            <div className="ef-user-info">
              <span className="ef-user-name">{user?.name || 'Account'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="ef-sidebar__logout-link"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isMobileNavOpen && (
        <div
          className="ef-sidebar-backdrop"
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main App Container */}
      <div className="ef-app-main">
        {/* Top App Header */}
        <header className="ef-app-header">
          <div className="ef-app-header__left">
            <button
              type="button"
              className="ef-header__menu-btn"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={22} />
            </button>
            <h1 className="ef-header__page-title">{getPageTitle()}</h1>
          </div>

          <div className="ef-app-header__right">
            {/* Dark/Light Mode Toggle */}
            <button
              type="button"
              className="ef-header__icon-btn"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* AI Assistant Quick Trigger */}
            <button
              type="button"
              className="ef-header__icon-btn ef-header__ai-btn"
              onClick={openAIChat}
              title="Open ExpenseFlow AI"
              aria-label="ExpenseFlow AI"
              style={{ color: 'var(--color-accent)' }}
            >
              <Sparkles size={18} />
            </button>

            {/* Currency Selector Pill */}
            <div className="ef-currency-selector">
              {['INR', 'USD', 'EUR'].map((curr) => (
                <button
                  key={curr}
                  type="button"
                  className={`ef-currency-btn ${currency === curr ? 'ef-currency-btn--active' : ''}`}
                  onClick={() => changeCurrency(curr)}
                >
                  {curr === 'INR' ? '₹ INR' : curr === 'USD' ? '$ USD' : '€ EUR'}
                </button>
              ))}
            </div>

            {/* Notification Bell */}
            <Link to="/notifications" className="ef-header__icon-btn" aria-label="Notifications">
              <Bell size={18} />
              <span className="ef-notification-dot" />
            </Link>

            {/* User Avatar / Settings Link */}
            <Link
              to="/settings"
              className="ef-header__avatar-btn"
              aria-label="Settings"
              title={`${user?.name || 'Account'} (Settings)`}
            >
              <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main
          className={`ef-app-content ${location.pathname === '/dashboard' ? 'ef-app-content--fit' : ''}`}
        >
          <div className="container">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ExpenseFlow AI Assistant */}
      <AIChatDrawer />
    </div>
  );
}
