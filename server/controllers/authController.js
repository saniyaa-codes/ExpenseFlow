import crypto from 'crypto';
import User from '../models/User.js';
import SecurityToken from '../models/SecurityToken.js';
import Notification from '../models/Notification.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { createSendToken } from '../utils/tokenUtils.js';
import { logAuditEvent } from '../services/auditService.js';
import {
  sendWelcomeEmail,
  sendLoginSecurityEmail,
  sendLogoutEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from '../services/emailService.js';

// Strict Real Email Format Validator
const isValidEmailFormat = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();

  // Basic RFC regex structure
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) return false;

  const parts = clean.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;
  if (!localPart || localPart.length < 2) return false;

  // Reject pure numbers as username (e.g. 12345@domain.com)
  if (/^\d+$/.test(localPart)) return false;

  // Domain checks
  const domainParts = domainPart.split('.');
  if (domainParts.length < 2) return false;

  const domainName = domainParts[0];
  const tld = domainParts[domainParts.length - 1];

  if (!domainName || domainName.length < 2) return false;
  if (!tld || tld.length < 2) return false;

  // Reject fake domain bypasses or local test domains
  if (domainPart.endsWith('.local') || domainPart.endsWith('.test') || domainPart.endsWith('.internal')) {
    return false;
  }

  return true;
};

/**
 * Register New User
 * POST /api/auth/register
 */
export const register = catchAsync(async (req, res, next) => {
  const { name, email, password, currency } = req.body;

  if (!name || !email || !password) {
    return next(new AppError('Please provide your name, email, and password.', 400));
  }

  const cleanEmail = email.trim().toLowerCase();

  // Validate strict email format
  if (!isValidEmailFormat(cleanEmail)) {
    return next(new AppError('Please provide a valid, real email address (e.g. name@domain.com).', 400));
  }

  if (password.length < 6) {
    return next(new AppError('Password must be at least 6 characters long.', 400));
  }

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    return next(new AppError('An account with this email address already exists.', 409));
  }

  // Account is immediately active and verified
  const newUser = await User.create({
    name: name.trim(),
    email: cleanEmail,
    password,
    currency: currency || 'INR',
    isVerified: true,
    status: 'Active',
    isActive: true,
    isBlocked: false,
  });

  // Dispatch Welcome Email via Gmail SMTP / Nodemailer in background
  sendWelcomeEmail({ user: newUser }).catch((err) => {
    console.error('[Email Error] Registration welcome email delivery failed:', err.message);
  });

  // Store Welcome Notification in DB
  await Notification.create({
    userId: newUser._id,
    title: 'Welcome to ExpenseFlow',
    message: 'Your account has been created successfully. Welcome to ExpenseFlow!',
    type: 'system',
  });

  await logAuditEvent({
    userId: newUser._id,
    action: 'USER_REGISTERED',
    req,
    status: 'SUCCESS',
    details: { email: newUser.email, currency: newUser.currency },
  });

  // Immediately log in newly registered user with JWT token
  createSendToken(newUser, 201, req, res, 'Registration successful! Welcome to ExpenseFlow.');
});

/**
 * Resend Email Verification Token
 * POST /api/auth/resend-verification
 */
export const resendVerificationEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email || !isValidEmailFormat(email)) {
    return next(new AppError('Please provide a valid registered email address.', 400));
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });

  if (!user) {
    return next(new AppError('No account found with this email address.', 404));
  }

  if (user.isVerified) {
    return res.status(200).json({
      success: true,
      message: 'This email address is already verified. You can log in directly.',
    });
  }

  if (user.status === 'Blocked' || user.isBlocked || !user.isActive) {
    return next(new AppError('Your account is deactivated. Please contact support.', 403));
  }

  // Delete previous verification tokens
  await SecurityToken.deleteMany({ userId: user._id, type: 'EMAIL_VERIFICATION' });

  // Generate new verification token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = SecurityToken.hashToken(rawToken);

  await SecurityToken.create({
    userId: user._id,
    tokenHash,
    type: 'EMAIL_VERIFICATION',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  await sendVerificationEmail({ user, rawToken });

  await logAuditEvent({
    userId: user._id,
    action: 'VERIFICATION_EMAIL_RESENT',
    req,
    status: 'SUCCESS',
  });

  res.status(200).json({
    success: true,
    message: 'A fresh verification email has been sent. Please check your inbox.',
  });
});

