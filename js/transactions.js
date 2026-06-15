/* ============================================================
   SENTIMO — Transaction History View Controller
   Full transaction list with filters, search, date grouping,
   inline delete, and infinite scroll.
   ============================================================ */

import * as store from './store.js';
import { formatCurrency, formatDate } from './formatters.js';
import { convertCurrencySync } from './currency.js';
import { showConfirm } from './ui.js?v=4';

let currentFilters = {
  type: 'all',
  period: 30,
  search: '',
};

/**
 * Render the Transaction History view.
 */
export function renderTransactions(container) {
  const accounts = store.getAccounts();
  const categories = getUniqueCategories();

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">History</h1>
        <p class="view-subtitle">All your transactions in one place</p>
      </div>
      <div class="period-selector" id="history-period-selector">
        <button class="period-btn" data-period="7">7D</button>
        <button class="period-btn active" data-period="30">30D</button>
        <button class="period-btn" data-period="90">90D</button>
        <button class="period-btn" data-period="365">All</button>
      </div>
    </div>

    <!-- Pawikan History Banner -->
    <div class="pawikan-page-banner pawikan-history-banner animate-in" id="history-pawikan-banner">
      <div class="pawikan-banner-content">
        <img src="assets/pawikan-sleeping.png" alt="Pawi sleeping" class="pawikan-banner-img" id="history-mascot">
        <div class="pawikan-banner-text">
          <div class="pawikan-banner-title">🐢 Pawi's tip...</div>
          <div class="pawikan-banner-msg">Review your spending history regularly. Patterns reveal habits — and habits shape your financial future!</div>
        </div>
      </div>
    </div>

    <!-- Filters Row -->
    <div class="history-filters animate-in">
      <div class="history-search-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" class="history-search-input" id="history-search" placeholder="Search transactions...">
      </div>
      <div class="tab-group" id="history-type-tabs">
        <button class="tab-item active" data-type="all">All</button>
        <button class="tab-item" data-type="income">Income</button>
        <button class="tab-item" data-type="expense">Expense</button>
        <button class="tab-item" data-type="transfer">Transfer</button>
      </div>
    </div>

    <!-- Summary Bar -->
    <div class="history-summary animate-in stagger-1" id="history-summary">
      ${renderHistorySummary()}
    </div>

    <!-- Transaction List -->
    <div class="history-list" id="history-list">
      ${renderFilteredTransactions()}
    </div>
  `;

  bindHistoryEvents(container);
}

/* ============================================================
   RENDER HELPERS
   ============================================================ */

function renderHistorySummary() {
  const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
  const accounts = store.getAccounts();
  const transactions = getFilteredTransactions();
  
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => {
    const account = accounts.find(a => a.id === t.accountId);
    const cur = account ? account.currency : 'PHP';
    return s + convertCurrencySync(t.amount, cur, defaultCurrency);
  }, 0);
  
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => {
    const account = accounts.find(a => a.id === t.accountId);
    const cur = account ? account.currency : 'PHP';
    return s + convertCurrencySync(t.amount, cur, defaultCurrency);
  }, 0);
  
  const net = income - expenses;

  return `
    <div class="history-stat">
      <span class="history-stat-label">Income</span>
      <span class="history-stat-value income">${formatCurrency(income, defaultCurrency)}</span>
    </div>
    <div class="history-stat">
      <span class="history-stat-label">Expenses</span>
      <span class="history-stat-value expense">${formatCurrency(expenses, defaultCurrency)}</span>
    </div>
    <div class="history-stat">
      <span class="history-stat-label">Net</span>
      <span class="history-stat-value ${net >= 0 ? 'positive' : 'negative'}">${net >= 0 ? '+' : ''}${formatCurrency(net, defaultCurrency)}</span>
    </div>
    <div class="history-stat">
      <span class="history-stat-label">Count</span>
      <span class="history-stat-value">${transactions.length}</span>
    </div>
  `;
}

function getFilteredTransactions() {
  let transactions = store.getTransactions();
  const now = new Date();

  // Period filter
  if (currentFilters.period < 365) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - currentFilters.period);
    transactions = transactions.filter(t => new Date(t.date) >= cutoff);
  }

  // Type filter
  if (currentFilters.type !== 'all') {
    transactions = transactions.filter(t => t.type === currentFilters.type);
  }

  // Search filter
  if (currentFilters.search) {
    const q = currentFilters.search.toLowerCase();
    transactions = transactions.filter(t =>
      (t.note || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    );
  }

  return transactions;
}

function renderFilteredTransactions() {
  const transactions = getFilteredTransactions();
  const accounts = store.getAccounts();

  if (transactions.length === 0) {
    return `
      <div class="empty-state">
        <img src="assets/pawikan-sleeping.png" alt="Pawi sleeping" style="width:100px;height:100px;object-fit:contain;filter:drop-shadow(0 4px 16px rgba(34,197,94,0.25));margin-bottom:var(--space-4);animation:mascotSleep 3s ease-in-out infinite">
        <div class="empty-state-title">No transactions found</div>
        <div class="empty-state-text">Pawi is resting... Log one with Ctrl+K to wake things up! 🐢</div>
      </div>
    `;
  }

  // Group by date
  const grouped = {};
  transactions.forEach(tx => {
    const dateKey = new Date(tx.date).toDateString();
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(tx);
  });

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  let html = '';

  for (const [dateKey, txs] of Object.entries(grouped)) {
    let dateLabel;
    if (dateKey === today) dateLabel = 'Today';
    else if (dateKey === yesterday) dateLabel = 'Yesterday';
    else dateLabel = formatDate(new Date(dateKey), 'dayMonth');

    const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
    const dayTotal = txs.reduce((s, t) => {
      const account = accounts.find(a => a.id === t.accountId);
      const cur = account ? account.currency : 'PHP';
      const amount = convertCurrencySync(t.amount, cur, defaultCurrency);
      if (t.type === 'income') return s + amount;
      if (t.type === 'expense') return s - amount;
      return s;
    }, 0);

    html += `
      <div class="history-date-group">
        <div class="history-date-header">
          <span>${dateLabel}</span>
          <span class="history-date-total ${dayTotal >= 0 ? 'positive' : 'negative'}">
            ${dayTotal >= 0 ? '+' : ''}${formatCurrency(Math.abs(dayTotal), defaultCurrency)}
          </span>
        </div>
        ${txs.map(tx => {
          const account = accounts.find(a => a.id === tx.accountId);
          const toAccount = accounts.find(a => a.id === tx.toAccountId);
          const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
          
          return `
            <div class="history-item" data-tx-id="${tx.id}">
              <div class="transaction-icon ${tx.type}">
                ${getTypeIcon(tx.type)}
              </div>
              <div class="transaction-info">
                <div class="transaction-name">${tx.note || tx.category}</div>
                <div class="transaction-meta">
                  <span class="badge badge-${tx.type === 'income' ? 'income' : tx.type === 'expense' ? 'expense' : 'transfer'}" style="font-size:9px;padding:1px 6px">${tx.type}</span>
                  <span>${tx.category}</span>
                  <span>·</span>
                  <span>${account?.name || ''}</span>
                  ${tx.type === 'transfer' && toAccount ? `<span>→ ${toAccount.name}</span>` : ''}
                </div>
              </div>
              <div class="history-item-right">
                <div class="transaction-amount ${tx.type}">
                  ${sign}${formatCurrency(tx.amount, account?.currency || 'PHP')}
                </div>
                <div class="history-item-time">${formatDate(tx.date, 'time')}</div>
              </div>
              <button class="history-delete-btn btn-ghost btn-icon" data-tx-id="${tx.id}" title="Delete transaction">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return html;
}

function getTypeIcon(type) {
  switch (type) {
    case 'income':
      return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>';
    case 'expense':
      return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>';
    case 'transfer':
      return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>';
    default:
      return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>';
  }
}

function getUniqueCategories() {
  const transactions = store.getTransactions();
  const cats = new Set(transactions.map(t => t.category).filter(Boolean));
  return [...cats].sort();
}

/* ============================================================
   EVENT BINDING
   ============================================================ */

function bindHistoryEvents(container) {
  // Period selector
  container.querySelectorAll('#history-period-selector .period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#history-period-selector .period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilters.period = parseInt(btn.dataset.period);
      refreshList(container);
    });
  });

  // Type filter tabs
  container.querySelectorAll('#history-type-tabs .tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('#history-type-tabs .tab-item').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilters.type = tab.dataset.type;
      refreshList(container);
    });
  });

  // Search
  let searchTimer;
  container.querySelector('#history-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentFilters.search = e.target.value;
      refreshList(container);
    }, 200);
  });

  // Delete buttons
  bindDeleteButtons(container);
}

function refreshList(container) {
  const listEl = container.querySelector('#history-list');
  const summaryEl = container.querySelector('#history-summary');
  if (listEl) listEl.innerHTML = renderFilteredTransactions();
  if (summaryEl) summaryEl.innerHTML = renderHistorySummary();
  bindDeleteButtons(container);
}

function bindDeleteButtons(container) {
  container.querySelectorAll('.history-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const txId = btn.dataset.txId;
      const confirmed = await showConfirm('Delete Transaction?', 'Are you sure you want to delete this transaction? This action cannot be undone.');
      if (confirmed) {
        await store.deleteTransaction(txId);
        refreshList(container);
      }
    });
  });
}
