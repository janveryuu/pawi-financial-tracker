import { parseChatAction } from "../chat-action-parser"

describe("Pawi Conversational Action Engine Full End-to-End Scenarios", () => {
  const mockContext = {
    defaultCurrency: "PHP",
    wallets: [
      { id: "w1", name: "GCash", balance: 5000, currency: "PHP", type: "ewallet" },
      { id: "w2", name: "BPI Savings", balance: 25000, currency: "PHP", type: "savings" },
      { id: "w3", name: "Cash", balance: 1200, currency: "PHP", type: "cash" },
    ],
    goals: [
      { id: "g1", name: "Emergency Fund", saved: 15000, target: 50000 },
      { id: "g2", name: "New Laptop", saved: 8000, target: 45000 },
    ],
    plannedPayments: [
      { id: "p1", label: "Netflix", amount: 549, dueDate: "Every 15th", frequency: "recurring" },
      { id: "p2", label: "Meralco", amount: 3200, dueDate: "Every 22nd", frequency: "recurring" },
    ],
    debts: [
      { id: "d1", name: "Pag-IBIG Housing Loan", amount: 50000, person: "Pag-IBIG" },
    ],
    receivables: [],
    installments: [
      { id: "inst_1", name: "Laptop", totalAmount: 50000, paid: 4167, remaining: 45833, monthlyAmount: 4167, monthsTotal: 12, monthsPaid: 1 },
    ],
  }

  // 1. Log Expense with Account Disambiguation
  test("Expense without account -> prompts with wallet chips -> user selects GCash -> ready for confirmation", () => {
    const step1 = parseChatAction("I spent 200 pesos on food", mockContext)
    expect(step1?.status).toBe("pending_clarification")
    expect(step1?.missingField).toBe("account")
    expect(step1?.clarificationOptions).toHaveLength(3)

    const step2 = parseChatAction("GCash", mockContext, step1)
    expect(step2?.status).toBe("ready_for_confirmation")
    expect(step2?.params.amount).toBe(200)
    expect(step2?.params.account).toBe("GCash")
    expect(step2?.params.category).toBe("Food & Dining")
  })

  // 2. Log Income (Explicit Account)
  test("Income with explicit account -> skips disambiguation -> ready for confirmation", () => {
    const action = parseChatAction("I just got my salary for 5000 in my GCash", mockContext)
    expect(action?.status).toBe("ready_for_confirmation")
    expect(action?.type).toBe("log_income")
    expect(action?.params.amount).toBe(5000)
    expect(action?.params.account).toBe("GCash")
  })

  // 3. Pay a Recurring Bill
  test("Pay Netflix bill -> matches bill name and triggers account disambiguation", () => {
    const step1 = parseChatAction("I paid the Netflix for 500 pesos", mockContext)
    expect(step1?.status).toBe("pending_clarification")
    expect(step1?.params.billName).toBe("Netflix")
    expect(step1?.missingField).toBe("account")

    const step2 = parseChatAction("BPI Savings", mockContext, step1)
    expect(step2?.status).toBe("ready_for_confirmation")
    expect(step2?.params.account).toBe("BPI Savings")
    expect(step2?.params.amount).toBe(500)
  })

  // 4. Deposit to a Goal
  test("Deposit to emergency fund -> matches goal name and triggers account disambiguation", () => {
    const step1 = parseChatAction("I deposited 500 pesos to emergency fund", mockContext)
    expect(step1?.status).toBe("pending_clarification")
    expect(step1?.params.goalName).toBe("Emergency Fund")
    expect(step1?.missingField).toBe("account")

    const step2 = parseChatAction("Cash", mockContext, step1)
    expect(step2?.status).toBe("ready_for_confirmation")
    expect(step2?.params.account).toBe("Cash")
    expect(step2?.params.amount).toBe(500)
  })

  // 5. Transfer between accounts
  test("Transfer funds from GCash to BPI Savings -> captures both accounts", () => {
    const action = parseChatAction("Move 1000 from GCash to BPI Savings", mockContext)
    expect(action?.status).toBe("ready_for_confirmation")
    expect(action?.type).toBe("transfer_funds")
    expect(action?.params.amount).toBe(1000)
    expect(action?.params.account).toBe("GCash")
    expect(action?.params.targetAccount).toBe("BPI Savings")
  })

  // 6. Create recurring payment
  test("Create recurring payment for Rent -> parses schedule and amount", () => {
    const action = parseChatAction("Remind me to pay my rent of 8000 every month on the 5th", mockContext)
    expect(action?.status).toBe("ready_for_confirmation")
    expect(action?.type).toBe("create_planned_payment")
    expect(action?.params.label).toBe("Rent")
    expect(action?.params.amount).toBe(8000)
    expect(action?.params.billDueDate).toBe("5th")
  })

  // 7. Create a new goal
  test("Create goal for new laptop -> parses target amount", () => {
    const action = parseChatAction("I want to save 20000 for a new laptop by December", mockContext)
    expect(action?.status).toBe("ready_for_confirmation")
    expect(action?.type).toBe("create_goal")
    expect(action?.params.goalTarget).toBe(20000)
  })

  // 8. Log Debt & Settle Receivables
  test("Log debt borrowed from John", () => {
    const action = parseChatAction("I borrowed 500 from John", mockContext)
    expect(action?.status).toBe("ready_for_confirmation")
    expect(action?.type).toBe("log_debt")
    expect(action?.params.amount).toBe(500)
    expect(action?.params.counterparty).toBe("John")
  })

  test("Settle money owed by Mike", () => {
    const action = parseChatAction("Mike paid me back 300", mockContext)
    expect(action?.status).toBe("ready_for_confirmation")
    expect(action?.type).toBe("settle_receivable")
    expect(action?.params.amount).toBe(300)
    expect(action?.params.counterparty).toBe("Mike")
  })

  // 9. Pay Installment with Disambiguation
  test("Paid installment on laptop 1500 -> prompts account -> resolves BPI Savings -> ready for confirmation", () => {
    const step1 = parseChatAction("Paid installment on laptop 1500", mockContext)
    expect(step1?.status).toBe("pending_clarification")
    expect(step1?.type).toBe("pay_installment")
    expect(step1?.params.amount).toBe(1500)
    expect(step1?.params.installmentName).toBe("Laptop")
    expect(step1?.missingField).toBe("account")

    const step2 = parseChatAction("BPI Savings", mockContext, step1)
    expect(step2?.status).toBe("ready_for_confirmation")
    expect(step2?.params.account).toBe("BPI Savings")
    expect(step2?.params.amount).toBe(1500)
    expect(step2?.params.installmentName).toBe("Laptop")
  })

  // 10. Pay Debt
  test("Paid 5000 to Pag-IBIG loan -> prompts account -> resolves GCash", () => {
    const step1 = parseChatAction("Paid 5000 to Pag-IBIG loan", mockContext)
    expect(step1?.status).toBe("pending_clarification")
    expect(step1?.type).toBe("settle_debt")
    expect(step1?.params.amount).toBe(5000)
    expect(step1?.params.debtName).toBe("Pag-IBIG Housing Loan")

    const step2 = parseChatAction("GCash", mockContext, step1)
    expect(step2?.status).toBe("ready_for_confirmation")
    expect(step2?.params.account).toBe("GCash")
    expect(step2?.params.amount).toBe(5000)
  })
})
