import AppError from '../utils/appError.js';

/**
 * Handles invalid MongoDB ObjectId cast errors
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

/**
 * Handles MongoDB duplicate field index errors (E11000)
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue ? err.keyValue[field] : '';
  const message = `Duplicate value '${value}' for field '${field}'. Please use another value.`;
  return new AppError(message, 409);
};

/**
 * Handles Mongoose Schema Validation errors
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handles JWT signature verification errors
 */
const handleJWTError = () =>
  new AppError('Invalid authentication token. Please log in again.', 401);

/**
 * Handles JWT expiration errors
 */
const handleJWTExpiredError = () =>
  new AppError('Your session has expired. Please log in again.', 401);

/**
 * Development Error Response (Includes full stack traces)
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

/**
 * Production Error Response (Sanitized, masks internal leaks)
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send clean message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  } else {
    // 2) Programming or other unknown error: don't leak details
    console.error('[CRITICAL ERROR]', err);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong on our end. Please try again later.',
    });
  }
};

/**
 * Global Express Error Handling Middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message || 'Something went wrong. Please try again.';
  error.name = err.name;
  error.statusCode = err.statusCode || 500;
  error.status = err.status || 'error';

  // Handle common database / security exceptions cleanly
  if (error.name === 'CastError' || err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (error.name === 'ValidationError' || err.name === 'ValidationError') error = handleValidationErrorDB(err);
  if (error.name === 'JsonWebTokenError' || err.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError' || err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // Log full error stack internally in server logs for developer debugging
  if (error.statusCode >= 500) {
    console.error('[Server Internal Error]', err);
  }

  // Always return clean, human-friendly JSON
  res.status(error.statusCode).json({
    success: false,
    status: error.status,
    message: error.message || 'Something went wrong. Please try again.',
  });
};

export default globalErrorHandler;
