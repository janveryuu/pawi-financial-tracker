/* ============================================================
   SENTIMO — Formatters & Utility Helpers
   Currency formatting, date helpers, number utilities,
   relative date parsing, UUID generation.
   ============================================================ */

/**
 * Format a number as currency string.
 * Uses Intl.NumberFormat for locale-aware formatting.
 * @param {number} amount - The monetary amount
 * @param {string} currency - Currency code (PHP, USD, etc.)
 * @returns {string} Formatted currency string (e.g., "₱15,000.00")
 */
export function formatCurrency(amount, currency = 'PHP') {
  const currencyMap = {
    PHP: { locale: 'en-PH', code: 'PHP' },
    USD: { locale: 'en-US', code: 'USD' },
    EUR: { locale: 'en-EU', code: 'EUR' },
    GBP: { locale: 'en-GB', code: 'GBP' },
    JPY: { locale: 'ja-JP', code: 'JPY' },
    BTC: { locale: 'en-US', code: 'BTC' },
  };

  const config = currencyMap[currency] || currencyMap.PHP;

  // Special handling for crypto
  if (currency === 'BTC') {
    return `₿${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
  }

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
}

/**
 * Format a number in compact notation (e.g., 15K, 1.2M).
 * @param {number} num - The number to format
 * @returns {string} Compact formatted number
 */
export function formatCompact(num) {
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

/**
 * Format a date in various styles.
 * @param {Date|string|number} date - Date to format
 * @param {'relative'|'short'|'full'|'time'|'day'|'monthYear'} style - Format style
 * @returns {string} Formatted date string
 */
export function formatDate(date, style = 'short') {
  const d = new Date(date);
  const now = new Date();

  switch (style) {
    case 'relative': {
      const diffMs = now - d;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDay === 1) return 'Yesterday';
      if (diffDay < 7) return `${diffDay}d ago`;
      if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    case 'full':
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    case 'time':
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    case 'day':
      return d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);

    case 'monthYear':
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    case 'dayMonth':
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    case 'iso':
      return d.toISOString().split('T')[0];

    default:
      return d.toLocaleDateString();
  }
}

/**
 * Parse relative date strings into Date objects.
 * Supports: "today", "yesterday", "last friday", "last week", 
 *           "june 5", "jun 5", date strings like "2026-06-05"
 * @param {string} text - Date text to parse
 * @returns {Date} Parsed date
 */
export function parseRelativeDate(text) {
  const lower = text.toLowerCase().trim();
  const now = new Date();
  now.setHours(12, 0, 0, 0); // Normalize to noon

  // Exact matches
  if (lower === 'today') return now;
  if (lower === 'yesterday') {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }

  // "last <day of week>"
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const lastDayMatch = lower.match(/^last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (lastDayMatch) {
    const targetDay = dayNames.indexOf(lastDayMatch[1]);
    const currentDay = now.getDay();
    let diff = currentDay - targetDay;
    if (diff <= 0) diff += 7;
    const d = new Date(now);
    d.setDate(d.getDate() - diff);
    return d;
  }

  // "last week"
  if (lower === 'last week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }

  // "X days ago"
  const daysAgoMatch = lower.match(/^(\d+)\s+days?\s+ago$/);
  if (daysAgoMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() - parseInt(daysAgoMatch[1]));
    return d;
  }

  // "month day" format (e.g., "june 5", "jun 5")
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];
  const monthAbbrev = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const monthDayMatch = lower.match(/^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})$/);
  if (monthDayMatch) {
    const monthStr = monthDayMatch[1];
    const day = parseInt(monthDayMatch[2]);
    let monthIdx = monthNames.findIndex(m => m.startsWith(monthStr));
    if (monthIdx === -1) monthIdx = monthAbbrev.indexOf(monthStr);
    if (monthIdx !== -1) {
      const d = new Date(now.getFullYear(), monthIdx, day, 12, 0, 0);
      // If the date is in the future, go to last year
      if (d > now) d.setFullYear(d.getFullYear() - 1);
      return d;
    }
  }

  // Try native Date parse as fallback
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed;

  // Default to today
  return now;
}

/**
 * Generate a UUID v4.
 * @returns {string} UUID string
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get the day of week name for a date.
 * @param {Date} date
 * @returns {string}
 */
export function getDayName(date) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Check if two dates are the same calendar day.
 * @param {Date} d1
 * @param {Date} d2
 * @returns {boolean}
 */
export function isSameDay(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

/**
 * Get the start of day (midnight).
 * @param {Date} date
 * @returns {Date}
 */
export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get an array of dates between start and end.
 * @param {Date} start
 * @param {Date} end
 * @returns {Date[]}
 */
export function getDateRange(start, end) {
  const dates = [];
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Calculate days until a target day of month.
 * @param {number} targetDay - Day of month (1-31)
 * @returns {number} Days until target
 */
export function daysUntil(targetDay) {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let targetDate;
  if (currentDay < targetDay) {
    // Target is later this month
    targetDate = new Date(currentYear, currentMonth, targetDay);
  } else if (currentDay === targetDay) {
    return 0;
  } else {
    // Target is next month
    targetDate = new Date(currentYear, currentMonth + 1, targetDay);
  }

  const diffMs = targetDate - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get the greeting based on time of day.
 * @returns {string}
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Category icon mapping.
 * Maps category names to Lucide icon names.
 */
export const CATEGORY_ICONS = {
  'Food': 'utensils',
  'Coffee': 'coffee',
  'Transport': 'car',
  'Shopping': 'shopping-bag',
  'Bills': 'receipt',
  'Entertainment': 'gamepad-2',
  'Health': 'heart-pulse',
  'Income': 'trending-up',
  'Salary': 'banknote',
  'Freelance': 'laptop',
  'Transfer': 'arrow-left-right',
  'Investment': 'trending-up',
  'Groceries': 'shopping-cart',
  'Rent': 'home',
  'Utilities': 'zap',
  'Subscription': 'repeat',
  'Education': 'book-open',
  'Travel': 'plane',
  'Gift': 'gift',
  'Other': 'circle-dot',
};

/**
 * Category color mapping.
 */
export const CATEGORY_COLORS = {
  'Food': '#f97316',
  'Coffee': '#a16207',
  'Transport': '#3b82f6',
  'Shopping': '#ec4899',
  'Bills': '#ef4444',
  'Entertainment': '#a855f7',
  'Health': '#14b8a6',
  'Income': '#22c55e',
  'Salary': '#22c55e',
  'Freelance': '#22c55e',
  'Transfer': '#60a5fa',
  'Investment': '#8b5cf6',
  'Groceries': '#f59e0b',
  'Rent': '#6366f1',
  'Utilities': '#eab308',
  'Subscription': '#d946ef',
  'Education': '#0ea5e9',
  'Travel': '#06b6d4',
  'Gift': '#f43f5e',
  'Other': '#64748b',
};

/**
 * Debounce a function.
 * @param {Function} fn
 * @param {number} delay - Delay in ms
 * @returns {Function}
 */
export function debounce(fn, delay = 150) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
