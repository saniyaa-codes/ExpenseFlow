import jwt from 'jsonwebtoken';

/**
 * Signs a JSON Web Token for user identity
 *
 * @param {string} id - MongoDB User ObjectId
 * @returns {string} Signed JWT
 */
export const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'expenseflow_dev_super_secret_jwt_key_2026_secure_32chars!', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Creates signed JWT, sets secure HTTP-only cookie, and dispatches JSON response
 *
 * @param {Object} user - Mongoose User document
 * @param {number} statusCode - HTTP status code
 * @param {Object} req - Express Request
 * @param {Object} res - Express Response
 * @param {string} message - Response message
 */
export const createSendToken = (user, statusCode, req, res, message = 'Success') => {
  const token = signToken(user._id);

  const cookieExpiresDays = parseInt(process.env.COOKIE_EXPIRES_IN_DAYS || '7', 10);
  const cookieOptions = {
    expires: new Date(Date.now() + cookieExpiresDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production',
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from response payload for security
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    message,
    token, // Provided for headless testing / headers
    data: {
      user,
    },
  });
};
