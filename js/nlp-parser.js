/* ============================================================
   SENTIMO — Natural Language Transaction Parser
   Parses free-text input into structured financial transactions.
   Handles income, expense, transfers, categories, accounts,
   amounts with multipliers, and relative dates.
   ============================================================ */

import { parseRelativeDate, generateId } from './formatters.js';
import { getAccounts } from './store.js';

/* ============================================================
   KEYWORD MAPS — Used for type detection & category inference
   ============================================================ */

const INCOME_KEYWORDS = [
  'salary', 'income', 'received', 'earned', 'got paid', 'freelance',
  'commission', 'bonus', 'refund', 'cashback', 'allowance', 'payout',
  'revenue', 'dividend', 'sold', 'payment received',
];

const EXPENSE_KEYWORDS = [
  'spent', 'paid', 'bought', 'purchased', 'cost', 'charged',
  'payment', 'expense', 'ordered', 'subscribed',
];

const TRANSFER_KEYWORDS = [
  'transfer', 'transferred', 'move', 'moved', 'send', 'sent',
];

/**
 * Category inference map: keyword → category.
 * More specific keywords take priority.
 */
const CATEGORY_MAP = {
  // Food & Drink
  'starbucks': 'Coffee', 'coffee': 'Coffee', 'cafe': 'Coffee', 'latte': 'Coffee',
  'food': 'Food', 'lunch': 'Food', 'dinner': 'Food', 'breakfast': 'Food',
  'restaurant': 'Food', 'mcdo': 'Food', 'jollibee': 'Food', 'kfc': 'Food',
  'mcdonald': 'Food', 'pizza': 'Food', 'burger': 'Food', 'snack': 'Food',
  'eat': 'Food', 'meal': 'Food', 'ramen': 'Food', 'sushi': 'Food',
  'groceries': 'Groceries', 'grocery': 'Groceries', 'puregold': 'Groceries',
  'sm supermarket': 'Groceries', 'robinsons': 'Groceries', 'market': 'Groceries',

  // Bills & Utilities
  'electric': 'Bills', 'electricity': 'Bills', 'meralco': 'Bills',
  'water': 'Bills', 'internet': 'Bills', 'wifi': 'Bills',
  'globe': 'Bills', 'pldt': 'Bills', 'converge': 'Bills',
  'postpaid': 'Bills', 'phone bill': 'Bills', 'bill': 'Bills',
  'rent': 'Rent', 'rental': 'Rent',

  // Transport
  'grab': 'Transport', 'uber': 'Transport', 'taxi': 'Transport',
  'gas': 'Transport', 'fuel': 'Transport', 'petrol': 'Transport',
  'jeep': 'Transport', 'jeepney': 'Transport', 'mrt': 'Transport',
  'lrt': 'Transport', 'bus': 'Transport', 'fare': 'Transport',
  'parking': 'Transport', 'toll': 'Transport', 'angkas': 'Transport',

  // Shopping
  'shopee': 'Shopping', 'lazada': 'Shopping', 'amazon': 'Shopping',
  'zalora': 'Shopping', 'shopping': 'Shopping', 'bought': 'Shopping',
  'clothes': 'Shopping', 'shoes': 'Shopping', 'bag': 'Shopping',
  'uniqlo': 'Shopping', 'h&m': 'Shopping', 'zara': 'Shopping',

  // Entertainment / Fun
  'netflix': 'Subscription', 'spotify': 'Subscription', 'youtube': 'Subscription',
  'disney': 'Subscription', 'hbo': 'Subscription', 'subscription': 'Subscription',
  'movie': 'Entertainment', 'cinema': 'Entertainment', 'game': 'Entertainment',
  'gaming': 'Entertainment', 'steam': 'Entertainment', 'playstation': 'Entertainment',
  'concert': 'Entertainment', 'event': 'Entertainment', 'fun': 'Entertainment',

  // Health
  'medicine': 'Health', 'doctor': 'Health', 'hospital': 'Health',
  'pharmacy': 'Health', 'gym': 'Health', 'fitness': 'Health',
  'health': 'Health', 'dental': 'Health', 'clinic': 'Health',

  // Education
  'tuition': 'Education', 'school': 'Education', 'course': 'Education',
  'book': 'Education', 'training': 'Education', 'seminar': 'Education',
  'class': 'Education', 'education': 'Education',

  // Travel
  'flight': 'Travel', 'hotel': 'Travel', 'airbnb': 'Travel',
  'travel': 'Travel', 'vacation': 'Travel', 'trip': 'Travel',
  'booking': 'Travel', 'airline': 'Travel',

  // Gifts
  'gift': 'Gift', 'birthday': 'Gift', 'present': 'Gift',
  'wedding': 'Gift', 'donation': 'Gift', 'charity': 'Gift',
};

