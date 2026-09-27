import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import api from '../../services/api';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await api.post(`/auth/reset-password/${token}`, { password: formData.password });
      setIsSuccess(true);
    } catch (err) {
      setError(err.message || 'Invalid or expired password reset link. Please request a new one.');
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
        <h2 className="ef-auth-title">Password Reset Complete</h2>
        <p className="ef-auth-subtitle">
          Your account password has been updated successfully. You can now sign in with your new credentials.
        </p>

        <Link to="/login" style={{ width: '100%' }}>
          <Button variant="primary" size="lg" fullWidth>
            Sign In with New Password
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="ef-auth-card-inner">
      <div className="ef-auth-header">
        <h2 className="ef-auth-title">Create new password</h2>
        <p className="ef-auth-subtitle">
          Please enter and confirm your new password below.
        </p>
      </div>

      {error && (
        <div className="ef-auth-alert ef-auth-alert--error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form className="ef-auth-form" onSubmit={handleSubmit}>
        <div className="ef-password-input-wrap">
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            id="reset-password"
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

        <Input
          label="Confirm New Password"
          type="password"
          name="confirmPassword"
          id="reset-confirm"
          placeholder="Repeat new password"
          icon={Lock}
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          icon={KeyRound}
        >
          Save New Password
        </Button>
      </form>

      <div className="ef-auth-card-footer">
        <Link to="/login" className="ef-back-to-login">
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  );
}
