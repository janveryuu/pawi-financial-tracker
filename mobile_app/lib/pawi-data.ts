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
  if (lower.includes("gcash")) return "/logos/gcash.png"
  if (lower.includes("maya") || lower.includes("paymaya")) return "/Paymaya-logo.png"
  if (lower.includes("paypal")) return "/Paypal-logo.png"
  if (lower.includes("rcbc")) return "/logos/rcbc.png"
  if (lower.includes("bdo")) return "/logos/bdo.png"
  if (lower.includes("bpi")) return "/logos/bpi.png"
  if (lower.includes("union")) return "/logos/unionbank.png"
  if (lower.includes("wise")) return "/logos/wise.png"
  if (lower.includes("globe")) return "/logos/globe.png"
  if (lower.includes("netflix")) return "/logos/netflix.png"
  if (lower.includes("converge")) return "/logos/converge.png"
  if (lower.includes("gotyme") || lower.includes("tyme")) return "/logos/gotyme.png"
  if (lower.includes("grab")) return "/logos/grab.png"
  if (lower.includes("panda") || lower.includes("foodpanda")) return "/logos/foodpanda.png"
  if (lower.includes("mcdo") || lower.includes("mcdonald")) return "/logos/mcdo.png"
  if (lower.includes("starbucks") || lower.includes("sbux")) return "/logos/starbucks.png"
  if (lower.includes("metro")) return "/metrobank.svg"
  if (lower.includes("sea")) return "/seabank.svg"
  return undefined
}

export function getTransactionMerchantLogo(label: string, category?: string, account?: string): string | undefined {
  const text = `${label} ${category || ""} ${account || ""}`.toLowerCase()
  
  if (text.includes("mcdo") || text.includes("mcdonald") || text.includes("big mac")) return "/logos/mcdo.png"
  if (text.includes("starbucks") || text.includes("sbux") || text.includes("frappuccino")) return "/logos/starbucks.png"
  if (text.includes("foodpanda") || text.includes("food panda")) return "/logos/foodpanda.png"
  if (text.includes("grab") || text.includes("grabfood") || text.includes("grabcar") || text.includes("grabpay")) return "/logos/grab.png"
  if (text.includes("gotyme") || text.includes("go tyme")) return "/logos/gotyme.png"
  if (text.includes("netflix")) return "/logos/netflix.png"
  if (text.includes("globe")) return "/logos/globe.png"
  if (text.includes("converge")) return "/logos/converge.png"
  if (text.includes("gcash")) return "/logos/gcash.png"
  if (text.includes("maya") || text.includes("paymaya")) return "/Paymaya-logo.png"
  if (text.includes("bdo")) return "/logos/bdo.png"
  if (text.includes("bpi")) return "/logos/bpi.png"
  if (text.includes("rcbc")) return "/logos/rcbc.png"
  if (text.includes("unionbank") || text.includes("union bank")) return "/logos/unionbank.png"
  if (text.includes("wise")) return "/logos/wise.png"
  if (text.includes("paypal")) return "/Paypal-logo.png"
  
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
  dateHeader?: string
  note?: string
  tag?: string
  icon?: string
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
  icon?: string
}

export interface Debt {
  id: string
  lender: string
  amount: number
  monthlyPayment: number
  dueDate: string
  interestRate?: string
  notes?: string
  category?: string
  accent?: string
}

export interface Receivable {
  id: string
  borrower: string
  amount: number
  dueDate: string
  notes?: string
  status: "pending" | "received" | "overdue"
  accent?: string
}

export interface PlannedPayment {
  id: string
  label: string
  amount: number
  dueDate: string
  frequency: "recurring" | "one-time"
  category: string
  account: string
  icon?: string
}

export interface Installment {
  id: string
  name: string
  totalAmount: number
  paid: number
  remaining: number
  monthlyAmount: number
  card: string
  monthsTotal: number
  monthsPaid: number
  endDate: string
}