/* ============================================================
   MAIN PARSER FUNCTION
   ============================================================ */

/**
 * Parse a natural language string into a structured transaction.
 * @param {string} input - Raw user input
 * @returns {Object} Parsed transaction object with confidence score
 * 
 * @example
 * parse("Salary 15000") 
 * // → { type: 'income', amount: 15000, category: 'Salary', accountId: 'cash-id', ... }
 * 
 * parse("Spent 220 on Starbucks from GCash")
 * // → { type: 'expense', amount: 220, category: 'Coffee', accountId: 'gcash-id', ... }
 * 
 * parse("Transfer 40k from BDO to BPI savings")
 * // → { type: 'transfer', amount: 40000, accountId: 'bdo-id', toAccountId: 'bpi-id', ... }
 */
export function parse(input) {
  if (!input || !input.trim()) return null;

  const raw = input.trim();
  const lower = raw.toLowerCase();
  const tokens = lower.split(/\s+/);

  let result = {
    id: generateId(),
    type: null,
    amount: 0,
    category: 'Other',
    note: raw,
    accountId: null,
    toAccountId: null,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    confidence: 0,
    rawText: raw,
  };

  // Step 1: Extract amount
  result.amount = extractAmount(lower);
  if (result.amount > 0) result.confidence += 0.3;

  // Step 2: Detect transaction type
  result.type = detectType(lower, tokens);
  if (result.type) result.confidence += 0.25;

  // Step 3: Match accounts
  const accountMatch = matchAccounts(lower);
  if (accountMatch.from) {
    result.accountId = accountMatch.from;
    result.confidence += 0.15;
  }
  if (accountMatch.to) {
    result.toAccountId = accountMatch.to;
    result.confidence += 0.1;
  }

  // Step 4: Infer category
  const category = inferCategory(lower);
  if (category) {
    result.category = category;
    result.confidence += 0.1;
  }

  // Step 5: Parse date
  const dateResult = extractDate(lower);
  if (dateResult) {
    result.date = dateResult.toISOString();
    result.confidence += 0.1;
  }

  // Step 6: Default account if not specified
  if (!result.accountId) {
    const accounts = getAccounts();
    // Default to first debit account or first account
    const defaultAccount = accounts.find(a => a.type === 'debit') || accounts[0];
    if (defaultAccount) {
      result.accountId = defaultAccount.id;
    }
  }

  // Step 7: Auto-detect type from keywords if still null
  if (!result.type) {
    // If amount found and matches income keyword patterns
    if (result.amount > 0) {
      // Check if first token is a known income word
      const firstToken = tokens[0];
      if (INCOME_KEYWORDS.includes(firstToken)) {
        result.type = 'income';
      } else {
        result.type = 'expense'; // Default to expense
      }
    }
  }

  // Adjust category for income types
  if (result.type === 'income' && result.category === 'Other') {
    if (lower.includes('salary')) result.category = 'Salary';
    else if (lower.includes('freelance')) result.category = 'Freelance';
    else result.category = 'Income';
  }

  // Cap confidence
  result.confidence = Math.min(result.confidence, 1);

  return result;
}

/* ============================================================
   EXTRACTION HELPERS
   ============================================================ */

/**
 * Extract monetary amount from text.
 * Handles: "15000", "15,000", "₱15,000", "$420", "40k", "1.5k"
 */
function extractAmount(text) {
  // Remove currency symbols for easier parsing
  let cleaned = text.replace(/[₱$€£¥]/g, '');

  // Pattern: numbers with optional commas, decimals, and K/M suffix
  const patterns = [
    /(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?)\s*([km])?/i,   // 15,000 or 1,234.56
    /(\d+(?:\.\d{1,2})?)\s*([km])/i,                      // 40k, 1.5m
    /(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i,                    // 15000 or 420.50
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      const suffix = match[2] ? match[2].toLowerCase() : null;

      if (suffix === 'k') amount *= 1000;
      if (suffix === 'm') amount *= 1000000;

      if (amount > 0 && amount < 100000000) {
        return amount;
      }
    }
  }

  return 0;
}

/**
 * Detect transaction type from text.
 */
