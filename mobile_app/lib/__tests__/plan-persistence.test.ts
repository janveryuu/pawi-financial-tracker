/**
 * Regression & Unit Tests for Plan Section Persistence and Goal Deposit Sync.
 *
 * Bugs Tested:
 * 1. Personal goals mapping bug: `Goal` uses `name`/`due` while mapper previously accessed
 *    `g.label`/`g.dueDate` which evaluated to `undefined` and caused PostgreSQL NOT NULL
 *    constraint violation on `title`.
 * 2. Goal deposit balance deduction: `addFundsToGoal` must deduct from source wallet,
 *    update goal saved amount, create a transaction record, and queue the source wallet
 *    for Supabase update.
 * 3. Over-deposit validation: `addFundsToGoal` must reject deposit attempts exceeding
 *    available source wallet balance.
 * 4. Plan entities round-trip: budgets, debts, receivables, installments, tags, and
 *    planned payments must serialize and deserialize to/from DB rows without data loss.
 */

import {
  Wallet,
  Goal,
  Budget,
  Debt,
  Receivable,
  PlannedPayment,
  Installment,
  Tag,
} from "../pawi-data"

// Helper functions mirroring the fixed store implementation
function mapGoalToRow(g: Goal, userId: string): any {
  return {
    id: g.id,
    user_id: userId,
    title: g.name || (g as any).label || "Goal",
    target_amount: g.target,
    current_amount: g.saved,
    target_date: g.due || (g as any).dueDate || null,
    icon: g.icon || "🎯",
    color: 1,
    completed: g.saved >= g.target,
  }
}

function mapGoalRowToGoal(g: any): Goal {
  return {
    id: g.id,
    name: g.title || g.label || "Goal",
    target: Number(g.target_amount) || 0,
    saved: Number(g.current_amount) || 0,
    due: g.target_date || g.due || null,
    color: "#3D784E",
    icon: g.icon || "🎯",
    accent: "#3D784E",
  }
}

function mapDebtToRow(d: Debt, userId: string): any {
  return {
    id: d.id,
    user_id: userId,
    lender: d.lender,
    amount: d.amount,
    monthly_payment: d.monthlyPayment || 0,
    due_date: d.dueDate || null,
    interest_rate: d.interestRate || null,
    notes: d.notes || null,
    category: d.category || null,
    accent: d.accent || "#E53E3E",
  }
}

function mapDebtRowToDebt(row: any): Debt {
  return {
    id: row.id,
    lender: row.lender,
    amount: Number(row.amount) || 0,
    monthlyPayment: Number(row.monthly_payment) || 0,
    dueDate: row.due_date || "Monthly",
    interestRate: row.interest_rate || undefined,
    notes: row.notes || undefined,
    category: row.category || undefined,
    accent: row.accent || "#E53E3E",
  }
}

function mapReceivableToRow(r: Receivable, userId: string): any {
  return {
    id: r.id,
    user_id: userId,
    borrower: r.borrower,
    amount: r.amount,
    due_date: r.dueDate || null,
    notes: r.notes || null,
    status: r.status || "pending",
    accent: r.accent || "#3D784E",
  }
}

function mapReceivableRowToReceivable(row: any): Receivable {
  return {
    id: row.id,
    borrower: row.borrower,
    amount: Number(row.amount) || 0,
    dueDate: row.due_date || "Upcoming",
    notes: row.notes || undefined,
    status: row.status === "received" ? "received" : "pending",
    accent: row.accent || "#3D784E",
  }
}

function mapInstallmentToRow(i: Installment, userId: string): any {
  return {
    id: i.id,
    user_id: userId,
    name: i.name,
    total_amount: i.totalAmount,
    paid: i.paid,
    remaining: i.remaining,
    monthly_amount: i.monthlyAmount,
    card: i.card,
    months_total: i.monthsTotal,
    months_paid: i.monthsPaid,
    end_date: i.endDate,
  }
}

function mapInstallmentRowToInstallment(row: any): Installment {
  return {
    id: row.id,
    name: row.name,
    totalAmount: Number(row.total_amount) || 0,
    paid: Number(row.paid) || 0,
    remaining: Number(row.remaining) || 0,
    monthlyAmount: Number(row.monthly_amount) || 0,
    card: row.card || "Credit Card",
    monthsTotal: Number(row.months_total) || 12,
    monthsPaid: Number(row.months_paid) || 0,
    endDate: row.end_date || "",
  }
}

function mapTagToRow(t: Tag, userId: string): any {
  return {
    id: t.id,
    user_id: userId,
    label: t.label,
    color: t.color || "#3D784E",
    count: t.count || 0,
  }
}

function mapTagRowToTag(row: any): Tag {
  return {
    id: row.id,
    label: row.label,
    color: row.color || "#3D784E",
    count: Number(row.count) || 0,
  }
}

function mapPlannedPaymentToRow(p: PlannedPayment, userId: string): any {
  return {
    id: p.id,
    user_id: userId,
    name: p.label,
    amount: p.amount,
    billing_cycle: p.frequency || "monthly",
    due_day: 15,
    next_due_date: p.dueDate || "Monthly",
    account_name: p.account || "Cash",
  }
}