/**
 * Verify Email Token
 * POST /api/auth/verify-email/:token
 */
export const verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const tokenHash = SecurityToken.hashToken(token);

  const securityDoc = await SecurityToken.findOne({
    tokenHash,
    type: 'EMAIL_VERIFICATION',
    expiresAt: { $gt: Date.now() },
  });

  if (!securityDoc) {
    return next(new AppError('Verification link is invalid or has expired.', 400));
  }

  const user = await User.findById(securityDoc.userId);
  if (!user) {
    return next(new AppError('User belonging to this verification token no longer exists.', 400));
  }

  user.isVerified = true;
  await user.save({ validateBeforeSave: false });

  // Invalidate Token
  await SecurityToken.findByIdAndDelete(securityDoc._id);

  // Send Verification Success Email
  sendVerificationSuccessEmail({ user }).catch(() => {});

  // Store in-app notification
  await Notification.create({
    userId: user._id,
    title: 'Email Verified',
    message: 'Your email address has been verified successfully.',
    type: 'security',
  });

  await logAuditEvent({
    userId: user._id,
    action: 'EMAIL_VERIFIED',
    req,
    status: 'SUCCESS',
  });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully! You can now log in.',
  });
});

/**
 * Request Password Reset Link
 * POST /api/auth/forgot-password
 */
export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email || !isValidEmailFormat(email)) {
    return next(new AppError('Please provide a valid registered email address.', 400));
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });

  if (user) {
    await SecurityToken.deleteMany({ userId: user._id, type: 'PASSWORD_RESET' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = SecurityToken.hashToken(rawToken);

    await SecurityToken.create({
      userId: user._id,
      tokenHash,
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    let clientOrigin = req.get('origin');
    if (!clientOrigin && req.get('referer')) {
      try {
        clientOrigin = new URL(req.get('referer')).origin;
      } catch (e) {
        clientOrigin = null;
      }
    }

    await sendPasswordResetEmail({ user, rawToken, clientOrigin });

    await Notification.create({
      userId: user._id,
      title: 'Password Reset Requested',
      message: 'A password reset request was initiated for your account.',
      type: 'security',
    });

    await logAuditEvent({
      userId: user._id,
      action: 'PASSWORD_RESET_REQUESTED',
      req,
      status: 'SUCCESS',
    });
  }

  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});

/**
 * Reset Password with Valid Token
 * POST /api/auth/reset-password/:token
 */
export const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return next(new AppError('Password must be at least 6 characters long.', 400));
  }

  const tokenHash = SecurityToken.hashToken(token);

  const securityDoc = await SecurityToken.findOne({
    tokenHash,
    type: 'PASSWORD_RESET',
    expiresAt: { $gt: Date.now() },
  });

  if (!securityDoc) {
    return next(new AppError('Reset link is invalid or has expired.', 400));
  }

  const user = await User.findById(securityDoc.userId);
  if (!user) {
    return next(new AppError('User belonging to this reset link no longer exists.', 400));
  }

  user.password = password;
  user.passwordChangedAt = Date.now() - 1000;
  await user.save();

  await SecurityToken.findByIdAndDelete(securityDoc._id);

  // Send Password Changed Email & in-app notification
  sendPasswordChangedEmail({ user }).catch(() => {});

  await Notification.create({
    userId: user._id,
    title: 'Password Changed',
    message: 'Your account password was updated successfully.',
    type: 'security',
  });

  await logAuditEvent({
    userId: user._id,
    action: 'PASSWORD_RESET_SUCCESS',
    req,
    status: 'SUCCESS',
  });

  createSendToken(user, 200, req, res, 'Password has been updated successfully.');
});