function detectType(text, tokens) {
  // Check for transfer keywords first (most specific)
  for (const kw of TRANSFER_KEYWORDS) {
    if (text.includes(kw)) {
      // Verify it has "from" and "to" patterns
      if (text.includes('to') || text.includes('from')) {
        return 'transfer';
      }
      return 'transfer';
    }
  }

  // Check for expense keywords
  for (const kw of EXPENSE_KEYWORDS) {
    if (text.includes(kw)) return 'expense';
  }

  // Check for income keywords
  for (const kw of INCOME_KEYWORDS) {
    if (text.includes(kw)) return 'income';
  }

  // Heuristic: if first word is a known income source
  if (['salary', 'income', 'bonus', 'freelance', 'commission', 'refund', 'cashback', 'allowance', 'payout', 'dividend'].includes(tokens[0])) {
    return 'income';
  }

  return null;
}

/**
 * Match account names from user text against stored accounts.
 * Uses fuzzy substring matching.
 * @returns {{ from: string|null, to: string|null }}
 */
function matchAccounts(text) {
  const accounts = getAccounts();
  let from = null;
  let to = null;

  if (accounts.length === 0) return { from, to };

  // Build searchable account map
  const accountSearch = accounts.map((a) => ({
    id: a.id,
    searchTerms: [
      a.name.toLowerCase(),
      ...a.name.toLowerCase().split(/\s+/),
    ],
  }));

  // Check for "from <account>" pattern
  const fromMatch = text.match(/from\s+(?:my\s+)?(.+?)(?:\s+(?:to|account|wallet)|\s*$)/i);
  if (fromMatch) {
    const fromText = fromMatch[1].trim();
    from = findBestAccountMatch(fromText, accountSearch);
  }

  // Check for "to <account>" pattern
  const toMatch = text.match(/to\s+(?:my\s+)?(.+?)(?:\s+(?:from|account|wallet)|\s*$)/i);
  if (toMatch) {
    const toText = toMatch[1].trim();
    to = findBestAccountMatch(toText, accountSearch);
  }

  // If only one account mentioned and it's not in from/to pattern
  if (!from && !to) {
    // Check for account name anywhere in text
    for (const acct of accountSearch) {
      for (const term of acct.searchTerms) {
        if (term.length >= 3 && text.includes(term)) {
          from = acct.id;
          break;
        }
      }
      if (from) break;
    }
  }

  // Avoid same from and to
  if (from && to && from === to) {
    to = null;
  }

  return { from, to };
}

/**
 * Find the best matching account for a text string.
 */
function findBestAccountMatch(text, accountSearch) {
  let bestMatch = null;
  let bestScore = 0;

  for (const acct of accountSearch) {
    for (const term of acct.searchTerms) {
      if (text.includes(term) || term.includes(text)) {
        // Score by how much of the term is matched
        const score = Math.min(text.length, term.length) / Math.max(text.length, term.length);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = acct.id;
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Infer category from text using keyword matching.
 */
function inferCategory(text) {
  // Sort by longest keyword first (more specific matches win)
  const sortedEntries = Object.entries(CATEGORY_MAP)
    .sort(([a], [b]) => b.length - a.length);

  for (const [keyword, category] of sortedEntries) {
    if (text.includes(keyword)) {
      return category;
    }
  }

  return null;
}

/**
 * Extract date from text if relative date expressions are found.
 */
function extractDate(text) {
  const datePatterns = [
    /\b(today)\b/,
    /\b(yesterday)\b/,
    /\blast\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
    /\b(last\s+week)\b/,
    /\b(\d+)\s+days?\s+ago\b/,
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\b/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return parseRelativeDate(match[0]);
    }
  }

  return null;
}

/**
 * Generate a human-readable summary of a parsed transaction.
 * @param {Object} tx - Parsed transaction
 * @returns {string} e.g., "Income: ₱15,000 to Cash"
 */
export function generateSummary(tx) {
  const accounts = getAccounts();
  const fromAccount = accounts.find((a) => a.id === tx.accountId);
  const toAccount = accounts.find((a) => a.id === tx.toAccountId);

  const currency = fromAccount?.currency || 'PHP';
  const amountStr = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency === 'BTC' ? 'PHP' : currency,
  }).format(tx.amount);

  switch (tx.type) {
    case 'income':
      return `Income: ${amountStr} to ${fromAccount?.name || 'Unknown'}`;
    case 'expense':
      return `${tx.category}: ${amountStr} from ${fromAccount?.name || 'Unknown'}`;
    case 'transfer':
      return `Transfer: ${amountStr} from ${fromAccount?.name || '?'} → ${toAccount?.name || '?'}`;
    default:
      return `${amountStr}`;
  }
}
