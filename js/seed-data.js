/* ============================================================
   SENTIMO — Seed Data
   Realistic demo data for first-run experience.
   5 accounts, ~30 transactions, 2 goals, 4 recurring items.
   ============================================================ */

import { generateId } from './formatters.js';

/**
 * Generate seed data with IDs and realistic dates.
 * @returns {Object} { accounts, transactions, goals, recurring, settings }
 */
export function generateSeedData() {
  const now = new Date();

  // Helper to create dates relative to now
  const daysAgo = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);
    return d.toISOString();
  };

  const daysFromNow = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  };

  // --- ACCOUNT IDs ---
  const cashId = generateId();
  const gcashId = generateId();
  const bdoId = generateId();
  const bpiId = generateId();
  const rcbcId = generateId();

  // --- ACCOUNTS ---
  const accounts = [
    {
      id: cashId,
      name: 'Cash',
      type: 'debit',
      currency: 'PHP',
      balance: 5420,
      creditLimit: 0,
      color: 'green',
      icon: 'CA',
      order: 0,
    },
    {
      id: gcashId,
      name: 'GCash',
      type: 'debit',
      currency: 'PHP',
      balance: 8920,
      creditLimit: 0,
      color: 'blue',
      icon: 'GC',
      order: 1,
    },
    {
      id: bdoId,
      name: 'BDO Savings',
      type: 'debit',
      currency: 'PHP',
      balance: 45200,
      creditLimit: 0,
      color: 'yellow',
      icon: 'BD',
      order: 2,
    },
    {
      id: bpiId,
      name: 'BPI Savings',
      type: 'debit',
      currency: 'PHP',
      balance: 22450,
      creditLimit: 0,
      color: 'red',
      icon: 'BP',
      order: 3,
    },
    {
      id: rcbcId,
      name: 'RCBC Visa',
      type: 'credit',
      currency: 'PHP',
      balance: 28200, // Available credit (limit - used)
      creditLimit: 33700,
      color: 'cyan',
      icon: 'RC',
      order: 4,
    },
  ];

  // --- TRANSACTIONS ---
  const transactions = [
    // Today
    {
      id: generateId(), type: 'expense', amount: 469, category: 'Food',
      note: 'Lunch at Jollibee', accountId: gcashId, toAccountId: null,
      date: daysAgo(0), createdAt: daysAgo(0),
    },
    {
      id: generateId(), type: 'expense', amount: 180, category: 'Transport',
      note: 'Grab ride to office', accountId: gcashId, toAccountId: null,
      date: daysAgo(0), createdAt: daysAgo(0),
    },

    // Yesterday
    {
      id: generateId(), type: 'expense', amount: 220, category: 'Coffee',
      note: 'Starbucks Caramel Macchiato', accountId: cashId, toAccountId: null,
      date: daysAgo(1), createdAt: daysAgo(1),
    },
    {
      id: generateId(), type: 'expense', amount: 1250, category: 'Groceries',
      note: 'Puregold groceries', accountId: gcashId, toAccountId: null,
      date: daysAgo(1), createdAt: daysAgo(1),
    },

    // 2 days ago — SALARY
    {
      id: generateId(), type: 'income', amount: 52200, category: 'Salary',
      note: 'June salary', accountId: bdoId, toAccountId: null,
      date: daysAgo(2), createdAt: daysAgo(2),
    },

    // 3 days ago
    {
      id: generateId(), type: 'expense', amount: 3421, category: 'Bills',
      note: 'Meralco electric bill', accountId: bpiId, toAccountId: null,
      date: daysAgo(3), createdAt: daysAgo(3),
    },
    {
      id: generateId(), type: 'expense', amount: 150, category: 'Transport',
      note: 'Jeep and MRT fare', accountId: cashId, toAccountId: null,
      date: daysAgo(3), createdAt: daysAgo(3),
    },

    // 4 days ago
    {
      id: generateId(), type: 'expense', amount: 999, category: 'Subscription',
      note: 'Globe postpaid plan', accountId: gcashId, toAccountId: null,
      date: daysAgo(4), createdAt: daysAgo(4),
    },
    {
      id: generateId(), type: 'expense', amount: 549, category: 'Subscription',
      note: 'Netflix Premium', accountId: rcbcId, toAccountId: null,
      date: daysAgo(4), createdAt: daysAgo(4),
    },

    // 5 days ago
    {
      id: generateId(), type: 'transfer', amount: 5000, category: 'Transfer',
      note: 'Transfer to BPI savings', accountId: bdoId, toAccountId: bpiId,
      date: daysAgo(5), createdAt: daysAgo(5),
    },
    {
      id: generateId(), type: 'expense', amount: 2380, category: 'Groceries',
      note: 'SM Supermarket weekly grocery', accountId: gcashId, toAccountId: null,
      date: daysAgo(5), createdAt: daysAgo(5),
    },

    // 6 days ago
    {
      id: generateId(), type: 'expense', amount: 350, category: 'Food',
      note: 'Pizza delivery', accountId: cashId, toAccountId: null,
      date: daysAgo(6), createdAt: daysAgo(6),
    },

    // 7 days ago
    {
      id: generateId(), type: 'expense', amount: 1200, category: 'Shopping',
      note: 'Shopee order - phone case', accountId: gcashId, toAccountId: null,
      date: daysAgo(7), createdAt: daysAgo(7),
    },
    {
      id: generateId(), type: 'income', amount: 4500, category: 'Freelance',
      note: 'Freelance web design project', accountId: gcashId, toAccountId: null,
      date: daysAgo(7), createdAt: daysAgo(7),
    },

    // 10 days ago
    {
      id: generateId(), type: 'expense', amount: 650, category: 'Health',
      note: 'Pharmacy - vitamins', accountId: cashId, toAccountId: null,
      date: daysAgo(10), createdAt: daysAgo(10),
    },
    {
      id: generateId(), type: 'expense', amount: 899, category: 'Entertainment',
      note: 'Cinema tickets', accountId: gcashId, toAccountId: null,
      date: daysAgo(10), createdAt: daysAgo(10),
    },

    // 14 days ago
    {
      id: generateId(), type: 'expense', amount: 1500, category: 'Bills',
      note: 'Converge internet bill', accountId: bpiId, toAccountId: null,
      date: daysAgo(14), createdAt: daysAgo(14),
    },
    {
      id: generateId(), type: 'expense', amount: 800, category: 'Transport',
      note: 'Gasoline refill', accountId: cashId, toAccountId: null,
      date: daysAgo(14), createdAt: daysAgo(14),
    },

    // 17 days ago
    {
      id: generateId(), type: 'income', amount: 52200, category: 'Salary',
      note: 'May salary 2nd tranche', accountId: bdoId, toAccountId: null,
      date: daysAgo(17), createdAt: daysAgo(17),
    },
    {
      id: generateId(), type: 'transfer', amount: 10000, category: 'Transfer',
      note: 'Monthly savings transfer', accountId: bdoId, toAccountId: bpiId,
      date: daysAgo(17), createdAt: daysAgo(17),
    },

    // 20 days ago
    {
      id: generateId(), type: 'expense', amount: 3200, category: 'Shopping',
      note: 'Uniqlo clothes', accountId: rcbcId, toAccountId: null,
      date: daysAgo(20), createdAt: daysAgo(20),
    },
    {
      id: generateId(), type: 'expense', amount: 280, category: 'Food',
      note: 'McDonalds delivery', accountId: cashId, toAccountId: null,
      date: daysAgo(20), createdAt: daysAgo(20),
    },

    // 23 days ago
    {
      id: generateId(), type: 'expense', amount: 4500, category: 'Bills',
      note: 'Credit card partial payment', accountId: bdoId, toAccountId: null,
      date: daysAgo(23), createdAt: daysAgo(23),
    },

    // 25 days ago
    {
      id: generateId(), type: 'income', amount: 3200, category: 'Income',
      note: 'Online selling payout', accountId: gcashId, toAccountId: null,
      date: daysAgo(25), createdAt: daysAgo(25),
    },

    // 28 days ago
    {
      id: generateId(), type: 'expense', amount: 1800, category: 'Education',
      note: 'Udemy course bundle', accountId: rcbcId, toAccountId: null,
      date: daysAgo(28), createdAt: daysAgo(28),
    },
    {
      id: generateId(), type: 'expense', amount: 750, category: 'Health',
      note: 'Gym monthly membership', accountId: gcashId, toAccountId: null,
      date: daysAgo(28), createdAt: daysAgo(28),
    },

    // 30 days ago
    {
      id: generateId(), type: 'expense', amount: 2500, category: 'Food',
      note: 'Dinner out with friends', accountId: cashId, toAccountId: null,
      date: daysAgo(30), createdAt: daysAgo(30),
    },
  ];

  // --- GOALS ---
  const goals = [
    {
      id: generateId(),
      name: 'Bohol Trip',
      targetAmount: 18000,
      savedAmount: 9500,
      deadline: daysFromNow(45),
      color: '#22c55e',
      icon: '🏖️',
      createdAt: daysAgo(60),
    },
    {
      id: generateId(),
      name: 'Emergency Fund',
      targetAmount: 100000,
      savedAmount: 25000,
      deadline: null,
      color: '#a78bfa',
      icon: '🛡️',
      createdAt: daysAgo(90),
    },
  ];

  // --- RECURRING ---
  const recurring = [
    {
      id: generateId(),
      name: 'Monthly Salary',
      type: 'income',
      amount: 52200,
      category: 'Salary',
      accountId: bdoId,
      frequency: 'monthly',
      nextDate: daysFromNow(13),
      isActive: true,
    },
    {
      id: generateId(),
      name: 'Globe Postpaid',
      type: 'expense',
      amount: 999,
      category: 'Bills',
      accountId: gcashId,
      frequency: 'monthly',
      nextDate: daysFromNow(3),
      isActive: true,
    },
    {
      id: generateId(),
      name: 'Netflix Premium',
      type: 'expense',
      amount: 549,
      category: 'Subscription',
      accountId: rcbcId,
      frequency: 'monthly',
      nextDate: daysFromNow(18),
      isActive: true,
    },
    {
      id: generateId(),
      name: 'Online Selling Payout',
      type: 'income',
      amount: 3200,
      category: 'Income',
      accountId: gcashId,
      frequency: 'biweekly',
      nextDate: daysFromNow(8),
      isActive: true,
    },
  ];

  // --- SETTINGS ---
  const settings = [
    { key: 'defaultCurrency', value: 'PHP' },
    { key: 'paydayDate', value: 15 },
    { key: 'userName', value: 'User' },
  ];

  return { accounts, transactions, goals, recurring, settings };
}