/**
 * Log In User
 * POST /api/auth/login
 */
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide your email address and password.', 400));
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail }).select('+password');

  if (!user) {
    await logAuditEvent({
      action: 'LOGIN_FAILED',
      req,
      status: 'FAILURE',
      details: { emailAttempt: cleanEmail, reason: 'User not found' },
    });
    return next(new AppError('Invalid email or password.', 401));
  }

  // Check if account is deactivated
  if (user.status === 'Blocked' || user.isBlocked || !user.isActive) {
    await logAuditEvent({
      userId: user._id,
      action: 'BLOCKED_LOGIN_ATTEMPT',
      req,
      status: 'FAILURE',
    });
    return next(new AppError('Your account is deactivated. Please contact support.', 403));
  }

  // Verify password
  const isMatch = await user.correctPassword(password, user.password);
  if (!isMatch) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    user.lastFailedLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Detect abnormal suspicious behavior (>= 5 failed attempts)
    if (user.failedLoginAttempts >= 5) {
      await logAuditEvent({
        userId: user._id,
        action: 'EXCESSIVE_FAILED_LOGINS',
        req,
        status: 'WARNING',
        details: { failedAttempts: user.failedLoginAttempts },
      });
    } else {
      await logAuditEvent({
        userId: user._id,
        action: 'LOGIN_FAILED',
        req,
        status: 'FAILURE',
        details: { emailAttempt: cleanEmail },
      });
    }

    return next(new AppError('Invalid email or password.', 401));
  }

  // Reset failed login counter upon successful login
  user.failedLoginAttempts = 0;
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  await logAuditEvent({
    userId: user._id,
    action: 'LOGIN_SUCCESS',
    req,
    status: 'SUCCESS',
  });

  // Send Login Security Email & in-app notification
  sendLoginSecurityEmail({ user, ipAddress: req.ip }).catch(() => {});
  Notification.create({
    userId: user._id,
    title: 'New login',
    message: 'Your ExpenseFlow account was just used to sign in.',
    type: 'security',
  }).catch(() => {});

  createSendToken(user, 200, req, res, 'Logged in successfully.');
});

/**
 * Log Out User
 * POST /api/auth/logout
 */
export const logout = catchAsync(async (req, res, next) => {
  if (req.user) {
    await logAuditEvent({
      userId: req.user._id,
      action: 'LOGOUT_SUCCESS',
      req,
      status: 'SUCCESS',
    });

    // Send Logout notification email and in-app alert in background
    sendLogoutEmail({ user: req.user }).catch(() => {});
    Notification.create({
      userId: req.user._id,
      title: 'Signed out',
      message: 'Your ExpenseFlow session was logged out.',
      type: 'security',
    }).catch(() => {});
  }

  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 500),
    httpOnly: true,
    sameSite: 'strict',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * Get Current Authenticated User Profile
 * GET /api/auth/me
 */
export const getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

/**
 * Update User Preferences
 * PUT /api/auth/preferences
 */
export const updatePreferences = catchAsync(async (req, res, next) => {
  const { currency, notificationPreferences } = req.body;

  const updates = {};
  if (currency && ['INR', 'USD', 'EUR'].includes(currency)) {
    updates.currency = currency;
  }
  if (notificationPreferences) {
    updates.notificationPreferences = {
      ...req.user.notificationPreferences,
      ...notificationPreferences,
    };
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  await logAuditEvent({
    userId: req.user._id,
    action: 'USER_PREFERENCES_UPDATED',
    req,
    status: 'SUCCESS',
    details: updates,
  });

  res.status(200).json({
    success: true,
    message: 'Preferences updated successfully.',
    data: {
      user: updatedUser,
    },
  });
});

/**
 * Update Current User Password
 * PUT /api/auth/update-password
 */
export const updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide both current password and new password.', 400));
  }

  if (newPassword.length < 6) {
    return next(new AppError('New password must be at least 6 characters long.', 400));
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError('Your current password is incorrect.', 401));
  }

  user.password = newPassword;
  user.passwordChangedAt = Date.now() - 1000;
  await user.save();

  // Send security alert
  sendPasswordChangedEmail({ user }).catch(() => {});
  Notification.create({
    userId: user._id,
    title: 'Password Updated',
    message: 'Your account password was successfully updated from settings.',
    type: 'security',
  }).catch(() => {});

  await logAuditEvent({
    userId: user._id,
    action: 'PASSWORD_UPDATED_IN_SETTINGS',
    req,
    status: 'SUCCESS',
  });

  createSendToken(user, 200, req, res, 'Password updated successfully.');
});

