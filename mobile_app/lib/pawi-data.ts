export type WalletType = "cash" | "ewallet" | "card" | "savings" | "credit" | "loan"

export type WalletGroup = "ewallet" | "bank" | "credit" | "loan"

export type CurrencyCode = "PHP" | "USD" | "EUR" | "GBP" | "JPY"

export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  PHP: 57,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 155.5,
}

export function convertCurrency(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amount
  const amountInUSD = amount / EXCHANGE_RATES[from]
  return amountInUSD * EXCHANGE_RATES[to]
}

export function getWalletBrandLogo(name: string): string | undefined {
  const lower = name.toLowerCase()
  if (lower === "cash" || (lower.includes("cash") && !lower.includes("gcash"))) return "/cash-logo.png"
  if (lower.includes("gcash")) return "/gcash.png"
  if (lower.includes("maya") || lower.includes("paymaya")) return "/Paymaya-logo.png"
  if (lower.includes("paypal")) return "/Paypal-logo.png"
  if (lower.includes("rcbc")) return "/RCBC2.png"
  if (lower.includes("bdo")) return "/bdo.svg"
  if (lower.includes("bpi")) return "/bpi.svg"
  if (lower.includes("union")) return "/unionbank.svg"
  if (lower.includes("metro")) return "/metrobank.svg"
  if (lower.includes("gotyme") || lower.includes("tyme")) return "/gotyme.svg"
  if (lower.includes("sea")) return "/seabank.svg"
  return undefined
}

export interface Wallet {
  id: string
  name: string
  subtitle: string
  balance: number
  currency: CurrencyCode
  type: WalletType
  group?: WalletGroup
  accent: string
  isLiability?: boolean
  interestRate?: string
  dueDay?: number
  usedCredit?: number
  creditLimit?: number
  notes?: string
  spendable?: number
  goalsLinked?: number
}

export interface Transaction {
  id: string
  label: string
  category: string
  account: string
  time: string
  amount: number
  currency: CurrencyCode
  kind: "income" | "expense"
  date?: string
}

export interface Goal {
  id: string
  name: string
  due: string | null
  saved: number
  target: number
  accent: string
  icon?: string
}

export interface Budget {
  id: string
  category: string
  spent: number
  limit: number
  accent: string
}

export const wallets: Wallet[] = [
  // E-wallets
  {
    id: "gcash",
    name: "GCash",
    subtitle: "Debit · PHP",
    balance: 31420,
    currency: "PHP",
    type: "ewallet",
    group: "ewallet",
    accent: "#1A73E8",
    spendable: 31420,
    notes: "Primary digital wallet for bills, food, and online transfers.",
  },
  // Bank Accounts
  {
    id: "bpi",
    name: "BPI Savings",
    subtitle: "Debit · PHP · 1.25% yearly",
    balance: 22450,
    currency: "PHP",
    type: "savings",
    group: "bank",
    accent: "#E53E3E",
    interestRate: "1.25% yearly",
    spendable: 20751,
    goalsLinked: 30000,
    notes: "Account: 4892-0192-33\nBranch: Ayala Avenue Makati\nEmergency fund & goal deposits.",
  },
  {
    id: "wise",
    name: "Wise USD",
    subtitle: "Debit · USD",
    balance: 420,
    currency: "USD",
    type: "savings",
    group: "bank",
    accent: "#48D065",
    spendable: 420,
    notes: "Wise multi-currency account for international freelance payouts.",
  },
  // Credit Cards (Liabilities)
  {
    id: "bdo_mc",
    name: "BDO Mastercard",
    subtitle: "Credit · PHP · due day 12",
    balance: 11850,
    currency: "PHP",
    type: "credit",
    group: "credit",
    accent: "#D97706",
    isLiability: true,
    dueDay: 12,
    usedCredit: 11850,
    creditLimit: 75000,
    notes: "Statement cutoff: 25th of month. Due date: 12th.",
  },
  {
    id: "rcbc_visa",
    name: "RCBC Visa",
    subtitle: "Credit · PHP · due day 18",
    balance: 6300,
    currency: "PHP",
    type: "credit",
    group: "credit",
    accent: "#0284C7",
    isLiability: true,
    dueDay: 18,
    usedCredit: 6300,
    creditLimit: 40000,
    notes: "Card for subscriptions and travel points.",
  },
  {
    id: "ub_rewards",
    name: "UnionBank Rewards",
    subtitle: "Credit · PHP · due day 24",
    balance: 2950,
    currency: "PHP",
    type: "credit",
    group: "credit",
    accent: "#10B981",
    isLiability: true,
    dueDay: 24,
    usedCredit: 2950,
    creditLimit: 25000,
    notes: "Dining perks & 3x reward points.",
  },
  // Loans
  {
    id: "motorcycle_loan",
    name: "Motorcycle loan",
    subtitle: "Loans · PHP",
    balance: 32100,
    currency: "PHP",
    type: "loan",
    group: "loan",
    accent: "#0D9488",
    isLiability: true,
    notes: "Monthly installment: ₱2,850. Paid via auto-debit.",
  },
  {
    id: "pagibig_loan",
    name: "Pag-IBIG Housing Loan",
    subtitle: "Loans · PHP",
    balance: 1184000,
    currency: "PHP",
    type: "loan",
    group: "loan",
    accent: "#1E3A8A",
    isLiability: true,
    notes: "Pag-IBIG Housing loan amortization: ₱8,450 / month.",
  },
]

