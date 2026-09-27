# ExpenseFlow — Secure AI-Powered Personal Finance Management System

A production-ready full-stack web application designed for students and young professionals to manage personal cashflow, budget discipline, and savings targets. Built using the **MERN** architecture (MongoDB, Express.js, React.js, Node.js) with native CSS variables, Recharts, and Google Gemini AI conversational grounding.

---

## 1. Project Description

**ExpenseFlow** solves the common problem of fragmented personal budgeting by combining daily income/expense logging, automated recurring monthly salaries and budgets, algorithmic financial health analysis, and conversational AI assistance into a single unified platform. 

The application is built strictly with authentic, real-time database calculations (no mock numbers or fabricated statistics) and incorporates complete client and server validation, secure JWT sessions, rate limiting, and NoSQL query injection protection.

---

## 2. Main Features

- **Executive Financial Dashboard:**
  - Dynamic user greeting and date tracking.
  - Essential metric summary: Current Net Balance, Total Income, Total Expenses, and Savings Rate percentage.
  - AI Spending Prediction and personalized actionable savings tips.
  - Interactive **Income vs. Expense** multi-month comparison bar chart (4, 5, 6-month filters).
  - Current month **Category-Wise Expense Distribution** donut chart.
  - Live budget consumption tracking and active savings goals status.

- **Unified Recurring Salary & Monthly Budget System:**
  - Automated scheduling of recurring monthly earnings (e.g. stipend, salary) on a chosen date (1st–28th).
  - Automatic allocation of the base monthly spending budget upon the scheduled day.
  - Idempotent and duplicate-safe execution across calendar months.
  - Synchronized category budget management with optional one-click syncing to the recurring monthly plan.

- **Complete Transaction Management:**
  - Log, edit, view, and delete both Income and Expense records.
  - Filter transactions by type, category, date range, or free-text search.
  - Pre-submission confirmation step modal to prevent accidental entries.
  - Authenticated CSV export functionality with automatic Bearer token transmission.

- **Category Budget Caps & Threshold Notifications:**
  - Set limits for Food, Transport, Rent, Bills, Shopping, Entertainment, Education, Healthcare, or Overall.
  - Visual color-coded progress bars (Safe <75%, Warning 75–99%, Exceeded 100%+).
  - In-app notification alerts and automated email notifications at 50%, 75%, 90%, and 100% threshold consumption.

- **Milestone-Based Savings Goals:**
  - Set savings targets with custom category labels, colors, and target deadlines.
  - Record progressive deposits with automatic progress and remaining balance computation.

- **Deterministic Financial Health Scoring:**
  - Objective 0–100 algorithm assessing 5 distinct financial pillars: Savings Rate Ratio, Budget Compliance, Emergency Reserve Cushion, Goal Progress Velocity, and Recurring Burden.
  - Clear rating classifications: Excellent, Good, Fair, or Needs Attention with contextual recommendations.

- **ExpenseFlow AI & Voice Assistant:**
  - Natural speech input using the browser Web Speech API.
  - Converts voice commands (e.g., *"I spent 450 on food today"*) into structured proposals with human-in-the-loop confirmation before saving.
  - Conversational Q&A powered by Google Gemini (with instant local intelligent advisor fallback) 100% grounded in real user MongoDB records.

- **Security & Multi-Device Responsiveness:**
  - Argon2/bcrypt password hashing with real-time complexity meter.
  - Cross-device responsive design optimized for mobile, tablet, laptop, and desktop.
  - Toggleable Light and Dark themes with persistent user preferences.
  - Multi-currency support: Indian Rupee (₹ INR), US Dollar ($ USD), and Euro (€ EUR).

---

## 3. Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend UI** | React 19, React Router v7, Lucide Icons, Recharts 3, Vanilla CSS (Design Tokens) |
| **Build Tool** | Vite 8 |
| **Backend API** | Node.js, Express.js (REST API, ES Modules) |
| **Database** | MongoDB (Local Community Edition or MongoDB Atlas), Mongoose ODM |
| **Authentication** | JSON Web Tokens (JWT), HTTP-Only Cookies, bcryptjs |
| **AI Engine** | Google Generative AI SDK (`@google/generative-ai`), Gemini 1.5 Flash + Local Rule Engine |
| **Voice & Speech** | Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) |
| **Email Service** | Nodemailer (Gmail SMTP or development interceptor) |
| **Security & Middleware** | Helmet, CORS, express-rate-limit, express-mongo-sanitize, cookie-parser |

---

## 4. System Architecture

