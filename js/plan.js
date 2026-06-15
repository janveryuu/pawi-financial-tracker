/* ============================================================
   SENTIMO — Plan View Controller
   Goals with progress bars, payday countdown, upcoming schedule
   with recurring items timeline.
   ============================================================ */

import * as store from './store.js';
import { formatCurrency, formatDate, daysUntil, generateId } from './formatters.js';
import { showConfirm } from './ui.js';

/**
 * Render the Plan view.
 */
export function renderPlan(container) {
  const goals = store.getGoals();
  const recurring = store.getRecurring();
  const paydayDate = store.getSettingValue('paydayDate', 15);

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Plan</h1>
        <p class="view-subtitle">Goals, milestones, and upcoming schedule</p>
      </div>
      <button class="btn btn-primary" id="add-goal-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        New Goal
      </button>
    </div>

    <div class="plan-layout">
      <!-- LEFT: Goals -->
      <div class="plan-goals-section">
        ${renderGoalsSummary(goals)}
        <div class="goals-grid" id="goals-grid">
          ${goals.length > 0 ? goals.map((g, i) => renderGoalCard(g, i)).join('') : `
            <div class="empty-state">
              <div class="empty-state-title">No goals yet</div>
              <div class="empty-state-text">Set savings goals and track your progress</div>
            </div>
          `}
        </div>
      </div>

      <!-- RIGHT: Payday & Upcoming -->
      <div class="plan-schedule-section">
        ${renderPaydayCountdown(paydayDate, recurring)}
        ${renderUpcomingSchedule(recurring)}
      </div>
    </div>

    <!-- Goal Modal -->
    <div class="modal-overlay" id="goal-modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title" id="goal-modal-title">New Goal</h3>
          <button class="modal-close" id="goal-modal-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="goal-edit-id" value="">
          <div class="input-group">
            <label class="input-label">Goal Name</label>
            <input type="text" class="input" id="goal-name" placeholder="e.g., Bohol Trip, Emergency Fund">
          </div>
          <div class="input-group">
            <label class="input-label">Target Amount</label>
            <input type="number" class="input" id="goal-target" placeholder="0.00" step="0.01">
          </div>
          <div class="input-group">
            <label class="input-label">Already Saved</label>
            <input type="number" class="input" id="goal-saved" placeholder="0.00" step="0.01">
          </div>
          <div class="input-group">
            <label class="input-label">Deadline (optional)</label>
            <input type="date" class="input" id="goal-deadline">
          </div>
          <div class="input-group">
            <label class="input-label">Icon</label>
            <div class="color-picker" id="goal-icon-picker">
              ${['🏖️', '🛡️', '🏠', '🚗', '💻', '🎓', '💍', '✈️', '📱', '🎉'].map((icon) => `
                <div class="color-swatch ${icon === '🏖️' ? 'selected' : ''}" 
                     data-icon="${icon}" 
                     style="background:var(--bg-card);font-size:18px;display:flex;align-items:center;justify-content:center;border:2px solid var(--border-subtle)">
                  ${icon}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="goal-modal-cancel">Cancel</button>
          <button class="btn btn-danger" id="goal-delete-btn" style="display:none">Delete</button>
          <button class="btn btn-primary" id="goal-save-btn">Save Goal</button>
        </div>
      </div>
    </div>

    <!-- Add Funds Modal -->
    <div class="modal-overlay" id="add-funds-modal-overlay">
      <div class="modal" style="max-width:400px">
        <div class="modal-header">
          <h3 class="modal-title" style="display:flex;align-items:center;gap:var(--space-2)">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-green)"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
            Add Funds to Goal
          </h3>
          <button class="modal-close" id="add-funds-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="add-funds-goal-id">
          <div id="add-funds-goal-info" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);margin-bottom:var(--space-4)"></div>
          <div class="input-group">
            <label class="input-label">Amount to Add (₱)</label>
            <input type="number" class="input" id="add-funds-amount" placeholder="Enter amount..." step="0.01" min="0.01">
          </div>
          <div id="add-funds-error" style="display:none;color:var(--accent-red);font-size:var(--text-sm);margin-top:var(--space-2)">Please enter a valid amount greater than 0.</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="add-funds-cancel">Cancel</button>
          <button class="btn btn-primary" id="add-funds-save">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Add Funds
          </button>
        </div>
      </div>
    </div>
  `;

  bindPlanEvents(container);
}

/* ============================================================
   RENDER HELPERS
   ============================================================ */

function renderGoalsSummary(goals) {
  const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const completed = goals.filter((g) => g.savedAmount >= g.targetAmount).length;

  return `
    <div class="goals-summary animate-in">
      <div class="goal-stat">
        <div class="goal-stat-value">${goals.length}</div>
        <div class="goal-stat-label">Active</div>
      </div>
      <div class="goal-stat">
        <div class="goal-stat-value">${completed}</div>
        <div class="goal-stat-label">Completed</div>
      </div>
      <div class="goal-stat">
        <div class="goal-stat-value">${formatCurrency(totalTarget, defaultCurrency)}</div>
        <div class="goal-stat-label">Total Target</div>
      </div>
    </div>
  `;
}

function renderGoalCard(goal, index) {
  const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
  const pct = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0;
  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);

  return `
    <div class="goal-card animate-in stagger-${index + 1}" data-goal-id="${goal.id}">
      <div class="goal-card-header">
        <div class="goal-card-title-group">
          <div class="goal-card-icon" style="background: ${goal.color || 'var(--accent-green)'}20; font-size: 24px">
            ${goal.icon || '🎯'}
          </div>
          <div>
            <div class="goal-card-title">${goal.name}</div>
            <div class="goal-card-subtitle">
              ${goal.deadline ? `Due ${formatDate(goal.deadline, 'short')}` : 'No deadline'}
            </div>
          </div>
        </div>
        <div class="goal-card-percentage">${Math.round(pct)}%</div>
      </div>
      
      <div class="goal-progress">
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="goal-amounts">
          <span class="goal-saved">${formatCurrency(goal.savedAmount, defaultCurrency)}</span>
          <span class="goal-target">of ${formatCurrency(goal.targetAmount, defaultCurrency)}</span>
        </div>
        <div class="goal-remaining">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>
          ${formatCurrency(remaining, defaultCurrency)} remaining
        </div>
      </div>

      <div class="goal-actions">
        <button class="btn btn-sm btn-primary add-funds-btn" data-goal-id="${goal.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Add Funds
        </button>
        <button class="btn btn-sm btn-ghost edit-goal-btn" data-goal-id="${goal.id}">Edit</button>
      </div>
    </div>
  `;
}

function renderPaydayCountdown(paydayDate, recurring) {
  const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
  const days = daysUntil(paydayDate);
  const expectedIncome = recurring
    .filter((r) => r.type === 'income' && r.isActive)
    .reduce((s, r) => s + r.amount, 0);

  // Calculate next payday date
  const now = new Date();
  let nextPayday;
  if (now.getDate() < paydayDate) {
    nextPayday = new Date(now.getFullYear(), now.getMonth(), paydayDate);
  } else {
    nextPayday = new Date(now.getFullYear(), now.getMonth() + 1, paydayDate);
  }

  return `
    <div class="payday-card animate-in">
      <div class="payday-header">
        <svg class="payday-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
        <span class="payday-label">Days Until Payday</span>
      </div>
      <div class="payday-days">${days} <span>day${days !== 1 ? 's' : ''}</span></div>
      <div class="payday-info">
        <span class="payday-amount">${formatCurrency(expectedIncome, defaultCurrency)}</span>
        <span class="payday-date">${formatDate(nextPayday, 'short')}</span>
      </div>
    </div>
  `;
}

function renderUpcomingSchedule(recurring) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const active = recurring.filter((r) => r.isActive);
  const incomeItems = active.filter((r) => r.type === 'income').sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));
  const expenseItems = active.filter((r) => r.type === 'expense').sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));

  return `
    <div class="upcoming-section animate-in stagger-2">
      <div class="upcoming-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <div>
          <div class="upcoming-title">Upcoming</div>
          <div class="upcoming-subtitle">Planned and recurring money moves</div>
        </div>
      </div>

      ${incomeItems.length > 0 ? `
        <div class="schedule-type-label income">Income</div>
        ${incomeItems.map((item) => renderScheduleItem(item, now)).join('')}
      ` : ''}

      ${expenseItems.length > 0 ? `
        <div class="schedule-type-label expenses">Expenses</div>
        ${expenseItems.map((item) => renderScheduleItem(item, now)).join('')}
      ` : ''}

      ${active.length === 0 ? `
        <div class="empty-state" style="padding: var(--space-6)">
          <div class="empty-state-text">No recurring items set up</div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderScheduleItem(item, now) {
  const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
  const nextDate = new Date(item.nextDate);
  const diffDays = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));

  let countdownText = '';
  let countdownClass = '';
  if (diffDays === 0) {
    countdownText = 'TODAY';
    countdownClass = 'today';
  } else if (diffDays === 1) {
    countdownText = 'TOMORROW';
    countdownClass = 'soon';
  } else if (diffDays <= 3) {
    countdownText = `${diffDays} DAYS LEFT`;
    countdownClass = 'soon';
  } else if (diffDays <= 7) {
    countdownText = `${diffDays} DAYS LEFT`;
    countdownClass = '';
  }

  return `
    <div class="schedule-item">
      <div class="schedule-item-icon ${item.type}">
        ${item.type === 'income' 
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>'
        }
      </div>
      <div class="schedule-item-info">
        <div class="schedule-item-name">${item.name}</div>
        <div class="schedule-item-date">${formatDate(item.nextDate, 'short')}</div>
      </div>
      <div class="schedule-item-right">
        <div class="schedule-item-amount ${item.type}">${formatCurrency(item.amount, defaultCurrency)}</div>
        ${countdownText ? `<div class="schedule-countdown ${countdownClass}">${countdownText}</div>` : ''}
      </div>
    </div>
  `;
}

