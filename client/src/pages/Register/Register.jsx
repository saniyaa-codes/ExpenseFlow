import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import './Register.css';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    currency: 'INR',
    agreeTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Real-time password strength analysis
  const passwordCriteria = useMemo(() => {
    const pwd = formData.password;
    return {
      hasLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    };
  }, [formData.password]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordCriteria.hasLength) score += 1;
    if (passwordCriteria.hasUpper) score += 1;
    if (passwordCriteria.hasNumber) score += 1;
    if (passwordCriteria.hasSpecial) score += 1;
    return score;
  }, [passwordCriteria]);

  const getStrengthLabel = () => {
    if (strengthScore === 0) return { label: 'Empty', color: '#D4D4D4' };
    if (strengthScore <= 2) return { label: 'Weak', color: '#EF4444' };
    if (strengthScore === 3) return { label: 'Good', color: '#F59E0B' };
    return { label: 'Strong & Secure', color: '#10B981' };
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const isValidClientEmail = (email) => {
    if (!email) return false;
    const clean = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(clean)) return false;
    const parts = clean.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (local.length < 2 || /^\d+$/.test(local)) return false;
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return false;
    if (domainParts[0].length < 2 || domainParts[domainParts.length - 1].length < 2) return false;
    if (domain.endsWith('.local') || domain.endsWith('.test')) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!isValidClientEmail(formData.email)) {
      setError('Please enter a valid, real email address (e.g. name@domain.com).');
      return;
    }
    if (strengthScore < 3) {
      setError('Please choose a stronger password meeting the requirements.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!formData.agreeTerms) {
      setError('You must agree to the Terms of Service to create an account.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        currency: formData.currency,
      });

      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="ef-auth-card-inner ef-auth-success-card">
        <div className="ef-success-icon-wrap">
          <CheckCircle2 size={48} className="text-success" />
        </div>
        <h2 className="ef-auth-title">Welcome to ExpenseFlow</h2>
        <p className="ef-auth-subtitle">
          Your account has been created successfully. A welcome notification email has been dispatched to <strong>{formData.email}</strong>.
        </p>
        <div className="ef-auth-alert ef-auth-alert--success">
          <Check size={16} />
          <span>Redirecting to your dashboard...</span>
        </div>
        <Link to="/dashboard" style={{ width: '100%', marginTop: '1rem' }}>
          <Button variant="primary" size="lg" fullWidth>
            Go to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="ef-auth-card-inner">
      <div className="ef-auth-header">
        <h2 className="ef-auth-title">Create an account</h2>
        <p className="ef-auth-subtitle">
          Sign up to track your income, expenses, and monthly budgets.
        </p>
      </div>

      {error && (
        <div className="ef-auth-alert ef-auth-alert--error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form className="ef-auth-form" onSubmit={handleSubmit}>
        <Input
          label="Full Name"
          type="text"
          name="name"
          id="reg-name"
          placeholder="e.g. Saif Khan"
          icon={User}
          value={formData.name}
          onChange={handleChange}
          required
        />

        <Input
          label="Email Address"
          type="email"
          name="email"
          id="reg-email"
          placeholder="name@example.com"
          icon={Mail}
          value={formData.email}
          onChange={handleChange}
          required
        />

        <div className="ef-password-input-wrap">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            id="reg-password"
            placeholder="Min. 8 characters"
            icon={Lock}
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            className="ef-password-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Real-Time Password Strength Meter */}
        {formData.password && (
          <div className="ef-strength-meter">
            <div className="ef-strength-header">
              <span className="ef-strength-label">Strength:</span>
              <strong style={{ color: getStrengthLabel().color }}>
                {getStrengthLabel().label}
              </strong>
            </div>

            <div className="ef-strength-bars">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className="ef-strength-bar"
                  style={{
                    backgroundColor: step <= strengthScore ? getStrengthLabel().color : '#E5E5E5',
                  }}
                />
              ))}
            </div>

            <ul className="ef-criteria-list">
              <li className={passwordCriteria.hasLength ? 'valid' : ''}>
                <Check size={12} /> Min 8 characters
              </li>
              <li className={passwordCriteria.hasUpper ? 'valid' : ''}>
                <Check size={12} /> 1 Uppercase letter
              </li>
              <li className={passwordCriteria.hasNumber ? 'valid' : ''}>
                <Check size={12} /> 1 Number
              </li>
              <li className={passwordCriteria.hasSpecial ? 'valid' : ''}>
                <Check size={12} /> 1 Special character
              </li>
            </ul>
          </div>
        )}

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          id="reg-confirm"
          placeholder="Repeat your password"
          icon={Lock}
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />

        <div className="ef-currency-select-group">
          <label htmlFor="reg-currency" className="ef-input-label">Preferred Currency</label>
          <select
            id="reg-currency"
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="ef-select-field"
          >
            <option value="INR">INR (₹) — Indian Rupee</option>
            <option value="USD">USD ($) — US Dollar</option>
            <option value="EUR">EUR (€) — Euro</option>
          </select>
        </div>

        <label className="ef-checkbox-label">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={formData.agreeTerms}
            onChange={handleChange}
          />
          <span>I agree to the Terms of Service and Privacy Policy</span>
        </label>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          icon={UserPlus}
        >
          Create Account
        </Button>
      </form>

      <div className="ef-auth-card-footer">
        <div className="ef-auth-divider">
          <span>Already have an account?</span>
        </div>
        <Link to="/login">
          <Button variant="outline" size="md" fullWidth>
            Sign In Instead
          </Button>
        </Link>
      </div>
    </div>
  );
}