```
[ User Browser / Client ]
           │
           │ HTTP / REST / JSON
           ▼
[ Reverse Proxy / Express Server (Port 5000) ]
   ├── Helmet & CORS Headers
   ├── express-mongo-sanitize (NoSQL Injection Defense)
   ├── express-rate-limit (API Throttling)
   ├── JWT Auth & Cookie Middleware
   │
   ├── /api/auth          --> User registration, login, logout, password reset
   ├── /api/transactions  --> CRUD, pagination, filtering, summary aggregation
   ├── /api/budgets       --> Category caps, spending comparisons, threshold alerts
   ├── /api/recurring     --> Recurring salary deposit & base budget scheduler
   ├── /api/goals         --> Savings milestone management & contributions
   ├── /api/health        --> Algorithmic financial health scoring (0-100)
   ├── /api/ai            --> Gemini 1.5 Flash grounded assistant & voice parser
   ├── /api/notifications --> In-app alert management
   └── /api/reports       --> Monthly summary and CSV streaming
           │
           ├── Mongoose ODM
           ▼
[ MongoDB Database (Database: 'expenseflow') ]
   ├── Users
   ├── Transactions
   ├── Budgets
   ├── RecurringPlans
   ├── SavingsGoals
   ├── Notifications
   └── AuditLogs
```

---

## 5. Folder Structure

```
ExpenseFlow/
├── package.json             # Root workspace script runner
├── .gitignore               # Ignored files (node_modules, .env, dist)
├── .env.example             # Server configuration template
├── README.md                # Project documentation
│
├── client/                  # React Frontend
│   ├── index.html           # HTML5 entry point
│   ├── package.json         # Client dependencies & Vite scripts
│   ├── vite.config.js       # Vite build & proxy configuration
│   ├── .env.example         # Client environment template
│   └── src/
│       ├── main.jsx         # App root render
│       ├── App.jsx          # Context providers & routing tree
│       ├── index.css        # Base styles, variables & CSS reset
│       ├── assets/          # Static assets & stock illustrations
│       ├── components/      # Reusable UI components
│       │   ├── common/      # Button, Modal, Input, Badge, ConfirmModal
│       │   └── ai/          # AIChatDrawer (Voice & Chat assistant)
│       ├── context/         # AuthContext, CurrencyContext, ThemeContext
│       ├── layouts/         # RootLayout, AppLayout, AuthLayout
│       ├── pages/           # Application views
│       │   ├── Home/        # Landing page
│       │   ├── Login/       # User authentication
│       │   ├── Register/    # User onboarding
│       │   ├── Dashboard/   # Financial overview & charts
│       │   ├── Transactions/# Transaction history & filters
│       │   ├── Income/      # Income sources & recurring banner
│       │   ├── Expenses/    # Expense categories & logging
│       │   ├── Budgets/     # Monthly limits & recurring setup
│       │   ├── SavingsGoals/# Milestone targets & funding
│       │   ├── Analytics/   # Multi-month trend charts
│       │   ├── Reports/     # Executive summary & CSV export
│       │   ├── Health/      # Financial health assessment
│       │   ├── Notifications/# In-app alerts
│       │   └── Settings/    # User profile & preferences
│       ├── routes/          # AppRoutes & ProtectedRoute wrapper
│       └── services/        # Axios API client & download helpers
│
└── server/                  # Node.js Express Backend
    ├── server.js            # Express server initialization & SPA routing
    ├── package.json         # Backend dependencies & scripts
    ├── .env.example         # Backend environment template
    ├── seed.js              # Realistic viva demo data seeder
    ├── config/              # MongoDB connection & Nodemailer configuration
    ├── controllers/         # Business logic & request handlers
    ├── middleware/          # Authentication, error handling, rate limiting
    ├── models/              # Mongoose database schemas
    ├── routes/              # Express API route modules
    ├── services/            # AI tools, recurring scheduler, email dispatcher
    └── utils/               # Error wrappers, token utilities, helpers
```

---

## 6. Requirements

- **Node.js:** `v18.0.0` or higher (`v20.x` recommended)
- **npm:** `v9.0.0` or higher
- **MongoDB:** MongoDB Community Server running locally on `mongodb://localhost:27017` or a MongoDB Atlas URI
- **Web Browser:** Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari (Chrome/Edge recommended for Web Speech recognition)

---

## 7. Installation

Clone or extract the project to your local workspace, open a terminal in the root directory, and run:

```bash
# Option A: One-command install across all workspaces
npm run install:all

# Option B: Manual install
npm install
npm install --prefix server
npm install --prefix client
```

---

## 8. Environment Variables

