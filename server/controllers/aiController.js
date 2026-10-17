import { GoogleGenerativeAI } from '@google/generative-ai';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import SavingsGoal from '../models/SavingsGoal.js';
import {
  getUserFinancialSummary,
  getCategorySpending,
  getBudgetStatus,
  getMultiMonthAnalysis,
  calculateAffordability,
} from '../services/aiTools.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Natural language helper to parse amounts including commas, decimals, 'k' suffix, and symbols.
 * Examples: ₹500, 500, ₹30,000, 30,000, 30k, Rs 300, 450.50
 */
export const extractAmountFromText = (text) => {
  if (!text) return null;

  // 1. Check for 'k' notation (e.g. 30k, 2.5k, ₹30k)
  const kMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    const val = parseFloat(kMatch[1]);
    if (!isNaN(val) && val > 0) return Math.round(val * 1000);
  }

  // 2. Check for standard numeric amount with optional commas (e.g. 30,000 or 500 or 500.00)
  const numMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:rs|rupees|inr)?/i);
  if (numMatch) {
    const cleaned = numMatch[1].replace(/,/g, '');
    const val = parseInt(cleaned, 10);
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
};

/**
 * Helper category detector matching ExpenseFlow taxonomy
 */
export const detectCategoryFromText = (str) => {
  const s = str.toLowerCase();
  if (s.includes('food') || s.includes('dinner') || s.includes('lunch') || s.includes('breakfast') || s.includes('meal') || s.includes('pizza') || s.includes('burger') || s.includes('canteen') || s.includes('grocery') || s.includes('groceries') || s.includes('coffee') || s.includes('tea') || s.includes('snack') || s.includes('zomato') || s.includes('swiggy') || s.includes('cafe') || s.includes('restaurant') || s.includes('drinks') || s.includes('fruit') || s.includes('vegetable')) return 'Food';
  if (s.includes('transport') || s.includes('travel') || s.includes('cab') || s.includes('uber') || s.includes('ola') || s.includes('petrol') || s.includes('fuel') || s.includes('diesel') || s.includes('bus') || s.includes('train') || s.includes('metro') || s.includes('auto') || s.includes('taxi') || s.includes('flight') || s.includes('fare')) return 'Transport';
  if (s.includes('electricity') || s.includes('power') || s.includes('water') || s.includes('wifi') || s.includes('internet') || s.includes('recharge') || s.includes('bill') || s.includes('bills') || s.includes('mobile') || s.includes('gas') || s.includes('broadband') || s.includes('utility') || s.includes('utilities')) return 'Bills';
  if (s.includes('rent') || s.includes('room') || s.includes('hostel') || s.includes('pg') || s.includes('flat') || s.includes('accommodation')) return 'Rent';
  if (s.includes('salary') || s.includes('stipend') || s.includes('paycheck') || s.includes('wage')) return 'Salary';
  if (s.includes('freelance') || s.includes('freelancing') || s.includes('client') || s.includes('gig') || s.includes('contract') || s.includes('project') || s.includes('upwork') || s.includes('fiverr')) return 'Freelancing';
  if (s.includes('investment') || s.includes('stock') || s.includes('shares') || s.includes('dividend') || s.includes('mutual fund') || s.includes('crypto') || s.includes('interest')) return 'Investment';
  if (s.includes('shopping') || s.includes('shirt') || s.includes('clothes') || s.includes('clothing') || s.includes('shoes') || s.includes('dress') || s.includes('pant') || s.includes('amazon') || s.includes('flipkart') || s.includes('myntra') || s.includes('mall') || s.includes('store') || s.includes('sneakers')) return 'Shopping';
  if (s.includes('movie') || s.includes('movies') || s.includes('game') || s.includes('games') || s.includes('concert') || s.includes('entertainment') || s.includes('cinema') || s.includes('netflix') || s.includes('prime') || s.includes('hotstar') || s.includes('spotify') || s.includes('cinema') || s.includes('film')) return 'Entertainment';
  if (s.includes('book') || s.includes('books') || s.includes('course') || s.includes('courses') || s.includes('tuition') || s.includes('fee') || s.includes('fees') || s.includes('education') || s.includes('college') || s.includes('school') || s.includes('stationery')) return 'Education';
  if (s.includes('medicine') || s.includes('medicines') || s.includes('doctor') || s.includes('health') || s.includes('healthcare') || s.includes('hospital') || s.includes('clinic') || s.includes('pharmacy') || s.includes('medical')) return 'Healthcare';
  return 'Other';
};

/**
 * Format date strictly in Indian format (DD/MM/YYYY)
 * Example: 17/10/2026
 */
export const formatIndianDate = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Natural language helper to parse Indian format dates (DD/MM/YYYY, DD-MM-YYYY, relative days, named months)
 */
export const extractIndianDateFromText = (text) => {
  if (!text) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return { date: now, label: 'Today', dateStr: `${year}-${month}-${day}`, displayIndian: `${day}/${month}/${year}` };
  }

  const s = text.toLowerCase();
  const now = new Date();

  if (s.includes('yesterday')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return { date: d, label: 'Yesterday', dateStr: `${year}-${month}-${day}`, displayIndian: `${day}/${month}/${year}` };
  }

  if (s.includes('day before yesterday')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 2);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return { date: d, label: `${day}/${month}/${year}`, dateStr: `${year}-${month}-${day}`, displayIndian: `${day}/${month}/${year}` };
  }

  const daysAgoMatch = s.match(/(\d+)\s*days?\s*ago/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return { date: d, label: `${day}/${month}/${year}`, dateStr: `${year}-${month}-${day}`, displayIndian: `${day}/${month}/${year}` };
  }

  // Indian format numeric: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const ddmmyyyyMatch = text.match(/\b([0-3]?\d)[\/\-\.]([0-1]?\d)(?:[\/\-\.](\d{2,4}))?\b/);
  if (ddmmyyyyMatch) {
    const dNum = parseInt(ddmmyyyyMatch[1], 10);
    const mNum = parseInt(ddmmyyyyMatch[2], 10);
    let yNum = ddmmyyyyMatch[3] ? parseInt(ddmmyyyyMatch[3], 10) : now.getFullYear();
    if (yNum < 100) yNum += 2000;
    if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12) {
      const d = new Date(yNum, mNum - 1, dNum, 12, 0, 0);
      if (!isNaN(d.getTime())) {
        const day = String(dNum).padStart(2, '0');
        const month = String(mNum).padStart(2, '0');
        return {
          date: d,
          label: `${day}/${month}/${yNum}`,
          dateStr: `${yNum}-${month}-${day}`,
          displayIndian: `${day}/${month}/${yNum}`,
        };
      }
    }
  }

  // Word date like "15th October" or "15 Oct" or "October 15"
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const wordDateMatch = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+(\d{4}))?/i) ||
                        s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?/i);
  if (wordDateMatch) {
    let dayNum, monthStr, yNum;
    if (isNaN(parseInt(wordDateMatch[1], 10))) {
      monthStr = wordDateMatch[1];
      dayNum = parseInt(wordDateMatch[2], 10);
      yNum = wordDateMatch[3] ? parseInt(wordDateMatch[3], 10) : now.getFullYear();
    } else {
      dayNum = parseInt(wordDateMatch[1], 10);
      monthStr = wordDateMatch[2];
      yNum = wordDateMatch[3] ? parseInt(wordDateMatch[3], 10) : now.getFullYear();
    }
    const monthIdx = monthNames.findIndex((m) => monthStr.toLowerCase().startsWith(m));
    if (monthIdx !== -1 && dayNum >= 1 && dayNum <= 31) {
      const d = new Date(yNum, monthIdx, dayNum, 12, 0, 0);
      if (!isNaN(d.getTime())) {
        const day = String(dayNum).padStart(2, '0');
        const month = String(monthIdx + 1).padStart(2, '0');
        return {
          date: d,
          label: `${day}/${month}/${yNum}`,
          dateStr: `${yNum}-${month}-${day}`,
          displayIndian: `${day}/${month}/${yNum}`,
        };
      }
    }
  }

  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return {
    date: now,
    label: 'Today',
    dateStr: `${year}-${month}-${day}`,
    displayIndian: `${day}/${month}/${year}`,
  };
};

