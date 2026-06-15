/* ============================================================
   SENTIMO — App Bootstrapper & Router
   Main entry point: initializes IndexedDB, loads state,
   seeds demo data on first run, manages hash-based routing,
   and coordinates view lifecycle.
   ============================================================ */

import { openDB, isEmpty } from './db.js';
import * as store from './store.js';
import { generateSeedData } from './seed-data.js';
import { initCommandBar, openCommandBar } from './command-bar.js';
import { renderDashboard } from './dashboard.js';
import { renderWallets } from './wallets.js';
import { renderPlan } from './plan.js';
import { renderTransactions } from './transactions.js';
import { initCharts, destroyCharts } from './analytics.js';
import { renderWrap } from './wrap.js';
import { exportJSON, importJSON, exportCSV, importCSV } from './data-io.js';
import * as db from './db.js';
import { showConfirm } from './ui.js';
import { initAuth, logOut, signInWithGoogle } from './auth.js';
import { initCurrencyRates } from './currency.js';

/* ============================================================
   VIEW REGISTRY
   ============================================================ */
const views = {
  dashboard: {
    render: renderDashboard,
    afterRender: () => initCharts(),
    beforeDestroy: () => destroyCharts(),
  },
  wallets: {
    render: renderWallets,
  },
  plan: {
    render: renderPlan,
  },
  history: {
    render: renderTransactions,
  },
  wrap: {
    render: renderWrap,
  },
};

let currentView = null;
let viewContainer = null;

/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  viewContainer = document.getElementById('view-container');
  setupNavigation();
  setupSettingsModal();
  initCommandBar();
  
  // Setup additional UI features regardless of auth state so buttons work
  setupThemeToggle();
  setupPawiChat();

  // Initialize Authentication. The app only boots up after anonymous login.
  initAuth(async (user) => {
    try {
      // Hide login overlay, show app shell
      const loginOverlay = document.getElementById('login-overlay');
      const appShell = document.getElementById('app-shell');
      if (loginOverlay) loginOverlay.classList.remove('active');
      if (appShell) appShell.style.display = 'flex';

      // Wait for DB to be fully ready before proceeding
      await openDB();
      
      // Initialize live currency rates
      await initCurrencyRates();

      // Step 3: Load all data into memory store with timeout
      try {
        await Promise.race([
          store.loadState(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout loading state")), 4000))
        ]);
      } catch (loadErr) {
        console.error('Failed to load state from database:', loadErr);
        showToast('Could not load saved data from the cloud. Running in offline mode.', 'warning');
      }

      // Route to initial view
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      navigateTo(hash);

      // Listen for store events to refresh current view
      store.subscribe(store.Events.TRANSACTION_ADDED, () => refreshView());
      store.subscribe(store.Events.TRANSACTION_DELETED, () => refreshView());
      store.subscribe(store.Events.ACCOUNT_UPDATED, () => refreshView());
      store.subscribe(store.Events.DATA_IMPORTED, () => refreshView());

      // Listen for view changes
      store.subscribe(store.Events.VIEW_CHANGED, (view) => {
        navigateTo(view);
      });

      // Gamification subscriptions
      store.subscribe(store.Events.TRANSACTION_ADDED, updatePawiUI);
      store.subscribe(store.Events.GOAL_ADDED, updatePawiUI);
      store.subscribe('pawi:levelup', async (level) => {
        const { showToast } = await import('./ui.js');
        showToast(`🎉 Pawi leveled up to Level ${level}!`, 'success');
        updatePawiUI();
      });

      // Initial Pawi UI state
      updatePawiUI();

      console.log('Pawi initialized successfully.');

    } catch (err) {
      console.error('App initialization error:', err);
      // Fallback: render dashboard anyway so UI doesn't hang
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      navigateTo(hash);
      showToast('Cloud database unreachable. Running in offline mode.', 'error');
    }
  }, () => {
    console.log('User signed out or auth failed');
    if (viewContainer) viewContainer.innerHTML = '';
    
    // Show login overlay, hide app shell
    const loginOverlay = document.getElementById('login-overlay');
    const appShell = document.getElementById('app-shell');
    if (loginOverlay) loginOverlay.classList.add('active');
    if (appShell) appShell.style.display = 'none';
  });
});