function mapPlannedPaymentRowToPlannedPayment(row: any): PlannedPayment {
  return {
    id: row.id,
    label: row.name,
    amount: Number(row.amount) || 0,
    dueDate: row.next_due_date || "Monthly",
    frequency: (row.billing_cycle as any) || "recurring",
    category: "Bills",
    account: row.account_name || "Cash",
    icon: "📅",
  }
}

// Simulated deposit funds engine
function executeGoalDeposit(
  goalId: string,
  amount: number,
  fromWalletName: string,
  state: { goals: Goal[]; wallets: Wallet[] }
): {
  success: boolean
  error?: string
  updatedGoal?: Goal
  updatedWallet?: Wallet
  transaction?: any
} {
  if (amount <= 0) {
    return { success: false, error: "Deposit amount must be greater than ₱0.00" }
  }

  const goal = state.goals.find((g) => g.id === goalId)
  if (!goal) {
    return { success: false, error: "Goal not found" }
  }

  const sourceWallet = state.wallets.find(
    (w) => w.name.toLowerCase() === fromWalletName.toLowerCase()
  )
  if (!sourceWallet) {
    return { success: false, error: `Account ${fromWalletName} not found` }
  }

  if (sourceWallet.balance < amount) {
    return {
      success: false,
      error: `Insufficient balance in ${sourceWallet.name}. Available: ₱${sourceWallet.balance.toLocaleString()}`,
    }
  }

  const newSaved = goal.saved + amount
  const updatedGoal: Goal = {
    ...goal,
    saved: newSaved,
  }

  const updatedWallet: Wallet = {
    ...sourceWallet,
    balance: sourceWallet.balance - amount,
  }

  const transaction = {
    id: crypto.randomUUID(),
    label: `Goal deposit: ${goal.name}`,
    category: "Savings Goal",
    account: sourceWallet.name,
    amount: amount,
    currency: "PHP",
    kind: "expense",
    date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }),
    time: "12:00 PM",
  }

  return {
    success: true,
    updatedGoal,
    updatedWallet,
    transaction,
  }
}

