import { Wallet, Goal, Debt, Receivable, Budget, Transaction, formatMoney } from "./pawi-data"

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface StatementDueCard {
  id: string
  name: string
  accent: string
  amountDue: number
  dueDay: number | undefined
  daysLeft: number | null
  formattedDueDate: string
}

export interface GoalRow {
  id: string
  name: string
  saved: number
  target: number
  remaining: number
  percent: number
  accent: string
  icon?: string
}

export interface DebtSummary {
  hasData: boolean
  count: number
  total: number
  nextDue: Debt | null
  nextDueDaysLeft: number | null
}

export interface ReceivableSummary {
  hasData: boolean
  count: number
  total: number
  nextExpected: Receivable | null
  nextExpectedDaysLeft: number | null
}

// ─── Utility: parse a due-date string to ms epoch ────────────────────────────
export function parseDueDateToMs(dateStr?: string | null): number | null {
  if (!dateStr || typeof dateStr !== "string") return null
  const cleanStr = dateStr.trim()
  if (!cleanStr) return null

  // 1. Try standard date parsing
  const parsed = new Date(cleanStr)
  if (!isNaN(parsed.getTime())) {
    // If user provided string without year (e.g., "Apr 22" or "April 22"), check if year was assigned sensibly
    return parsed.getTime()
  }

  // 2. If standard parse failed, check if it's "Month Day" format like "Apr 22"
  const monthDayRegex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}$/i
  if (monthDayRegex.test(cleanStr)) {
    const currentYear = new Date().getFullYear()
    const withYear = new Date(`${cleanStr}, ${currentYear}`)
    if (!isNaN(withYear.getTime())) return withYear.getTime()
  }

  return null
}

// ─── 1. Statement Due Cards ────────────────────────────────────────────────────
/**
 * Returns one StatementDueCard per credit wallet that currently has usedCredit > 0 or balance > 0.
 * Returns [] when no cards qualify — the component must NOT render the section at all.
 */
export function computeStatementDueCards(
  wallets: Wallet[],
  referenceDate: Date = new Date()
): StatementDueCard[] {
  return wallets
    .filter((w) => w.type === "credit" && ((w.usedCredit ?? 0) > 0 || (w.balance ?? 0) > 0))
    .map((w) => {
      const amountDue = (w.usedCredit && w.usedCredit > 0) ? w.usedCredit : (w.balance ?? 0)
      let daysLeft: number | null = null
      let formattedDueDate = ""

      if (w.dueDay) {
        const ref = new Date(referenceDate)
        const currentDay = ref.getDate()

        // Compute next due date: if dueDay already passed this month, use next month
        let dueYear = ref.getFullYear()
        let dueMonth = ref.getMonth()

        if (currentDay >= w.dueDay) {
          dueMonth += 1
          if (dueMonth > 11) {
            dueMonth = 0
            dueYear += 1
          }
        }

        const dueDate = new Date(dueYear, dueMonth, w.dueDay)
        const diffMs = dueDate.getTime() - ref.getTime()
        daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
        formattedDueDate = dueDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      }

      return {
        id: w.id,
        name: w.name,
        accent: w.accent || "#0055B8",
        amountDue,
        dueDay: w.dueDay,
        daysLeft,
        formattedDueDate,
      }
    })
    .sort((a, b) => {
      // Sort by soonest due date first (nulls last)
      if (a.daysLeft === null && b.daysLeft === null) return 0
      if (a.daysLeft === null) return 1
      if (b.daysLeft === null) return -1
      return a.daysLeft - b.daysLeft
    })
}

// ─── 2. Top Goals (up to 3, sorted by closest to completion) ─────────────────
/**
 * Returns the top 3 active goals sorted by progress % descending.
 * Never fabricates data — if no goals, returns [].
 */
