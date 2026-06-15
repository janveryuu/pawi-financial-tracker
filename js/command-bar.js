/* ============================================================
   SENTIMO — Command Bar UI Controller
   Global Ctrl+K command palette with real-time NLP parsing,
   success states, undo capability, and recent commands.
   ============================================================ */

import { parse, generateSummary } from './nlp-parser.js';
import * as store from './store.js';
import { formatCurrency, formatDate, debounce } from './formatters.js';

let commandOverlay = null;
let commandInput = null;
let previewEl = null;
let successEl = null;
let recentEl = null;
let scanStatusEl = null;
let scanBtn = null;
let receiptFileInput = null;
let cameraOverlay = null;
let cameraVideo = null;
let cameraCanvas = null;
let cameraStream = null;
let currentParse = null;
let undoTimer = null;
let undoTxId = null;

// Recent commands stored in localStorage
const RECENT_KEY = 'sentimo_recent_commands';

/**
 * Initialize the command bar module.
 * Attaches global keyboard shortcut and DOM references.
 */
export function initCommandBar() {
  commandOverlay = document.getElementById('command-overlay');
  commandInput = document.getElementById('command-input');
  previewEl = document.getElementById('command-preview');
  successEl = document.getElementById('command-success');
  recentEl = document.getElementById('command-recent');
  scanStatusEl = document.getElementById('command-scan-status');
  scanBtn = document.getElementById('command-scan-btn');
  receiptFileInput = document.getElementById('receipt-file-input');
  cameraOverlay = document.getElementById('camera-overlay');
  cameraVideo = document.getElementById('camera-video');
  cameraCanvas = document.getElementById('camera-canvas');

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openCommandBar();
    }
    if (e.key === 'Escape') {
      if (cameraOverlay?.classList.contains('active')) {
        closeCamera();
      } else if (commandOverlay?.classList.contains('active')) {
        closeCommandBar();
      }
    }
  });

  // Click outside to close
  commandOverlay?.addEventListener('click', (e) => {
    if (e.target === commandOverlay) {
      closeCommandBar();
    }
  });

  // Live parse as user types
  commandInput?.addEventListener('input', debounce(handleInput, 150));

  // Submit on Enter
  commandInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && currentParse && currentParse.amount > 0) {
      e.preventDefault();
      submitTransaction();
    }
  });

  // Close button
  document.getElementById('command-close-btn')?.addEventListener('click', closeCommandBar);

  // Undo button
  document.getElementById('undo-btn')?.addEventListener('click', handleUndo);

  // Scan Receipt button — open camera
  scanBtn?.addEventListener('click', () => {
    openCamera();
  });

  // Camera close button
  document.getElementById('camera-close-btn')?.addEventListener('click', closeCamera);

  // Camera capture button
  document.getElementById('camera-capture-btn')?.addEventListener('click', capturePhoto);

  // Gallery fallback button
  document.getElementById('camera-upload-btn')?.addEventListener('click', () => {
    receiptFileInput.value = '';
    receiptFileInput.click();
  });

  // File selected from gallery fallback — kick off scan
  receiptFileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      closeCamera();
      scanReceipt(file);
    }
  });
}

/**
 * Open the command bar overlay.
 */
export function openCommandBar() {
  if (!commandOverlay) return;
  commandOverlay.classList.add('active');
  commandInput.value = '';
  currentParse = null;
  previewEl.classList.remove('active');
  successEl.classList.remove('active');
  if (scanStatusEl) scanStatusEl.innerHTML = '';
  recentEl.style.display = 'block';
  renderRecentCommands();

  // Focus input after animation
  setTimeout(() => commandInput.focus(), 100);

  store.emit(store.Events.COMMAND_BAR_OPENED);
}

/**
 * Close the command bar overlay.
 */
export function closeCommandBar() {
  if (!commandOverlay) return;
  commandOverlay.classList.remove('active');
  commandInput.value = '';
  currentParse = null;
  clearTimeout(undoTimer);

  store.emit(store.Events.COMMAND_BAR_CLOSED);
}

/**
 * Handle input changes — parse and show preview.
 */
function handleInput() {
  const value = commandInput.value.trim();

  // Reset states
  successEl.classList.remove('active');
  recentEl.style.display = 'none';

  if (!value) {
    previewEl.classList.remove('active');
    recentEl.style.display = 'block';
    renderRecentCommands();
    currentParse = null;
    return;
  }

  // Parse the input
  currentParse = parse(value);

  if (currentParse && currentParse.amount > 0) {
    renderPreview(currentParse);
    previewEl.classList.add('active');
  } else {
    previewEl.classList.remove('active');
  }
}

/**
 * Render the real-time parse preview chips.
 */