/**
 * Natural language transaction parser and validator (strictly Indian format dates)
 */
export const parseNaturalTransaction = (text, userCurrency = 'INR') => {
  const s = text.toLowerCase().trim();
  const currSymbol = userCurrency === 'USD' ? '$' : userCurrency === 'EUR' ? '€' : '₹';

  // 1. Amount Extraction
  const amount = extractAmountFromText(s);

  // 2. Income vs Expense Intent Detection
  const hasIncomeWord = /\b(salary|received|earned|earning|income|stipend|freelance|freelancing|dividend|bonus|credited|credit|got|cashback)\b/.test(s);
  const hasExpenseWord = /\b(spent|spend|paid|pay|bought|buy|cost|expense|bill|bills|debited|debit)\b/.test(s);

  // 3. Category Detection
  const detectedCat = detectCategoryFromText(s);

  let type = 'expense';
  if (hasIncomeWord && !hasExpenseWord) {
    type = 'income';
  } else if (hasExpenseWord && !hasIncomeWord) {
    type = 'expense';
  } else if (['Salary', 'Freelancing', 'Investment'].includes(detectedCat)) {
    type = 'income';
  } else {
    type = 'expense';
  }

  // 4. Category refinement
  let category = detectedCat;
  if (category === 'Other') {
    if (type === 'income') {
      category = 'Salary';
    } else if (s.includes('coffee') || s.includes('dinner') || s.includes('food')) {
      category = 'Food';
    } else if (s.includes('uber') || s.includes('travel') || s.includes('transport')) {
      category = 'Transport';
    }
  }

  // 5. Date Parsing in Indian format
  const parsedDateObj = extractIndianDateFromText(text);
  const dateStr = parsedDateObj.dateStr;
  const dateLabel = parsedDateObj.label;

  // Validation: Check if required information is missing or unclear
  if (!amount || amount <= 0) {
    return {
      status: 'INCOMPLETE',
      missingField: 'amount',
      type,
      category,
      reply: category !== 'Other'
        ? `How much did you ${type === 'income' ? 'receive for' : 'spend on'} ${category}? Please specify the amount.`
        : 'Please specify the amount for this transaction (e.g. “Add ₹500 for food”).',
    };
  }

  // Confirmation Prompt format: “Add ₹500 Expense → Food → Today?” or “Add ₹500 Expense → Food → 15/10/2026?”
  const typeLabel = type === 'income' ? 'Income' : 'Expense';
  const confirmationPrompt = `Add ${currSymbol}${amount.toLocaleString('en-IN')} ${typeLabel} → ${category} → ${dateLabel}?`;

  return {
    status: 'READY',
    confirmationPrompt,
    proposal: {
      type,
      amount,
      currency: userCurrency,
      category,
      merchantOrSource: category,
      paymentMethod: type === 'income' ? 'Bank Transfer' : 'UPI',
      date: dateStr,
      dateLabel,
      dateFormatted: parsedDateObj.displayIndian,
      notes: `Voice/NL command: "${text.trim()}"`,
    },
  };
};

/**
 * Intelligent Deterministic Natural Language Advisor
 * (Grounds strictly in real DB data: spending, income, savings, budgets, categories,
 *  unusual expenses, comparisons, predictions, and saving suggestions)
 */
import RecurringPlan from '../models/RecurringPlan.js';

/**
 * Intelligent Deterministic Natural Language Advisor
 * (Accurately handles all 15 core financial queries and explains features without inventing numbers)
 */
