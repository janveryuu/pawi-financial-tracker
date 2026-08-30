import {
  computeStatementDueCards,
  computeTopGoals,
  computeDebtSummary,
  computeReceivableSummary,
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
