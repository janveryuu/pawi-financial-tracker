/* ============================================================
   SENTIMO — Reactive State Store
   Lightweight pub/sub event-driven state management.
   Holds in-memory cache of all data; syncs with IndexedDB.
   ============================================================ */

import * as db from './db.js?v=2';

/* ============================================================
   EVENT SYSTEM
   ============================================================ */
const listeners = {};

/**
 * Subscribe to a state event.
 * @param {string} event - Event name
 * @param {Function} callback - Handler function
 * @returns {Function} Unsubscribe function
 */
export function subscribe(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);

  // Return unsubscribe function
  return () => {
    listeners[event] = listeners[event].filter((cb) => cb !== callback);
  };
}

/**
 * Emit a state event to all subscribers.
 * @param {string} event - Event name
 * @param {any} data - Event payload
 */
export function emit(event, data) {
  if (listeners[event]) {
    listeners[event].forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in ${event} listener:`, err);
      }
    });
  }
}

/* ============================================================
   EVENT NAMES (Constants)
   ============================================================ */
export const Events = {
  // Data mutations
  TRANSACTION_ADDED: 'transaction:added',
  TRANSACTION_UPDATED: 'transaction:updated',
  TRANSACTION_DELETED: 'transaction:deleted',
  ACCOUNT_ADDED: 'account:added',
  ACCOUNT_UPDATED: 'account:updated',
  ACCOUNT_DELETED: 'account:deleted',
  ACCOUNTS_REORDERED: 'accounts:reordered',
  GOAL_ADDED: 'goal:added',
  GOAL_UPDATED: 'goal:updated',
  GOAL_DELETED: 'goal:deleted',
  RECURRING_ADDED: 'recurring:added',
  RECURRING_UPDATED: 'recurring:updated',
  RECURRING_DELETED: 'recurring:deleted',
  SETTINGS_UPDATED: 'settings:updated',

  // Navigation
  VIEW_CHANGED: 'view:changed',

  // UI events
  DATA_LOADED: 'data:loaded',
  DATA_IMPORTED: 'data:imported',
  COMMAND_BAR_OPENED: 'commandbar:opened',
  COMMAND_BAR_CLOSED: 'commandbar:closed',
};

/* ============================================================
   IN-MEMORY STATE CACHE
   ============================================================ */
const state = {
  accounts: [],
  transactions: [],
  goals: [],
  recurring: [],
  settings: {},
  currentView: 'dashboard',
  isLoaded: false,
};

/**
 * Get current state (read-only snapshot).
 * @returns {Object}
 */
export function getState() {
  return { ...state };
}

/**
 * Get accounts sorted by order.
 * @returns {Object[]}
 */
export function getAccounts() {
  return [...state.accounts].sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Get a single account by ID.
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getAccountById(id) {
  return state.accounts.find((a) => a.id === id);
}

/**
 * Get all transactions sorted by date (newest first).
 * @returns {Object[]}
 */
export function getTransactions() {
  return [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Get goals.
 * @returns {Object[]}
 */
export function getGoals() {
  return [...state.goals];
}

/**
 * Get recurring items.
 * @returns {Object[]}
 */
export function getRecurring() {
  return [...state.recurring];
}

/**
 * Get a setting value.
 * @param {string} key
 * @param {any} defaultValue
 * @returns {any}
 */
export function getSettingValue(key, defaultValue = null) {
  return state.settings[key] !== undefined ? state.settings[key] : defaultValue;
}

/**
 * Get Pawi's current level and XP.
 */
export function getPawiLevelInfo() {
  const xp = getSettingValue('pawiXp', 0);
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const currentLevelXp = 50 * Math.pow(level - 1, 2);
  const nextLevelXp = 50 * Math.pow(level, 2);
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  
  return { xp, level, progress, nextLevelXp, currentLevelXp };
}

export async function addXp(amount) {
  const currentXp = getSettingValue('pawiXp', 0);
  const oldLevel = getPawiLevelInfo().level;
  
  await updateSetting('pawiXp', currentXp + amount);
  
  const newLevel = getPawiLevelInfo().level;
  if (newLevel > oldLevel) {
    emit('pawi:levelup', newLevel);
  }
}

/* ============================================================
   STATE MUTATIONS — Write through to IndexedDB + emit events
   ============================================================ */

/**
 * Initialize state: load all data from IndexedDB into memory.
 */
export async function loadState() {
  const [accounts, transactions, goals, recurring, settingsArr] = await Promise.all([
    db.getAll('accounts'),
    db.getAll('transactions'),
    db.getAll('goals'),
    db.getAll('recurring'),
    db.getAll('settings'),
  ]);

  state.accounts = accounts || [];
  state.transactions = transactions || [];
  state.goals = goals || [];
  state.recurring = recurring || [];

  // Convert settings array to object
  state.settings = {};
  (settingsArr || []).forEach((s) => {
    state.settings[s.key] = s.value;
  });

  state.isLoaded = true;
  emit(Events.DATA_LOADED, getState());
}

// --- Account Mutations ---

export async function addAccount(account) {
  await db.add('accounts', account);
  state.accounts.push(account);
  emit(Events.ACCOUNT_ADDED, account);
}

export async function updateAccount(account) {
  await db.update('accounts', account);
  const idx = state.accounts.findIndex((a) => a.id === account.id);
  if (idx !== -1) state.accounts[idx] = account;
  emit(Events.ACCOUNT_UPDATED, account);
}

export async function deleteAccount(id) {
  await db.remove('accounts', id);
  state.accounts = state.accounts.filter((a) => a.id !== id);
  emit(Events.ACCOUNT_DELETED, id);
}

export async function reorderAccounts(orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    const account = state.accounts.find((a) => a.id === orderedIds[i]);
    if (account) {
      account.order = i;
      await db.update('accounts', account);
    }
  }
  emit(Events.ACCOUNTS_REORDERED, orderedIds);
}

// --- Transaction Mutations ---

export async function addTransaction(tx) {
  await db.add('transactions', tx);
  state.transactions.push(tx);

  // Update account balance
  await updateAccountBalance(tx, 'add');

  // Gamification: 10 XP per transaction
  await addXp(10);

  emit(Events.TRANSACTION_ADDED, tx);
}

export async function deleteTransaction(id) {
  const tx = state.transactions.find((t) => t.id === id);
  if (tx) {
    await db.remove('transactions', id);
    state.transactions = state.transactions.filter((t) => t.id !== id);

    // Reverse account balance
    await updateAccountBalance(tx, 'reverse');

    emit(Events.TRANSACTION_DELETED, tx);
  }
}

/**
 * Update account balances when a transaction is added or reversed.
 * @param {Object} tx - Transaction
 * @param {'add'|'reverse'} action
 */
async function updateAccountBalance(tx, action) {
  const multiplier = action === 'add' ? 1 : -1;

  if (tx.type === 'income') {
    const account = state.accounts.find((a) => a.id === tx.accountId);
    if (account) {
      account.balance += tx.amount * multiplier;
      await db.update('accounts', account);
    }
  } else if (tx.type === 'expense') {
    const account = state.accounts.find((a) => a.id === tx.accountId);
    if (account) {
      account.balance -= tx.amount * multiplier;
      await db.update('accounts', account);
    }
  } else if (tx.type === 'transfer') {
    const fromAccount = state.accounts.find((a) => a.id === tx.accountId);
    const toAccount = state.accounts.find((a) => a.id === tx.toAccountId);
    if (fromAccount) {
      fromAccount.balance -= tx.amount * multiplier;
      await db.update('accounts', fromAccount);
    }
    if (toAccount) {
      toAccount.balance += tx.amount * multiplier;
      await db.update('accounts', toAccount);
    }
  }
}

// --- Goal Mutations ---

export async function addGoal(goal) {
  await db.add('goals', goal);
  state.goals.push(goal);
  
  // Gamification: 50 XP per new goal
  await addXp(50);
  
  emit(Events.GOAL_ADDED, goal);
}

export async function updateGoal(goal) {
  await db.update('goals', goal);
  const idx = state.goals.findIndex((g) => g.id === goal.id);
  if (idx !== -1) state.goals[idx] = goal;
  emit(Events.GOAL_UPDATED, goal);
}

export async function deleteGoal(id) {
  await db.remove('goals', id);
  state.goals = state.goals.filter((g) => g.id !== id);
  emit(Events.GOAL_DELETED, id);
}

// --- Recurring Mutations ---

export async function addRecurring(item) {
  await db.add('recurring', item);
  state.recurring.push(item);
  emit(Events.RECURRING_ADDED, item);
}

export async function updateRecurring(item) {
  await db.update('recurring', item);
  const idx = state.recurring.findIndex((r) => r.id === item.id);
  if (idx !== -1) state.recurring[idx] = item;
  emit(Events.RECURRING_UPDATED, item);
}

export async function deleteRecurring(id) {
  await db.remove('recurring', id);
  state.recurring = state.recurring.filter((r) => r.id !== id);
  emit(Events.RECURRING_DELETED, id);
}

// --- Settings Mutations ---

export async function updateSetting(key, value) {
  await db.setSetting(key, value);
  state.settings[key] = value;
  emit(Events.SETTINGS_UPDATED, { key, value });
}

// --- Navigation ---

export function setCurrentView(view) {
  state.currentView = view;
  emit(Events.VIEW_CHANGED, view);
}