export const runDeterministicAdvisor = ({
  message,
  conversationHistory = [],
  summary,
  budgets = [],
  categories = [],
  multiMonth = { monthlyTrends: [], suggestions: [], abnormalSpending: [], prediction: {} },
  goals = [],
  recentExpenses = [],
  recurringPlan = null,
  currency = 'INR',
}) => {
  const msg = message.toLowerCase().trim();
  const currSymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';

  const currentMonthData = multiMonth.monthlyTrends && multiMonth.monthlyTrends.length > 0
    ? multiMonth.monthlyTrends[multiMonth.monthlyTrends.length - 1]
    : {
        income: summary?.currentMonth?.monthlyIncome || 0,
        expenses: summary?.currentMonth?.monthlyExpenses || 0,
        netSavings: summary?.currentMonth?.monthlySurplus || 0,
        savingsRate: 0,
      };

  const prevMonthData = multiMonth.monthlyTrends && multiMonth.monthlyTrends.length > 1
    ? multiMonth.monthlyTrends[multiMonth.monthlyTrends.length - 2]
    : null;

  // Retrieve last assistant topic from conversation history for follow-up resolution
  let lastTopic = '';
  if (conversationHistory.length > 0) {
    const lastAssistantMsg = [...conversationHistory].reverse().find((m) => m.role === 'assistant' || m.sender === 'ai');
    if (lastAssistantMsg) {
      const lastText = (lastAssistantMsg.text || '').toLowerCase();
      if (lastText.includes('food')) lastTopic = 'Food';
      else if (lastText.includes('rent')) lastTopic = 'Rent';
      else if (lastText.includes('transport')) lastTopic = 'Transport';
      else if (lastText.includes('shopping')) lastTopic = 'Shopping';
      else if (lastText.includes('bill')) lastTopic = 'Bills';
      else if (lastText.includes('entertainment')) lastTopic = 'Entertainment';
      else if (lastText.includes('salary') || lastText.includes('income')) lastTopic = 'Income';
      else if (lastText.includes('budget')) lastTopic = 'Budget';
      else if (lastText.includes('goal') || lastText.includes('saving')) lastTopic = 'Goal';
    }
  }

  // 1. General greetings / meta & Opening Answer
  if (msg.includes('who are you') || msg.includes('what is your name') || msg.includes('your name')) {
    return { reply: 'I am ExpenseFlow AI, your personal financial assistant for tracking spending, analyzing affordability, managing budgets, and planning savings.' };
  }
  if (msg.includes('how are you') || msg.includes('how are things') || msg.includes("what's up") || msg.includes('how are u')) {
    return { reply: "I'm doing well and ready to assist you! How can I help you manage your finances or analyze your spending today?" };
  }
  if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))\b/i.test(msg)) {
    return {
      reply: `Hello! Welcome to ExpenseFlow AI, your personal financial assistant. You can ask me questions like "Will I be able to buy a laptop in 6 months?", "What is my remaining budget?", "What is my total income?", or manage your transactions by saying "Add ₹500 for food" or "Delete last transaction". How can I assist you today?`,
    };
  }

  // Proper closing / farewell answer
  if (
    msg.includes('thank you') ||
    msg.includes('thanks') ||
    msg.includes('bye') ||
    msg.includes('goodbye') ||
    msg.includes('see you') ||
    msg.includes('have a good day') ||
    msg.includes('have a nice day')
  ) {
    return {
      reply: `You're very welcome! Keep up the great financial habits. If you need more insights, want to test affordability, or need to log or delete transactions, I'm always right here. Have a wonderful day managing your finances with ExpenseFlow!`,
    };
  }

  // Question: Will I be able to buy a laptop in 6 months? / Purchase Affordability Planning
  const isGoalAffordabilityQuery =
    (msg.includes('will i be able to buy') ||
     msg.includes('can i buy') ||
     msg.includes('will i be able to afford') ||
     msg.includes('can i afford to buy') ||
     msg.includes('able to buy') ||
     msg.includes('buy a laptop') ||
     msg.includes('buy laptop')) &&
    (msg.includes('month') || msg.includes('year') || msg.includes('in 6') || msg.includes('laptop') || msg.includes('phone') || msg.includes('bike') || msg.includes('car'));

  if (isGoalAffordabilityQuery) {
    let item = 'laptop';
    if (msg.includes('laptop') || msg.includes('macbook') || msg.includes('computer') || msg.includes('pc')) item = 'laptop';
    else if (msg.includes('phone') || msg.includes('iphone') || msg.includes('smartphone') || msg.includes('mobile')) item = 'phone';
    else if (msg.includes('bike') || msg.includes('motorcycle') || msg.includes('scooter')) item = 'bike';
    else if (msg.includes('car')) item = 'car';
    else if (msg.includes('trip') || msg.includes('vacation')) item = 'trip';
    else if (msg.includes('watch') || msg.includes('smartwatch')) item = 'smartwatch';

    let months = 6;
    const monthMatch = msg.match(/(\d+)\s*(?:month|months|m)\b/i);
    if (monthMatch) {
      months = parseInt(monthMatch[1], 10);
    } else if (msg.includes('a year') || msg.includes('1 year')) {
      months = 12;
    } else if (msg.includes('half year') || msg.includes('half a year')) {
      months = 6;
    }

    let targetPrice = extractAmountFromText(msg);
    if (!targetPrice) {
      if (item === 'laptop') targetPrice = currency === 'USD' ? 700 : currency === 'EUR' ? 650 : 50000;
      else if (item === 'phone') targetPrice = currency === 'USD' ? 400 : currency === 'EUR' ? 380 : 30000;
      else if (item === 'bike') targetPrice = currency === 'USD' ? 1000 : currency === 'EUR' ? 950 : 80000;
      else if (item === 'car') targetPrice = currency === 'USD' ? 6000 : currency === 'EUR' ? 5500 : 450000;
      else if (item === 'smartwatch') targetPrice = currency === 'USD' ? 200 : currency === 'EUR' ? 180 : 15000;
      else targetPrice = currency === 'USD' ? 500 : currency === 'EUR' ? 450 : 40000;
    }

    const currentBalance = summary?.allTime?.netAvailableBalance || 0;
    const monthlyIncome = currentMonthData.income || summary?.currentMonth?.monthlyIncome || 0;
    const monthlyExpenses = currentMonthData.expenses || summary?.currentMonth?.monthlyExpenses || 0;
    const monthlySurplus = monthlyIncome - monthlyExpenses;

    const projectedSavings = Math.max(0, currentBalance) + (Math.max(0, monthlySurplus) * months);

    if (monthlySurplus <= 0 && currentBalance < targetPrice) {
      const requiredMonthly = Math.ceil((targetPrice - Math.max(0, currentBalance)) / months);
      return {
        reply: `Based on your current numbers (income: ${currSymbol}${monthlyIncome.toLocaleString()}, expenses: ${currSymbol}${monthlyExpenses.toLocaleString()}), you currently have a deficit or zero monthly surplus. To buy a ${item} (~${currSymbol}${targetPrice.toLocaleString()}) in ${months} months, you will need to save about ${currSymbol}${requiredMonthly.toLocaleString()}/month by reducing non-essential expenses like Food and Shopping.`,
      };
    }

    if (projectedSavings >= targetPrice) {
      const surplusRemaining = projectedSavings - targetPrice;
      return {
        reply: `Yes! Based on your current surplus of ${currSymbol}${monthlySurplus.toLocaleString()}/month and available balance of ${currSymbol}${currentBalance.toLocaleString()}, you are projected to accumulate ${currSymbol}${projectedSavings.toLocaleString()} in ${months} months. You will comfortably be able to buy a ${item} (~${currSymbol}${targetPrice.toLocaleString()}) with ${currSymbol}${surplusRemaining.toLocaleString()} to spare!`,
      };
    } else {
      const shortfall = targetPrice - projectedSavings;
      const additionalMonthlyNeeded = Math.ceil(shortfall / months);
      return {
        reply: `With your current monthly surplus of ${currSymbol}${monthlySurplus.toLocaleString()}, you will reach approximately ${currSymbol}${projectedSavings.toLocaleString()} in ${months} months. You will be about ${currSymbol}${shortfall.toLocaleString()} short of a ${item} (~${currSymbol}${targetPrice.toLocaleString()}). To reach it, try saving an extra ${currSymbol}${additionalMonthlyNeeded.toLocaleString()} per month.`,
      };
    }
  }

  // Immediate Affordability
  if (
    msg.includes('can i afford') ||
    msg.includes('should i buy') ||
    (msg.includes('can i buy') && !msg.includes('month') && !msg.includes('year'))
  ) {
    const amount = extractAmountFromText(msg);
    const balance = summary?.allTime?.netAvailableBalance || 0;
    const surplus = currentMonthData.netSavings || 0;

    if (amount) {
      if (balance >= amount && surplus >= 0) {
        return {
          reply: `Yes, you can afford it! You have ${currSymbol}${balance.toLocaleString()} available. Spending ${currSymbol}${amount.toLocaleString()} will leave you with ${currSymbol}${(balance - amount).toLocaleString()} in reserves.`,
        };
      } else if (balance >= amount) {
        return {
          reply: `You have enough balance (${currSymbol}${balance.toLocaleString()}) to cover ${currSymbol}${amount.toLocaleString()}, but your spending this month is currently high. Consider waiting until next month to preserve your savings buffer.`,
        };
      } else {
        return {
          reply: `No, your current balance of ${currSymbol}${balance.toLocaleString()} is not enough for ${currSymbol}${amount.toLocaleString()}. You need an additional ${currSymbol}${(amount - balance).toLocaleString()} before making this purchase.`,
        };
      }
    }
  }

  // How to delete a transaction
  if (
    msg.includes('how do i delete') ||
    msg.includes('how to delete') ||
    msg.includes('how do i remove') ||
    msg.includes('how to cancel a transaction') ||
    msg.includes('delete a transaction') ||
    msg.includes('delete an expense')
  ) {
    return {
      reply: `You can delete any transaction right here using voice or chat! Just say or type "Delete last transaction" or "Delete ₹500 for Food", and confirm when prompted. You can also delete transactions on the Transactions page using the trash icon.`,
    };
  }

  // Financial health status
  if (
    msg.includes('financial health') ||
    msg.includes('how am i doing') ||
    msg.includes('how is my finance') ||
    msg.includes('financial status') ||
    msg.includes('financial summary')
  ) {
    const inc = currentMonthData.income || 0;
    const exp = currentMonthData.expenses || 0;
    const surplus = inc - exp;
    const rate = inc > 0 ? Math.round((Math.max(0, surplus) / inc) * 100) : 0;
    const balance = summary?.allTime?.netAvailableBalance || 0;
    const healthStatus = rate >= 30 ? 'Excellent' : rate >= 15 ? 'Good' : rate > 0 ? 'Moderate' : 'Needs Attention';

    return {
      reply: `Your financial health status is ${healthStatus}. This month: Income ${currSymbol}${inc.toLocaleString()}, Expenses ${currSymbol}${exp.toLocaleString()}, Net Savings ${currSymbol}${Math.max(0, surplus).toLocaleString()} (${rate}% savings rate), and Available Balance ${currSymbol}${balance.toLocaleString()}.`,
    };
  }

  // Emergency Fund advice
  if (
    msg.includes('emergency fund') ||
    msg.includes('rainy day fund') ||
    msg.includes('emergency saving')
  ) {
    const monthlyExp = currentMonthData.expenses || (summary?.allTime?.allTimeExpense ? summary.allTime.allTimeExpense / 3 : 15000);
    const threeMonth = Math.round(monthlyExp * 3);
    const sixMonth = Math.round(monthlyExp * 6);
    return {
      reply: `A recommended emergency fund covers 3 to 6 months of living expenses. Based on your current monthly spending of ~${currSymbol}${Math.round(monthlyExp).toLocaleString()}, your target emergency fund should be between ${currSymbol}${threeMonth.toLocaleString()} (3 months) and ${currSymbol}${sixMonth.toLocaleString()} (6 months). Keep this in an easily accessible, liquid savings account.`,
    };
  }

  // Dining out / food budget query
  if (
    msg.includes('eat out') ||
    msg.includes('dine out') ||
    msg.includes('order food') ||
    msg.includes('zomato') ||
    msg.includes('swiggy') ||
    msg.includes('restaurant')
  ) {
    const foodBudget = budgets.find((b) => b.category?.toLowerCase() === 'food');
    const foodSpent = categories.find((c) => c._id?.toLowerCase() === 'food')?.totalSpent || 0;
    if (foodBudget) {
      const remainingFood = Math.max(0, (foodBudget.limit || foodBudget.limitAmount || 0) - foodSpent);
      return {
        reply: `You have spent ${currSymbol}${foodSpent.toLocaleString()} on Food this month with ${currSymbol}${remainingFood.toLocaleString()} remaining in your Food budget. If you stay within ${currSymbol}${remainingFood.toLocaleString()}, you can enjoy dining out without breaking budget.`,
      };
    }
    return {
      reply: `You spent ${currSymbol}${foodSpent.toLocaleString()} on Food this month. Check your monthly budget and balance before ordering to ensure you maintain your savings goal.`,
    };
  }

  // Question 15: How do I use recurring income and budget?
  if (
    msg.includes('recurring') ||
    msg.includes('fixed salary') ||
    msg.includes('repeat budget') ||
    msg.includes('repeat income') ||
    msg.includes('monthly recurring')
  ) {
    if (recurringPlan && recurringPlan.incomeAmount) {
      const statusStr = recurringPlan.isActive ? 'active' : 'paused';
      return {
        reply: `Your recurring monthly setup is currently ${statusStr}: ${currSymbol}${recurringPlan.incomeAmount.toLocaleString()} salary (${recurringPlan.incomeSource}) and ${currSymbol}${recurringPlan.budgetAmount.toLocaleString()} budget on day ${recurringPlan.dayOfMonth} of every month. You can manage this anytime on the Budgets page.`,
      };
    }
    return {
      reply: 'To use recurring income and budget, go to the Budgets page and find "Recurring Monthly Income & Budget". Enter your fixed salary, source name, monthly budget, and scheduled date. ExpenseFlow will automatically add your salary and set your budget on that date each month without duplicate entries.',
    };
  }

  // Question 13: How does ExpenseFlow predict my expenses?
  if (
    (msg.includes('predict') && (msg.includes('how') || msg.includes('does') || msg.includes('what'))) ||
    msg.includes('how does expenseflow predict') ||
    msg.includes('prediction work')
  ) {
    return {
      reply: 'ExpenseFlow predicts your expenses by analyzing your historical 6-month spending patterns across each category and computing weighted moving averages to project your expected total for next month.',
    };
  }

  // Question 14: What does abnormal/unusual spending mean?
  if (
    (msg.includes('abnormal') || msg.includes('unusual')) &&
    (msg.includes('mean') || msg.includes('what') || msg.includes('explain') || msg.includes('definition'))
  ) {
    return {
      reply: 'Abnormal spending flags any category where your current month expenses spike by 25% or more above your typical 6-month average, helping you spot unexpected budget leaks early.',
    };
  }

  // Question 7: How do I add an expense?
  if (
    msg.includes('how do i add an expense') ||
    msg.includes('how to add an expense') ||
    msg.includes('how to add expense') ||
    (msg.includes('add expense') && (msg.includes('how') || msg.includes('step') || msg.includes('where')))
  ) {
    return {
      reply: 'To add an expense, go to Transactions or Expenses and click "+ Add Expense". Enter the amount, category, and payment method, or simply tell me here: "Add ₹500 for Food".',
    };
  }

  // Question 8: How do I add income?
  if (
    msg.includes('how do i add income') ||
    msg.includes('how to add income') ||
    (msg.includes('add income') && (msg.includes('how') || msg.includes('step') || msg.includes('where')))
  ) {
    return {
      reply: 'To add income, navigate to the Income page and click "+ Add Income", or tell me in chat: "I received ₹30,000 salary". You can also automate monthly salary on the Budgets page.',
    };
  }

  // Question 9: How do I create a budget?
  if (
    msg.includes('how do i create a budget') ||
    msg.includes('how to create a budget') ||
    msg.includes('how do i set a budget') ||
    msg.includes('how to set budget') ||
    (msg.includes('budget') && msg.includes('how') && (msg.includes('create') || msg.includes('set') || msg.includes('make')))
  ) {
    return {
      reply: 'To create a budget, go to the Budgets page and click "Set Category Budget". Select a category (or Overall), enter your monthly limit, and save. You will receive alert notifications as spending approaches your cap.',
    };
  }

  // Question 10: How do I create a savings goal?
  if (
    msg.includes('how do i create a savings goal') ||
    msg.includes('how to create a savings goal') ||
    msg.includes('how do i set a savings goal') ||
    (msg.includes('savings goal') && msg.includes('how') && (msg.includes('create') || msg.includes('set') || msg.includes('start')))
  ) {
    return {
      reply: 'To create a savings goal, open the Savings Goals page and click "+ New Goal". Enter a title, target amount, and target completion date. You can fund it anytime to track your progress bar.',
    };
  }

  // Question 6: What are my recent expenses?
  if (
    msg.includes('recent expense') ||
    msg.includes('latest expense') ||
    msg.includes('last expense') ||
    msg.includes('recent transactions') ||
    msg.includes('latest transaction') ||
    msg.includes('recent entries') ||
    msg.includes('last transaction')
  ) {
    if (recentExpenses && recentExpenses.length > 0) {
      const listStr = recentExpenses
        .slice(0, 4)
        .map((e) => {
          const dateStr = formatIndianDate(e.date);
          return `${currSymbol}${e.amount.toLocaleString('en-IN')} on ${e.category} (${e.merchantOrSource || e.category})${dateStr ? ` [${dateStr}]` : ''}`;
        })
        .join(', ');
      return {
        reply: `Your recent transactions: ${listStr}. View all on the Transactions page.`,
      };
    }
    return {
      reply: 'You have not recorded any transactions recently.',
    };
  }

  // Available Balance / Account Status query
  if (
    msg.includes('balance') ||
    msg.includes('how much money do i have') ||
    msg.includes('how much money i have') ||
    msg.includes('available money') ||
    msg.includes('available funds') ||
    msg.includes('net balance') ||
    msg.includes('my funds') ||
    msg.includes('current balance')
  ) {
    const netBalance = summary?.allTime?.netAvailableBalance || 0;
    const surplus = currentMonthData.netSavings || 0;
    const inc = currentMonthData.income || 0;
    const exp = currentMonthData.expenses || 0;
    return {
      reply: `Your total available net balance is ${currSymbol}${netBalance.toLocaleString('en-IN')}. This month you earned ${currSymbol}${inc.toLocaleString('en-IN')}, spent ${currSymbol}${exp.toLocaleString('en-IN')}, and currently have ${currSymbol}${Math.max(0, surplus).toLocaleString('en-IN')} in net savings.`,
    };
  }

  // Where did my money go / Category breakdown query
  if (
    msg.includes('where did my money go') ||
    msg.includes('where is my money going') ||
    msg.includes('spending breakdown') ||
    msg.includes('category breakdown') ||
    msg.includes('where am i spending') ||
    msg.includes('spending distribution') ||
    msg.includes('expense breakdown')
  ) {
    if (categories && categories.length > 0) {
      const topList = categories
        .slice(0, 4)
        .map((c) => `${c._id}: ${currSymbol}${c.totalSpent.toLocaleString('en-IN')}`)
        .join(', ');
      return {
        reply: `Here is where your money is going this month: ${topList}. Your highest spending category is ${categories[0]._id} (${currSymbol}${categories[0].totalSpent.toLocaleString('en-IN')}).`,
      };
    }
    return {
      reply: 'You have not recorded any category expenses for this month yet.',
    };
  }

  // Capabilities & Help query
  if (
    msg.includes('what can you do') ||
    msg.includes('help') ||
    msg.includes('what are your features') ||
    msg.includes('capabilities') ||
    msg.includes('what questions can i ask') ||
    msg.includes('how can you help') ||
    msg.includes('what do you do')
  ) {
    return {
      reply: `Here is what I can do for you:
1. Answering Financial Questions: Ask about your available balance, remaining budget, top categories, monthly savings, recent transactions, or purchase planning (e.g., "Will I be able to buy a laptop in 6 months?").
2. Voice & Text Transactions: Speak or type to add transactions (e.g. "Add ₹500 for food") or delete transactions (e.g. "Delete last transaction" or "Delete ₹500 for Food").
3. Financial Planning: Get spending predictions, emergency fund targets, and tips to reduce your spending.
Just click the microphone or type to get started!`,
    };
  }

  // Question 4: What is my remaining budget?
  if (
    msg.includes('remaining budget') ||
    msg.includes('budget remaining') ||
    msg.includes('budget left') ||
    msg.includes('left in my budget') ||
    msg.includes('how much budget')
  ) {
    if (!budgets || budgets.length === 0) {
      return {
        reply: "You have not set any budgets for this month yet. You can set one on the Budgets page.",
      };
    }
    const totalLimit = budgets.reduce((acc, b) => acc + (b.limit || b.limitAmount || 0), 0);
    const totalSpent = budgets.reduce((acc, b) => acc + (b.spent || 0), 0);
    const remaining = Math.max(0, totalLimit - totalSpent);
    const exceededCount = budgets.filter((b) => b.isExceeded || b.spent > (b.limit || b.limitAmount)).length;

    if (exceededCount > 0) {
      return {
        reply: `You have ${currSymbol}${remaining.toLocaleString()} remaining across active budgets (Total budgeted: ${currSymbol}${totalLimit.toLocaleString()}, Spent: ${currSymbol}${totalSpent.toLocaleString()}). Note: ${exceededCount} category budget has exceeded its limit.`,
      };
    }
    return {
      reply: `Your total remaining budget for this month is ${currSymbol}${remaining.toLocaleString()} out of ${currSymbol}${totalLimit.toLocaleString()} budgeted (${currSymbol}${totalSpent.toLocaleString()} spent).`,
    };
  }

  // Question 5: What category do I spend the most on?
  if (
    msg.includes('category do i spend the most') ||
    msg.includes('where did i spend the most') ||
    msg.includes('highest spending') ||
    msg.includes('biggest expense') ||
    msg.includes('top category') ||
    msg.includes('most spent') ||
    msg.includes('highest category')
  ) {
    if (categories.length > 0) {
      const top = categories[0];
      return {
        reply: `${top._id} is your highest spending category at ${currSymbol}${top.totalSpent.toLocaleString()} this month.`,
      };
    }
    return {
      reply: 'You have not recorded any category expenses for this month yet.',
    };
  }

  // Question 11: How can I reduce my spending?
  if (
    msg.includes('reduce my spending') ||
    msg.includes('reduce spending') ||
    msg.includes('how can i save') ||
    msg.includes('how to save') ||
    msg.includes('save more') ||
    msg.includes('cut back') ||
    msg.includes('cut spending') ||
    msg.includes('spend less')
  ) {
    if (multiMonth.abnormalSpending && multiMonth.abnormalSpending.length > 0) {
      const ab = multiMonth.abnormalSpending[0];
      return {
        reply: `Your ${ab.category.toLowerCase()} spending jumped to ${currSymbol}${ab.currentSpend.toLocaleString()} (+${ab.percentageIncrease}%). Trimming non-essential ${ab.category.toLowerCase()} purchases is the fastest way to reduce your spending.`,
      };
    }
    const topFlexible = categories.find((c) => ['Food', 'Shopping', 'Entertainment'].includes(c._id)) || categories[0];
    if (topFlexible && topFlexible.totalSpent > 0) {
      const potential = Math.round(topFlexible.totalSpent * 0.15);
      return {
        reply: `${topFlexible._id} is your highest flexible category at ${currSymbol}${topFlexible.totalSpent.toLocaleString()}. Trimming it by 15% would save you around ${currSymbol}${potential.toLocaleString()} this month.`,
      };
    }
    return {
      reply: 'Set category budget limits on flexible expenses like Food and Shopping, review recurring subscriptions, and deposit 20% of incoming salary directly into savings.',
    };
  }

  // Question 3: How much money did I save?
  if (
    msg.includes('how much did i save') ||
    msg.includes('how much money did i save') ||
    msg.includes('how much saved') ||
    msg.includes('how much have i saved') ||
    msg.includes('my savings') ||
    msg.includes('money did i save')
  ) {
    const netBalance = summary?.allTime?.netAvailableBalance || 0;
    const surplus = currentMonthData.netSavings || 0;
    const rate = currentMonthData.savingsRate || (currentMonthData.income > 0 ? Math.round((Math.max(0, surplus) / currentMonthData.income) * 100) : 0);

    return {
      reply: `This month you saved ${currSymbol}${Math.max(0, surplus).toLocaleString()} (savings rate: ${rate}%). Your total available net balance is ${currSymbol}${netBalance.toLocaleString()}.`,
    };
  }

  // Question 1: What is my total income?
  if (
    msg.includes('total income') ||
    msg.includes('my income') ||
    msg.includes('how much did i earn') ||
    msg.includes('how much earned') ||
    msg.includes('inflow')
  ) {
    const inc = currentMonthData.income || 0;
    const allInc = summary?.allTime?.allTimeIncome || 0;
    return {
      reply: `Your total income this month is ${currSymbol}${inc.toLocaleString()} (all-time total income: ${currSymbol}${allInc.toLocaleString()}).`,
    };
  }

  // Question 12 & 2: What is my monthly spending? / What is my total expense?
  if (
    msg.includes('monthly spending') ||
    msg.includes('total expense') ||
    msg.includes('total spending') ||
    msg.includes('spend this month') ||
    msg.includes('spent this month') ||
    msg.includes('how much did i spend')
  ) {
    const exp = currentMonthData.expenses || 0;
    const allExp = summary?.allTime?.allTimeExpense || 0;
    return {
      reply: `Your total expense this month is ${currSymbol}${exp.toLocaleString()} (all-time total expenses: ${currSymbol}${allExp.toLocaleString()}).`,
    };
  }

  // Unusual / Abnormal Spending check for user's current month
  if (
    msg.includes('unusual') ||
    msg.includes('abnormal') ||
    msg.includes('spike') ||
    msg.includes('irregular') ||
    msg.includes('unexpected')
  ) {
    if (multiMonth.abnormalSpending && multiMonth.abnormalSpending.length > 0) {
      const item = multiMonth.abnormalSpending[0];
      return {
        reply: `Your ${item.category} spending is unusually high this month at ${currSymbol}${item.currentSpend.toLocaleString()} compared to your average of ${currSymbol}${item.avgPrevious.toLocaleString()} (+${item.percentageIncrease}%).`,
      };
    }
    return {
      reply: 'You have no abnormal expenses this month. All category spending is within your typical range.',
    };
  }

  // Spending Prediction for next month
  if (
    msg.includes('predict') ||
    msg.includes('forecast') ||
    msg.includes('next month') ||
    msg.includes('future spending') ||
    msg.includes('will i spend')
  ) {
    if (multiMonth.prediction && multiMonth.prediction.estimatedExpense) {
      return {
        reply: `Based on your recent trends, your projected expenses for next month are around ${currSymbol}${multiMonth.prediction.estimatedExpense.toLocaleString()}.`,
      };
    }
    const estimate = currentMonthData.expenses > 0 ? currentMonthData.expenses : (summary?.allTime?.allTimeExpense || 0);
    return {
      reply: `Based on current activity, your expenses next month are estimated at around ${currSymbol}${estimate.toLocaleString()}.`,
    };
  }

  // Active Savings Goals query
  if (msg.includes('goal') || msg.includes('saving target')) {
    if (!goals || goals.length === 0) {
      return {
        reply: "You don't have any active savings goals right now. You can create one on the Savings Goals page.",
      };
    }
    const goalList = goals
      .map((g) => `${g.name} (${currSymbol}${g.currentAmount.toLocaleString()} of ${currSymbol}${g.targetAmount.toLocaleString()})`)
      .join(', ');
    return {
      reply: `You have ${goals.length} active savings goal(s): ${goalList}.`,
    };
  }

  // Specific Category query
  const knownCategories = ['Food', 'Transport', 'Rent', 'Shopping', 'Bills', 'Entertainment', 'Education', 'Healthcare', 'Salary', 'Freelancing', 'Investment', 'Other'];
  let matchedCategory = knownCategories.find((c) => msg.includes(c.toLowerCase()));
  if (!matchedCategory && (msg.includes('it') || msg.includes('that category')) && lastTopic && !['Income', 'Budget', 'Goal'].includes(lastTopic)) {
    matchedCategory = lastTopic;
  }

  if (matchedCategory) {
    const catData = categories.find((c) => c._id.toLowerCase() === matchedCategory.toLowerCase());
    if (catData) {
      return {
        reply: `You spent ${currSymbol}${catData.totalSpent.toLocaleString()} on ${matchedCategory} this month.`,
      };
    }
    return {
      reply: `You have not recorded any ${matchedCategory} expenses for this month yet.`,
    };
  }

  // General fallback when answer isn't available - proper closing answer
  return {
    reply: `I don't have enough financial records or details to answer that accurately right now. To help me calculate this for you, try logging your regular monthly income and expenses or setting up budgets and savings goals. If there is anything else you'd like to check—like your remaining budget, monthly spending, or purchase affordability (e.g., "Will I be able to buy a laptop in 6 months?")—feel free to ask! Have a great day managing your finances with ExpenseFlow.`,
  };
};