/* ============================================================
   ROUTING
   ============================================================ */

/**
 * Navigate to a view by name.
 * @param {string} viewName - 'dashboard' | 'wallets' | 'plan' | 'history'
 */
function navigateTo(viewName) {
  if (!views[viewName]) viewName = 'dashboard';

  // Destroy current view
  if (currentView && views[currentView]?.beforeDestroy) {
    views[currentView].beforeDestroy();
  }

  // Update URL hash
  window.location.hash = viewName;

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });
  document.querySelectorAll('.bottom-nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Render new view
  currentView = viewName;
  if (viewContainer) {
    viewContainer.innerHTML = '';
    views[viewName].render(viewContainer);

    // After render hooks (e.g., init charts)
    if (views[viewName].afterRender) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        views[viewName].afterRender();
      });
    }
  }
}

/**
 * Refresh the current view (re-render with latest data).
 */
function refreshView() {
  if (currentView && viewContainer) {
    if (views[currentView]?.beforeDestroy) {
      views[currentView].beforeDestroy();
    }
    views[currentView].render(viewContainer);
    if (views[currentView]?.afterRender) {
      requestAnimationFrame(() => {
        views[currentView].afterRender();
      });
    }
  }
}

/* ============================================================
   THEME TOGGLE
   ============================================================ */

function setupThemeToggle() {
  const darkBtn  = document.getElementById('theme-dark-btn');
  const lightBtn = document.getElementById('theme-light-btn');
  if (!darkBtn || !lightBtn) return;

  // Apply saved theme preference on load
  const saved = localStorage.getItem('sentimo-theme') || 'dark';
  applyTheme(saved);

  darkBtn.addEventListener('click', () => applyTheme('dark'));
  lightBtn.addEventListener('click', () => applyTheme('light'));
}

function applyTheme(theme) {
  const darkBtn  = document.getElementById('theme-dark-btn');
  const lightBtn = document.getElementById('theme-light-btn');
  const html     = document.documentElement;

  if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
    darkBtn?.classList.remove('active');
    lightBtn?.classList.add('active');
  } else {
    html.removeAttribute('data-theme');
    lightBtn?.classList.remove('active');
    darkBtn?.classList.add('active');
  }

  localStorage.setItem('sentimo-theme', theme);
}

// Make applyTheme globally accessible if needed
window.applyTheme = applyTheme;

/* ============================================================
   NAVIGATION SETUP
   ============================================================ */

function setupNavigation() {
  // Sidebar nav items
  document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.view);
    });
  });

  // Bottom nav items (mobile)
  document.querySelectorAll('.bottom-nav-item[data-view]').forEach((item) => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.view);
    });
  });

  // Hash change listener
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    if (hash !== currentView) {
      navigateTo(hash);
    }
  });

  // Command bar trigger (sidebar Quick Log button)
  document.getElementById('open-command-bar')?.addEventListener('click', () => {
    openCommandBar();
  });

  // FAB — Floating Action Button (always visible)
  document.getElementById('fab-quick-log')?.addEventListener('click', () => {
    openCommandBar();
  });

  // Auth Buttons
  document.getElementById('google-signin-btn')?.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
      window.location.reload(); // Reload to refresh data with new auth context
    } catch (e) {
      showToast('Failed to sign in with Google.', 'error');
    }
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    const isSure = await showConfirm('Sign Out', 'Are you sure you want to sign out?', 'Sign Out', true);
    if (isSure) {
      await logOut();
      window.location.reload();
    }
  });
}

/* ============================================================
   SETTINGS MODAL
   ============================================================ */

