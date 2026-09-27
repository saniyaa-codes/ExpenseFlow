import React, { useState } from 'react';
import {
  User,
  Bell,
  Check,
  Moon,
  Sun,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import './Settings.css';

export default function Settings() {
  const { user, updatePreferences } = useAuth();
  const { currency, changeCurrency } = useCurrency();
  const { toggleTheme, isDark } = useTheme();

  // Notification Preferences State
  const [notificationPrefs, setNotificationPrefs] = useState(
    user?.notificationPreferences || {
      budgetAlerts: true,
      goalMilestones: true,
      emailAlerts: true,
    }
  );
  const [isSavedPrefs, setIsSavedPrefs] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsError, setPrefsError] = useState('');

  const handleTogglePref = (key) => {
    setNotificationPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setIsSavedPrefs(false);
    setPrefsError('');
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    setPrefsError('');
    try {
      await updatePreferences({
        currency,
        notificationPreferences: notificationPrefs,
      });
      setIsSavedPrefs(true);
      setTimeout(() => setIsSavedPrefs(false), 3000);
    } catch (err) {
      setPrefsError(err.response?.data?.message || err.message || 'Failed to save preferences.');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  return (
    <div className="ef-page-container">
      <div className="ef-page-head">
        <div>
          <h2 className="ef-page-title">Settings</h2>
          <p className="ef-page-subtitle">
            Manage your account details, appearance theme, and notification preferences.
          </p>
        </div>
      </div>

      <div className="ef-settings-layout">
        {/* Left Column: Account Information & Appearance */}
        <div className="ef-settings-col">
          {/* Profile Card */}
          <div className="surface-card ef-settings-card">
            <div className="ef-card-header">
              <div className="ef-card-header-title">
                <div className="ef-card-icon-title">
                  <User size={18} className="text-primary" />
                  <h3>Account Profile</h3>
                </div>
                <span className="ef-card-subtitle">Your basic personal details</span>
              </div>
              <Badge variant="success" size="sm">
                Active Account
              </Badge>
            </div>

            <div className="ef-profile-info-list">
              <div className="ef-pinfo-row">
                <span>Full Name</span>
                <strong>{user?.name || 'User'}</strong>
              </div>
              <div className="ef-pinfo-row">
                <span>Email Address</span>
                <strong>{user?.email || ''}</strong>
              </div>
              <div className="ef-pinfo-row">
                <span>Account Status</span>
                <strong>Verified Account</strong>
              </div>
              <div className="ef-pinfo-row">
                <span>Member Since</span>
                <strong>
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Active'}
                </strong>
              </div>
            </div>
          </div>

          {/* Appearance & Currency */}
          <div className="surface-card ef-settings-card">
            <div className="ef-card-header">
              <div className="ef-card-header-title">
                <div className="ef-card-icon-title">
                  {isDark ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
                  <h3>Appearance & Display</h3>
                </div>
                <span className="ef-card-subtitle">Customize theme and currency</span>
              </div>
            </div>

            <div className="ef-appearance-section">
              <div className="ef-appearance-row">
                <div>
                  <strong>Color Theme</strong>
                  <p>Switch between light and dark mode</p>
                </div>
                <button
                  type="button"
                  className="ef-theme-toggle-btn"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                >
                  {isDark ? (
                    <>
                      <Sun size={16} /> Light Mode
                    </>
                  ) : (
                    <>
                      <Moon size={16} /> Dark Mode
                    </>
                  )}
                </button>
              </div>

              <div className="ef-appearance-row ef-currency-picker-row">
                <div>
                  <strong>Display Currency</strong>
                  <p>Choose your default monetary currency</p>
                </div>
                <select
                  className="ef-select-field"
                  value={currency}
                  onChange={(e) => changeCurrency(e.target.value)}
                >
                  <option value="INR">INR (₹) — Indian Rupee</option>
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="EUR">EUR (€) — Euro</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Notification Preferences */}
        <div className="ef-settings-col">
          <div className="surface-card ef-settings-card">
            <div className="ef-card-header">
              <div className="ef-card-header-title">
                <div className="ef-card-icon-title">
                  <Bell size={18} className="text-primary" />
                  <h3>Notifications</h3>
                </div>
                <span className="ef-card-subtitle">Set your email and alert preferences</span>
              </div>
            </div>

            <form onSubmit={handleSavePreferences} className="ef-settings-form">
              <div className="ef-toggles-section">
                <label className="ef-toggle-row">
                  <div>
                    <strong>Budget Alerts</strong>
                    <p>Notify when category spending reaches 80% or 100% of budget.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.budgetAlerts}
                    onChange={() => handleTogglePref('budgetAlerts')}
                  />
                </label>

                <label className="ef-toggle-row">
                  <div>
                    <strong>Savings Goal Alerts</strong>
                    <p>Receive updates when you fund or complete a savings goal.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.goalMilestones}
                    onChange={() => handleTogglePref('goalMilestones')}
                  />
                </label>

                <label className="ef-toggle-row">
                  <div>
                    <strong>Email Notifications</strong>
                    <p>Send real email notifications to your registered address.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.emailAlerts}
                    onChange={() => handleTogglePref('emailAlerts')}
                  />
                </label>
              </div>

              {isSavedPrefs && (
                <div className="ef-auth-alert ef-auth-alert--success">
                  <Check size={16} />
                  <span>Preferences saved successfully!</span>
                </div>
              )}

              {prefsError && (
                <div className="ef-auth-alert ef-auth-alert--error">
                  <AlertCircle size={16} />
                  <span>{prefsError}</span>
                </div>
              )}

              <div className="ef-settings-actions">
                <Button type="submit" variant="primary" size="md" isLoading={isSavingPrefs}>
                  Save Preferences
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