export const transactions: Transaction[] = [
  {
    id: "t1",
    label: "Transfer sent",
    category: "Transfer",
    account: "BPI Savings",
    time: "10:30 AM",
    amount: 1850.64,
    currency: "PHP",
    kind: "expense",
    date: "YESTERDAY",
  },
  {
    id: "t2",
    label: "Debt payment",
    category: "Loans",
    account: "BPI Savings",
    time: "4:15 PM",
    amount: 1388.87,
    currency: "PHP",
    kind: "expense",
    date: "SAT, APR 18",
  },
  {
    id: "t3",
    label: "Cutoff salary",
    category: "Salary",
    account: "BPI Savings",
    time: "8:00 AM",
    amount: 18500,
    currency: "PHP",
    kind: "income",
    date: "Apr 15",
  },
  {
    id: "t4",
    label: "SM Supermarket Groceries",
    category: "Groceries",
    account: "GCash",
    time: "2:45 PM",
    amount: 2450,
    currency: "PHP",
    kind: "expense",
    date: "Apr 14",
  },
  {
    id: "t5",
    label: "Freelance UI Project Payout",
    category: "Freelance",
    account: "Wise USD",
    time: "11:20 PM",
    amount: 420,
    currency: "USD",
    kind: "income",
    date: "Apr 12",
  },
]

export const goals: Goal[] = [
  {
    id: "emergency",
    name: "Emergency Fund",
    due: "Dec 31",
    saved: 45000,
    target: 60000,
    accent: "#3D784E",
    icon: "🛡️",
  },
  {
    id: "japan",
    name: "Japan Trip",
    due: "Nov 15",
    saved: 35000,
    target: 80000,
    accent: "#E53E3E",
    icon: "✈️",
  },
]

export const budgets: Budget[] = [
  {
    id: "food",
    category: "Food & Dining",
    spent: 4820,
    limit: 6000,
    accent: "#3D784E",
  },
  {
    id: "groceries",
    category: "Groceries",
    spent: 3215,
    limit: 5000,
    accent: "#E53E3E",
  },
  {
    id: "transport",
    category: "Transport",
    spent: 1890,
    limit: 2500,
    accent: "#1A73E8",
  },
]

export function formatMoney(amount: number, currency: CurrencyCode = "PHP") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amount)
}