function setupSettingsModal() {
  const settingsBtn = document.getElementById('open-settings');
  const modal = document.getElementById('settings-modal-overlay');
  const closeBtn = document.getElementById('settings-modal-close');
  const cancelBtn = document.getElementById('settings-cancel');

  settingsBtn?.addEventListener('click', () => {
    modal?.classList.add('active');
    // Load current settings
    document.getElementById('settings-payday').value = store.getSettingValue('paydayDate', 15);
    document.getElementById('settings-currency').value = store.getSettingValue('defaultCurrency', 'PHP');
    document.getElementById('settings-name').value = store.getSettingValue('userName', 'User');
  });

  closeBtn?.addEventListener('click', () => modal?.classList.remove('active'));
  cancelBtn?.addEventListener('click', () => modal?.classList.remove('active'));
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  // Save settings
  document.getElementById('settings-save')?.addEventListener('click', async () => {
    const payday = parseInt(document.getElementById('settings-payday').value) || 15;
    const currency = document.getElementById('settings-currency').value || 'PHP';
    const name = document.getElementById('settings-name').value || 'User';

    await store.updateSetting('paydayDate', payday);
    await store.updateSetting('defaultCurrency', currency);
    await store.updateSetting('userName', name);

    modal?.classList.remove('active');
    refreshView();
    showToast('Settings saved', 'success');
  });

  // Export JSON
  document.getElementById('export-json')?.addEventListener('click', async () => {
    await exportJSON();
    showToast('JSON backup exported', 'success');
  });

  // Export CSV
  document.getElementById('export-csv')?.addEventListener('click', () => {
    exportCSV();
    showToast('CSV exported', 'success');
  });

  // Import JSON
  document.getElementById('import-json')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const result = await importJSON(file);
        showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) refreshView();
      }
    };
    input.click();
  });

  // Import CSV
  document.getElementById('import-csv')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const result = await importCSV(file);
        showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) refreshView();
      }
    };
    input.click();
  });

  // Clear all data
  document.getElementById('clear-data')?.addEventListener('click', async () => {
    const confirmed = await showConfirm('Wipe Account Data?', 'Are you absolutely sure? This will permanently delete all your data in the cloud and give you a clean slate. This action cannot be undone.');
    if (confirmed) {
      await db.clearAll();
      window.location.reload();
    }
  });


}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSVGs = {
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    error: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconSVGs[type] || iconSVGs.info}</span>
    <div class="toast-content">
      <div class="toast-title">${message}</div>
    </div>
    <button class="toast-close" onclick="this.closest('.toast').remove()">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  `;

  container.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Make showToast globally accessible for inline handlers
window.showToast = showToast;

/* ============================================================
   PAWI CHAT AI
   ============================================================ */
function setupPawiChat() {
  const modal = document.getElementById('pawi-chat-modal');
  const openBtn = document.getElementById('open-pawi-chat');
  const closeBtn = document.getElementById('close-pawi-chat');
  const form = document.getElementById('pawi-chat-form');
  const input = document.getElementById('pawi-chat-input');
  const body = document.getElementById('pawi-chat-body');

  if (!modal || !openBtn) return;

  openBtn.addEventListener('click', () => {
    modal.classList.add('active');
    setTimeout(() => input.focus(), 100);
  });

  const closeModal = () => modal.classList.remove('active');
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user-message animate-in';
    userMsg.style.cssText = 'display: flex; gap: 12px; align-items: flex-start; flex-direction: row-reverse; margin-bottom: 16px;';
    userMsg.innerHTML = `
      <div style="background: linear-gradient(135deg, var(--accent-green), var(--accent-teal)); color: var(--bg-primary); padding: 12px 16px; border-radius: 16px 0 16px 16px; font-size: var(--text-sm); line-height: 1.5; max-width: 85%;">
        ${escapeHTML(text)}
      </div>
    `;
    body.appendChild(userMsg);
    input.value = '';
    body.scrollTop = body.scrollHeight;

    // Show loading indicator
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'chat-message ai-message animate-in';
    loadingMsg.style.cssText = 'display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px;';
    loadingMsg.innerHTML = `
      <img src="assets/pawikan-2.png" alt="Pawi" style="width: 36px; height: 36px; border-radius: 50%; background: var(--accent-green-bg); padding: 4px; border: 1px solid var(--accent-green);">
      <div style="background: var(--bg-card); padding: 12px 16px; border-radius: 0 16px 16px 16px; border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: var(--text-sm); line-height: 1.5; max-width: 85%; opacity: 0.7;">
        Thinking... 🐢
      </div>
    `;
    body.appendChild(loadingMsg);
    body.scrollTop = body.scrollHeight;

    try {
      const accounts = store.getAccounts();
      const goals = store.getGoals();
      const contextText = `User Accounts:\n${accounts.map(a => `${a.name}: ${a.balance} ${a.currency}`).join('\n')}\n\nGoals:\n${goals.map(g => `${g.name}: ${g.savedAmount}/${g.targetAmount}`).join('\n')}`;
      
      const systemPrompt = "You are Pawi, a helpful financial AI assistant turtle for the Sentimo app. Be friendly, concise, and give financial advice or summarize the user's data. Format with markdown if needed, but keep it simple. Here is the user's current data:\n" + contextText;
      
      const response = await fetch(`http://localhost:3000/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text }]}],
          generationConfig: { temperature: 0.7 }
        })
      });

      if (!response.ok) {
        let errorMsg = `API Error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error && errorData.error.message) {
            errorMsg = `API Error: ${errorData.error.message}`;
          }
        } catch(e) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't think of anything to say! 🐢";
      
      loadingMsg.remove();
      // Replace basic markdown line breaks for simple rendering
      aiText = escapeHTML(aiText).replace(/\n/g, '<br>');
      // Replace bold markdown for simple rendering
      aiText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      showPawiMessage(aiText, body);
    } catch (err) {
      console.error(err);
      loadingMsg.remove();
      showPawiMessage(`Oops, I had trouble connecting to the Gemini API.<br><br><small style="color:var(--text-danger)">${err.message}</small><br><br>Please check your proxy server's .env file to ensure your API key is correct! 🐢`, body);
    }
  });
}

