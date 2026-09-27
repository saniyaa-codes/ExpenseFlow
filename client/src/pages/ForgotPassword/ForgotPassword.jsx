import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import api from '../../services/api';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setIsSubmitted(true);
    } catch (err) {
      setError(err.message || 'Unable to request password reset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="ef-auth-card-inner ef-auth-success-card">
        <div className="ef-success-icon-wrap">
          <CheckCircle2 size={48} className="text-success" />
        </div>
        <h2 className="ef-auth-title">Check your inbox</h2>
        <p className="ef-auth-subtitle">
          If an account exists for <strong>{email}</strong>, we have sent a secure password reset link.
        </p>

        <div className="ef-auth-alert ef-auth-alert--success">
          <span>Link expires in 15 minutes.</span>
        </div>

        <div className="ef-forgot-actions">
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={() => setIsSubmitted(false)}
          >
            Try another email
          </Button>

          <Link to="/login" className="ef-back-to-login">
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ef-auth-card-inner">
      <div className="ef-auth-header">
        <h2 className="ef-auth-title">Reset your password</h2>
        <p className="ef-auth-subtitle">
          Enter your registered email address and we'll send you a password reset link.
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
          id="forgot-email"
          placeholder="name@example.com"
          icon={Mail}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          icon={Send}
        >
          Send Reset Link
        </Button>
      </form>

      <div className="ef-auth-card-footer">
        <Link to="/login" className="ef-back-to-login">
          <ArrowLeft size={16} />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  );
}