/* ============================================================
   EVENT BINDING
   ============================================================ */

function bindPlanEvents(container) {
  const modal = container.querySelector('#goal-modal-overlay');
  let selectedIcon = '🏖️';

  // Add goal button
  container.querySelector('#add-goal-btn')?.addEventListener('click', () => {
    openGoalModal(modal, null);
  });

  // Edit goal buttons
  container.querySelectorAll('.edit-goal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const goal = store.getGoals().find((g) => g.id === btn.dataset.goalId);
      if (goal) openGoalModal(modal, goal);
    });
  });

  // Add funds buttons — event delegation (more reliable than forEach binding)
  const addFundsModal = container.querySelector('#add-funds-modal-overlay');
  let addFundsGoalId = null;

  const goalsGrid = container.querySelector('#goals-grid');
  goalsGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-funds-btn');
    if (!btn) return;
    e.preventDefault();
    addFundsGoalId = btn.dataset.goalId;
    const goal = store.getGoals().find((g) => g.id === addFundsGoalId);
    if (goal) {
      const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
      const pct = goal.targetAmount > 0
        ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0;
      const infoEl = container.querySelector('#add-funds-goal-info');
      if (infoEl) {
        infoEl.innerHTML = `
          <span style="font-size:28px;line-height:1">${goal.icon || '🎯'}</span>
          <div>
            <div style="font-weight:var(--weight-semibold);color:var(--text-primary);font-size:var(--text-md)">${goal.name}</div>
            <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:2px">
              ${Math.round(pct)}% complete
              &nbsp;·&nbsp;
              <span style="color:var(--accent-green);font-weight:var(--weight-medium)">₱${remaining.toLocaleString()} to go</span>
            </div>
          </div>
        `;
      }
      const amountInput = container.querySelector('#add-funds-amount');
      const errorEl = container.querySelector('#add-funds-error');
      if (amountInput) amountInput.value = '';
      if (amountInput) amountInput.style.borderColor = '';
      if (errorEl) errorEl.style.display = 'none';
      addFundsModal?.classList.add('active');
      setTimeout(() => container.querySelector('#add-funds-amount')?.focus(), 120);
    }
  });

  // Add funds modal — close
  container.querySelector('#add-funds-close')?.addEventListener('click', () => addFundsModal?.classList.remove('active'));
  container.querySelector('#add-funds-cancel')?.addEventListener('click', () => addFundsModal?.classList.remove('active'));
  addFundsModal?.addEventListener('click', (e) => { if (e.target === addFundsModal) addFundsModal.classList.remove('active'); });

  // Add funds modal — save
  container.querySelector('#add-funds-save')?.addEventListener('click', async () => {
    const amountInput = container.querySelector('#add-funds-amount');
    const errorEl = container.querySelector('#add-funds-error');
    const amount = parseFloat(amountInput.value);
    if (!amountInput.value || isNaN(amount) || amount <= 0) {
      if (amountInput) amountInput.style.borderColor = 'var(--accent-red)';
      if (errorEl) errorEl.style.display = 'block';
      amountInput?.focus();
      return;
    }
    if (amountInput) amountInput.style.borderColor = '';
    if (errorEl) errorEl.style.display = 'none';
    if (addFundsGoalId) {
      const goal = store.getGoals().find((g) => g.id === addFundsGoalId);
      if (goal) {
        goal.savedAmount = parseFloat((goal.savedAmount + amount).toFixed(2));
        await store.updateGoal(goal);
        addFundsModal?.classList.remove('active');
        renderPlan(container);
      }
    }
  });

  // Allow Enter key in amount field to submit
  container.querySelector('#add-funds-amount')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') container.querySelector('#add-funds-save')?.click();
  });

  // Modal close
  container.querySelector('#goal-modal-close')?.addEventListener('click', () => closeGoalModal(modal));
  container.querySelector('#goal-modal-cancel')?.addEventListener('click', () => closeGoalModal(modal));
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeGoalModal(modal); });

  // Icon picker
  container.querySelectorAll('#goal-icon-picker .color-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      container.querySelectorAll('#goal-icon-picker .color-swatch').forEach((s) => s.classList.remove('selected'));
      swatch.classList.add('selected');
      selectedIcon = swatch.dataset.icon;
    });
  });

  // Save goal
  container.querySelector('#goal-save-btn')?.addEventListener('click', async () => {
    const editId = container.querySelector('#goal-edit-id').value;
    const name = container.querySelector('#goal-name').value.trim();
    const targetAmount = parseFloat(container.querySelector('#goal-target').value) || 0;
    const savedAmount = parseFloat(container.querySelector('#goal-saved').value) || 0;
    const deadline = container.querySelector('#goal-deadline').value || null;

    if (!name || targetAmount <= 0) return;

    if (editId) {
      const existing = store.getGoals().find((g) => g.id === editId);
      if (existing) {
        await store.updateGoal({
          ...existing, name, targetAmount, savedAmount,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          icon: selectedIcon,
        });
      }
    } else {
      await store.addGoal({
        id: generateId(), name, targetAmount, savedAmount,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        color: '#22c55e', icon: selectedIcon,
        createdAt: new Date().toISOString(),
      });
    }

    closeGoalModal(modal);
    renderPlan(container);
  });

  // Delete goal
  container.querySelector('#goal-delete-btn')?.addEventListener('click', async () => {
    const editId = container.querySelector('#goal-edit-id').value;
    if (editId) {
      const confirmed = await showConfirm('Delete Goal?', 'Are you sure you want to delete this goal?');
      if (confirmed) {
        await store.deleteGoal(editId);
        closeGoalModal(modal);
        renderPlan(container);
      }
    }
  });
}

function openGoalModal(modal, goal) {
  document.querySelector('#goal-modal-title').textContent = goal ? 'Edit Goal' : 'New Goal';
  document.querySelector('#goal-edit-id').value = goal?.id || '';
  document.querySelector('#goal-name').value = goal?.name || '';
  document.querySelector('#goal-target').value = goal?.targetAmount || '';
  document.querySelector('#goal-saved').value = goal?.savedAmount || '';
  document.querySelector('#goal-deadline').value = goal?.deadline
    ? new Date(goal.deadline).toISOString().split('T')[0] : '';
  document.querySelector('#goal-delete-btn').style.display = goal ? 'inline-flex' : 'none';

  modal.classList.add('active');
}

function closeGoalModal(modal) {
  modal?.classList.remove('active');
}
