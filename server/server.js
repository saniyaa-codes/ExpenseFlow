import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import apiRouter from './routes/api.js';
import AppError from './utils/appError.js';
import globalErrorHandler from './middleware/errorMiddleware.js';
import { processAllDueRecurringPlans } from './services/recurringService.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB().then(() => {
  // Check and apply recurring financial setups on startup
  processAllDueRecurringPlans().catch((err) => {
    console.error('[Recurring Scheduler Startup Error]:', err.message);
  });
});

const app = express();

// Security HTTP Headers (configured for cross-origin and SPA compatibility)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Prepare allowed origins for CORS
const configuredClientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim())
  : [];

// Enable Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin) ||
        configuredClientUrls.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser with 10kb limit
app.use(express.json({ limit: '10kb' }));

// Cookie parser for HTTP-only session cookies
app.use(cookieParser());

// NoSQL query injection protection
app.use(mongoSanitize());

// Health check endpoint
app.get('/api/health-check', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    service: 'ExpenseFlow Core REST API',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Mount Master API Router
app.use('/api', apiRouter);

// Serve static frontend in unified production deployment if client/dist exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 Handler for Unhandled Routes
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server.`, 404));
});

// Centralized Error Handling Middleware
app.use(globalErrorHandler);

// Recurring Background Scheduler (Runs every hour to process due recurring monthly plans)
const RECURRING_INTERVAL_MS = 60 * 60 * 1000;
setInterval(() => {
  processAllDueRecurringPlans();
}, RECURRING_INTERVAL_MS);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ExpenseFlow API] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT} (0.0.0.0)`);
});
