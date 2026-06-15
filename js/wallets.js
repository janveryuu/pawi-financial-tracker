/* ============================================================
   SENTIMO — Wallets / Accounts View Controller
   Account cards grid, net worth header, add/edit account modal,
   credit card utilization, and drag-and-drop reordering.
   ============================================================ */

import * as store from './store.js';
import { formatCurrency, generateId } from './formatters.js';
import { convertCurrencySync } from './currency.js';
import { showConfirm } from './ui.js?v=4';

const ACCOUNT_COLORS = [
  { name: 'green', label: 'Green' },
  { name: 'blue', label: 'Blue' },
  { name: 'yellow', label: 'Gold' },
  { name: 'red', label: 'Coral' },
  { name: 'teal', label: 'Teal' },
  { name: 'cyan', label: 'Cyan' },
  { name: 'orange', label: 'Orange' },
  { name: 'purple', label: 'Purple' },
];

const CURRENCIES = ['PHP', 'USD', 'EUR', 'GBP', 'JPY'];

/* ============================================================
   WALLET BRAND ICONS — SVG representations of PH bank brands
   ============================================================ */
const WALLET_BRAND_ICONS = {
  cash: `<div class="wallet-brand-icon" style="background:transparent; overflow:visible;">
    <img src="assets/cash-logo.png" style="width:100%;height:100%;object-fit:contain;transform:scale(1.8);" alt="Cash">
  </div>`,
  gcash: `<div class="wallet-brand-icon" style="background:#007df1; overflow:hidden;">
    <img src="assets/gcash.jpg" style="width:100%;height:100%;object-fit:cover;transform:scale(1.35);" alt="GCash">
  </div>`,
  paypal: `<div class="wallet-brand-icon" style="background:white; overflow:hidden;">
    <img src="assets/Paypal-logo.png" style="width:100%;height:100%;object-fit:contain;padding:2px;" alt="PayPal">
  </div>`,
  paymaya: `<div class="wallet-brand-icon" style="background:white; overflow:hidden;">
    <img src="assets/Paymaya-logo.png" style="width:100%;height:100%;object-fit:contain;padding:3px;" alt="PayMaya">
  </div>`,
  bdo: `<div class="wallet-brand-icon" style="background:#0047BB">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
      <text x="20" y="22" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="13" fill="white">BDO</text>
      <text x="20" y="31" text-anchor="middle" font-family="Arial,sans-serif" font-weight="400" font-size="7" fill="rgba(255,255,255,0.75)">Unibank</text>
    </svg>
  </div>`,
  bpi: `<div class="wallet-brand-icon" style="background:linear-gradient(145deg,#CC1122,#8B0000)">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
      <text x="20" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="18" fill="white">BPI</text>
    </svg>
  </div>`,
  rcbc: `<div class="wallet-brand-icon" style="background:linear-gradient(180deg,#1a1f3a 55%,#B8860B 55%)">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
      <text x="20" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="10" fill="white">RCBC</text>
      <text x="20" y="33" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="9" fill="white" letter-spacing="1">VISA</text>
    </svg>
  </div>`,
};

/**
 * Return an SVG brand icon HTML string for known PH banks, or null to fall back to initials.
 * @param {string} name - Account name
 * @returns {string|null}
 */
export function getWalletBrandIcon(name) {
  const n = (name || '').toLowerCase().trim();
  if (n === 'cash')           return WALLET_BRAND_ICONS.cash;
  if (n.includes('gcash') || n.includes('g cash')) return WALLET_BRAND_ICONS.gcash;
  if (n.includes('paypal'))   return WALLET_BRAND_ICONS.paypal;
  if (n.includes('paymaya') || n.includes('maya')) return WALLET_BRAND_ICONS.paymaya;
  if (n.includes('bdo'))      return WALLET_BRAND_ICONS.bdo;
  if (n.includes('bpi'))      return WALLET_BRAND_ICONS.bpi;
  if (n.includes('rcbc'))     return WALLET_BRAND_ICONS.rcbc;
  return null;
}