function renderPreview(parsed) {
  const accounts = store.getAccounts();
  const fromAccount = accounts.find((a) => a.id === parsed.accountId);
  const toAccount = accounts.find((a) => a.id === parsed.toAccountId);

  const typeClass = parsed.type === 'income' ? '' :
    parsed.type === 'expense' ? 'expense' :
      parsed.type === 'transfer' ? 'transfer' : '';

  let chipsHTML = `
    <div class="parse-breakdown">
      <span class="parse-chip parse-chip-type ${typeClass}">
        ${getTypeIcon(parsed.type)} ${parsed.type?.toUpperCase() || 'EXPENSE'}
      </span>
      <span class="parse-chip parse-chip-amount">
        ${formatCurrency(parsed.amount, fromAccount?.currency || 'PHP')}
      </span>
  `;

  if (parsed.category && parsed.category !== 'Other') {
    chipsHTML += `<span class="parse-chip parse-chip-category">${parsed.category}</span>`;
  }

  if (fromAccount) {
    chipsHTML += `<span class="parse-chip parse-chip-account">${fromAccount.name}</span>`;
  }

  if (parsed.type === 'transfer' && toAccount) {
    chipsHTML += `<span class="parse-arrow">→</span>`;
    chipsHTML += `<span class="parse-chip parse-chip-account">${toAccount.name}</span>`;
  }

  // Show date if not today
  const parsedDate = new Date(parsed.date);
  const today = new Date();
  if (parsedDate.toDateString() !== today.toDateString()) {
    chipsHTML += `<span class="parse-chip parse-chip-date">${formatDate(parsedDate, 'short')}</span>`;
  }

  chipsHTML += `</div>`;
  chipsHTML += `<div class="parse-hint">Press <span class="kbd">Enter</span> to log · <span class="kbd">Esc</span> to close</div>`;

  previewEl.innerHTML = chipsHTML;
}

/**
 * Submit the parsed transaction.
 */
async function submitTransaction() {
  if (!currentParse || currentParse.amount <= 0) return;

  const tx = { ...currentParse };

  try {
    await store.addTransaction(tx);

    // Save to recent commands
    saveRecentCommand(tx.rawText);

    // Show success state
    previewEl.classList.remove('active');
    recentEl.style.display = 'none';
    showSuccess(tx);

    // Set up undo timer
    undoTxId = tx.id;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
      undoTxId = null;
      closeCommandBar();
    }, 8000);

  } catch (err) {
    console.error('Failed to log transaction:', err);
  }
}

/**
 * Show success state after logging.
 */
function showSuccess(tx) {
  const summary = generateSummary(tx);

  successEl.innerHTML = `
    <div class="success-badge">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      LOGGED
    </div>
    <div class="success-details">
      <strong>${summary}</strong>
    </div>
    <button class="undo-btn" id="undo-btn" onclick="document.getElementById('undo-btn').dispatchEvent(new Event('undo'))">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
      Undo
      <span class="undo-timer"></span>
    </button>
  `;

  // Rebind undo handler
  const undoBtn = successEl.querySelector('.undo-btn');
  undoBtn?.addEventListener('click', handleUndo);

  successEl.classList.add('active');
}

/**
 * Handle undo action.
 */
async function handleUndo() {
  if (!undoTxId) return;

  try {
    await store.deleteTransaction(undoTxId);
    undoTxId = null;
    clearTimeout(undoTimer);

    // Reset command bar
    successEl.classList.remove('active');
    commandInput.value = '';
    commandInput.focus();
    recentEl.style.display = 'block';
    renderRecentCommands();
  } catch (err) {
    console.error('Undo failed:', err);
  }
}

/**
 * Get icon SVG for transaction type.
 */
function getTypeIcon(type) {
  switch (type) {
    case 'income':
      return '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>';
    case 'expense':
      return '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>';
    case 'transfer':
      return '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>';
    default:
      return '';
  }
}

/* ============================================================
   RECENT COMMANDS
   ============================================================ */

function getRecentCommands() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentCommand(text) {
  const recent = getRecentCommands();
  // Remove duplicates and add to front
  const updated = [text, ...recent.filter((r) => r !== text)].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function renderRecentCommands() {
  if (!recentEl) return;
  const recent = getRecentCommands();

  if (recent.length === 0) {
    recentEl.innerHTML = `
      <div class="command-recent-title">Try saying...</div>
      <div class="command-recent-item" data-cmd="Salary 15000">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
        Salary 15000
      </div>
      <div class="command-recent-item" data-cmd="Spent 220 on Starbucks from GCash">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
        Spent 220 on Starbucks from GCash
      </div>
      <div class="command-recent-item" data-cmd="Transfer 40k from BDO to BPI savings">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>
        Transfer 40k from BDO to BPI savings
      </div>
    `;
  } else {
    recentEl.innerHTML = `
      <div class="command-recent-title">Recent</div>
      ${recent.map((cmd) => `
        <div class="command-recent-item" data-cmd="${cmd}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${cmd}
        </div>
      `).join('')}
    `;
  }

  // Click to fill
  recentEl.querySelectorAll('.command-recent-item').forEach((item) => {
    item.addEventListener('click', () => {
      commandInput.value = item.dataset.cmd;
      handleInput();
      commandInput.focus();
    });
  });
}

/* ============================================================
   CAMERA MODAL — Device Camera Access
   ============================================================ */

/**
 * Open the camera modal and request camera access.
 */
async function openCamera() {
  if (!cameraOverlay) return;
  cameraOverlay.classList.add('active');

  try {
    // Prefer rear camera on mobile, fallback to any camera
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };

    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    cameraVideo.srcObject = cameraStream;
  } catch (err) {
    console.error('Camera error:', err);
    closeCamera();

    // Fallback: open file picker
    if (err.name === 'NotAllowedError') {
      if (!commandOverlay?.classList.contains('active')) openCommandBar();
      showScanStatus('error', 'Camera permission denied. Please allow camera access or use the Gallery button \ud83d\udcf7');
    } else {
      // Some desktop browsers don't have a camera — fall back to gallery
      receiptFileInput.value = '';
      receiptFileInput.click();
    }
  }
}

