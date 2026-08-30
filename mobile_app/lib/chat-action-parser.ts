/**
 * chat-action-parser.ts
 *
 * Deterministic and NLP-backed conversational action parser for Pawi Chat.
 * Extracts intent, entities (amounts, accounts, categories, goals, bills, counterparties),
 * checks for missing slots, and generates clarification chips.
 */

import { getBrandLogo, getWalletBrandColor } from "./pawi-data"

export type ChatIntentType =
  | "log_expense"
  | "log_income"
  | "pay_bill"
  | "deposit_goal"
  | "log_debt"
  | "settle_debt"
  | "log_receivable"
  | "settle_receivable"
  | "create_planned_payment"
  | "create_goal"
  | "transfer_funds"
  | "query_info"
  | "general_chat"

export interface ProposedActionParams {
  amount?: number
  currency?: string
  account?: string
  targetAccount?: string
  category?: string
  label?: string
  goalId?: string
  goalName?: string
  goalTarget?: number
  goalDueDate?: string
  billId?: string
  billName?: string
  billDueDate?: string
  billFrequency?: "recurring" | "one-time"
  counterparty?: string
  debtDirection?: "i_owe" | "they_owe"
  note?: string
}

export interface ClarificationOption {
  label: string
  value: string
  color?: string
  icon?: string
}

export interface ProposedAction {
  id: string
  type: ChatIntentType
  status: "pending_clarification" | "ready_for_confirmation" | "confirmed" | "cancelled" | "executed"
  title: string
  summary: string
  params: ProposedActionParams
  missingField?: "account" | "targetAccount" | "amount" | "goalName" | "billName" | "counterparty" | "debtDirection"
  clarificationPrompt?: string
  clarificationOptions?: ClarificationOption[]
  requiresConfirmation: boolean
  error?: string
}

export interface ChatAppContext {
  defaultCurrency?: string
  wallets?: Array<{ id?: string; name: string; balance: number; currency?: string; type?: string; accent?: string }>
  goals?: Array<{ id?: string; name: string; saved: number; target: number; accent?: string }>
  budgets?: Array<{ id?: string; category: string; spent: number; limit: number }>
  plannedPayments?: Array<{ id?: string; label: string; amount: number; dueDate?: string; frequency?: string }>
  debts?: Array<{ id?: string; name: string; amount: number; person?: string }>
  receivables?: Array<{ id?: string; name: string; amount: number; person?: string }>
}

/**
 * Fuzzy match a query string against a list of candidates.
 * Returns the best candidate name or undefined.
 */
export function fuzzyMatchCandidate(query: string, candidates: string[]): string | undefined {
  if (!query || candidates.length === 0) return undefined
  const q = query.toLowerCase().trim()

  // Exact match
  const exact = candidates.find((c) => c.toLowerCase().trim() === q)
  if (exact) return exact

  // Contains match
  const contains = candidates.find((c) => c.toLowerCase().includes(q) || q.includes(c.toLowerCase()))
  if (contains) return contains

  // Word overlap
  const qWords = q.split(/\s+/).filter((w) => w.length > 2)
  for (const c of candidates) {
    const cLower = c.toLowerCase()
    if (qWords.some((w) => cLower.includes(w))) {
      return c
    }
  }

  return undefined
}

/**
 * Extract numerical amount from string (e.g. "₱500", "500 pesos", "5,000.50", "20k")
 */
export function extractAmount(text: string): number | undefined {
  // Handle "20k", "5k", "2.5k"
  const kMatch = text.match(/\b(\d+(?:\.\d+)?)\s*k\b/i)
  if (kMatch) {
    return parseFloat(kMatch[1]) * 1000
  }

  // Extract all numeric candidates with word boundaries
  const matches = text.match(/(?:[₱$€£¥]\s*|\bpesos?\s*|\bphp\s*)?(\b\d{1,3}(?:,\d{3})+\b|\b\d+(?:\.\d+)?\b)(?:\s*pesos?|\s*php)?/gi)
  if (matches) {
    for (const m of matches) {
      const numClean = m.replace(/[^0-9.]/g, "")
      const val = parseFloat(numClean)
      if (!isNaN(val) && val > 0) {
        return val
      }
    }
  }

  return undefined
}

