/* ============================================================
   SENTIMO — Data Import/Export (CSV & JSON)
   Complete data mobility: export all data, import from files.
   All client-side via File API / Blob / URL.createObjectURL().
   ============================================================ */

import * as db from './db.js';
import * as store from './store.js';
import { formatDate } from './formatters.js';

/* ============================================================
   JSON EXPORT / IMPORT
   ============================================================ */

/**
 * Export all data as a JSON file download.
 */
export async function exportJSON() {
  const data = await db.exportAll();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `sentimo-backup-${formatDate(new Date(), 'iso')}.json`);
}

/**
 * Import data from a JSON file.
 * @param {File} file - JSON file to import
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function importJSON(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate structure
    if (!data.accounts || !data.transactions) {
      return { success: false, message: 'Invalid file format. Missing accounts or transactions.' };
    }

    // Import all data (replaces existing)
    await db.importAll(data);

    // Reload state
    await store.loadState();
    store.emit(store.Events.DATA_IMPORTED, data);

    return {
      success: true,
      message: `Imported ${data.accounts.length} accounts, ${data.transactions.length} transactions, ${(data.goals || []).length} goals.`,
    };
  } catch (err) {
    console.error('Import error:', err);
    return { success: false, message: `Import failed: ${err.message}` };
  }
}

/* ============================================================
   CSV EXPORT / IMPORT
   ============================================================ */

/**
 * Export transactions as a CSV file download.
 */
export function exportCSV() {
  const transactions = store.getTransactions();
  const accounts = store.getAccounts();

  // CSV Header
  const headers = ['Date', 'Type', 'Amount', 'Category', 'Note', 'Account', 'To Account', 'Currency'];

  // CSV Rows
  const rows = transactions.map((tx) => {
    const account = accounts.find((a) => a.id === tx.accountId);
    const toAccount = accounts.find((a) => a.id === tx.toAccountId);
    return [
      formatDate(tx.date, 'iso'),
      tx.type,
      tx.amount.toFixed(2),
      tx.category || '',
      escapeCSV(tx.note || ''),
      account?.name || '',
      toAccount?.name || '',
      account?.currency || 'PHP',
    ];
  });

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `sentimo-transactions-${formatDate(new Date(), 'iso')}.csv`);
}

/**
 * Import transactions from a CSV file.
 * Expected columns: Date, Type, Amount, Category, Note, Account
 * @param {File} file - CSV file to import
 * @returns {Promise<{ success: boolean, message: string, preview?: Object[] }>}
 */
export async function importCSV(file) {
  try {
    const text = await file.text();
    const lines = text.trim().split('\n');

    if (lines.length < 2) {
      return { success: false, message: 'CSV file is empty or has no data rows.' };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const accounts = store.getAccounts();

    // Find column indices
    const dateIdx = headers.findIndex((h) => h === 'date');
    const typeIdx = headers.findIndex((h) => h === 'type');
    const amountIdx = headers.findIndex((h) => h === 'amount');
    const categoryIdx = headers.findIndex((h) => h === 'category');
    const noteIdx = headers.findIndex((h) => h === 'note');
    const accountIdx = headers.findIndex((h) => h === 'account');

    if (amountIdx === -1) {
      return { success: false, message: 'CSV must have an "Amount" column.' };
    }

    let imported = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length === 0) continue;

      try {
        const amount = parseFloat(cols[amountIdx] || '0');
        if (isNaN(amount) || amount === 0) continue;

        const type = (cols[typeIdx] || 'expense').toLowerCase();
        const category = cols[categoryIdx] || 'Other';
        const note = cols[noteIdx] || '';
        const accountName = cols[accountIdx] || '';
        const dateStr = cols[dateIdx] || new Date().toISOString();

        // Match account by name
        let accountId = accounts[0]?.id || null;
        if (accountName) {
          const match = accounts.find(
            (a) => a.name.toLowerCase() === accountName.toLowerCase()
          );
          if (match) accountId = match.id;
        }

        const tx = {
          id: crypto.randomUUID(),
          type: ['income', 'expense', 'transfer'].includes(type) ? type : 'expense',
          amount,
          category,
          note,
          accountId,
          toAccountId: null,
          date: new Date(dateStr).toISOString(),
          createdAt: new Date().toISOString(),
        };

        await store.addTransaction(tx);
        imported++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return {
      success: true,
      message: `Imported ${imported} transactions.${errors.length ? ` ${errors.length} rows skipped.` : ''}`,
    };
  } catch (err) {
    return { success: false, message: `CSV import failed: ${err.message}` };
  }
}

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Trigger a file download from a Blob.
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Escape a value for CSV (wrap in quotes if it contains commas).
 * @param {string} value
 * @returns {string}
 */
function escapeCSV(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Parse a CSV line, handling quoted fields.
 * @param {string} line
 * @returns {string[]}
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