/**
 * Stop camera stream and close the modal.
 */
function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  if (cameraVideo) cameraVideo.srcObject = null;
  cameraOverlay?.classList.remove('active');

  const captureBtn = document.getElementById('camera-capture-btn');
  if (captureBtn) captureBtn.classList.remove('processing');
}

/**
 * Capture the current video frame as a Blob, then scan it.
 */
function capturePhoto() {
  if (!cameraVideo || !cameraCanvas || !cameraStream) return;

  const captureBtn = document.getElementById('camera-capture-btn');
  captureBtn?.classList.add('processing');

  // Draw current video frame onto hidden canvas
  const width = cameraVideo.videoWidth || 1280;
  const height = cameraVideo.videoHeight || 720;
  cameraCanvas.width = width;
  cameraCanvas.height = height;
  const ctx = cameraCanvas.getContext('2d');
  ctx.drawImage(cameraVideo, 0, 0, width, height);

  // Convert canvas to Blob (JPEG, 90% quality)
  cameraCanvas.toBlob(async (blob) => {
    if (!blob) {
      showScanStatus('error', 'Could not capture image, please try again.');
      captureBtn?.classList.remove('processing');
      return;
    }
    const file = new File([blob], 'receipt-capture.jpg', { type: 'image/jpeg' });
    closeCamera();
    scanReceipt(file);
  }, 'image/jpeg', 0.9);
}

/* ============================================================
   RECEIPT SCANNING — Gemini Vision AI
   ============================================================ */


/**
 * Display a status message in the scan status bar.
 */
function showScanStatus(type, message) {
  if (!scanStatusEl) return;
  const colors = {
    loading: 'var(--accent-teal)',
    success: 'var(--accent-green)',
    error: '#ef4444',
  };
  const icons = {
    loading: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`,
  };
  scanStatusEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border-subtle);color:${colors[type]};font-size:var(--text-sm);margin-top:8px;">
      ${icons[type] || ''}
      <span>${message}</span>
    </div>`;
}

/**
 * Convert a File to a base64 string (data URI stripped).
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Scan a receipt image using the Gemini Vision API and prefill the command bar.
 */
async function scanReceipt(file) {
  // Show the command bar if not open
  if (!commandOverlay?.classList.contains('active')) openCommandBar();

  showScanStatus('loading', 'Pawi is scanning your receipt... 🐢');
  recentEl.style.display = 'none';
  previewEl.classList.remove('active');

  try {
    const base64Image = await fileToBase64(file);
    const mimeType = file.type || 'image/jpeg';

    const prompt = `You are a receipt parser. Look at this receipt image and extract the transaction details.
Return ONLY a raw JSON object with these exact keys (no markdown, no explanation):
{
  "amount": <number, the total amount paid>,
  "description": "<short merchant name or item description, max 4 words>",
  "category": "<one of: Food, Transport, Shopping, Entertainment, Health, Bills, Education, Other>",
  "type": "expense"
}
If you cannot find the amount, return { "error": "Could not read amount" }.`;

    const response = await fetch(
      `http://localhost:3000/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: base64Image } }
            ]
          }],
          generationConfig: { temperature: 0.1 }
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API Error ${response.status}`);
    }

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Strip markdown code fences if present
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    const parsed = JSON.parse(rawText);

    if (parsed.error) {
      showScanStatus('error', `Pawi couldn't read this receipt: ${parsed.error}`);
      return;
    }

    // Build a natural language command string for the command bar
    const cmdText = `Spent ${parsed.amount} on ${parsed.description}`;
    commandInput.value = cmdText;
    handleInput();
    commandInput.focus();

    showScanStatus('success', `✅ Pawi scanned: ${parsed.description} — ₱${parsed.amount}. Review below and press Enter to log!`);

  } catch (err) {
    console.error('Receipt scan error:', err);
    showScanStatus('error', `Scan failed: ${err.message}`);
  }
}