/**
 * AI Financial Assistant Chat Endpoint
 * POST /api/ai/chat
 */
export const chatWithAI = catchAsync(async (req, res, next) => {
  const { message, conversationHistory = [] } = req.body;
  if (!message || !message.trim()) {
    return next(new AppError('Please provide a message for the AI assistant.', 400));
  }

  const userId = req.user._id;
  const currency = req.user.currency || 'INR';
  const cleanMsg = message.trim();
  const lowerMsg = cleanMsg.toLowerCase();

  // 0a. Check if user typed a transaction deletion command:
  // e.g. "Delete last transaction", "Delete ₹500 food", "Delete transaction", "Remove last expense"
  const isDeleteCommand =
    /\b(delete|remove|cancel)\b/i.test(lowerMsg) &&
    (/\b(transaction|expense|income|entry|last|recent|food|transport|shopping|bills|rent|\d+)\b/i.test(lowerMsg) || /^(delete|remove)\b/i.test(lowerMsg));

  if (isDeleteCommand) {
    const amount = extractAmountFromText(lowerMsg);
    const category = detectCategoryFromText(lowerMsg);
    let targetTx = null;

    if (amount) {
      const query = { userId, amount };
      if (category !== 'Other') {
        query.category = category;
      }
      targetTx = await Transaction.findOne(query).sort('-createdAt');
    }

    if (!targetTx && category !== 'Other') {
      targetTx = await Transaction.findOne({ userId, category }).sort('-createdAt');
    }

    if (!targetTx) {
      targetTx = await Transaction.findOne({ userId }).sort('-createdAt');
    }

    if (!targetTx) {
      return res.status(200).json({
        success: true,
        data: {
          reply: "I couldn't find any recent transaction in your records to delete. Please check your Transactions page or specify the amount and category (e.g., 'Delete ₹500 for Food').",
        },
      });
    }

    const currSymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    const indianDate = formatIndianDate(targetTx.date);
    const confirmPrompt = `Delete ${currSymbol}${targetTx.amount.toLocaleString('en-IN')} ${targetTx.category} transaction (${targetTx.merchantOrSource || targetTx.category})${indianDate ? ` from ${indianDate}` : ''}?`;

    return res.status(200).json({
      success: true,
      data: {
        isTransactionProposal: true,
        isDeleteProposal: true,
        type: 'DELETE_PROPOSAL',
        action: 'CONFIRM_DELETE',
        confirmationPrompt: confirmPrompt,
        transactionToDelete: {
          id: targetTx._id,
          amount: targetTx.amount,
          category: targetTx.category,
          type: targetTx.type,
          merchantOrSource: targetTx.merchantOrSource || targetTx.category,
          date: targetTx.date,
          dateFormatted: indianDate,
        },
        reply: `Found transaction: ${currSymbol}${targetTx.amount.toLocaleString('en-IN')} for ${targetTx.category} (${indianDate}). Say "Confirm" or click the button below to delete it.`,
      },
    });
  }

  // 0b. Check if user typed a transaction entry command:
  // e.g. "Add ₹500 for food", "I spent ₹300 on transport", "I received ₹30,000 salary"
  const hasTxKeywords =
    /^(add|record|log|create|i spent|spent|paid|received|earned|i received|i earned)\b/i.test(lowerMsg) ||
    (/\b(\d+[\d,]*|\d+k)\b/i.test(lowerMsg) && /\b(food|transport|salary|rent|bill|shopping|entertainment|freelance|groceries|lunch|dinner|uber)\b/i.test(lowerMsg));

  if (hasTxKeywords) {
    const parsedTx = parseNaturalTransaction(cleanMsg, currency);
    if (parsedTx.status === 'READY') {
      return res.status(200).json({
        success: true,
        data: {
          isTransactionProposal: true,
          type: 'PROPOSAL',
          action: 'CONFIRM_TRANSACTIONS',
          confirmationPrompt: parsedTx.confirmationPrompt,
          proposals: [parsedTx.proposal],
          reply: parsedTx.confirmationPrompt,
        },
      });
    } else if (parsedTx.status === 'INCOMPLETE') {
      return res.status(200).json({
        success: true,
        data: {
          isTransactionProposal: false,
          reply: parsedTx.reply,
        },
      });
    }
  }

  // 1. Fetch real sandboxed financial data from MongoDB
  const [summary, budgets, categories, multiMonth, goals, recentExpenses, recurringPlan] = await Promise.all([
    getUserFinancialSummary(userId),
    getBudgetStatus(userId),
    getCategorySpending(userId),
    getMultiMonthAnalysis(userId, 6),
    SavingsGoal.find({ userId, isCompleted: false }),
    Transaction.find({ userId, type: 'expense' }).sort({ date: -1 }).limit(5),
    RecurringPlan.findOne({ userId }),
  ]);

  // 2. If Gemini API Key is configured and valid, use LLM with conversational grounding
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Format conversation history for context
      const formattedHistory = conversationHistory
        .slice(-6)
        .map((m) => `${m.role === 'user' || m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
        .join('\n');

      const prompt = `You are ExpenseFlow AI, a direct, helpful personal financial assistant for a student.
Rules:
- Speak in plain, conversational English.
- Keep answers concise (1 to 3 short sentences maximum).
- Never use marketing buzzwords like "bank-grade security" or "advanced intelligence".
- Ground all numbers strictly in the actual user database records below. Do NOT make up any numbers.
- If data is missing or zero, clearly state that.
- Answer the user's specific question directly.
- If asked how to use features (adding expense, adding income, creating budget, savings goal, recurring income/budget), give simple step-by-step instructions.

User Financial Database Facts:
- Currency: ${currency}
- Total Available Net Balance: ${summary.allTime.netAvailableBalance}
- Total All-Time Income: ${summary.allTime.allTimeIncome}
- Total All-Time Expenses: ${summary.allTime.allTimeExpense}
- Current Month Income: ${summary.currentMonth.monthlyIncome}
- Current Month Expenses: ${summary.currentMonth.monthlyExpenses}
- Current Month Surplus: ${summary.currentMonth.monthlySurplus}
- Category Breakdown: ${JSON.stringify(categories)}
- Active Budgets: ${JSON.stringify(budgets)}
- Active Savings Goals: ${JSON.stringify(goals.map((g) => ({ name: g.name, target: g.targetAmount, current: g.currentAmount })))}
- Recent Expenses: ${JSON.stringify(recentExpenses.map((e) => ({ amount: e.amount, category: e.category, date: e.date, source: e.merchantOrSource })))}
- Recurring Monthly Setup: ${recurringPlan ? JSON.stringify({ incomeAmount: recurringPlan.incomeAmount, budgetAmount: recurringPlan.budgetAmount, dayOfMonth: recurringPlan.dayOfMonth, isActive: recurringPlan.isActive }) : 'Not set up'}
- Recent Monthly Trends: ${JSON.stringify(multiMonth.monthlyTrends)}
- Abnormal Spending Spikes: ${JSON.stringify(multiMonth.abnormalSpending)}
- Spending Prediction: ${JSON.stringify(multiMonth.prediction)}
- Savings Suggestions: ${JSON.stringify(multiMonth.suggestions)}

${formattedHistory ? `Recent Conversation:\n${formattedHistory}\n` : ''}
User Question: "${cleanMsg}"

Your Answer:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      if (text) {
        return res.status(200).json({
          success: true,
          data: {
            reply: text,
          },
        });
      }
    } catch (err) {
      console.warn('[Gemini AI Fallback to local intelligent advisor]:', err.message);
    }
  }

  // 3. Intelligent Local Advisor Engine (Instant, reliable, grounded in real MongoDB data)
  const localResult = runDeterministicAdvisor({
    message: cleanMsg,
    conversationHistory,
    summary,
    budgets,
    categories,
    multiMonth,
    goals,
    recentExpenses,
    recurringPlan,
    currency,
  });

  res.status(200).json({
    success: true,
    data: localResult,
  });
});