export interface Tag {
  id: string
  label: string
  color: string
  count?: number
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
  // Today's entries matching Image 2
  {
    id: "tx_1",
    label: "Food",
    category: "Food",
    note: "Lunch at carinderia",
    tag: "Dining Out",
    account: "Cash",
    time: "12:00 PM",
    amount: 220,
    currency: "PHP",
    kind: "expense",
    dateHeader: "Today",
    date: "APRIL 20, 2026",
    icon: "🍽️",
  },
  {
    id: "tx_2",
    label: "Sold pre-loved items",
    category: "Online Selling",
    note: "Garage sale clothing item",
    tag: "Side Hustle",
    account: "GCash",
    time: "10:00 AM",
    amount: 2200,
    currency: "PHP",
    kind: "income",
    dateHeader: "Today",
    date: "APRIL 20, 2026",
    icon: "🏪",
  },
  {
    id: "tx_3",
    label: "Fun",
    category: "Entertainment",
    note: "Netflix subscription",
    tag: "Subscription",
    account: "RCBC Visa",
    time: "7:00 AM",
    amount: 249,
    currency: "PHP",
    kind: "expense",
    dateHeader: "Today",
    date: "APRIL 20, 2026",
    icon: "🎮",
  },
  {
    id: "tx_4",
    label: "Food",
    category: "Food",
    note: "Starbucks iced latte",
    tag: "Coffee",
    account: "Cash",
    time: "12:51 AM",
    amount: 250,
    currency: "PHP",
    kind: "expense",
    dateHeader: "Today",
    date: "APRIL 20, 2026",
    icon: "☕",
  },
  {
    id: "tx_5",
    label: "Shopping",
    category: "Shopping",
    note: "Uniqlo everyday jacket",
    tag: "Clothes",
    account: "Cash",
    time: "12:51 AM",
    amount: 5000,
    currency: "PHP",
    kind: "expense",
    dateHeader: "Today",
    date: "APRIL 20, 2026",
    icon: "🛍️",
  },
  {
    id: "tx_6",
    label: "Freelance Project Deposit",
    category: "Salary",
    note: "Client web design milestone 1",
    tag: "Work",
    account: "Cash",
    time: "12:51 AM",
    amount: 25000,
    currency: "PHP",
    kind: "income",
    dateHeader: "Today",
    date: "APRIL 20, 2026",
    icon: "💼",
  },
  // Yesterday's entries
  {
    id: "tx_7",
    label: "Groceries",
    category: "Groceries",
    note: "Weekly kitchen stock SM",
    tag: "Essentials",
    account: "GCash",
    time: "6:30 PM",
    amount: 1299,
    currency: "PHP",
    kind: "expense",
    dateHeader: "Yesterday",
    date: "APRIL 19, 2026",
    icon: "🛒",
  },
  {
    id: "tx_8",
    label: "Allowance from Family",
    category: "Allowance",
    note: "Weekly support",
    tag: "Family",
    account: "Cash",
    time: "11:00 AM",
    amount: 2500,
    currency: "PHP",
    kind: "income",
    dateHeader: "Yesterday",
    date: "APRIL 19, 2026",
    icon: "👛",
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
    icon: "🍽️",
  },
  {
    id: "groceries",
    category: "Groceries",
    spent: 3215,
    limit: 5000,
    accent: "#E53E3E",
    icon: "🛒",
  },
  {
    id: "transport",
    category: "Transport",
    spent: 1890,
    limit: 2500,
    accent: "#1A73E8",
    icon: "🚗",
  },
  {
    id: "utilities",
    category: "Utilities & Bills",
    spent: 4100,
    limit: 5000,
    accent: "#D97706",
    icon: "⚡",
  },
]

export const debts: Debt[] = [
  {
    id: "debt_1",
    lender: "Home Credit Phone",
    amount: 14200,
    monthlyPayment: 1388.87,
    dueDate: "Day 15 of month",
    interestRate: "0% 12-month promo",
    notes: "Samsung Galaxy installment",
    accent: "#E53E3E",
  },
  {
    id: "debt_2",
    lender: "Motorcycle Loan (Yamaha)",
    amount: 32100,
    monthlyPayment: 2850,
    dueDate: "Day 28 of month",
    interestRate: "4.5% p.a.",
    notes: "Auto-debit via BPI Savings",
    accent: "#0D9488",
  },
]

export const receivables: Receivable[] = [
  {
    id: "rec_1",
    borrower: "Marco (Cousin)",
    amount: 3500,
    dueDate: "Apr 30, 2026",
    notes: "Borrowed for laptop repair",
    status: "pending",
    accent: "#3D784E",
  },
  {
    id: "rec_2",
    borrower: "Sarah Client (Freelance)",
    amount: 8000,
    dueDate: "May 5, 2026",
    notes: "Logo design final milestone payout",
    status: "pending",
    accent: "#1A73E8",
  },
]

export const plannedPayments: PlannedPayment[] = [
  {
    id: "plan_1",
    label: "Meralco Electric Bill",
    amount: 3850,
    dueDate: "Apr 28, 2026",
    frequency: "recurring",
    category: "Utilities",
    account: "GCash",
    icon: "⚡",
  },
  {
    id: "plan_2",
    label: "PLDT Fiber Internet",
    amount: 1699,
    dueDate: "May 2, 2026",
    frequency: "recurring",
    category: "Bills",
    account: "GCash",
    icon: "🌐",
  },
  {
    id: "plan_3",
    label: "Spotify Family",
    amount: 239,
    dueDate: "May 5, 2026",
    frequency: "recurring",
    category: "Entertainment",
    account: "RCBC Visa",
    icon: "🎵",
  },
  {
    id: "plan_4",
    label: "Dentist Cleaning & Checkup",
    amount: 2500,
    dueDate: "May 10, 2026",
    frequency: "one-time",
    category: "Health",
    account: "Cash",
    icon: "🦷",
  },
]

export const installments: Installment[] = [
  {
    id: "inst_1",
    name: "MacBook Air M2",
    totalAmount: 64990,
    paid: 43326,
    remaining: 21664,
    monthlyAmount: 2708,
    card: "BDO Mastercard",
    monthsTotal: 24,
    monthsPaid: 16,
    endDate: "Dec 2026",
  },
  {
    id: "inst_2",
    name: "IKEA Study Desk & Ergonomic Chair",
    totalAmount: 18500,
    paid: 12333,
    remaining: 6167,
    monthlyAmount: 1541,
    card: "RCBC Visa",
    monthsTotal: 12,
    monthsPaid: 8,
    endDate: "Aug 2026",
  },
]

export const tags: Tag[] = [
  { id: "tag_1", label: "Dining Out", color: "#E53E3E", count: 18 },
  { id: "tag_2", label: "Side Hustle", color: "#3D784E", count: 6 },
  { id: "tag_3", label: "Subscription", color: "#8B5CF6", count: 4 },
  { id: "tag_4", label: "Essentials", color: "#1A73E8", count: 24 },
  { id: "tag_5", label: "Coffee", color: "#D97706", count: 12 },
  { id: "tag_6", label: "Travel", color: "#0D9488", count: 8 },
]

export function formatMoney(amount: number, currency: CurrencyCode = "PHP") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amount)
}
