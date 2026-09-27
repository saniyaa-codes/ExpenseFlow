import rateLimit from 'express-rate-limit';

/**
 * Strict Rate Limiter for Authentication Endpoints
 * Mitigates brute-force credential stuffing and password guessing.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

/**
 * General Rate Limiter for Standard API Routes
 * Protects server resources from denial-of-service and flooding.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many requests from this IP. Please slow down.',
  },
});

/**
 * Rate Limiter for AI and Voice Processing Endpoints
 * Safeguards Google Gemini free-tier quota limits (15 RPM).
 */
export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // Limit to 15 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'fail',
    message: 'AI request limit reached. Please wait a minute before querying ExpenseFlow AI again.',
  },
});