### Backend Configuration (`server/.env`)
Copy `server/.env.example` to `server/.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# Database Connection (Local or Atlas)
MONGODB_URI=mongodb://localhost:27017/expenseflow

# Security & Authentication
JWT_SECRET=expenseflow_super_secret_jwt_key_2026_at_least_32_chars!
JWT_EXPIRES_IN=7d
COOKIE_EXPIRES_IN_DAYS=7

# Email Service — Gmail SMTP (Optional)
# Leave placeholders to log emails cleanly to the console in development
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM="ExpenseFlow <your_email@gmail.com>"

# Google Gemini AI API (Optional)
# Get a free key at: https://aistudio.google.com/
# If left blank, the built-in deterministic local intelligence engine is used
GEMINI_API_KEY=your_google_gemini_api_key_here

# Security Rate Limiting
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Configuration (`client/.env`)
*Optional:* If deploying the client separately from the backend, copy `client/.env.example` to `client/.env`:
```env
VITE_API_URL=http://localhost:5000
```
*(Leave blank during local development to use the default Vite proxy).*

---

## 9. Database Setup & Demo Data Seeding

Ensure MongoDB is active on your system:
```bash
# Check MongoDB service status (Windows PowerShell)
Get-Service -Name MongoDB
```

To populate the database with **realistic student project demo data** (spanning 6 months of historical transactions, monthly budgets, savings goals, and an automated recurring salary plan):

```bash
npm run seed
```

This creates the default demo account:
- **Email:** `demo@expenseflow.com`
- **Password:** `Password123!`

---

## 10. Running the Application Locally

### Concurrent Mode (Frontend + Backend Together)
From the project root directory:
```bash
npm run dev
```

### Individual Service Mode
If you prefer running in separate terminal windows:

**Terminal 1 — Backend Server:**
```bash
npm run dev:server
# Server will run at: http://localhost:5000
```

**Terminal 2 — Frontend Client:**
```bash
npm run dev:client
# Client will run at: http://localhost:5173
```

Open your browser at **[http://localhost:5173](http://localhost:5173)**.

---

## 11. Build & Production Commands

```bash
# Build the production bundle of the client
npm run build

# Start the production Node.js server (serves both API & built frontend)
npm start
```

---

## 12. Deployment Instructions

ExpenseFlow is configured for unified zero-config deployment on cloud hosts like **Render**, **Railway**, **VPS**, or **Heroku**:

### Unified Deployment (Single Web Service)
1. Push your repository to GitHub.
2. Create a new **Web Service** on Render or Railway.
3. Configure the service settings:
   - **Environment:** `Node`
   - **Build Command:** `npm run install:all && npm run build`
   - **Start Command:** `npm start`
4. Add Environment Variables in the host dashboard:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = `mongodb+srv://<username>:<password>@cluster0.mongodb.net/expenseflow?retryWrites=true&w=majority`
   - `JWT_SECRET` = `<your_secure_32_char_secret>`
   - `GEMINI_API_KEY` = `<your_gemini_key>` *(optional)*
   - `SMTP_USER` / `SMTP_PASS` *(optional)*
5. Deploy. The backend automatically detects the built `client/dist` directory and serves the client application with client-side SPA fallback.

---

## 13. College Viva Demonstration Guide

When presenting ExpenseFlow in your college project viva, demonstrate the features in this logical sequence:

1. **Landing Page:** Show the overview of platform capabilities, responsive navigation, and Light/Dark mode toggling.
2. **Authentication:** Log in with `demo@expenseflow.com` / `Password123!` or demonstrate new registration with the real-time password strength meter.
3. **Dashboard:** Point out the live financial summary cards, multi-month trend chart, category breakdown donut, and AI spending prediction.
4. **Voice Entry:** Click "Voice Entry", say *"I spent 250 on food today"*, show the parsed confirmation modal, confirm, and watch the dashboard figures update instantly.
5. **Recurring Budget System:** Navigate to **Budgets**, highlight the active Recurring Salary plan (₹35,000 on Day 1), and click "Sync Now" to show idempotent execution.
6. **Expense & Income Management:** Add an expense, show category validation, filter transactions, and click "Export CSV" to demonstrate report downloading.
7. **Financial Health Assessment:** Open **Financial Health** to explain the 5 algorithmic factor pillars and deterministic scoring methodology.

---

## 14. Important Notes & Future Improvements

- **No Mock Production Data:** All numbers, charts, and advice are strictly computed from real database records.
- **Fail-Safe Email Transporter:** If SMTP credentials are not provided, email notifications log cleanly to the development console without interrupting user actions.
- **Future Enhancements:**
  - Optical Character Recognition (OCR) for receipt image scanning.
  - Multi-user shared family budgets.
  - Push notifications via Web Push API.

---

**Developed for academic demonstration and production personal finance management.**
