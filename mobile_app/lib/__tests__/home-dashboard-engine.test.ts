import {
  computeHomeHeroMetrics,
  computeGoalBudgetSpotlight,
  computePacingMetrics,
  computeQuickInsight,
  computeMascotDialogue,
} from "../home-dashboard-engine"
import { Transaction, Goal, Budget, PlannedPayment } from "../pawi-data"
import { UserProfile } from "../use-profile"

describe("Home Dashboard Engine", () => {
  const fixedDate = new Date("2026-08-31T12:00:00Z") // Monday

  const mockTransactions: Transaction[] = [
    {
      id: "tx-1",
      label: "Allowance",
      amount: 3000,
      currency: "PHP",
      kind: "income",
      account: "Cash",
      category: "Income",
      date: "2026-08-31",
      time: "08:00 AM",
    },
    {
      id: "tx-2",
      label: "Lunch at Jollibee",
      amount: 250,
      currency: "PHP",
      kind: "expense",
      account: "GCash",
      category: "Food & Dining",
      date: "2026-08-31",
      time: "12:30 PM",
    },
    {
      id: "tx-3",
      label: "Coffee",
      amount: 180,
      currency: "PHP",
      kind: "expense",
      account: "Cash",
      category: "Coffee",
      date: "2026-08-30",
      time: "03:00 PM",
    },
  ]

  const mockGoals: Goal[] = [
    {
      id: "goal-1",
      name: "Emergency Fund",
      saved: 8000,
      target: 10000,
      accent: "#3D784E",
      due: "2026-12-31",
      icon: "🎯",
    },
    {
      id: "goal-2",
      name: "New Laptop",
      saved: 15000,
      target: 50000,
      accent: "#0284C7",
      due: null,
      icon: "💻",
    },
  ]

  const mockBudgets: Budget[] = [
    {
      id: "budget-1",
      category: "Food & Dining",
      spent: 4200,
      limit: 5000,
      accent: "#EA580C",
      icon: "🍔",
    },
    {
      id: "budget-2",
      category: "Transport",
      spent: 800,
      limit: 2000,
      accent: "#3D784E",
      icon: "🚗",
    },
  ]

  const mockProfile: Partial<UserProfile> = {
    name: "Irish",
    profile_type: "student",
    weekly_allowance: 2500,
    monthly_income: 0,
    is_student: true,
  }

  describe("computeHomeHeroMetrics", () => {
    it("correctly aggregates weekly income, expense, and net position", () => {
      const hero = computeHomeHeroMetrics(mockTransactions, fixedDate)
      expect(hero.weeklyIncome).toBe(3000)
      expect(hero.weeklyExpense).toBe(430)
      expect(hero.weeklyNet).toBe(2570)
      expect(hero.isPositive).toBe(true)
      expect(hero.days.length).toBe(7)
      expect(hero.callout).toBeTruthy()
    })

    it("handles empty transactions without NaN or fake numbers", () => {
      const hero = computeHomeHeroMetrics([], fixedDate)
      expect(hero.weeklyIncome).toBe(0)
      expect(hero.weeklyExpense).toBe(0)
      expect(hero.weeklyNet).toBe(0)
      expect(hero.isPositive).toBe(true)
      expect(hero.callout).toContain("Ready to start")
    })
  })

  describe("computeGoalBudgetSpotlight", () => {
    it("prioritizes closest goal or at-risk budget", () => {
      const spotlight = computeGoalBudgetSpotlight(mockGoals, mockBudgets)
      expect(spotlight.items.length).toBeGreaterThan(0)
      const primary = spotlight.items[0]
      expect(primary).toBeDefined()
      expect(primary.percent).toBeGreaterThanOrEqual(80)
    })

    it("returns hasData: false when user has no goals and no budgets", () => {
      const spotlight = computeGoalBudgetSpotlight([], [])
      expect(spotlight.hasData).toBe(false)
      expect(spotlight.items.length).toBe(0)
    })
  })

  describe("computePacingMetrics", () => {
    it("calculates weekly allowance pacing for students correctly", () => {
      const pacing = computePacingMetrics(mockProfile as UserProfile, mockTransactions, null, fixedDate)
      expect(pacing.type).toBe("allowance")
      expect(pacing.totalBudget).toBe(2500)
      expect(pacing.spent).toBe(250) // Monday spend is 250
      expect(pacing.remaining).toBe(2250)
      expect(pacing.percentSpent).toBe(10)
    })

    it("handles unconfigured pacing gracefully", () => {
      const pacing = computePacingMetrics({ ...mockProfile, weekly_allowance: 0, profile_type: "professional" } as UserProfile, [], null, fixedDate)
      expect(pacing.isConfigured).toBe(false)
    })
  })

  describe("computeQuickInsight", () => {
    it("generates honest, data-driven insight from real spending", () => {
      const insight = computeQuickInsight(mockTransactions, mockGoals, mockBudgets, [], mockProfile as UserProfile)
      expect(insight.hasData).toBe(true)
      expect(insight.title).toBeTruthy()
      expect(insight.body).toBeTruthy()
    })

    it("returns helpful starter insight when transaction list is empty", () => {
      const insight = computeQuickInsight([], [], [], [], mockProfile as UserProfile)
      expect(insight.hasData).toBe(false)
      expect(insight.body).toContain("Log a few transactions")
    })
  })

  describe("computeMascotDialogue", () => {
    it("adapts dialogue for overspending, milestones, and brand new accounts", () => {
      const newAccountDialogue = computeMascotDialogue({
        transactions: [],
        goals: [],
        budgets: [],
        streakDays: 0,
        hour: 10,
        isOverspending: false,
      })
      expect(newAccountDialogue.length).toBeGreaterThan(0)
      expect(newAccountDialogue.some((msg) => msg.includes("Pawi") || msg.includes("Simulan") || msg.includes("Welcome"))).toBe(true)

      const activeDialogue = computeMascotDialogue({
        transactions: mockTransactions,
        goals: mockGoals,
        budgets: mockBudgets,
        streakDays: 5,
        hour: 14,
        isOverspending: false,
      })
      expect(activeDialogue.length).toBeGreaterThan(0)
    })
  })
})
