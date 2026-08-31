import { parseChatAction } from "../chat-action-parser"
import { computePaydayCountdown, calculateStreak } from "../store"
import { computeStatementDueCards, computeTopGoals, computeDebtSummary, computeReceivableSummary } from "../home-sections-engine"

describe("Final Pre-Launch QA Verification Suite", () => {
  const mockWallets = [
    { id: "w1", name: "GCash", balance: 5000, currency: "PHP" as const, type: "ewallet" as const, isLiability: false },
    { id: "w2", name: "Maya", balance: 12000, currency: "PHP" as const, type: "ewallet" as const, isLiability: false },
    { id: "w3", name: "BDO Credit", balance: 15000, currency: "PHP" as const, type: "credit" as const, isLiability: true, creditLimit: 50000, usedCredit: 15000, dueDay: 15 },
  ]

  const mockGoals = [
    { id: "g1", name: "Boracay Trip", target: 25000, saved: 10000, icon: "🏖️" },
    { id: "g2", name: "Emergency Fund", target: 100000, saved: 45000, icon: "🛡️" },
  ]

  const mockDebts = [
    { id: "d1", lender: "Bank Personal Loan", name: "Bank Personal Loan", amount: 20000, monthlyPayment: 2500, dueDate: "15th" },
    { id: "d2", lender: "Home Credit", name: "Home Credit", amount: 8000, monthlyPayment: 1200, dueDate: "20th" },
  ]

  const mockReceivables = [
    { id: "r1", borrower: "Alex", name: "Alex", amount: 3500, dueDate: "Friday", status: "pending" as const },
    { id: "r2", borrower: "Sarah", name: "Sarah", amount: 1500, dueDate: "Next week", status: "received" as const },
  ]

  const context = {
    wallets: mockWallets,
    goals: mockGoals,
    debts: mockDebts,
    receivables: mockReceivables,
    categories: ["Food & Dining", "Transportation", "Shopping", "Bills & Utilities"],
  }

  describe("1. Real-time Conversational Engine QA", () => {
    it("parses debt payoff intent accurately", () => {
      const action = parseChatAction("Paid 2500 for Bank Personal Loan from GCash", context)
      expect(action).not.toBeNull()
      expect(action?.type).toBe("settle_debt")
      expect(action?.params.amount).toBe(2500)
      expect(action?.params.account).toBe("GCash")
      expect(action?.status).toBe("ready_for_confirmation")
    })

    it("parses receivable settlement intent accurately", () => {
      const action = parseChatAction("Alex paid me back 3500 into GCash", context)
      expect(action).not.toBeNull()
      expect(action?.type).toBe("settle_receivable")
      expect(action?.params.amount).toBe(3500)
      expect(action?.params.counterparty).toBe("Alex")
      expect(action?.status).toBe("ready_for_confirmation")
    })

    it("parses goal deposit intent with smart wallet extraction", () => {
      const action = parseChatAction("Deposit 2000 to Boracay Trip using Maya", context)
      expect(action).not.toBeNull()
      expect(action?.type).toBe("deposit_goal")
      expect(action?.params.amount).toBe(2000)
      expect(action?.params.account).toBe("Maya")
      expect(action?.status).toBe("ready_for_confirmation")
    })
  })

  describe("2. Financial Overview & Analytics Verification", () => {
    it("computes accurate statement due cards for credit liabilities", () => {
      const cards = computeStatementDueCards(mockWallets as any, new Date("2026-08-31T00:00:00Z"))
      expect(cards.length).toBe(1)
      expect(cards[0].id).toBe("w3")
      expect(cards[0].name).toBe("BDO Credit")
      expect(cards[0].amountDue).toBe(15000)
    })

    it("computes accurate top savings goals ranking", () => {
      const topGoals = computeTopGoals(mockGoals as any)
      expect(topGoals.length).toBe(2)
      expect(topGoals[0].name).toBe("Emergency Fund")
      expect(topGoals[1].name).toBe("Boracay Trip")
    })

    it("computes accurate total debt summaries", () => {
      const summary = computeDebtSummary(mockDebts as any)
      expect(summary.total).toBe(28000)
      expect(summary.count).toBe(2)
    })

    it("computes accurate pending receivable summaries (excluding received)", () => {
      const summary = computeReceivableSummary(mockReceivables as any)
      expect(summary.total).toBe(3500)
      expect(summary.count).toBe(1)
    })
  })

  describe("3. Date Boundary & Payday Engine Verification", () => {
    it("accurately computes days remaining until 15th payday across month boundaries", () => {
      const config = {
        configured: true,
        day1: 15,
        frequency: "monthly" as const,
        amount: 25000,
      }
      const testDate = new Date("2026-08-31T00:00:00Z")
      const result = computePaydayCountdown(config, testDate)
      expect(result.configured).toBe(true)
      expect(result.daysRemaining).toBe(15) // From Aug 31 to Sep 15
      expect(result.amount).toBe(25000)
    })

    it("accurately computes semi-monthly 15th / 30th payday countdown", () => {
      const config = {
        configured: true,
        day1: 15,
        day2: 30,
        frequency: "semi-monthly" as const,
        amount: 15000,
      }
      const testDate = new Date("2026-09-01T00:00:00Z")
      const result = computePaydayCountdown(config, testDate)
      expect(result.configured).toBe(true)
      expect(result.daysRemaining).toBe(14) // From Sep 1 to Sep 15
    })

    it("calculates active tracking streak across consecutive days", () => {
      const todayStr = new Date().toISOString().split("T")[0]
      const d1 = new Date()
      d1.setDate(d1.getDate() - 1)
      const d1Str = d1.toISOString().split("T")[0]
      const d2 = new Date()
      d2.setDate(d2.getDate() - 2)
      const d2Str = d2.toISOString().split("T")[0]

      const sampleTx = [
        { id: "1", label: "Coffee", category: "Food", account: "Cash", amount: 150, currency: "PHP" as const, kind: "expense" as const, date: todayStr, time: "10:00 AM" },
        { id: "2", label: "Lunch", category: "Food", account: "Cash", amount: 200, currency: "PHP" as const, kind: "expense" as const, date: d1Str, time: "12:30 PM" },
        { id: "3", label: "Groceries", category: "Food", account: "Cash", amount: 800, currency: "PHP" as const, kind: "expense" as const, date: d2Str, time: "05:00 PM" },
      ]

      const streak = calculateStreak(sampleTx)
      expect(streak).toBe(3)
    })
  })
})