/**
 * Natural Language / Speech Transaction Parser (ADD & DELETE)
 * POST /api/ai/parse-voice
 */
export const parseVoiceTransaction = catchAsync(async (req, res, next) => {
  const { transcript } = req.body;
  if (!transcript || !transcript.trim()) {
    return next(new AppError('Please provide a speech transcript to parse.', 400));
  }

  const text = transcript.toLowerCase();
  const userId = req.user._id;
  const userCurrency = req.user.currency || 'INR';

  // ==========================================
  // 1. VOICE DELETION INTENT
  // ==========================================
  if (text.includes('delete') || text.includes('remove') || text.includes('cancel transaction')) {
    const amount = extractAmountFromText(text);
    const category = detectCategoryFromText(text);
    let targetTx = null;

    if (amount) {
      const query = { userId, amount };
      if (category !== 'Other') {
        query.category = category;
      }
      targetTx = await Transaction.findOne(query).sort('-createdAt');
    }

    if (!targetTx) {
      targetTx = await Transaction.findOne({ userId }).sort('-createdAt');
    }

    if (!targetTx) {
      return next(new AppError('No matching transaction found in your records to delete.', 404));
    }

    const currSymbol = userCurrency === 'USD' ? '$' : userCurrency === 'EUR' ? '€' : '₹';
    const indianDate = formatIndianDate(targetTx.date);
    return res.status(200).json({
      success: true,
      data: {
        type: 'DELETE_PROPOSAL',
        action: 'CONFIRM_DELETE',
        confirmationPrompt: `Delete ${currSymbol}${targetTx.amount.toLocaleString('en-IN')} ${targetTx.category} transaction (${targetTx.merchantOrSource || targetTx.category})${indianDate ? ` from ${indianDate}` : ''}?`,
        transactionToDelete: {
          id: targetTx._id,
          amount: targetTx.amount,
          category: targetTx.category,
          type: targetTx.type,
          merchantOrSource: targetTx.merchantOrSource || targetTx.category,
          date: targetTx.date,
          dateFormatted: indianDate,
        },
      },
    });
  }

  // ==========================================
  // 2. VOICE ADD INTENT (EXPENSE OR INCOME)
  // ==========================================
  const parsed = parseNaturalTransaction(transcript, userCurrency);

  if (parsed.status === 'INCOMPLETE') {
    return res.status(200).json({
      success: true,
      data: {
        type: 'INCOMPLETE_PROPOSAL',
        missingField: parsed.missingField,
        reply: parsed.reply,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      type: 'PROPOSAL',
      action: 'CONFIRM_TRANSACTIONS',
      confirmationPrompt: parsed.confirmationPrompt,
      proposal: parsed.proposal,
      proposals: [parsed.proposal],
    },
  });
});
