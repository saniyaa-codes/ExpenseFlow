import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import api from '../../services/api';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await login(formData.email, formData.password);
      if (res.success && res.data?.user) {
        navigate('/dashboard');
      }
    } catch (err) {
      const errMsg = err.message || 'Invalid email or password.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ef-auth-card-inner">
      <div className="ef-auth-header">
        <h2 className="ef-auth-title">Sign In</h2>
        <p className="ef-auth-subtitle">
          Enter your details below to access your account.
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
          label="Email Address"
          type="email"
          name="email"
          id="login-email"
          placeholder="name@example.com"
          icon={Mail}
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
        />

        <div className="ef-password-input-wrap">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            id="login-password"
            placeholder="••••••••••••"
            icon={Lock}
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
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

        <div className="ef-auth-form-options">
          <label className="ef-checkbox-label">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
            />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password" className="ef-auth-link">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          icon={LogIn}
        >
          Sign In
        </Button>
      </form>

      <div className="ef-auth-card-footer">
        <div className="ef-auth-divider">
          <span>Don't have an account?</span>
        </div>
        <Link to="/register">
          <Button variant="outline" size="md" fullWidth>
            Create an Account
          </Button>
        </Link>
      </div>
    </div>
  );
}

