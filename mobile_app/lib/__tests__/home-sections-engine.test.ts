import {
  computeStatementDueCards,
  computeTopGoals,
  computeDebtSummary,
  computeReceivableSummary,
  computeBudgetSpent,
  isTransactionMatchingBudget,
  computeAllBudgetsSpent,
  parseDueDateToMs,
} from "../home-sections-engine"
import { Wallet, Goal, Debt, Receivable } from "../pawi-data"

// ─── helpers ──────────────────────────────────────────────────────────────────
const TODAY = new Date("2026-08-31T10:00:00Z")

const creditCard = (overrides: Partial<Wallet> = {}): Wallet => ({
  id: "cc_1",
  name: "RCBC Visa",
  subtitle: "Credit · PHP",
  balance: 6300,
  currency: "PHP",
  type: "credit",
  group: "credit",
  accent: "#0055B8",
  isLiability: true,
  dueDay: 18,
  usedCredit: 6300,
  creditLimit: 40000,
  ...overrides,
})

const goal = (overrides: Partial<Goal> = {}): Goal => ({
  id: "g1",
  name: "Emergency Fund",
  saved: 30000,
  target: 50000,
  accent: "#3D784E",
  due: "2026-12-31",
  icon: "🛡️",
  ...overrides,
})

const debt = (overrides: Partial<Debt> = {}): Debt => ({
  id: "d1",
  lender: "Home Credit Phone",
  amount: 14200,
  monthlyPayment: 1388,
  dueDate: "Apr 22, 2026",
  accent: "#E53E3E",
  ...overrides,
})

const receivable = (overrides: Partial<Receivable> = {}): Receivable => ({
  id: "r1",
  borrower: "Marco (Cousin)",
  amount: 3500,
  dueDate: "Apr 30, 2026",
  status: "pending",
  accent: "#3D784E",
  ...overrides,
})

// ─── Statement Due ─────────────────────────────────────────────────────────────
describe("computeStatementDueCards", () => {
  it("returns empty array when no wallets are credit type", () => {
    const nonCredit: Wallet[] = [
      { ...creditCard(), type: "savings", isLiability: false },
    ]
    const result = computeStatementDueCards(nonCredit, TODAY)
    expect(result).toHaveLength(0)
  })

  it("returns empty array when credit card has zero usedCredit and zero balance", () => {
    const zeroed: Wallet[] = [creditCard({ usedCredit: 0, balance: 0 })]
    const result = computeStatementDueCards(zeroed, TODAY)
    expect(result).toHaveLength(0)
  })

  it("returns a card entry for a credit card with usedCredit > 0", () => {
    const result = computeStatementDueCards([creditCard()], TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("RCBC Visa")
    expect(result[0].amountDue).toBe(6300)
  })

  it("correctly sums total across multiple cards with balances", () => {
    const cards = [
      creditCard({ id: "cc_1", name: "RCBC Visa", usedCredit: 6300, balance: 6300, dueDay: 18 }),
      creditCard({ id: "cc_2", name: "BDO Mastercard", usedCredit: 11850, balance: 11850, dueDay: 12 }),
    ]
    const result = computeStatementDueCards(cards, TODAY)
    expect(result).toHaveLength(2)
    const total = result.reduce((s, c) => s + c.amountDue, 0)
    expect(total).toBe(18150)
  })

  it("correctly computes daysLeft based on dueDay in current/next month", () => {
    // TODAY = Aug 31; dueDay = 18 → next due Sep 18 → 18 days left
    const result = computeStatementDueCards([creditCard({ dueDay: 18 })], TODAY)
    expect(result[0].daysLeft).toBe(18)
    expect(result[0].formattedDueDate).toBe("Sep 18")
  })

  it("does NOT crash and sets daysLeft to null when dueDay is undefined", () => {
    const card = creditCard({ dueDay: undefined })
    const result = computeStatementDueCards([card], TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].daysLeft).toBeNull()
  })
})

// ─── Goals ─────────────────────────────────────────────────────────────────────
describe("computeTopGoals", () => {
  it("returns empty array when no goals exist", () => {
    expect(computeTopGoals([])).toHaveLength(0)
  })

  it("caps at 3 items", () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      goal({ id: `g${i}`, saved: i * 1000, target: 10000 })
    )
    expect(computeTopGoals(many)).toHaveLength(3)
  })

  it("computes percent correctly and never exceeds 100", () => {
    const overFunded = goal({ saved: 60000, target: 50000 })
    const result = computeTopGoals([overFunded])
    expect(result[0].percent).toBe(100)
    expect(result[0].remaining).toBe(0)
  })

  it("sorts by percent desc (closest to completion first)", () => {
    const goals = [
      goal({ id: "g1", saved: 5000, target: 10000 }),  // 50%
      goal({ id: "g2", saved: 8000, target: 10000 }),  // 80%
      goal({ id: "g3", saved: 2000, target: 10000 }),  // 20%
    ]
    const result = computeTopGoals(goals)
    expect(result[0].percent).toBe(80)
    expect(result[1].percent).toBe(50)
    expect(result[2].percent).toBe(20)
  })

  it("computes remaining correctly", () => {
    const g = goal({ saved: 30000, target: 50000 })
    const result = computeTopGoals([g])
    expect(result[0].remaining).toBe(20000)
  })
})