/**
 * Parse an incoming message into a structured ProposedAction or null
 */
export function parseChatAction(
  message: string,
  context: ChatAppContext = {},
  pendingAction?: ProposedAction | null
): ProposedAction | null {
  const text = message.trim()
  const lower = text.toLowerCase()

  // 0. Check if message is a cancellation
  if (/^(cancel|nevermind|never mind|abort|stop|no thanks|forget it|no)$/i.test(lower)) {
    return null
  }

  // 1. If there is already a pending action waiting for clarification (e.g. user selected or typed an account)
  if (pendingAction && pendingAction.status === "pending_clarification") {
    return resolvePendingClarification(text, pendingAction, context)
  }

  // 1. Create a Planned/Recurring Payment (Priority before Pay Bill)
  if (
    /\b(remind me to pay|create bill|add bill|new recurring|plan payment|monthly bill|schedule bill)\b/i.test(lower) ||
    (/\b(every month|monthly|every cutoff|due on)\b/i.test(lower) && /\b(pay|rent|subscription|bill|fee)\b/i.test(lower))
  ) {
    const amt = extractAmount(lower) || 1000
    const label = extractBillKeyword(lower) || "Recurring Payment"
    const onTheMatch = lower.match(/\bon the\s*(\d{1,2}(?:st|nd|rd|th)?)\b/i)
    const everyMatch = lower.match(/\bevery\s*(\d{1,2}(?:st|nd|rd|th)?|\w+)\b/i)
    const dueDate = onTheMatch ? onTheMatch[1] : everyMatch ? everyMatch[1] : "Every month"

    return {
      id: "action-" + Date.now(),
      type: "create_planned_payment",
      status: "ready_for_confirmation",
      title: "Create Planned Payment",
      summary: `Schedule "${label}" of ₱${amt.toLocaleString()} (${dueDate})`,
      params: {
        label,
        amount: amt,
        billDueDate: dueDate,
        billFrequency: "recurring",
        category: "Bills",
      },
      requiresConfirmation: true,
    }
  }

  // 2. Create a New Goal (Priority before Deposit Goal)
  if (/\b(want to save|new goal|create goal|save up for|target of|goal to save)\b/i.test(lower)) {
    const amt = extractAmount(lower) || 10000
    const nameMatch = text.match(/(?:for (?:a )?|save for |goal (?:is )?)(.+?)(?: by| with| target|$)/i)
    const goalTitle = nameMatch ? nameMatch[1].trim() : "New Goal"

    return {
      id: "action-" + Date.now(),
      type: "create_goal",
      status: "ready_for_confirmation",
      title: "Create Savings Goal",
      summary: `Create savings goal "${goalTitle}" with target ₱${amt.toLocaleString()}`,
      params: {
        goalName: goalTitle.charAt(0).toUpperCase() + goalTitle.slice(1),
        goalTarget: amt,
      },
      requiresConfirmation: true,
    }
  }

  // 3. Transfer Between Accounts: e.g. "Move 1000 from GCash to BPI Savings"
  if (
    /\b(move|transfer|send)\b/i.test(lower) &&
    (lower.includes("from") || lower.includes("to") || (context.wallets || []).length >= 2)
  ) {
    const amt = extractAmount(lower)
    const walletNames = (context.wallets || []).map((w) => w.name)
    let fromWallet: string | undefined
    let toWallet: string | undefined

    const fromMatch = text.match(/from\s+([a-zA-Z0-9\s]+?)(?:\s+to|\s*$)/i)
    const toMatch = text.match(/to\s+([a-zA-Z0-9\s]+?)(?:\s+from|\s*$)/i)

    if (fromMatch) fromWallet = fuzzyMatchCandidate(fromMatch[1].trim(), walletNames)
    if (toMatch) toWallet = fuzzyMatchCandidate(toMatch[1].trim(), walletNames)

    // Check direct mention of wallets
    if (!fromWallet || !toWallet) {
      for (const w of walletNames) {
        if (lower.includes(w.toLowerCase())) {
          if (!fromWallet) fromWallet = w
          else if (!toWallet && w !== fromWallet) toWallet = w
        }
      }
    }

    const action: ProposedAction = {
      id: "action-" + Date.now(),
      type: "transfer_funds",
      status: "ready_for_confirmation",
      title: "Transfer Funds",
      summary: `Transfer ₱${amt?.toLocaleString() || "0"} from ${fromWallet || "Account"} to ${toWallet || "Account"}`,
      params: {
        amount: amt,
        account: fromWallet,
        targetAccount: toWallet,
      },
      requiresConfirmation: true,
    }

    if (!fromWallet) {
      action.status = "pending_clarification"
      action.missingField = "account"
      action.clarificationPrompt = "Which wallet are you transferring from?"
      action.clarificationOptions = buildWalletOptions(context.wallets)
      return action
    }

    if (!toWallet) {
      action.status = "pending_clarification"
      action.missingField = "targetAccount"
      action.clarificationPrompt = "Which wallet are you transferring to?"
      action.clarificationOptions = buildWalletOptions(context.wallets?.filter((w) => w.name !== fromWallet))
      return action
    }

    return action
  }

  // 4. Pay a Recurring Bill: e.g. "I paid the Netflix for 500 pesos"
  if (
    (/\b(paid|pay|settled)\b/i.test(lower) && /\b(bill|netflix|spotify|meralco|maynilad|converge|globe|pldt|rent|wifi|internet|insurance)\b/i.test(lower)) ||
    ((context.plannedPayments || []).some((p) => lower.includes(p.label.toLowerCase()) && /\b(paid|pay)\b/i.test(lower)))
  ) {
    const amt = extractAmount(lower)
    const billNames = (context.plannedPayments || []).map((p) => p.label)
    const matchedBillName = fuzzyMatchCandidate(lower, billNames)
    const matchedBill = context.plannedPayments?.find((p) => p.label === matchedBillName)

    const walletNames = (context.wallets || []).map((w) => w.name)
    const matchedWallet = walletNames.find((w) => lower.includes(w.toLowerCase()))

    const billTitle = matchedBillName || extractBillKeyword(lower) || "Bill"
    const finalAmount = amt || matchedBill?.amount || 0

    const action: ProposedAction = {
      id: "action-" + Date.now(),
      type: "pay_bill",
      status: "ready_for_confirmation",
      title: "Pay Recurring Bill",
      summary: `Pay ${billTitle} ₱${finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} from ${matchedWallet || "Wallet"}`,
      params: {
        amount: finalAmount,
        billId: matchedBill?.id,
        billName: billTitle,
        account: matchedWallet,
        category: "Bills & Utilities",
        label: billTitle,
      },
      requiresConfirmation: true,
    }

    if (!matchedWallet) {
      action.status = "pending_clarification"
      action.missingField = "account"
      action.clarificationPrompt = `Got it, ₱${finalAmount} for ${billTitle}. Which account did you pay from?`
      action.clarificationOptions = buildWalletOptions(context.wallets)
    }

    return action
  }

  // 5. Deposit to a Goal: e.g. "I deposited 500 pesos to my emergency fund" or "add 500 to my emergency fund"
  if (
    (/\b(deposit|deposited|add|saved|put)\b/i.test(lower) && /\b(goal|emergency fund|savings|vacation|laptop|house|car|tuition)\b/i.test(lower)) ||
    ((context.goals || []).some((g) => lower.includes(g.name.toLowerCase()) && /\b(deposit|add|saved|put)\b/i.test(lower)))
  ) {
    const amt = extractAmount(lower)
    const goalNames = (context.goals || []).map((g) => g.name)
    const matchedGoalName = fuzzyMatchCandidate(lower, goalNames)
    const matchedGoal = context.goals?.find((g) => g.name === matchedGoalName)

    const walletNames = (context.wallets || []).map((w) => w.name)
    const matchedWallet = walletNames.find((w) => lower.includes(w.toLowerCase()))

    const goalTitle = matchedGoalName || matchedGoal?.name || "Emergency Fund"
    const finalAmount = amt || 0

    const action: ProposedAction = {
      id: "action-" + Date.now(),
      type: "deposit_goal",
      status: "ready_for_confirmation",
      title: "Deposit to Goal",
      summary: `Deposit ₱${finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} to ${goalTitle} from ${matchedWallet || "Wallet"}`,
      params: {
        amount: finalAmount,
        goalId: matchedGoal?.id,
        goalName: goalTitle,
        account: matchedWallet,
        category: "Savings",
        label: `Deposit to ${goalTitle}`,
      },
      requiresConfirmation: true,
    }

    if (!matchedWallet) {
      action.status = "pending_clarification"
      action.missingField = "account"
      action.clarificationPrompt = `Adding ₱${finalAmount} to ${goalTitle}. Which wallet is the money coming from?`
      action.clarificationOptions = buildWalletOptions(context.wallets)
    }

    return action
  }

  // 6. Log/Update Debt & Receivable: e.g. "I borrowed 500 from John", "Mike paid me back 300"
  if (/\b(borrowed|lent|debt|loan|paid me back|owes me|owe|owed)\b/i.test(lower)) {
    const amt = extractAmount(lower) || 0
    const isTheyOweMe = /\b(lent|paid me back|owes me)\b/i.test(lower)

    let person = "Friend"
    const paidBackMatch = text.match(/([a-zA-Z]+)\s+paid me back/i)
    const fromMatch = text.match(/(?:from|to|by)\s+([a-zA-Z]+)/i)

    if (paidBackMatch) person = paidBackMatch[1]
    else if (fromMatch) person = fromMatch[1]

    if (lower.includes("paid me back") || lower.includes("settled")) {
      return {
        id: "action-" + Date.now(),
        type: "settle_receivable",
        status: "ready_for_confirmation",
        title: "Settle Receivable",
        summary: `Mark ₱${amt.toLocaleString()} received from ${person}`,
        params: {
          amount: amt,
          counterparty: person,
          category: "Debt Settlement",
        },
        requiresConfirmation: true,
      }
    }

    return {
      id: "action-" + Date.now(),
      type: isTheyOweMe ? "log_receivable" : "log_debt",
      status: "ready_for_confirmation",
      title: isTheyOweMe ? "Log Money Owed to You" : "Log Debt Owed",
      summary: isTheyOweMe
        ? `${person} owes you ₱${amt.toLocaleString()}`
        : `You owe ${person} ₱${amt.toLocaleString()}`,
      params: {
        amount: amt,
        counterparty: person,
        debtDirection: isTheyOweMe ? "they_owe" : "i_owe",
      },
      requiresConfirmation: true,
    }
  }

  // 7. Log Income: e.g. "I just got my salary for 5000 in my GCash"
  if (/\b(salary|income|earned|received|got paid|allowance|bonus|commission)\b/i.test(lower)) {
    const amt = extractAmount(lower)
    if (amt && amt > 0) {
      const walletNames = (context.wallets || []).map((w) => w.name)
      const matchedWallet = walletNames.find((w) => lower.includes(w.toLowerCase()))

      const descMatch = text.match(/(?:received|earned|got|salary|income|for)\s+(?:[₱$€£¥0-9,k\s]+)?(?:from\s+)?(.+)?/i)
      const label = descMatch?.[1] ? descMatch[1].trim() : "Salary & Income"

      const action: ProposedAction = {
        id: "action-" + Date.now(),
        type: "log_income",
        status: "ready_for_confirmation",
        title: "Log Income",
        summary: `Log Income of ₱${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} into ${matchedWallet || "Wallet"} (${label})`,
        params: {
          amount: amt,
          category: "Income",
          label: label.charAt(0).toUpperCase() + label.slice(1),
          account: matchedWallet,
        },
        requiresConfirmation: true,
      }

      if (!matchedWallet) {
        action.status = "pending_clarification"
        action.missingField = "account"
        action.clarificationPrompt = `Got it! ₱${amt.toLocaleString()} income — which account should I credit?`
        action.clarificationOptions = buildWalletOptions(context.wallets)
      }

      return action
    }
  }

  // 8. Log Expense: e.g. "I spent 200 pesos on food" or "Bought coffee for 180"
  if (/\b(spent|paid|bought|buy|expense|cost|charge)\b/i.test(lower)) {
    const amt = extractAmount(lower)
    if (amt && amt > 0) {
      const walletNames = (context.wallets || []).map((w) => w.name)
      const matchedWallet = walletNames.find((w) => lower.includes(w.toLowerCase()))

      const category = extractExpenseCategory(lower)
      const label = cleanExpenseLabel(text, matchedWallet, category)

      const action: ProposedAction = {
        id: "action-" + Date.now(),
        type: "log_expense",
        status: "ready_for_confirmation",
        title: "Log Expense",
        summary: `Log Expense of ₱${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} from ${matchedWallet || "Wallet"} (${label})`,
        params: {
          amount: amt,
          category,
          label,
          account: matchedWallet,
        },
        requiresConfirmation: true,
      }

      if (!matchedWallet) {
        action.status = "pending_clarification"
        action.missingField = "account"
        action.clarificationPrompt = `Got it, ₱${amt.toLocaleString()} for ${label} — which account did you use?`
        action.clarificationOptions = buildWalletOptions(context.wallets)
      }

      return action
    }
  }

  return null
}