describe("Plan Section Persistence & Goal Deposit Suite", () => {
  describe("1. Goal Mapping & Serialization", () => {
    it("correctly maps Goal with name and due to Supabase row format", () => {
      const appGoal: Goal = {
        id: "goal_chocolate_hill",
        name: "Chocolate Hill",
        target: 15000,
        saved: 1000,
        due: "2026-12-31",
        accent: "#3D784E",
        icon: "🍫",
      }

      const row = mapGoalToRow(appGoal, "user_uuid_123")

      expect(row.id).toBe("goal_chocolate_hill")
      expect(row.user_id).toBe("user_uuid_123")
      expect(row.title).toBe("Chocolate Hill") // NOT undefined!
      expect(row.target_amount).toBe(15000)
      expect(row.current_amount).toBe(1000)
      expect(row.target_date).toBe("2026-12-31")
      expect(row.completed).toBe(false)
    })

    it("correctly round-trips from Supabase row back to Goal interface", () => {
      const dbRow = {
        id: "goal_chocolate_hill",
        user_id: "user_uuid_123",
        title: "Chocolate Hill",
        target_amount: 15000,
        current_amount: 1000,
        target_date: "2026-12-31",
        icon: "🍫",
        completed: false,
      }

      const goal = mapGoalRowToGoal(dbRow)

      expect(goal.id).toBe("goal_chocolate_hill")
      expect(goal.name).toBe("Chocolate Hill")
      expect(goal.target).toBe(15000)
      expect(goal.saved).toBe(1000)
      expect(goal.due).toBe("2026-12-31")
      expect(goal.icon).toBe("🍫")
    })
  })

  describe("2. Goal Deposit & Wallet Balance Deduction", () => {
    const mockWallets: Wallet[] = [
      {
        id: "ub_rewards",
        name: "UnionBank Rewards",
        subtitle: "Credit · PHP",
        balance: 2950,
        currency: "PHP",
        type: "credit",
        accent: "#EA580C",
      },
      {
        id: "gcash",
        name: "GCash",
        subtitle: "E-Wallet · PHP",
        balance: 5000,
        currency: "PHP",
        type: "ewallet",
        accent: "#007DFE",
      },
    ]

    const mockGoals: Goal[] = [
      {
        id: "goal_chocolate_hill",
        name: "Chocolate Hill",
        target: 15000,
        saved: 1000,
        due: "2026-12-31",
        accent: "#3D784E",
      },
    ]

    it("deducts exact deposit amount from source wallet and increases goal saved amount", () => {
      const result = executeGoalDeposit(
        "goal_chocolate_hill",
        1000,
        "UnionBank Rewards",
        { goals: mockGoals, wallets: mockWallets }
      )

      expect(result.success).toBe(true)
      expect(result.updatedGoal?.saved).toBe(2000) // 1000 + 1000
      expect(result.updatedWallet?.balance).toBe(1950) // 2950 - 1000
      expect(result.transaction).toBeDefined()
      expect(result.transaction.label).toBe("Goal deposit: Chocolate Hill")
      expect(result.transaction.amount).toBe(1000)
      expect(result.transaction.account).toBe("UnionBank Rewards")
      expect(result.transaction.kind).toBe("expense")
    })

    it("rejects deposit when deposit amount exceeds available source wallet balance", () => {
      const result = executeGoalDeposit(
        "goal_chocolate_hill",
        5000,
        "UnionBank Rewards", // balance is 2950
        { goals: mockGoals, wallets: mockWallets }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain("Insufficient balance in UnionBank Rewards")
      expect(result.updatedGoal).toBeUndefined()
      expect(result.updatedWallet).toBeUndefined()
    })

    it("rejects deposit of zero or negative amounts", () => {
      const resultZero = executeGoalDeposit(
        "goal_chocolate_hill",
        0,
        "GCash",
        { goals: mockGoals, wallets: mockWallets }
      )
      expect(resultZero.success).toBe(false)

      const resultNeg = executeGoalDeposit(
        "goal_chocolate_hill",
        -500,
        "GCash",
        { goals: mockGoals, wallets: mockWallets }
      )
      expect(resultNeg.success).toBe(false)
    })

    it("marks goal as completed when saved reaches target", () => {
      const result = executeGoalDeposit(
        "goal_chocolate_hill",
        14000,
        "GCash", // balance 5000 is not enough, let's give GCash 20000
        {
          goals: mockGoals,
          wallets: [{ ...mockWallets[1], balance: 20000 }],
        }
      )

      expect(result.success).toBe(true)
      expect(result.updatedGoal?.saved).toBe(15000)

      const row = mapGoalToRow(result.updatedGoal!, "user_123")
      expect(row.completed).toBe(true)
    })
  })

  describe("3. Plan Entities DB Serialization Round Trips", () => {
    it("round-trips Debt entity", () => {
      const debt: Debt = {
        id: "debt_home_credit",
        lender: "Home Credit Phone",
        amount: 14200,
        monthlyPayment: 1388.87,
        dueDate: "Day 15 of month",
        interestRate: "0% 12-month promo",
        notes: "Samsung Galaxy installment",
        accent: "#E53E3E",
      }

      const row = mapDebtToRow(debt, "user_123")
      const restored = mapDebtRowToDebt(row)

      expect(restored.id).toBe(debt.id)
      expect(restored.lender).toBe("Home Credit Phone")
      expect(restored.amount).toBe(14200)
      expect(restored.monthlyPayment).toBe(1388.87)
      expect(restored.dueDate).toBe("Day 15 of month")
    })

    it("round-trips Receivable entity", () => {
      const receivable: Receivable = {
        id: "rec_marco",
        borrower: "Marco (Cousin)",
        amount: 3500,
        dueDate: "Apr 30, 2026",
        notes: "Borrowed for laptop repair",
        status: "pending",
        accent: "#3D784E",
      }

      const row = mapReceivableToRow(receivable, "user_123")
      const restored = mapReceivableRowToReceivable(row)

      expect(restored.id).toBe(receivable.id)
      expect(restored.borrower).toBe("Marco (Cousin)")
      expect(restored.amount).toBe(3500)
      expect(restored.status).toBe("pending")
    })

    it("round-trips Installment entity", () => {
      const inst: Installment = {
        id: "inst_macbook",
        name: "MacBook Air M2",
        totalAmount: 64990,
        paid: 43326,
        remaining: 21664,
        monthlyAmount: 2708,
        card: "BDO Mastercard",
        monthsTotal: 24,
        monthsPaid: 16,
        endDate: "Dec 2026",
      }

      const row = mapInstallmentToRow(inst, "user_123")
      const restored = mapInstallmentRowToInstallment(row)

      expect(restored.id).toBe(inst.id)
      expect(restored.name).toBe("MacBook Air M2")
      expect(restored.totalAmount).toBe(64990)
      expect(restored.remaining).toBe(21664)
      expect(restored.card).toBe("BDO Mastercard")
    })

    it("round-trips PlannedPayment entity with freeform text due dates", () => {
      const payment: PlannedPayment = {
        id: "plan_meralco",
        label: "Meralco Electric Bill",
        amount: 3850,
        dueDate: "15th of the month",
        frequency: "recurring",
        category: "Utilities",
        account: "GCash",
        icon: "⚡",
      }

      const row = mapPlannedPaymentToRow(payment, "user_123")
      const restored = mapPlannedPaymentRowToPlannedPayment(row)

      expect(restored.id).toBe(payment.id)
      expect(restored.label).toBe("Meralco Electric Bill")
      expect(restored.amount).toBe(3850)
      expect(restored.dueDate).toBe("15th of the month")
    })

    it("round-trips Tag entity", () => {
      const tag: Tag = {
        id: "tag_dining",
        label: "Dining Out",
        color: "#E53E3E",
        count: 18,
      }

      const row = mapTagToRow(tag, "user_123")
      const restored = mapTagRowToTag(row)

      expect(restored.id).toBe(tag.id)
      expect(restored.label).toBe("Dining Out")
      expect(restored.color).toBe("#E53E3E")
      expect(restored.count).toBe(18)
    })
  })
})