/**
 * Render the Wallets view.
 */
export function renderWallets(container) {
  const accounts = store.getAccounts();
  const filter = 'all'; // Default filter

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Accounts</h1>
        <p class="view-subtitle">Manage your wallets and balances</p>
      </div>
      <button class="btn btn-primary" id="add-account-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Add Account
      </button>
    </div>

    <!-- Pawikan Wallets Banner -->
    <div class="pawikan-page-banner animate-in" id="wallets-pawikan-banner">
      <div class="pawikan-banner-content">
        <img src="assets/pawikan-2.png" alt="Pawi" class="pawikan-banner-img" id="wallets-mascot">
        <div class="pawikan-banner-text">
          <div class="pawikan-banner-title">🐢 Pawi says...</div>
          <div class="pawikan-banner-msg">Keep your wallets organized! A clear view of your money is the first step to financial freedom.</div>
        </div>
      </div>
    </div>

    ${renderWalletsNetWorth(accounts)}

    <div class="wallet-filters">
      <div class="tab-group" id="wallet-filter-tabs">
        <button class="tab-item active" data-filter="all">All</button>
        <button class="tab-item" data-filter="cash">Cash</button>
        <button class="tab-item" data-filter="debit">Debit</button>
        <button class="tab-item" data-filter="credit">Credit</button>
      </div>
    </div>

    <div class="accounts-grid" id="accounts-grid">
      ${renderAccountCards(accounts, filter)}
    </div>

    <!-- Add/Edit Account Modal -->
    <div class="modal-overlay" id="account-modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title" id="account-modal-title">Add Account</h3>
          <button class="modal-close" id="account-modal-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="account-edit-id" value="">
          <div class="input-group">
            <label class="input-label">Account Name</label>
            <input type="text" class="input" id="account-name" placeholder="e.g., GCash, BDO Savings">
          </div>
          <div class="input-group">
            <label class="input-label">Type</label>
            <select class="input" id="account-type">
              <option value="cash">Cash</option>
              <option value="debit">Debit (Bank / E-Wallet)</option>
              <option value="credit">Credit Card</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">Currency</label>
            <select class="input" id="account-currency">
              ${CURRENCIES.map((c) => `<option value="${c}" ${c === 'PHP' ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">Balance</label>
            <input type="number" class="input" id="account-balance" placeholder="0.00" step="0.01">
          </div>
          <div class="input-group" id="credit-limit-group" style="display:none">
            <label class="input-label">Credit Limit</label>
            <input type="number" class="input" id="account-credit-limit" placeholder="0.00" step="0.01">
          </div>
          <div class="input-group">
            <label class="input-label">Color</label>
            <div class="color-picker" id="account-color-picker">
              ${ACCOUNT_COLORS.map((c) => `
                <div class="color-swatch ${c.name === 'green' ? 'selected' : ''}" 
                     data-color="${c.name}" 
                     style="background: var(--brand-${c.name})"
                     title="${c.label}"></div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="account-modal-cancel">Cancel</button>
          <button class="btn btn-danger" id="account-delete-btn" style="display:none">Delete</button>
          <button class="btn btn-primary" id="account-save-btn">Save Account</button>
        </div>
      </div>
    </div>
  `;

  bindWalletEvents(container);
}

/* ============================================================
   RENDER HELPERS
   ============================================================ */

function renderWalletsNetWorth(accounts) {
  const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
  const debitTotal = accounts.filter((a) => a.type !== 'credit').reduce((s, a) => s + convertCurrencySync(a.balance, a.currency || 'PHP', defaultCurrency), 0);
  const creditUsed = accounts.filter((a) => a.type === 'credit').reduce((s, a) => s + convertCurrencySync(a.creditLimit - a.balance, a.currency || 'PHP', defaultCurrency), 0);
  const netWorth = debitTotal - creditUsed;

  return `
    <div class="wallets-header animate-in">
      <div class="wallets-net-worth">
        <div class="wallets-net-worth-info">
          <span class="wallets-nw-label">Net Worth</span>
          <span class="wallets-nw-amount">${formatCurrency(netWorth, defaultCurrency)}</span>
          <div>
            <span class="wallets-nw-change positive">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
              5.8%
            </span>
            <span class="wallets-nw-subtitle">Debit balances and investments</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAccountCards(accounts, filter) {
  let filtered = accounts;
  if (filter === 'cash') filtered = accounts.filter((a) => a.type === 'cash');
  if (filter === 'debit') filtered = accounts.filter((a) => a.type === 'debit');
  if (filter === 'credit') filtered = accounts.filter((a) => a.type === 'credit');

  if (filtered.length === 0) {
    return `
      <div class="empty-state" style="grid-column: 1 / -1">
        <div class="empty-state-title">No ${filter !== 'all' ? filter : ''} accounts</div>
        <div class="empty-state-text">Add your first account to start tracking</div>
      </div>
    `;
  }

  return filtered.map((account, i) => {
    const isCredit = account.type === 'credit';
    const used = isCredit ? (account.creditLimit - account.balance) : 0;
    const utilPct = isCredit && account.creditLimit > 0 ? ((used / account.creditLimit) * 100).toFixed(0) : 0;

    const brandIcon = getWalletBrandIcon(account.name);

    return `
      <div class="account-card animate-in stagger-${i + 1}" 
           data-color="${account.color || 'default'}" 
           data-account-id="${account.id}"
           draggable="true">
        <div class="account-card-header">
          <div class="account-card-brand">
            <div class="account-card-logo" style="${brandIcon ? 'background:transparent; border:none;' : ''}">
              ${brandIcon || account.icon || account.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div class="account-card-name">${account.name}</div>
              <div class="account-card-type-badge">${isCredit ? 'Credit' : (account.type === 'cash' ? 'Cash' : 'Debit')} · ${account.currency}</div>
            </div>
          </div>
          <button class="account-card-menu" data-account-id="${account.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>

        <div class="account-card-balance-section">
          <div class="account-card-balance-label">BALANCE</div>
          <div class="account-card-balance">${formatCurrency(account.balance, account.currency)}</div>
          ${isCredit ? `
            <div class="credit-utilization">
              <div class="credit-bar">
                <div class="credit-bar-fill" style="width: ${utilPct}%"></div>
              </div>
              <div class="credit-info">
                <span><strong>${utilPct}%</strong> used</span>
                <span>${formatCurrency(account.balance, account.currency)} left</span>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

/* ============================================================
   EVENT BINDING
   ============================================================ */

function bindWalletEvents(container) {
  const modal = container.querySelector('#account-modal-overlay');
  const grid = container.querySelector('#accounts-grid');
  let selectedColor = 'green';
  let draggedEl = null;

  // Filter tabs
  container.querySelectorAll('#wallet-filter-tabs .tab-item').forEach((tab) => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('#wallet-filter-tabs .tab-item').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      grid.innerHTML = renderAccountCards(store.getAccounts(), tab.dataset.filter);
      setupDragAndDrop();
    });
  });

  // Add account button
  container.querySelector('#add-account-btn')?.addEventListener('click', () => {
    openAccountModal(modal, null);
  });

  // Account card menu (edit)
  grid.addEventListener('click', (e) => {
    const menuBtn = e.target.closest('.account-card-menu');
    if (menuBtn) {
      const accountId = menuBtn.dataset.accountId;
      const account = store.getAccountById(accountId);
      if (account) openAccountModal(modal, account);
    }
  });

  // Modal close
  container.querySelector('#account-modal-close')?.addEventListener('click', () => closeModal(modal));
  container.querySelector('#account-modal-cancel')?.addEventListener('click', () => closeModal(modal));
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });

  // Account type toggle
  container.querySelector('#account-type')?.addEventListener('change', (e) => {
    container.querySelector('#credit-limit-group').style.display =
      e.target.value === 'credit' ? 'block' : 'none';
  });

  // Color picker
  container.querySelectorAll('.color-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      container.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('selected'));
      swatch.classList.add('selected');
      selectedColor = swatch.dataset.color;
    });
  });

  // Save account
  container.querySelector('#account-save-btn')?.addEventListener('click', async () => {
    const editId = container.querySelector('#account-edit-id').value;
    const name = container.querySelector('#account-name').value.trim();
    const type = container.querySelector('#account-type').value;
    const currency = container.querySelector('#account-currency').value;
    const balance = parseFloat(container.querySelector('#account-balance').value) || 0;
    const creditLimit = parseFloat(container.querySelector('#account-credit-limit').value) || 0;

    if (!name) return;

    if (editId) {
      // Update existing
      const existing = store.getAccountById(editId);
      if (existing) {
        await store.updateAccount({
          ...existing,
          name,
          type,
          currency,
          balance,
          creditLimit: type === 'credit' ? creditLimit : 0,
          color: selectedColor,
          icon: name.substring(0, 2).toUpperCase(),
        });
      }
    } else {
      // Add new
      const accounts = store.getAccounts();
      await store.addAccount({
        id: generateId(),
        name,
        type,
        currency,
        balance,
        creditLimit: type === 'credit' ? creditLimit : 0,
        color: selectedColor,
        icon: name.substring(0, 2).toUpperCase(),
        order: accounts.length,
      });
    }

    closeModal(modal);
    renderWallets(container);
  });

  // Delete account
  container.querySelector('#account-delete-btn')?.addEventListener('click', async () => {
    const editId = container.querySelector('#account-edit-id').value;
    if (editId) {
      const confirmed = await showConfirm('Delete Account?', 'Are you sure you want to delete this account? This will not delete its transactions, but they will be orphaned.');
      if (confirmed) {
        await store.deleteAccount(editId);
        closeModal(modal);
        renderWallets(container);
      }
    }
  });

  // Setup drag and drop
  function setupDragAndDrop() {
    const cards = grid.querySelectorAll('.account-card');
    cards.forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        draggedEl = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        grid.querySelectorAll('.account-card').forEach((c) => c.classList.remove('drag-over'));

        // Save new order
        const orderedIds = [...grid.querySelectorAll('.account-card')].map((c) => c.dataset.accountId);
        store.reorderAccounts(orderedIds);
        draggedEl = null;
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedEl !== card) {
          card.classList.add('drag-over');
        }
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        if (draggedEl && draggedEl !== card) {
          // Swap positions in DOM
          const allCards = [...grid.children];
          const dragIdx = allCards.indexOf(draggedEl);
          const dropIdx = allCards.indexOf(card);
          if (dragIdx < dropIdx) {
            card.parentNode.insertBefore(draggedEl, card.nextSibling);
          } else {
            card.parentNode.insertBefore(draggedEl, card);
          }
        }
      });
    });
  }

  setupDragAndDrop();
}

function openAccountModal(modal, account) {
  if (!modal) return;
  const container = modal.closest('.view-container') || modal.parentElement;

  document.querySelector('#account-modal-title').textContent = account ? 'Edit Account' : 'Add Account';
  document.querySelector('#account-edit-id').value = account?.id || '';
  document.querySelector('#account-name').value = account?.name || '';
  document.querySelector('#account-type').value = account?.type || 'debit';
  document.querySelector('#account-currency').value = account?.currency || 'PHP';
  document.querySelector('#account-balance').value = account?.balance || '';
  document.querySelector('#account-credit-limit').value = account?.creditLimit || '';
  document.querySelector('#credit-limit-group').style.display =
    (account?.type === 'credit') ? 'block' : 'none';
  document.querySelector('#account-delete-btn').style.display = account ? 'inline-flex' : 'none';

  // Select color
  const color = account?.color || 'green';
  document.querySelectorAll('.color-swatch').forEach((s) => {
    s.classList.toggle('selected', s.dataset.color === color);
  });

  modal.classList.add('active');
}

function closeModal(modal) {
  modal?.classList.remove('active');
}