function resolvePendingClarification(
  message: string,
  pending: ProposedAction,
  context: ChatAppContext
): ProposedAction {
  const text = message.trim()

  if (pending.missingField === "account" || pending.missingField === "targetAccount") {
    const walletNames = (context.wallets || []).map((w) => w.name)
    const selected = fuzzyMatchCandidate(text, walletNames) || text

    const updatedParams = {
      ...pending.params,
      ...(pending.missingField === "account" ? { account: selected } : { targetAccount: selected }),
    }

    const amt = updatedParams.amount || 0
    let updatedSummary = pending.summary

    if (pending.type === "log_expense") {
      updatedSummary = `Log Expense of ₱${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} from ${selected} (${updatedParams.label || updatedParams.category})`
    } else if (pending.type === "log_income") {
      updatedSummary = `Log Income of ₱${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} into ${selected} (${updatedParams.label || "Income"})`
    } else if (pending.type === "pay_bill") {
      updatedSummary = `Pay ${updatedParams.billName} ₱${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} from ${selected}`
    } else if (pending.type === "deposit_goal") {
      updatedSummary = `Deposit ₱${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} to ${updatedParams.goalName} from ${selected}`
    } else if (pending.type === "transfer_funds") {
      updatedSummary = `Transfer ₱${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} from ${updatedParams.account || "Wallet"} to ${updatedParams.targetAccount || selected}`
    }

    return {
      ...pending,
      params: updatedParams,
      status: "ready_for_confirmation",
      summary: updatedSummary,
      missingField: undefined,
      clarificationPrompt: undefined,
      clarificationOptions: undefined,
    }
  }

  if (pending.missingField === "goalName") {
    const goalNames = (context.goals || []).map((g) => g.name)
    const matched = fuzzyMatchCandidate(text, goalNames) || text
    const matchedGoal = context.goals?.find((g) => g.name === matched)

    const updatedParams = {
      ...pending.params,
      goalName: matched,
      goalId: matchedGoal?.id,
    }

    const needsAccount = !updatedParams.account
    return {
      ...pending,
      params: updatedParams,
      status: needsAccount ? "pending_clarification" : "ready_for_confirmation",
      missingField: needsAccount ? "account" : undefined,
      clarificationPrompt: needsAccount ? `Which wallet is the deposit coming from?` : undefined,
      clarificationOptions: needsAccount ? buildWalletOptions(context.wallets) : undefined,
      summary: `Deposit ₱${updatedParams.amount?.toLocaleString()} to ${matched} from ${updatedParams.account || "Wallet"}`,
    }
  }

  return {
    ...pending,
    status: "ready_for_confirmation",
  }
}

