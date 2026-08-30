import { parseChatAction, fuzzyMatchCandidate, extractAmount } from "../chat-action-parser"

describe("Pawi Conversational Action Parser", () => {
  const mockContext = {
    defaultCurrency: "PHP",
    wallets: [
      { id: "w1", name: "GCash", balance: 5000, type: "ewallet" },
      { id: "w2", name: "BPI Savings", balance: 25000, type: "savings" },
      { id: "w3", name: "Cash", balance: 1200, type: "cash" },
    ],
    goals: [
      { id: "g1", name: "Emergency Fund", saved: 15000, target: 50000 },
      { id: "g2", name: "New Laptop", saved: 8000, target: 45000 },
    ],
    plannedPayments: [
      { id: "p1", label: "Netflix", amount: 549, dueDate: "Every 15th" },
      { id: "p2", label: "Meralco", amount: 3200, dueDate: "Every 22nd" },
    ],
    debts: [
      { id: "d1", name: "Sarah Loan", amount: 1000, person: "Sarah" },
    ],
    receivables: [
      { id: "r1", name: "Mike Borrowed", amount: 300, person: "Mike" },
    ],
  }

  // 1. Log Expense
  it("parses expense without account and triggers account clarification chips", () => {
    const action = parseChatAction("I spent 200 pesos on food", mockContext)
    expect(action).not.toBeNull()
    expect(action?.type).toBe("log_expense")
    expect(action?.params.amount).toBe(200)
    expect(action?.params.category).toBe("Food & Dining")
    expect(action?.status).toBe("pending_clarification")
    expect(action?.missingField).toBe("account")
    expect(action?.clarificationOptions).toHaveLength(3)
  })

  it("parses expense with explicit account directly ready for confirmation", () => {
    const action = parseChatAction("Spent 350 for groceries in my BPI Savings", mockContext)
    expect(action).not.toBeNull()
    expect(action?.type).toBe("log_expense")
    expect(action?.params.amount).toBe(350)
    expect(action?.params.account).toBe("BPI Savings")
    expect(action?.status).toBe("ready_for_confirmation")
  })

  // 2. Log Income
  it("parses income with explicit account without redundant clarification", () => {
    const action = parseChatAction("I just got my salary for 5000 in my GCash", mockContext)
    expect(action).not.toBeNull()
    expect(action?.type).toBe("log_income")
    expect(action?.params.amount).toBe(5000)
    expect(action?.params.account).toBe("GCash")
    expect(action?.status).toBe("ready_for_confirmation")
  })

  // 3. Pay Recurring Bill
  it("matches recurring bill and asks for account if missing", () => {
    const action = parseChatAction("I paid the Netflix for 500 pesos", mockContext)
    expect(action).not.toBeNull()
    expect(action?.type).toBe("pay_bill")
    expect(action?.params.billName).toBe("Netflix")
    expect(action?.params.amount).toBe(500)
    expect(action?.status).toBe("pending_clarification")
    expect(action?.missingField).toBe("account")
  })

  // 4. Deposit to Goal
  it("matches savings goal and asks for source account", () => {
    const action = parseChatAction("add 500 to my emergency fund", mockContext)
    expect(action).not.toBeNull()
    expect(action?.type).toBe("deposit_goal")
    expect(action?.params.goalName).toBe("Emergency Fund")
    expect(action?.params.amount).toBe(500)
    expect(action?.status).toBe("pending_clarification")
    expect(action?.missingField).toBe("account")
  })

  // 5. Transfer Funds
  it("parses transfer between accounts with from/to accounts", () => {
    const action = parseChatAction("Move 1000 from GCash to BPI Savings", mockContext)
    expect(action).not.toBeNull()
    expect(action?.type).toBe("transfer_funds")
    expect(action?.params.amount).toBe(1000)
    expect(action?.params.account).toBe("GCash")
    expect(action?.params.targetAccount).toBe("BPI Savings")
    expect(action?.status).toBe("ready_for_confirmation")
  })

  // 6. Create Recurring Payment
  it("parses recurring bill creation", () => {
    const action = parseChatAction("Remind me to pay my rent of 8000 every month on the 5th", mockContext)
    expect(action).not.toBeNull()
    expect(action?.type).toBe("create_planned_payment")
    expect(action?.params.label).toBe("Rent")
    expect(action?.params.amount).toBe(8000)
    expect(action?.status).toBe("ready_for_confirmation")
  })

  // 7. Create Goal
  it("parses new goal creation", () => {
    const action = parseChatAction("I want to save 20000 for a new laptop by December", mockContext)
    expect(action).not.toBeNull()
    expect(action?.type).toBe("create_goal")
    expect(action?.params.goalTarget).toBe(20000)
    expect(action?.status).toBe("ready_for_confirmation")
  })

  // 8. Log Debt & Receivables
  it("parses money borrowed / debt", () => {
    const action = parseChatAction("I borrowed 500 from John", mockContext)
    expect(action).not.toBeNull()
    expect(action?.type).toBe("log_debt")
    expect(action?.params.amount).toBe(500)
    expect(action?.params.counterparty).toBe("John")
    expect(action?.params.debtDirection).toBe("i_owe")
  })

  it("parses money owed to you", () => {
    const action = parseChatAction("Mike paid me back 300", mockContext)
    expect(action).not.toBeNull()
    expect(action?.type).toBe("settle_receivable")
    expect(action?.params.amount).toBe(300)
    expect(action?.params.counterparty).toBe("Mike")
  })

  // 9. Multi-turn Clarification Resolution
  it("resolves pending account clarification on chip select", () => {
    const initialAction = parseChatAction("I spent 200 on food", mockContext)
    expect(initialAction?.status).toBe("pending_clarification")

    const resolved = parseChatAction("GCash", mockContext, initialAction)
    expect(resolved?.status).toBe("ready_for_confirmation")
    expect(resolved?.params.account).toBe("GCash")
    expect(resolved?.params.amount).toBe(200)
  })

  // 10. General Questions do not trigger false write actions
  it("does not trigger write action for simple questions", () => {
    const action1 = parseChatAction("How much money do I have?", mockContext)
    expect(action1).toBeNull()

    const action2 = parseChatAction("Give me a tip on how to save", mockContext)
    expect(action2).toBeNull()
  })

  // 11. Cancellation mid-turn
  it("cancels pending action cleanly on cancel message", () => {
    const initialAction = parseChatAction("I spent 200 on food", mockContext)
    const cancelled = parseChatAction("cancel", mockContext, initialAction)
    expect(cancelled).toBeNull()
  })

  // 12. Fuzzy matching utilities
  it("accurately fuzzy matches names with case tolerance", () => {
    expect(fuzzyMatchCandidate("netflix", ["Netflix Premium", "Spotify"])).toBe("Netflix Premium")
    expect(fuzzyMatchCandidate("emergency", ["Emergency Fund", "Vacation"])).toBe("Emergency Fund")
    expect(fuzzyMatchCandidate("gcash", ["Cash", "GCash", "BPI"])).toBe("GCash")
  })
})