function showPawiMessage(htmlContent, body) {
  const aiMsg = document.createElement('div');
  aiMsg.className = 'chat-message ai-message animate-in';
  aiMsg.style.cssText = 'display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px;';
  aiMsg.innerHTML = `
    <img src="assets/pawikan-2.png" alt="Pawi" style="width: 36px; height: 36px; border-radius: 50%; background: var(--accent-green-bg); padding: 4px; border: 1px solid var(--accent-green);">
    <div style="background: var(--bg-card); padding: 12px 16px; border-radius: 0 16px 16px 16px; border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: var(--text-sm); line-height: 1.5; max-width: 85%;">
      ${htmlContent}
    </div>
  `;
  body.appendChild(aiMsg);
  body.scrollTop = body.scrollHeight;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/* ============================================================
   GAMIFICATION UI
   ============================================================ */
function updatePawiUI() {
  const info = store.getPawiLevelInfo();
  
  const badge = document.getElementById('pawi-level-badge');
  const bar = document.getElementById('pawi-xp-bar');
  
  if (badge) badge.textContent = `Lv ${info.level}`;
  if (bar) bar.style.width = `${Math.min(100, Math.max(0, info.progress))}%`;
  
  const mascotImg = document.getElementById('sidebar-mascot-img');
  if (mascotImg) {
    if (info.level >= 10) {
      mascotImg.style.filter = 'drop-shadow(0 4px 12px rgba(236, 72, 153, 0.5)) hue-rotate(-45deg)';
    } else if (info.level >= 5) {
      mascotImg.style.filter = 'drop-shadow(0 4px 12px rgba(234, 179, 8, 0.5)) hue-rotate(45deg)';
    } else {
      mascotImg.style.filter = '';
    }
  }
}