function buildWalletOptions(wallets?: Array<{ name: string; type?: string; accent?: string }>): ClarificationOption[] {
  if (!wallets || wallets.length === 0) {
    return [
      { label: "Cash", value: "Cash", color: "#2E683E" },
      { label: "GCash", value: "GCash", color: "#007DFE" },
    ]
  }
  return wallets.map((w) => ({
    label: w.name,
    value: w.name,
    color: getWalletBrandColor(w.name, w.type, w.accent),
    icon: getBrandLogo(w.name),
  }))
}

function extractBillKeyword(text: string): string | undefined {
  if (text.includes("netflix")) return "Netflix"
  if (text.includes("spotify")) return "Spotify"
  if (text.includes("meralco")) return "Meralco"
  if (text.includes("maynilad") || text.includes("manila water")) return "Water Bill"
  if (text.includes("converge")) return "Converge Internet"
  if (text.includes("globe")) return "Globe Telecom"
  if (text.includes("pldt")) return "PLDT Home"
  if (text.includes("rent")) return "Rent"
  if (text.includes("tuition")) return "Tuition Fee"
  if (text.includes("insurance")) return "Insurance"
  if (text.includes("gym")) return "Gym Membership"
  return undefined
}

function extractExpenseCategory(text: string): string {
  if (/\b(food|lunch|dinner|breakfast|coffee|starbucks|mcdo|jollibee|meal|snack|groceries|dining)\b/i.test(text)) return "Food & Dining"
  if (/\b(grab|taxi|commute|jeep|mrt|lrt|gas|fuel|fare|toll|transport)\b/i.test(text)) return "Transportation"
  if (/\b(shopee|lazada|clothes|shopping|mall|amazon|item)\b/i.test(text)) return "Shopping"
  if (/\b(bill|electricity|water|wifi|internet|meralco|converge|globe)\b/i.test(text)) return "Bills & Utilities"
  if (/\b(movie|cinema|netflix|game|steam|concert|fun)\b/i.test(text)) return "Entertainment"
  if (/\b(tuition|book|school|course|exam)\b/i.test(text)) return "Education"
  if (/\b(medicine|doctor|hospital|clinic|health)\b/i.test(text)) return "Health & Medical"
  return "General"
}

function cleanExpenseLabel(text: string, matchedWallet?: string, category?: string): string {
  let cleaned = text
    .replace(/\b(i\s+)?(spent|paid|bought|buy|purchased|charged)\b/gi, "")
    .replace(/(?:[₱$€£¥]\s*|\bpesos?\s*|\bphp\s*)?(\b\d{1,3}(?:,\d{3})+\b|\b\d+(?:\.\d+)?\b)(?:\s*pesos?|\s*php)?/gi, "")
    .replace(/\b(pesos|peso|php)\b/gi, "")
    .replace(/\b(on|for)\b/gi, "")
    .replace(/\b(using|via|through|in|from|with)\s+[a-zA-Z0-9\s]+/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  if (matchedWallet) {
    const wRegex = new RegExp(`\\b(using|via|in|from|with)?\\s*${matchedWallet}\\b`, "gi")
    cleaned = cleaned.replace(wRegex, "").trim()
  }

  cleaned = cleaned.replace(/^(on|for|a|an|the|using)\s+/i, "").trim()
  if (!cleaned || cleaned.length < 2) {
    return category || "General"
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}