// ─── Debt Summary ──────────────────────────────────────────────────────────────
describe("computeDebtSummary", () => {
  it("returns hasData: false when debts array is empty", () => {
    expect(computeDebtSummary([], TODAY).hasData).toBe(false)
  })

  it("sums total across all debts", () => {
    const debts = [
      debt({ id: "d1", amount: 14200 }),
      debt({ id: "d2", amount: 32100 }),
    ]
    const result = computeDebtSummary(debts, TODAY)
    expect(result.total).toBe(46300)
    expect(result.count).toBe(2)
  })

  it("identifies soonest-due debt correctly", () => {
    const debts = [
      debt({ id: "d1", lender: "Later Debt",  dueDate: "Sep 30, 2026" }),
      debt({ id: "d2", lender: "Sooner Debt", dueDate: "Sep 05, 2026" }),
    ]
    const result = computeDebtSummary(debts, TODAY)
    expect(result.nextDue?.lender).toBe("Sooner Debt")
  })

  it("handles debts with no parseable dueDate gracefully (no crash)", () => {
    const d = debt({ dueDate: "Invalid Date String" })
    const result = computeDebtSummary([d], TODAY)
    expect(result.hasData).toBe(true)
    expect(result.nextDueDaysLeft).toBeNull()
  })
})

// ─── Receivable Summary ────────────────────────────────────────────────────────
describe("computeReceivableSummary", () => {
  it("returns hasData: false when no open receivables", () => {
    expect(computeReceivableSummary([], TODAY).hasData).toBe(false)
  })

  it("excludes received (closed) receivables from total", () => {
    const recs = [
      receivable({ id: "r1", amount: 3500, status: "pending" }),
      receivable({ id: "r2", amount: 8000, status: "received" }),
    ]
    const result = computeReceivableSummary(recs, TODAY)
    expect(result.total).toBe(3500)
    expect(result.count).toBe(1)
  })

  it("picks soonest expected date as primary row", () => {
    const recs = [
      receivable({ id: "r1", borrower: "Later", dueDate: "Oct 10, 2026", status: "pending" }),
      receivable({ id: "r2", borrower: "Sooner", dueDate: "Sep 05, 2026", status: "pending" }),
    ]
    const result = computeReceivableSummary(recs, TODAY)
    expect(result.nextExpected?.borrower).toBe("Sooner")
  })
})

// ─── Category Budget Matching & Spent ─────────────────────────────────────────
describe("isTransactionMatchingBudget & computeBudgetSpent", () => {
  const netflixBudget = { id: "b1", category: "Netflix subscription", limit: 500, spent: 0, accent: "#E50914" }
  const foodpandaBudget = { id: "b2", category: "Foodpanda", limit: 2000, spent: 0, accent: "#D70F64" }
  const starbucksBudget = { id: "b3", category: "Starbucks", limit: 1000, spent: 0, accent: "#00704A" }
  const foodBudget = { id: "b4", category: "Food & Dining", limit: 3000, spent: 0, accent: "#3D784E" }

  it("matches 'Spent 200 on netflix' to 'Netflix subscription' budget", () => {
    const tx = {
      id: "tx1",
      label: "Spent 200 on netflix",
      category: "Entertainment",
      account: "BPI Savings",
      amount: 200,
      currency: "PHP" as const,
      kind: "expense" as const,
      date: "2026-08-31",
      time: "01:37 PM",
    }
    const spent = computeBudgetSpent(netflixBudget, [tx], TODAY)
    expect(spent).toBe(200)
  })

  it("matches Foodpanda transactions to Foodpanda budget", () => {
    const tx = {
      id: "tx2",
      label: "Foodpanda dinner delivery",
      category: "Food & Dining",
      account: "GCash",
      amount: 350,
      currency: "PHP" as const,
      kind: "expense" as const,
      date: "2026-08-31",
      time: "07:30 PM",
    }
    const spent = computeBudgetSpent(foodpandaBudget, [tx], TODAY)
    expect(spent).toBe(350)
  })

  it("matches Starbucks transaction to Starbucks budget", () => {
    const tx = {
      id: "tx3",
      label: "Starbucks iced caramel macchiato",
      category: "Coffee & Snacks",
      account: "GCash",
      amount: 195,
      currency: "PHP" as const,
      kind: "expense" as const,
      date: "2026-08-31",
      time: "09:15 AM",
    }
    const spent = computeBudgetSpent(starbucksBudget, [tx], TODAY)
    expect(spent).toBe(195)
  })

  it("matches category aliases (e.g. 'Food' matching 'Food & Dining')", () => {
    const tx = {
      id: "tx4",
      label: "Lunch at carinderia",
      category: "Food",
      account: "Cash",
      amount: 120,
      currency: "PHP" as const,
      kind: "expense" as const,
      date: "2026-08-31",
      time: "12:00 PM",
    }
    const spent = computeBudgetSpent(foodBudget, [tx], TODAY)
    expect(spent).toBe(120)
  })

  it("ignores income transactions when calculating budget spent", () => {
    const tx = {
      id: "tx5",
      label: "Netflix reimbursement",
      category: "Entertainment",
      account: "GCash",
      amount: 500,
      currency: "PHP" as const,
      kind: "income" as const,
      date: "2026-08-31",
      time: "02:00 PM",
    }
    const spent = computeBudgetSpent(netflixBudget, [tx], TODAY)
    expect(spent).toBe(0)
  })

  it("sums multiple matching transactions accurately", () => {
    const txs = [
      { id: "1", label: "Netflix Premium", category: "Entertainment", account: "Card", amount: 249, currency: "PHP" as const, kind: "expense" as const, date: "2026-08-15", time: "12:00 PM" },
      { id: "2", label: "Netflix extra member", category: "Entertainment", account: "Card", amount: 149, currency: "PHP" as const, kind: "expense" as const, date: "2026-08-20", time: "01:00 PM" },
    ]
    const spent = computeBudgetSpent(netflixBudget, txs, TODAY)
    expect(spent).toBe(398)
  })
})
