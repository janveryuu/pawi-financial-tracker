/* ============================================================
   SENTIMO — Dashboard View Controller
   Three-panel dashboard: wallet sidebar, activity feed, analytics.
   Renders insight banner, today's summary, transaction list,
   and mini charts.
   ============================================================ */

import * as store from './store.js';
import { formatCurrency, formatDate, getGreeting, isSameDay, startOfDay, getDateRange, CATEGORY_COLORS } from './formatters.js';
import { generateInsight } from './insights.js';
import { getWalletBrandIcon } from './wallets.js';
import { convertCurrencySync } from './currency.js';

/**
 * Render the full dashboard view.
 * @param {HTMLElement} container - The view container element
 */
export function renderDashboard(container) {
  const accounts = store.getAccounts();
  const transactions = store.getTransactions();
  const now = new Date();

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- LEFT PANEL: Wallet Summary -->
      <div class="dashboard-left">
        ${renderNetWorthCard(accounts)}
        ${renderQuickAccounts(accounts)}
        <div class="view-all-link" id="view-all-accounts">
          View all accounts
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>

      <!-- CENTER PANEL: Activity Feed -->
      <div class="dashboard-center">
        ${renderGreeting()}
        ${renderInsightBanner()}
        ${renderMiniChartSection(transactions)}
        ${renderTodaySummary(transactions)}
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recent Transactions</h3>
            <div class="period-selector" id="tx-period-selector">
              <button class="period-btn active" data-period="7">7D</button>
              <button class="period-btn" data-period="30">30D</button>
              <button class="period-btn" data-period="90">All</button>
            </div>
          </div>
          <div class="transaction-list" id="transaction-list">
            ${renderTransactionList(transactions, 7)}
          </div>
        </div>
      </div>

      <!-- RIGHT PANEL: Analytics -->
      <div class="dashboard-right">
        <div class="chart-card">
          <div class="chart-card-header">
            <div>
              <div class="chart-title">Cashflow</div>
              <div class="chart-subtitle">Last 30 days</div>
            </div>
          </div>
          <div class="cashflow-chart-wrapper">
            <canvas id="cashflow-chart"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header">
            <div>
              <div class="chart-title">Spending by Category</div>
              <div class="chart-subtitle">This month</div>
            </div>
          </div>
          <div class="donut-container">
            <div class="donut-chart-wrapper">
              <canvas id="donut-chart"></canvas>
              <div class="donut-center-text">
                <div class="donut-center-label">Total</div>
                <div class="donut-center-amount" id="donut-total">₱0</div>
              </div>
            </div>
            <div class="donut-legend" id="donut-legend"></div>
          </div>
        </div>

        ${renderIncomeStatement(transactions)}
      </div>
    </div>
  `;

  // Bind events
  bindDashboardEvents(container);
}

/* ============================================================
   RENDER HELPERS
   ============================================================ */

function renderNetWorthCard(accounts) {
  const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
  const debitTotal = accounts
    .filter((a) => a.type === 'debit')
    .reduce((sum, a) => sum + convertCurrencySync(a.balance, a.currency || 'PHP', defaultCurrency), 0);
  const creditUsed = accounts
    .filter((a) => a.type === 'credit')
    .reduce((sum, a) => sum + convertCurrencySync(a.creditLimit - a.balance, a.currency || 'PHP', defaultCurrency), 0);
  const netWorth = debitTotal - creditUsed;

  // Simple mock for percentage change (we'd need historical data for real)
  const changePercent = 5.8;
  const isPositive = changePercent >= 0;

  return `
    <div class="net-worth-card animate-in">
      <div class="net-worth-label">Net Worth</div>
      <div class="net-worth-amount">${formatCurrency(netWorth, defaultCurrency)}</div>
      <div class="net-worth-change ${isPositive ? 'positive' : 'negative'}">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${isPositive ? '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>' : '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>'}
        </svg>
        ${isPositive ? '+' : ''}${changePercent}%
      </div>
    </div>
  `;
}

function renderQuickAccounts(accounts) {
  const topAccounts = accounts.slice(0, 4);
  return `
    <div class="quick-accounts">
      ${topAccounts.map((account, i) => {
        const brandIcon = getWalletBrandIcon(account.name);
        return `
        <div class="quick-account-item animate-in stagger-${i + 1}" data-account-id="${account.id}">
          <div class="quick-account-icon" style="${brandIcon ? 'background:transparent;' : `background: var(--brand-${account.color || 'default'})`}">
            ${brandIcon || account.icon || account.name.charAt(0)}
          </div>
          <div class="quick-account-info">
            <div class="quick-account-name">${account.name}</div>
            <div class="quick-account-type">${account.type === 'credit' ? 'Credit' : 'Debit'} · ${account.currency}</div>
          </div>
          <div class="quick-account-balance">${formatCurrency(account.balance, account.currency)}</div>
        </div>
      `}).join('')}
    </div>
  `;
}

function renderGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const userName = store.getSettingValue ? store.getSettingValue('userName', 'there') : 'there';

  // Time-based greeting
  let timeGreeting, timeEmoji, timeTip;
  if (hour >= 5 && hour < 12) {
    timeGreeting = 'Good Morning';
    timeEmoji = '☀️';
    timeTip = 'Start the day right — review yesterday\'s spending and set a daily budget.';
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good Afternoon';
    timeEmoji = '🌊';
    timeTip = 'Midday check-in: track any purchases you made this morning before you forget!';
  } else if (hour >= 17 && hour < 21) {
    timeGreeting = 'Good Evening';
    timeEmoji = '🌅';
    timeTip = 'Wind-down time — log today\'s transactions and see how your day went.';
  } else {
    timeGreeting = 'Hello, Night Owl';
    timeEmoji = '🌙';
    timeTip = 'Late night? Tomorrow\'s a fresh start. Every peso counts, even at midnight.';
  }

  const dateStr = now.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Rotating Pawikan tips
  const pawikanTips = [
    '🐢 Save 20% of every income before spending.',
    '🐢 Track small expenses — they add up faster than big ones!',
    '🐢 An emergency fund of 3–6 months of expenses is your shield.',
    '🐢 Pay credit card bills in full every month to avoid interest.',
    '🐢 Every centavo logged is a step toward financial freedom.',
    '🐢 Invest in yourself — knowledge is the best ROI.',
    '🐢 Budget first, spend second. Always.',
    '🐢 Slow and steady wins the financial race, just like Pawi! 🐢',
  ];
  const todayTip = pawikanTips[now.getDate() % pawikanTips.length];

  return `
    <div class="greeting-hero animate-in" id="greeting-hero">
      <div class="greeting-hero-text">
        <div class="greeting-date">${timeEmoji} ${dateStr}</div>
        <h1 class="greeting-text">${timeGreeting}, <span class="greeting-name">${userName}</span>!</h1>
        <p class="greeting-tip">${timeTip}</p>
        <div class="greeting-pawikan-tip">
          <span class="pawikan-tip-icon">🐢</span>
          <span class="pawikan-tip-text" id="pawikan-daily-tip">${todayTip.replace('🐢 ', '')}</span>
        </div>
      </div>
      <div class="greeting-hero-mascot">
        <img
          src="pawikan-2.png"
          alt="Pawi mascot"
          class="greeting-mascot-img"
          id="greeting-mascot"
          title="Hi! I'm Pawi, your finance buddy!"
          style="width: 120px; height: 120px; object-fit: contain;"
        >
        <div class="greeting-mascot-wave" id="greeting-mascot-wave">👋</div>
      </div>
    </div>
  `;
}

function renderInsightBanner() {
  const insight = generateInsight();
  return `
    <div class="insight-banner animate-in stagger-2">
      <div class="insight-header">
        <div class="insight-avatar" style="overflow: hidden; background: transparent;">
          <img src="Pawikan-Original.png" alt="Pawi" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <span class="insight-name">Pawi</span>
      </div>
      <div class="insight-text">${insight.text}</div>
    </div>
  `;
}

function renderMiniChartSection(transactions) {
  const now = new Date();
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
  const accounts = store.getAccounts();

  // Render spending category pie chart
  const categories = {};
  let totalSpent = 0; 
  // Get last 7 days spending
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayExpenses = transactions
      .filter((t) => t.type === 'expense' && new Date(t.date) >= dayStart && new Date(t.date) < dayEnd)
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const cur = account ? account.currency : 'PHP';
        return sum + convertCurrencySync(t.amount, cur, defaultCurrency);
      }, 0);

    last7.push({
      label: days[date.getDay()],
      amount: dayExpenses,
      isToday: i === 0,
    });
  }

  const maxAmount = Math.max(...last7.map((d) => d.amount), 1);

  // Today's totals
  const todayStart = startOfDay(now);
  const todayIncome = transactions
    .filter((t) => t.type === 'income' && new Date(t.date) >= todayStart)
    .reduce((sum, t) => {
      const account = accounts.find(a => a.id === t.accountId);
      const cur = account ? account.currency : 'PHP';
      return sum + convertCurrencySync(t.amount, cur, defaultCurrency);
    }, 0);
  const todayExpense = transactions
    .filter((t) => t.type === 'expense' && new Date(t.date) >= todayStart)
    .reduce((sum, t) => {
      const account = accounts.find(a => a.id === t.accountId);
      const cur = account ? account.currency : 'PHP';
      return sum + convertCurrencySync(t.amount, cur, defaultCurrency);
    }, 0);

  return `
    <div class="mini-chart-section animate-in stagger-3">
      <div class="card card-sm">
        <div class="summary-label">Last 7 Days</div>
        <div class="mini-bar-chart">
          ${last7.map((d) => `
            <div class="mini-bar ${d.isToday ? '' : 'expense'}" 
                 style="height: ${Math.max((d.amount / maxAmount) * 100, 6)}%"
                 title="${d.label}: ${formatCurrency(d.amount, defaultCurrency)}">
              <span class="mini-bar-label">${d.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card card-sm">
        <div class="summary-label">Today</div>
        <div style="margin-top: var(--space-3)">
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
            <span class="summary-amount income" style="font-size:var(--text-lg)">${formatCurrency(todayIncome, defaultCurrency)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
            <span class="summary-amount expense" style="font-size:var(--text-lg)">${formatCurrency(todayExpense, defaultCurrency)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTodaySummary(transactions) {
  return ''; // Incorporated into mini chart section above
}

function renderTransactionList(transactions, days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  let filtered;
  if (days >= 90) {
    filtered = transactions;
  } else {
    filtered = transactions.filter((t) => new Date(t.date) >= cutoff);
  }

  if (filtered.length === 0) {
    return `
        <div class="empty-state" style="text-align: center; padding: var(--space-8) 0;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); margin-bottom: var(--space-4); margin-left: auto; margin-right: auto;"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          <h3 style="font-size: var(--text-lg); margin-bottom: var(--space-2);">No transactions yet</h3>
          <p style="color: var(--text-tertiary);">Start logging to see your recent activity.</p>
        </div>
    `;
  }

  // Group by date
  const grouped = {};
  filtered.forEach((tx) => {
    const dateKey = new Date(tx.date).toDateString();
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(tx);
  });

  const accounts = store.getAccounts();

  let html = '';
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const [dateKey, txs] of Object.entries(grouped)) {
    let dateLabel;
    if (dateKey === today) dateLabel = 'Today';
    else if (dateKey === yesterday) dateLabel = 'Yesterday';
    else dateLabel = formatDate(new Date(dateKey), 'dayMonth');

    html += `<div class="transaction-date-header">${dateLabel}</div>`;

    txs.forEach((tx) => {
      const account = accounts.find((a) => a.id === tx.accountId);
      const typeClass = tx.type;
      const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';

      html += `
        <div class="transaction-item" data-tx-id="${tx.id}">
          <div class="transaction-icon ${typeClass}">
            ${getTransactionIcon(tx.type)}
          </div>
          <div class="transaction-info">
            <div class="transaction-name">${tx.note || tx.category}</div>
            <div class="transaction-meta">
              <span>${tx.category}</span>
              <span>·</span>
              <span>${account?.name || ''}</span>
              <span>·</span>
              <span>${formatDate(tx.date, 'time')}</span>
            </div>
          </div>
          <div class="transaction-amount ${typeClass}">
            ${sign}${formatCurrency(tx.amount, account?.currency || 'PHP')}
          </div>
        </div>
      `;
    });
  }

  return html;
}

function renderIncomeStatement(transactions) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
  const accounts = store.getAccounts();
  const monthTx = transactions.filter((t) => new Date(t.date) >= thirtyDaysAgo);
  const totalIncome = monthTx.filter((t) => t.type === 'income').reduce((sum, t) => {
    const account = accounts.find(a => a.id === t.accountId);
    const cur = account ? account.currency : 'PHP';
    return sum + convertCurrencySync(t.amount, cur, defaultCurrency);
  }, 0);
  const totalExpenses = monthTx.filter((t) => t.type === 'expense').reduce((sum, t) => {
    const account = accounts.find(a => a.id === t.accountId);
    const cur = account ? account.currency : 'PHP';
    return sum + convertCurrencySync(t.amount, cur, defaultCurrency);
  }, 0);
  const netFlow = totalIncome - totalExpenses;
  const txCount = monthTx.length;

  return `
    <div class="income-statement">
      <div class="income-statement-header">
        <div class="income-statement-title">Income Statement</div>
        <span class="badge badge-neutral">30 Days</span>
      </div>
      <div class="income-statement-rows">
        <div class="is-row">
          <div class="is-row-label"><span class="dot income"></span> Total Income</div>
          <div class="is-row-value income">${formatCurrency(totalIncome, defaultCurrency)}</div>
        </div>
        <div class="is-row">
          <div class="is-row-label"><span class="dot expense"></span> Total Expenses</div>
          <div class="is-row-value expense">${formatCurrency(totalExpenses, defaultCurrency)}</div>
        </div>
        <div class="is-row total">
          <div class="is-row-label"><span class="dot net"></span> Net Flow</div>
          <div class="is-row-value ${netFlow >= 0 ? 'positive' : 'negative'}">${netFlow >= 0 ? '+' : ''}${formatCurrency(netFlow, defaultCurrency)}</div>
        </div>
      </div>
      <div class="is-count">${txCount} transactions in this period</div>
    </div>
  `;
}

function getTransactionIcon(type) {
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

/**
 * Bind dashboard event listeners.
 */
function bindDashboardEvents(container) {
  // View all accounts link
  container.querySelector('#view-all-accounts')?.addEventListener('click', () => {
    store.setCurrentView('wallets');
  });

  // Period selector for transactions
  container.querySelectorAll('#tx-period-selector .period-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#tx-period-selector .period-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const period = parseInt(btn.dataset.period);
      const txList = container.querySelector('#transaction-list');
      if (txList) {
        txList.innerHTML = renderTransactionList(store.getTransactions(), period);
      }
    });
  });
}
