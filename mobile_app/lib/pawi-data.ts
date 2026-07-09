export type WalletType = "cash" | "ewallet" | "card" | "savings"

export type CurrencyCode = "PHP" | "USD" | "EUR" | "GBP" | "JPY"

export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  PHP: 57,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 155.5
}

export function convertCurrency(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amount;
  const amountInUSD = amount / EXCHANGE_RATES[from];
  return amountInUSD * EXCHANGE_RATES[to];
}

export function getWalletBrandLogo(name: string): string | undefined {
  const lower = name.toLowerCase()
  if (lower === "cash" || (lower.includes("cash") && !lower.includes("gcash"))) return "/cash-logo.png"
  if (lower.includes("gcash")) return "/gcash.png"
  if (lower.includes("maya") || lower.includes("paymaya")) return "/Paymaya-logo.png"
  if (lower.includes("paypal")) return "/Paypal-logo.png"
  if (lower.includes("rcbc")) return "/RCBC2.png"
  return undefined
}

export interface Wallet {
  id: string
  name: string
  subtitle: string
  balance: number
  currency: CurrencyCode
  type: WalletType
  accent: string
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

export const wallets: Wallet[] = [
  {
    id: "cash",
    name: "Cash",
    subtitle: "Debit · USD",
    balance: 12580,
    currency: "USD",
    type: "cash",
    accent: "oklch(0.7 0.13 145)",
  },
  {
    id: "gcash",
    name: "GCash",
    subtitle: "Debit · PHP",
    balance: 300,
    currency: "PHP",
    type: "ewallet",
    accent: "oklch(0.62 0.18 250)",
  },
  {
    id: "paymaya",
    name: "Paymaya",
    subtitle: "Debit · PHP",
    balance: 10440,
    currency: "PHP",
    type: "ewallet",
    accent: "oklch(0.68 0.16 162)",
  },
  {
    id: "rcbc",
    name: "RCBC Visa",
    subtitle: "Debit · PHP",
    balance: 200,
    currency: "PHP",
    type: "card",
    accent: "oklch(0.6 0.2 25)",
  },
]

export const transactions: Transaction[] = [
  {
    id: "t1",
    label: "buy food for 20 dollars",
    category: "Food",
    account: "Cash",
    time: "12:42 AM",
    amount: 20,
    currency: "USD",
    kind: "expense",
  },
  {
    id: "t2",
    label: "allowance increase 200 cash",
    category: "Income",
    account: "Cash",
    time: "12:34 AM",
    amount: 200,
    currency: "PHP",
    kind: "income",
  },
  {
    id: "t3",
    label: "Spent 895 on Groceries",
    category: "Groceries",
    account: "Cash",
    time: "12:07 AM",
    amount: 895,
    currency: "PHP",
    kind: "expense",
  },
]

export const goals: Goal[] = [
  {
    id: "dubai",
    name: "Dubai",
    due: "Dec 15",
    saved: 65000,
    target: 100000,
    accent: "oklch(0.68 0.16 162)",
  },
  {
    id: "anniversary",
    name: "Girlfriend Anniversary",
    due: "Aug 11",
    saved: 15628,
    target: 25000,
    accent: "oklch(0.7 0.15 25)",
  },
]

export interface Budget {
  id: string
  category: string
  spent: number
  limit: number
  accent: string
}

export interface HistoryGroup {
  date: string
  items: Transaction[]
}

export const budgets: Budget[] = [
  {
    id: "food",
    category: "Food & Dining",
    spent: 4820,
    limit: 6000,
    accent: "oklch(0.7 0.15 25)",
  },
  {
    id: "groceries",
    category: "Groceries",
    spent: 3215,
    limit: 5000,
    accent: "oklch(0.68 0.16 162)",
  },
  {
    id: "transport",
    category: "Transport",
    spent: 1890,
    limit: 2000,
    accent: "oklch(0.62 0.18 250)",
  },
  {
    id: "fun",
    category: "Entertainment",
    spent: 2450,
    limit: 2000,
    accent: "oklch(0.7 0.13 145)",
  },
]

export const history: HistoryGroup[] = [
  {
    date: "Today",
    items: transactions,
  },
  {
    date: "Yesterday",
    items: [
      {
        id: "t4",
        label: "Grab ride to office",
        category: "Transport",
        account: "GCash",
        time: "8:15 AM",
        amount: 165,
        currency: "PHP",
        kind: "expense",
      },
      {
        id: "t5",
        label: "Freelance payment",
        category: "Income",
        account: "Paymaya",
        time: "2:40 PM",
        amount: 8500,
        currency: "PHP",
        kind: "income",
      },
      {
        id: "t6",
        label: "Netflix subscription",
        category: "Entertainment",
        account: "RCBC Visa",
        time: "11:02 PM",
        amount: 549,
        currency: "PHP",
        kind: "expense",
      },
    ],
  },
  {
    date: "Jun 13",
    items: [
      {
        id: "t7",
        label: "Coffee with friends",
        category: "Food",
        account: "Cash",
        time: "4:18 PM",
        amount: 380,
        currency: "PHP",
        kind: "expense",
      },
      {
        id: "t8",
        label: "Sold old monitor",
        category: "Income",
        account: "GCash",
        time: "1:05 PM",
        amount: 3200,
        currency: "PHP",
        kind: "income",
      },
    ],
  },
]

export const monthlyIncome = 11900
export const monthlyExpense = 7943

export const netWorth = 775731.62
export const netWorthChange = 5.8

export function formatMoney(amount: number, currency: CurrencyCode = "PHP") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amount)
}
