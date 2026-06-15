/* ============================================================
   SENTIMO — Personality-Driven Financial Insights Engine
   Generates witty, contextual commentary based on user's
   current financial state, spending patterns, and goals.
   ============================================================ */

import { getAccounts, getTransactions, getGoals, getRecurring, getSettingValue } from './store.js';
import { formatCurrency, isSameDay, startOfDay } from './formatters.js';

/**
 * Last shown insight ID, to avoid repetition.
 * Tracked in localStorage with timestamps.
 */
const INSIGHT_HISTORY_KEY = 'sentimo_insight_history';

/**
 * Get the insight history from localStorage.
 * @returns {Object} { insightId: timestamp }
 */
function getInsightHistory() {
  try {
    return JSON.parse(localStorage.getItem(INSIGHT_HISTORY_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Record that an insight was shown.
 * @param {string} insightId
 */
function recordInsight(insightId) {
  const history = getInsightHistory();
  history[insightId] = Date.now();
  // Keep only last 20 entries
  const entries = Object.entries(history).sort(([, a], [, b]) => b - a).slice(0, 20);
  localStorage.setItem(INSIGHT_HISTORY_KEY, JSON.stringify(Object.fromEntries(entries)));
}

/**
 * Check if an insight was shown recently (within 24 hours).
 * @param {string} insightId
 * @returns {boolean}
 */
function wasRecentlyShown(insightId) {
  const history = getInsightHistory();
  if (!history[insightId]) return false;
  const hoursSince = (Date.now() - history[insightId]) / (1000 * 60 * 60);
  return hoursSince < 24;
}

/* ============================================================
   INSIGHT GENERATORS — Each returns { id, text, priority }
   or null if not applicable.
   ============================================================ */

function highLiquidity() {
  const accounts = getAccounts();
  const totalBalance = accounts
    .filter(a => a.type === 'debit')
    .reduce((sum, a) => sum + a.balance, 0);

  if (totalBalance > 50000) {
    return {
      id: 'high_liquidity',
      text: `That's <em>₱${totalBalance.toLocaleString()}</em> in liquid assets. Very adult, in the best boring and financially useful way.`,
      priority: 3,
    };
  }
  return null;
}

function salaryLanded() {
  const transactions = getTransactions();
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const recentIncome = transactions.filter(
    (t) => t.type === 'income' && new Date(t.date) >= twoDaysAgo && t.amount >= 10000
  );

  if (recentIncome.length > 0) {
    const total = recentIncome.reduce((sum, t) => sum + t.amount, 0);
    const defaultCurrency = getSettingValue('defaultCurrency', 'PHP');
    return {
      id: 'salary_landed',
      text: `Salary landed with real weight — <em>${formatCurrency(total, defaultCurrency)}</em>. Nice boost, just give that money a job before lifestyle creep introduces itself.`,
      priority: 5,
    };
  }
  return null;
}

function overspendingWeek() {
  const transactions = getTransactions();
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const thisWeekExpenses = transactions
    .filter((t) => t.type === 'expense' && new Date(t.date) >= weekAgo)
    .reduce((sum, t) => sum + t.amount, 0);

  const lastWeekExpenses = transactions
    .filter((t) => t.type === 'expense' && new Date(t.date) >= twoWeeksAgo && new Date(t.date) < weekAgo)
    .reduce((sum, t) => sum + t.amount, 0);

  if (lastWeekExpenses > 0 && thisWeekExpenses > lastWeekExpenses * 1.3) {
    return {
      id: 'overspending_week',
      text: `You've been a bit generous with yourself this week. Spending is <em>${Math.round((thisWeekExpenses / lastWeekExpenses - 1) * 100)}% above</em> last week's pace. Not judging, just... observing.`,
      priority: 4,
    };
  }
  return null;
}

function goalNearCompletion() {
  const goals = getGoals();
  const nearComplete = goals.find((g) => g.targetAmount > 0 && (g.savedAmount / g.targetAmount) >= 0.9);

  if (nearComplete) {
    const pct = Math.round((nearComplete.savedAmount / nearComplete.targetAmount) * 100);
    return {
      id: `goal_near_${nearComplete.id}`,
      text: `Your <em>${nearComplete.name}</em> fund is at <em>${pct}%</em>. The finish line is practically waving at you. Keep going!`,
      priority: 4,
    };
  }
  return null;
}

function quietDay() {
  const transactions = getTransactions();
  const today = startOfDay(new Date());
  const todayTx = transactions.filter((t) => new Date(t.date) >= today);

  if (todayTx.length === 0) {
    return {
      id: 'quiet_day',
      text: `Quiet day on the books. Sometimes the best financial move is <em>no move at all</em>. Zen finance.`,
      priority: 1,
    };
  }
  return null;
}

function bigPurchase() {
  const transactions = getTransactions();
  const today = startOfDay(new Date());
  const recentExpenses = transactions.filter(
    (t) => t.type === 'expense' && new Date(t.date) >= today
  );

  const biggest = recentExpenses.reduce((max, t) => (t.amount > (max?.amount || 0) ? t : max), null);
  if (biggest && biggest.amount >= 5000) {
    const defaultCurrency = getSettingValue('defaultCurrency', 'PHP');
    return {
      id: 'big_purchase',
      text: `<em>${formatCurrency(biggest.amount, defaultCurrency)}</em> on ${biggest.category.toLowerCase()} today. That's a statement purchase. Hopefully a planned one.`,
      priority: 3,
    };
  }
  return null;
}

function savingsRate() {
  const transactions = getTransactions();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const monthIncome = transactions
    .filter((t) => t.type === 'income' && new Date(t.date) >= thirtyDaysAgo)
    .reduce((sum, t) => sum + t.amount, 0);

  const monthExpenses = transactions
    .filter((t) => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo)
    .reduce((sum, t) => sum + t.amount, 0);

  if (monthIncome > 0) {
    const rate = ((monthIncome - monthExpenses) / monthIncome) * 100;
    if (rate > 30) {
      return {
        id: 'savings_rate_good',
        text: `You're saving <em>${Math.round(rate)}%</em> of your income this month. That's genuinely impressive. Future you is doing a little victory dance.`,
        priority: 3,
      };
    }
    if (rate < 10 && rate >= 0) {
      return {
        id: 'savings_rate_low',
        text: `Savings rate is sitting at <em>${Math.round(rate)}%</em> this month. There's room to breathe, but not much. Worth a look at the bigger expenses.`,
        priority: 3,
      };
    }
  }
  return null;
}

function paydayApproaching() {
  const payday = getSettingValue('paydayDate', 15);
  const now = new Date();
  const currentDay = now.getDate();
  let daysLeft;

  if (currentDay < payday) {
    daysLeft = payday - currentDay;
  } else if (currentDay === payday) {
    daysLeft = 0;
  } else {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, payday);
    daysLeft = Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24));
  }

  if (daysLeft <= 3 && daysLeft > 0) {
    return {
      id: 'payday_approaching',
      text: `Payday in <em>${daysLeft} day${daysLeft > 1 ? 's' : ''}</em>. Almost there. The light at the end of the budget tunnel.`,
      priority: 4,
    };
  }
  if (daysLeft === 0) {
    return {
      id: 'payday_today',
      text: `It's <em>payday</em>! Time to allocate wisely. Remember: pay yourself first, bills second, fun last. Or don't. I'm a text box, not your mom.`,
      priority: 5,
    };
  }
  return null;
}

function freshStart() {
  const transactions = getTransactions();
  if (transactions.length <= 3) {
    return {
      id: 'fresh_start',
      text: `Welcome to <em>Pawi</em>. Start logging your transactions using the command bar — press <em>Ctrl+K</em> and type naturally. I'll handle the rest.`,
      priority: 5,
    };
  }
  return null;
}

function creditUtilization() {
  const accounts = getAccounts();
  const creditAccounts = accounts.filter(a => a.type === 'credit' && a.creditLimit > 0);

  for (const card of creditAccounts) {
    const used = card.creditLimit - card.balance;
    const utilization = (used / card.creditLimit) * 100;
    if (utilization > 70) {
      return {
        id: `credit_high_${card.id}`,
        text: `Your <em>${card.name}</em> is at <em>${Math.round(utilization)}% utilization</em>. The credit gods prefer you stay under 30%. Just saying.`,
        priority: 4,
      };
    }
  }
  return null;
}

/* ============================================================
   MAIN INSIGHT GENERATOR
   ============================================================ */

/**
 * Generate the best contextual insight for the current state.
 * Avoids repeating the same insight within 24 hours.
 * @returns {{ text: string, id: string }}
 */
export function generateInsight() {
  const generators = [
    freshStart,
    salaryLanded,
    paydayApproaching,
    overspendingWeek,
    goalNearCompletion,
    bigPurchase,
    savingsRate,
    highLiquidity,
    creditUtilization,
    quietDay,
  ];

  // Collect all applicable insights
  const candidates = [];
  for (const gen of generators) {
    const insight = gen();
    if (insight && !wasRecentlyShown(insight.id)) {
      candidates.push(insight);
    }
  }

  // Sort by priority (highest first)
  candidates.sort((a, b) => b.priority - a.priority);

  if (candidates.length > 0) {
    const chosen = candidates[0];
    recordInsight(chosen.id);
    return chosen;
  }

  // Fallback insight
  const fallbacks = [
    { id: 'fallback_1', text: `Your finances are looking steady. Keep tracking, keep growing. Consistency is the real flex.` },
    { id: 'fallback_2', text: `Every transaction logged is a step toward clarity. You're building a clear picture of where your money goes.` },
    { id: 'fallback_3', text: `Financial awareness is a superpower. And you, my friend, are suiting up.` },
    { id: 'fallback_4', text: `Tip: Try typing <em>"Spent 500 on groceries from GCash"</em> in the command bar. I'll parse it instantly.` },
  ];

  const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return randomFallback;
}