export function computeTopGoals(goals: Goal[]): GoalRow[] {
  return goals
    .filter((g) => g.target > 0)
    .map((g) => {
      const saved = Number(g.saved) || 0
      const target = Number(g.target) || 1
      const percent = Math.min(100, Math.round((saved / target) * 100))
      const remaining = Math.max(0, target - saved)
      return { id: g.id, name: g.name, saved, target, remaining, percent, accent: g.accent, icon: g.icon }
    })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3)
}

// ─── 3. Debt Summary ─────────────────────────────────────────────────────────
export function computeDebtSummary(
  debts: Debt[],
  referenceDate: Date = new Date()
): DebtSummary {
  if (debts.length === 0) {
    return { hasData: false, count: 0, total: 0, nextDue: null, nextDueDaysLeft: null }
  }

  const total = debts.reduce((sum, d) => sum + Number(d.amount || 0), 0)

  // Sort by soonest dueDate — debts without parseable dates go to the end
  const sorted = [...debts].sort((a, b) => {
    const aMs = parseDueDateToMs(a.dueDate)
    const bMs = parseDueDateToMs(b.dueDate)
    if (aMs === null && bMs === null) return 0
    if (aMs === null) return 1
    if (bMs === null) return -1
    return aMs - bMs
  })

  const nextDue = sorted[0]
  let nextDueDaysLeft: number | null = null
  const nextDueMs = parseDueDateToMs(nextDue.dueDate)
  if (nextDueMs !== null) {
    const diffMs = nextDueMs - referenceDate.getTime()
    nextDueDaysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }

  return { hasData: true, count: debts.length, total, nextDue, nextDueDaysLeft }
}

// ─── 4. Receivable Summary ────────────────────────────────────────────────────
export function computeReceivableSummary(
  receivables: Receivable[],
  referenceDate: Date = new Date()
): ReceivableSummary {
  const open = receivables.filter((r) => r.status !== "received")

  if (open.length === 0) {
    return { hasData: false, count: 0, total: 0, nextExpected: null, nextExpectedDaysLeft: null }
  }

  const total = open.reduce((sum, r) => sum + Number(r.amount || 0), 0)

  const sorted = [...open].sort((a, b) => {
    const aMs = parseDueDateToMs(a.dueDate)
    const bMs = parseDueDateToMs(b.dueDate)
    if (aMs === null && bMs === null) return 0
    if (aMs === null) return 1
    if (bMs === null) return -1
    return aMs - bMs
  })

  const nextExpected = sorted[0]
  let nextExpectedDaysLeft: number | null = null
  const nextExpectedMs = parseDueDateToMs(nextExpected.dueDate)
  if (nextExpectedMs !== null) {
    const diffMs = nextExpectedMs - referenceDate.getTime()
    nextExpectedDaysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }

  return { hasData: true, count: open.length, total, nextExpected, nextExpectedDaysLeft }
}

// ─── 5. Category Budget Spent Engine ──────────────────────────────────────────
/**
 * Determines whether a transaction matches a category budget.
 * Supports:
 * - Direct category matches ("Food & Dining", "Entertainment", "Groceries")
 * - Category aliases ("Food" <-> "Food & Dining", "Coffee" <-> "Coffee & Snacks")
 * - Merchant/Brand keywords ("Netflix", "Foodpanda", "Starbucks", "Grab", "McDo", etc.)
 * - Substring matching between transaction label/note/tag and budget name
 */
