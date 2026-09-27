import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import User from '../models/User.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Route Protection Middleware
 * Verifies JWT token from HTTP-only cookie or Authorization header,
 * confirms user existence, and verifies password has not been altered after token was issued.
 */
export const protect = catchAsync(async (req, res, next) => {
  let token;

  // 1) Read token from HTTP-Only Cookie or Authorization Bearer header
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please sign in to get access.', 401));
  }

  // 2) Verify JWT signature
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET || 'expenseflow_dev_super_secret_jwt_key_2026_secure_32chars!'
  );

  // 3) Check if user still exists in DB
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this session no longer exists.', 401));
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('Password was recently changed. Please log in again.', 401));
  }

  // 5) Check if user account is deactivated
  if (currentUser.status === 'Blocked' || currentUser.isBlocked || !currentUser.isActive) {
    return next(new AppError('Your account is deactivated. Please contact support.', 403));
  }

  // 6) Grant Access: Attach authenticated user to request
  req.user = currentUser;
  next();
});

/**
 * Email Verification Guard Middleware
 * Ensures user has completed email verification before performing mutations.
 */
export const requireVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return next(
      new AppError('Please verify your email address to access this financial feature.', 403)
    );
  }
  next();
};
