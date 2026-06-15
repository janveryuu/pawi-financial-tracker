/* ============================================================
   SENTIMO — Analytics / Chart Rendering
   Chart.js integration for cashflow area chart and 
   expense distribution donut chart.
   ============================================================ */

import * as store from './store.js';
import { formatCurrency, startOfDay, getDateRange, CATEGORY_COLORS } from './formatters.js';
import { convertCurrencySync } from './currency.js';

/* ============================================================
   CHART.JS DARK THEME DEFAULTS
   ============================================================ */

function setChartDefaults() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = '#1e2130';
  Chart.defaults.plugins.tooltip.titleColor = '#f1f5f9';
  Chart.defaults.plugins.tooltip.bodyColor = '#94a3b8';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.displayColors = true;
  Chart.defaults.plugins.tooltip.boxPadding = 4;
  Chart.defaults.animation.duration = 800;
  Chart.defaults.animation.easing = 'easeOutQuart';
}

/* ============================================================
   CASHFLOW AREA CHART
   ============================================================ */

let cashflowChart = null;

/**
 * Render the cashflow area chart.
 * Shows income vs expenses over the last 30 days.
 */
export function renderCashflowChart() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded');
    return;
  }

  setChartDefaults();

  const canvas = document.getElementById('cashflow-chart');
  if (!canvas) return;

  // Destroy previous instance
  if (cashflowChart) {
    cashflowChart.destroy();
    cashflowChart = null;
  }

  const transactions = store.getTransactions();
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Generate date range
  const dates = getDateRange(startOfDay(thirtyDaysAgo), startOfDay(now));

  // Aggregate daily income and expenses
  const incomeData = [];
  const expenseData = [];
  const labels = [];

  dates.forEach((date) => {
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
    const accounts = store.getAccounts();

    const dayIncome = transactions
      .filter((t) => t.type === 'income' && new Date(t.date) >= dayStart && new Date(t.date) < dayEnd)
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const cur = account ? account.currency : 'PHP';
        return sum + convertCurrencySync(t.amount, cur, defaultCurrency);
      }, 0);

    const dayExpense = transactions
      .filter((t) => t.type === 'expense' && new Date(t.date) >= dayStart && new Date(t.date) < dayEnd)
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const cur = account ? account.currency : 'PHP';
        return sum + convertCurrencySync(t.amount, cur, defaultCurrency);
      }, 0);

    incomeData.push(dayIncome);
    expenseData.push(dayExpense);

    // Short date label
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  });

  const ctx = canvas.getContext('2d');

  // Create gradients
  const incomeGradient = ctx.createLinearGradient(0, 0, 0, 240);
  incomeGradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
  incomeGradient.addColorStop(1, 'rgba(34, 197, 94, 0.02)');

  const expenseGradient = ctx.createLinearGradient(0, 0, 0, 240);
  expenseGradient.addColorStop(0, 'rgba(248, 113, 113, 0.2)');
  expenseGradient.addColorStop(1, 'rgba(248, 113, 113, 0.02)');

  cashflowChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          borderColor: '#22c55e',
          backgroundColor: incomeGradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#22c55e',
          pointHoverBorderColor: '#0f1117',
          pointHoverBorderWidth: 2,
        },
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: '#f87171',
          backgroundColor: expenseGradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#f87171',
          pointHoverBorderColor: '#0f1117',
          pointHoverBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
              return `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, defaultCurrency)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: 7,
            font: { size: 10 },
          },
        },
        y: {
          grid: {
            color: 'rgba(255,255,255,0.04)',
          },
          ticks: {
            callback: (value) => {
              if (value >= 1000) return `₱${(value / 1000).toFixed(0)}K`;
              return `₱${value}`;
            },
            maxTicksLimit: 5,
            font: { size: 10 },
          },
        },
      },
    },
  });
}

/* ============================================================
   DONUT CHART — Expense Category Breakdown
   ============================================================ */

let donutChart = null;

/**
 * Render the expense category donut chart.
 */
export function renderDonutChart() {
  if (typeof Chart === 'undefined') return;

  setChartDefaults();

  const canvas = document.getElementById('donut-chart');
  if (!canvas) return;

  if (donutChart) {
    donutChart.destroy();
    donutChart = null;
  }

  const transactions = store.getTransactions();
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
  const accounts = store.getAccounts();

  // Aggregate expenses by category
  const categoryTotals = {};
  transactions
    .filter((t) => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo)
    .forEach((t) => {
      const cat = t.category || 'Other';
      const account = accounts.find(a => a.id === t.accountId);
      const cur = account ? account.currency : 'PHP';
      const convertedAmt = convertCurrencySync(t.amount, cur, defaultCurrency);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + convertedAmt;
    });

  // Sort by amount descending
  const sorted = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a);

  if (sorted.length === 0) {
    // Show empty state
    const totalEl = document.getElementById('donut-total');
    if (totalEl) totalEl.textContent = '₱0';
    return;
  }

  const categories = sorted.map(([cat]) => cat);
  const amounts = sorted.map(([, amt]) => amt);
  const total = amounts.reduce((s, a) => s + a, 0);
  const colors = categories.map((cat) => CATEGORY_COLORS[cat] || '#64748b');

  // Update center total
  const totalEl = document.getElementById('donut-total');
  if (totalEl) totalEl.textContent = formatCurrency(total, defaultCurrency);

  // Render legend
  const legendEl = document.getElementById('donut-legend');
  if (legendEl) {
    legendEl.innerHTML = sorted.map(([cat, amt]) => `
      <div class="donut-legend-item">
        <div class="donut-legend-color" style="background: ${CATEGORY_COLORS[cat] || '#64748b'}"></div>
        <span class="donut-legend-label">${cat}</span>
        <span class="donut-legend-value">${formatCurrency(amt, defaultCurrency)}</span>
        <span class="donut-legend-pct">${((amt / total) * 100).toFixed(1)}%</span>
      </div>
    `).join('');
  }

  const ctx = canvas.getContext('2d');

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categories,
      datasets: [{
        data: amounts,
        backgroundColor: colors,
        borderColor: '#1a1d26',
        borderWidth: 3,
        hoverBorderColor: '#22252f',
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return `${ctx.label}: ${formatCurrency(ctx.parsed, defaultCurrency)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/* ============================================================
   INITIALIZE ALL CHARTS (called after dashboard renders)
   ============================================================ */

/**
 * Initialize all dashboard charts.
 * Should be called after the dashboard DOM is ready.
 */
export function initCharts() {
  // Small delay to ensure canvas elements are in DOM
  requestAnimationFrame(() => {
    renderCashflowChart();
    renderDonutChart();
  });
}

/**
 * Destroy all chart instances (for cleanup on view change).
 */
export function destroyCharts() {
  if (cashflowChart) {
    cashflowChart.destroy();
    cashflowChart = null;
  }
  if (donutChart) {
    donutChart.destroy();
    donutChart = null;
  }
}
