import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Transaction from './models/Transaction.js';
import Budget from './models/Budget.js';
import SavingsGoal from './models/SavingsGoal.js';
import Notification from './models/Notification.js';
import AuditLog from './models/AuditLog.js';
import RecurringPlan from './models/RecurringPlan.js';

dotenv.config({ path: './.env' });

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expenseflow';
    await mongoose.connect(mongoUri);
    console.log(`[Seed] Connected to MongoDB: ${mongoUri}`);

    // Clear existing collections for demo user
    await Promise.all([
      User.deleteMany({ email: { $in: ['demo@expenseflow.com', 'saif@example.com'] } }),
    ]);

    // 1. Create Demo User
    const demoUser = await User.create({
      name: 'Saif',
      email: 'demo@expenseflow.com',
      password: 'Password123!',
      role: 'user',
      isVerified: true,
      currency: 'INR',
      notificationPreferences: { budgetAlerts: true, goalMilestones: true, emailAlerts: true },
    });

    console.log('[Seed] Created Demo User (demo@expenseflow.com / Password123!).');

    // Clear old data for demo user
    await Promise.all([
      Transaction.deleteMany({ userId: demoUser._id }),
      Budget.deleteMany({ userId: demoUser._id }),
      SavingsGoal.deleteMany({ userId: demoUser._id }),
      Notification.deleteMany({ userId: demoUser._id }),
      AuditLog.deleteMany({ userId: demoUser._id }),
      RecurringPlan.deleteMany({ userId: demoUser._id }),
    ]);

    // 2. Seed Recurring Monthly Schedule
    const plan = await RecurringPlan.create({
      userId: demoUser._id,
      incomeAmount: 35000,
      incomeSource: 'Software Internship Stipend',
      incomeCategory: 'Salary',
      budgetAmount: 22000,
      budgetCategory: 'Overall',
      dayOfMonth: 1,
      startDate: new Date('2026-01-01'),
      isActive: true,
      currency: 'INR',
      lastProcessedMonth: '2026-09',
      lastProcessedAt: new Date('2026-09-01'),
    });
    console.log('[Seed] Created Recurring Plan (₹35,000 salary / ₹22,000 monthly budget).');

    // 3. Seed Realistic Historical Transactions (April 2026 - September 2026)
    const transactions = [
      // April 2026 (Income: ₹30,000, Expense: ₹14,500)
      { type: 'income', amount: 30000, category: 'Salary', merchantOrSource: 'Monthly Stipend / Job', paymentMethod: 'Bank Transfer', date: new Date('2026-04-01') },
      { type: 'expense', amount: 6000, category: 'Rent', merchantOrSource: 'Hostel / Room Rent', paymentMethod: 'Bank Transfer', date: new Date('2026-04-02') },
      { type: 'expense', amount: 3500, category: 'Food', merchantOrSource: 'Groceries & Dining', paymentMethod: 'UPI', date: new Date('2026-04-09') },
      { type: 'expense', amount: 1500, category: 'Transport', merchantOrSource: 'Train ticket & Metro', paymentMethod: 'UPI', date: new Date('2026-04-14') },
      { type: 'expense', amount: 1200, category: 'Bills', merchantOrSource: 'Electricity & Internet', paymentMethod: 'UPI', date: new Date('2026-04-18') },
      { type: 'expense', amount: 1500, category: 'Shopping', merchantOrSource: 'New T-shirts', paymentMethod: 'UPI', date: new Date('2026-04-22') },
      { type: 'expense', amount: 800, category: 'Other', merchantOrSource: 'Books', paymentMethod: 'Debit Card', date: new Date('2026-04-28') },

      // May 2026 (Income: ₹32,000, Expense: ₹13,800)
      { type: 'income', amount: 30000, category: 'Salary', merchantOrSource: 'Monthly Stipend', paymentMethod: 'Bank Transfer', date: new Date('2026-05-01') },
      { type: 'income', amount: 2000, category: 'Freelancing', merchantOrSource: 'Web Bugfix Gig', paymentMethod: 'UPI', date: new Date('2026-05-12') },
      { type: 'expense', amount: 6000, category: 'Rent', merchantOrSource: 'Hostel / Room Rent', paymentMethod: 'Bank Transfer', date: new Date('2026-05-02') },
      { type: 'expense', amount: 3200, category: 'Food', merchantOrSource: 'Canteen & Groceries', paymentMethod: 'UPI', date: new Date('2026-05-08') },
      { type: 'expense', amount: 1400, category: 'Transport', merchantOrSource: 'Cab & Bus', paymentMethod: 'UPI', date: new Date('2026-05-16') },
      { type: 'expense', amount: 1100, category: 'Bills', merchantOrSource: 'Mobile recharge & WiFi', paymentMethod: 'UPI', date: new Date('2026-05-20') },
      { type: 'expense', amount: 1300, category: 'Education', merchantOrSource: 'Online Course Subscription', paymentMethod: 'Credit Card', date: new Date('2026-05-24') },
      { type: 'expense', amount: 800, category: 'Other', merchantOrSource: 'Personal care', paymentMethod: 'UPI', date: new Date('2026-05-29') },

      // June 2026 (Income: ₹30,000, Expense: ₹16,500)
      { type: 'income', amount: 30000, category: 'Salary', merchantOrSource: 'Monthly Stipend', paymentMethod: 'Bank Transfer', date: new Date('2026-06-01') },
      { type: 'expense', amount: 6000, category: 'Rent', merchantOrSource: 'Hostel / Room Rent', paymentMethod: 'Bank Transfer', date: new Date('2026-06-02') },
      { type: 'expense', amount: 4200, category: 'Food', merchantOrSource: 'Restaurants & Snacks', paymentMethod: 'UPI', date: new Date('2026-06-07') },
      { type: 'expense', amount: 2000, category: 'Transport', merchantOrSource: 'Weekend Trip Travel', paymentMethod: 'UPI', date: new Date('2026-06-14') },
      { type: 'expense', amount: 1500, category: 'Bills', merchantOrSource: 'Room AC Electricity Share', paymentMethod: 'UPI', date: new Date('2026-06-19') },
      { type: 'expense', amount: 1800, category: 'Entertainment', merchantOrSource: 'Movie & Gaming', paymentMethod: 'UPI', date: new Date('2026-06-23') },
      { type: 'expense', amount: 1000, category: 'Other', merchantOrSource: 'Pharmacy & Supplies', paymentMethod: 'Cash', date: new Date('2026-06-27') },

      // July 2026 (Income: ₹35,000, Expense: ₹19,200)
      { type: 'income', amount: 30000, category: 'Salary', merchantOrSource: 'Monthly Stipend', paymentMethod: 'Bank Transfer', date: new Date('2026-07-01') },
      { type: 'income', amount: 5000, category: 'Freelancing', merchantOrSource: 'Frontend project bonus', paymentMethod: 'UPI', date: new Date('2026-07-15') },
      { type: 'expense', amount: 6000, category: 'Rent', merchantOrSource: 'Hostel / Room Rent', paymentMethod: 'Bank Transfer', date: new Date('2026-07-02') },
      { type: 'expense', amount: 4800, category: 'Food', merchantOrSource: 'Dining & Groceries', paymentMethod: 'UPI', date: new Date('2026-07-08') },
      { type: 'expense', amount: 2200, category: 'Transport', merchantOrSource: 'Monthly metro & auto', paymentMethod: 'UPI', date: new Date('2026-07-14') },
      { type: 'expense', amount: 1600, category: 'Bills', merchantOrSource: 'Power & broadband', paymentMethod: 'UPI', date: new Date('2026-07-19') },
      { type: 'expense', amount: 3600, category: 'Shopping', merchantOrSource: 'Semester Clothes & Shoes', paymentMethod: 'Debit Card', date: new Date('2026-07-22') },
      { type: 'expense', amount: 1000, category: 'Other', merchantOrSource: 'Household supplies', paymentMethod: 'Cash', date: new Date('2026-07-29') },

      // August 2026 (Income: ₹50,000, Expense: ₹15,600)
      { type: 'income', amount: 40000, category: 'Salary', merchantOrSource: 'Software Internship Stipend', paymentMethod: 'Bank Transfer', date: new Date('2026-08-01') },
      { type: 'income', amount: 10000, category: 'Freelancing', merchantOrSource: 'React App Gig', paymentMethod: 'UPI', date: new Date('2026-08-10') },
      { type: 'expense', amount: 6000, category: 'Rent', merchantOrSource: 'Hostel / Room Rent', paymentMethod: 'Bank Transfer', date: new Date('2026-08-02') },
      { type: 'expense', amount: 4500, category: 'Food', merchantOrSource: 'Canteen & Grocery shopping', paymentMethod: 'UPI', date: new Date('2026-08-05') },
      { type: 'expense', amount: 2100, category: 'Transport', merchantOrSource: 'Metro & Uber rides', paymentMethod: 'UPI', date: new Date('2026-08-11') },
      { type: 'expense', amount: 1800, category: 'Bills', merchantOrSource: 'Electricity & WiFi bills', paymentMethod: 'UPI', date: new Date('2026-08-16') },
      { type: 'expense', amount: 3200, category: 'Shopping', merchantOrSource: 'Electronics accessories', paymentMethod: 'Credit Card', date: new Date('2026-08-20') },
      { type: 'expense', amount: 900, category: 'Other', merchantOrSource: 'Stationery & Printing', paymentMethod: 'UPI', date: new Date('2026-08-25') },

      // September 2026 (Current Month - Income: ₹38,000, Expense: ₹14,200)
      { type: 'income', amount: 35000, category: 'Salary', merchantOrSource: 'Software Internship Stipend', paymentMethod: 'Bank Transfer', date: new Date('2026-09-01'), isRecurring: true, recurringId: plan._id },
      { type: 'income', amount: 3000, category: 'Freelancing', merchantOrSource: 'API Integration Project', paymentMethod: 'UPI', date: new Date('2026-09-12') },
      { type: 'expense', amount: 6000, category: 'Rent', merchantOrSource: 'Hostel / Room Rent', paymentMethod: 'Bank Transfer', date: new Date('2026-09-02') },
      { type: 'expense', amount: 3800, category: 'Food', merchantOrSource: 'Groceries & Dining', paymentMethod: 'UPI', date: new Date('2026-09-08') },
      { type: 'expense', amount: 1600, category: 'Transport', merchantOrSource: 'Metro Smart Card & Cab', paymentMethod: 'UPI', date: new Date('2026-09-15') },
      { type: 'expense', amount: 1400, category: 'Bills', merchantOrSource: 'Mobile & Broadband Plan', paymentMethod: 'UPI', date: new Date('2026-09-18') },
      { type: 'expense', amount: 1400, category: 'Shopping', merchantOrSource: 'College Stationery & Clothes', paymentMethod: 'UPI', date: new Date('2026-09-22') },
    ];

    await Transaction.insertMany(transactions.map((t) => ({ ...t, userId: demoUser._id, currency: 'INR' })));
    console.log(`[Seed] Created ${transactions.length} realistic historical transactions.`);

    // 4. Seed Budgets (September 2026 & August 2026)
    const budgets = [
      // September 2026 (Current)
      { userId: demoUser._id, month: 9, year: 2026, category: 'Overall', limitAmount: 22000, currency: 'INR', alertsTriggered: [50] },
      { userId: demoUser._id, month: 9, year: 2026, category: 'Food', limitAmount: 5000, currency: 'INR', alertsTriggered: [50, 75] },
      { userId: demoUser._id, month: 9, year: 2026, category: 'Transport', limitAmount: 3000, currency: 'INR', alertsTriggered: [50] },
      { userId: demoUser._id, month: 9, year: 2026, category: 'Bills', limitAmount: 2500, currency: 'INR', alertsTriggered: [50] },
      { userId: demoUser._id, month: 9, year: 2026, category: 'Shopping', limitAmount: 4000, currency: 'INR', alertsTriggered: [] },

      // August 2026 (Previous)
      { userId: demoUser._id, month: 8, year: 2026, category: 'Overall', limitAmount: 25000, currency: 'INR', alertsTriggered: [50] },
      { userId: demoUser._id, month: 8, year: 2026, category: 'Food', limitAmount: 5000, currency: 'INR', alertsTriggered: [50, 75] },
    ];
    await Budget.insertMany(budgets);
    console.log(`[Seed] Created ${budgets.length} monthly budgets.`);

    // 5. Seed Savings Goals
    const goals = [
      {
        userId: demoUser._id,
        name: 'New Laptop M3',
        targetAmount: 50000,
        currentAmount: 24000,
        currency: 'INR',
        deadline: new Date('2026-12-31'),
        category: 'Technology',
        color: '#2563EB',
        isCompleted: false,
      },
      {
        userId: demoUser._id,
        name: 'Semester Trip',
        targetAmount: 15000,
        currentAmount: 11500,
        currency: 'INR',
        deadline: new Date('2026-11-15'),
        category: 'Travel',
        color: '#10B981',
        isCompleted: false,
      },
    ];
    await SavingsGoal.insertMany(goals);
    console.log(`[Seed] Created ${goals.length} savings goals.`);

    console.log('[Seed] Database seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]', err);
    process.exit(1);
  }
};

seedDatabase();