export function isTransactionMatchingBudget(tx: Transaction, budgetCategory: string): boolean {
  if (!budgetCategory || !tx) return false

  const bRaw = budgetCategory.toLowerCase().trim()
  const txCat = (tx.category || "").toLowerCase().trim()
  const txLabel = (tx.label || "").toLowerCase().trim()
  const txNote = (tx.note || "").toLowerCase().trim()
  const txTag = (tx.tag || "").toLowerCase().trim()

  // 1. Direct equality with category or label
  if (txCat === bRaw || txLabel === bRaw) return true

  // 2. Direct category aliases
  const categoryAliases: Record<string, string[]> = {
    "food": ["food & dining", "dining out", "food and dining", "meals", "restaurant", "food"],
    "food & dining": ["food", "dining out", "food and dining", "meals", "restaurant"],
    "coffee": ["coffee & snacks", "coffee and snacks", "snacks", "cafe"],
    "coffee & snacks": ["coffee", "snacks", "cafe"],
    "entertainment": ["entertainment", "fun", "streaming", "movies", "games"],
    "transport": ["transport", "transportation", "commute", "gas", "fuel"],
    "utilities": ["utilities & bills", "utilities and bills", "bills", "electricity", "water", "internet"],
    "utilities & bills": ["utilities", "bills", "electricity", "water", "internet"],
    "groceries": ["groceries", "supermarket", "grocery"],
    "shopping": ["shopping", "retail", "clothes"],
    "health": ["health & wellness", "health and wellness", "medical", "pharmacy"],
    "health & wellness": ["health", "medical", "pharmacy"],
    "housing": ["rent & housing", "rent and housing", "rent"],
    "rent & housing": ["housing", "rent"],
  }

  for (const [key, aliases] of Object.entries(categoryAliases)) {
    if (bRaw === key || aliases.includes(bRaw)) {
      if (txCat === key || aliases.includes(txCat)) {
        return true
      }
    }
  }

  // 3. Known brand / merchant keywords
  const knownBrands = [
    "netflix", "foodpanda", "starbucks", "grab", "mcdo", "mcdonald",
    "spotify", "converge", "globe", "smart", "dito", "shopee", "lazada",
    "jollibee", "youtube", "apple", "icloud", "disney", "prime", "amazon",
    "steam", "playstation", "nintendo", "shell", "petron", "caltex",
    "meralco", "maynilad", "manila water", "pldt", "angkas", "joyride"
  ]

  for (const brand of knownBrands) {
    if (bRaw.includes(brand)) {
      if (txLabel.includes(brand) || txNote.includes(brand) || txCat.includes(brand) || txTag.includes(brand)) {
        return true
      }
    }
  }

  // 4. Token-based word matching between budget name and transaction texts
  const stopWords = new Set([
    "the", "and", "for", "with", "from", "subscription", "monthly",
    "budget", "expenses", "expense", "plan", "bill", "bills", "cost",
    "costs", "spend", "spent", "item", "items"
  ])

  const bTokens = bRaw
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w))

  const txCombined = `${txLabel} ${txNote} ${txCat} ${txTag}`
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")

  for (const token of bTokens) {
    if (txCombined.includes(token)) {
      return true
    }
  }

  // 5. If budget category is a substring of transaction label or note
  if (bRaw.length >= 3 && (txLabel.includes(bRaw) || txNote.includes(bRaw))) {
    return true
  }

  return false
}

/**
 * Computes the total spent for a specific budget in the current month from transactions.
 */
export function computeBudgetSpent(
  budget: Budget,
  transactions: Transaction[],
  referenceDate: Date = new Date()
): number {
  const currentMonthPrefix = referenceDate
    .toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
    .substring(0, 7) // "YYYY-MM"

  return transactions
    .filter((tx) => {
      if (tx.kind !== "expense") return false

      // Filter to current month's transactions (if date is present)
      const txIso = tx.date ? (tx.date.includes("T") ? tx.date.split("T")[0] : tx.date) : ""
      if (txIso && !txIso.startsWith(currentMonthPrefix)) {
        const isRecent =
          tx.dateHeader?.toLowerCase().includes("today") ||
          tx.dateHeader?.toLowerCase().includes("yesterday")
        if (!isRecent) return false
      }

      return isTransactionMatchingBudget(tx, budget.category)
    })
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
}

/**
 * Computes dynamic spent values for all budgets from transaction history.
 */
export function computeAllBudgetsSpent(
  budgets: Budget[],
  transactions: Transaction[],
  referenceDate: Date = new Date()
): Budget[] {
  return budgets.map((b) => ({
    ...b,
    spent: computeBudgetSpent(b, transactions, referenceDate),
  }))
}
