import {
  evaluateUserNotifications,
  getUserLocalDateString,
  getUserLocalHour,
  getUserLocalDayOfWeek,
  isInQuietHours,
  diffDays,
  DEFAULT_NOTIFICATION_PREFERENCES,
  UserEvaluationContext,
} from "../push-engine"

describe("Unified Push Notification Engine Tests", () => {
  const baseContext: UserEvaluationContext = {
    userId: "user-123",
    timezone: "Asia/Manila",
    preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    recurringBills: [
      {
        id: "bill-1",
        name: "PLDT Fiber",
        amount: 1899,
        next_due_date: "2026-09-03",
        reminder_days_before: 3,
        enabled: true,
        is_paid: false,
      },
    ],
    categories: [
      {
        id: "cat-food",
        name: "Food & Dining",
        spent: 8500,
        limit: 10000, // 85% -> crosses 80% threshold
      },
      {
        id: "cat-shopping",
        name: "Shopping",
        spent: 5500,
        limit: 5000, // 110% -> exceeds 100%
      },
    ],
    adminBudgetThreshold: 80,
    goals: [
      {
        id: "goal-1",
        name: "Boracay Trip",
        saved: 12500,
        target: 25000, // 50% milestone
      },
    ],
    debts: [
      {
        id: "debt-1",
        lender: "Home Credit",
        amount: 5000,
        monthlyPayment: 1200,
        due_date: "2026-08-31",
      },
    ],
    receivables: [
      {
        id: "rec-1",
        borrower: "Carlos",
        amount: 2500,
        due_date: "2026-08-31",
        status: "pending",
      },
      {
        id: "rec-2",
        borrower: "Maria",
        amount: 1000,
        due_date: "2026-08-31",
        status: "received", // Should be ignored
      },
    ],
    paydayConfig: {
      configured: true,
      day1: 31,
      day2: 15,
      frequency: "semi-monthly",
    },
    todayTransactionsCount: 0,
    existingLogs: new Set<string>(),
  }

  // Simulated timestamp: 2026-08-31 at 09:00:00 Manila Time (UTC+8 -> 01:00 UTC)
  const simulatedMorning = new Date("2026-08-31T01:00:00Z")

  // Simulated timestamp: 2026-08-31 at 20:00:00 Manila Time (UTC+8 -> 12:00 UTC)
  const simulatedEvening = new Date("2026-08-31T12:00:00Z")

  describe("1. Timezone & Date Helper Functions", () => {
    it("computes user local date accurately across timezones", () => {
      // 2026-08-31 23:30 UTC -> 2026-09-01 07:30 in Asia/Manila (UTC+8)
      const testUtc = new Date("2026-08-31T23:30:00Z")
      expect(getUserLocalDateString(testUtc, "Asia/Manila")).toBe("2026-09-01")
      expect(getUserLocalDateString(testUtc, "America/New_York")).toBe("2026-08-31")
    })

    it("computes user local hour accurately", () => {
      const testUtc = new Date("2026-08-31T01:00:00Z")
      expect(getUserLocalHour(testUtc, "Asia/Manila")).toBe(9) // 01:00 UTC + 8 = 9 AM
      expect(getUserLocalHour(testUtc, "America/New_York")).toBe(21) // 01:00 UTC - 4 = 9 PM previous day
    })

    it("calculates day difference between date strings accurately", () => {
      expect(diffDays("2026-08-31", "2026-09-03")).toBe(3)
      expect(diffDays("2026-08-31", "2026-08-31")).toBe(0)
      expect(diffDays("2026-09-03", "2026-08-31")).toBe(-3)
    })

    it("evaluates quiet hours accurately", () => {
      // 03:00 Manila time (quiet hours 22:00 to 07:00)
      const lateNightUtc = new Date("2026-08-30T19:00:00Z") // 03:00 Manila
      expect(isInQuietHours(lateNightUtc, "Asia/Manila", "22:00", "07:00")).toBe(true)

      // 14:00 Manila time (outside quiet hours)
      const afternoonUtc = new Date("2026-08-31T06:00:00Z") // 14:00 Manila
      expect(isInQuietHours(afternoonUtc, "Asia/Manila", "22:00", "07:00")).toBe(false)
    })
  })

  describe("2. Bill Due Reminder Trigger", () => {
    it("fires when today is exactly reminder_days_before days from due date", () => {
      const results = evaluateUserNotifications(baseContext, simulatedMorning)
      const billDue = results.find((r) => r.type === "bill_due_reminder")
      expect(billDue).toBeDefined()
      expect(billDue?.relatedEntityId).toBe("bill-1")
      expect(billDue?.cycleIdentifier).toBe("2026-09-03")
      expect(billDue?.payload.title).toContain("PLDT Fiber")
      expect(billDue?.payload.url).toContain("subTab=bills")
    })

    it("does NOT fire if bill is disabled or already marked paid", () => {
      const paidContext: UserEvaluationContext = {
        ...baseContext,
        recurringBills: [
          {
            ...baseContext.recurringBills[0],
            is_paid: true,
          },
        ],
      }
      const results = evaluateUserNotifications(paidContext, simulatedMorning)
      expect(results.find((r) => r.type === "bill_due_reminder")).toBeUndefined()
    })
  })

  describe("3. Bill Overdue Alert Trigger", () => {
    it("fires on the day after due date when bill is unpaid", () => {
      const overdueContext: UserEvaluationContext = {
        ...baseContext,
        recurringBills: [
          {
            id: "bill-overdue",
            name: "Meralco",
            amount: 3500,
            next_due_date: "2026-08-30", // Due yesterday
            enabled: true,
            is_paid: false,
          },
        ],
      }
      const results = evaluateUserNotifications(overdueContext, simulatedMorning)
      const overdue = results.find((r) => r.type === "bill_overdue_alert")
      expect(overdue).toBeDefined()
      expect(overdue?.relatedEntityId).toBe("bill-overdue")
      expect(overdue?.payload.title).toContain("Overdue Bill")
    })
  })

  describe("4. Budget Threshold & Exceeded Triggers", () => {
    it("fires budget threshold warning (80%) for nearing category limit", () => {
      const results = evaluateUserNotifications(baseContext, simulatedMorning)
      const warning = results.find((r) => r.type === "budget_threshold_crossed")
      expect(warning).toBeDefined()
      expect(warning?.relatedEntityId).toBe("cat-food")
      expect(warning?.cycleIdentifier).toBe("2026-08")
      expect(warning?.payload.body).toContain("85%")
    })

    it("fires budget exceeded alert (100%+) when category is over budget", () => {
      const results = evaluateUserNotifications(baseContext, simulatedMorning)
      const exceeded = results.find((r) => r.type === "budget_exceeded")
      expect(exceeded).toBeDefined()
      expect(exceeded?.relatedEntityId).toBe("cat-shopping")
      expect(exceeded?.cycleIdentifier).toBe("2026-08")
      expect(exceeded?.payload.title).toContain("Budget Exceeded")
    })
  })

  describe("5. Savings Goal Milestone Trigger", () => {
    it("fires celebratory milestone alert on hitting 50%", () => {
      const results = evaluateUserNotifications(baseContext, simulatedMorning)
      const milestone = results.find((r) => r.type === "goal_milestone")
      expect(milestone).toBeDefined()
      expect(milestone?.relatedEntityId).toBe("goal-1")
      expect(milestone?.cycleIdentifier).toBe("milestone_50")
      expect(milestone?.payload.title).toContain("50%")
    })
  })

  describe("6. Debt & Receivable Due Triggers", () => {
    it("fires debt due alert when debt due date is today", () => {
      const results = evaluateUserNotifications(baseContext, simulatedMorning)
      const debtAlert = results.find((r) => r.type === "debt_due_reminder")
      expect(debtAlert).toBeDefined()
      expect(debtAlert?.relatedEntityId).toBe("debt-1")
    })

    it("fires receivable reminder for pending money owed to user today", () => {
      const results = evaluateUserNotifications(baseContext, simulatedMorning)
      const recAlert = results.find((r) => r.type === "receivable_expected_reminder")
      expect(recAlert).toBeDefined()
      expect(recAlert?.relatedEntityId).toBe("rec-1")
      // rec-2 is status: 'received' and must NOT fire
      expect(results.filter((r) => r.relatedEntityId === "rec-2").length).toBe(0)
    })
  })

  describe("7. Daily Check-in Nudge Trigger", () => {
    it("fires in evening when opted in and 0 transactions logged today", () => {
      const eveningContext: UserEvaluationContext = {
        ...baseContext,
        preferences: {
          ...baseContext.preferences,
          checkin_nudges: true,
        },
        todayTransactionsCount: 0,
      }
      const results = evaluateUserNotifications(eveningContext, simulatedEvening)
      const nudge = results.find((r) => r.type === "checkin_nudge")
      expect(nudge).toBeDefined()
      expect(nudge?.payload.title).toContain("Evening Financial Check-In")
    })

    it("does NOT fire if user already logged transactions today", () => {
      const activeUserContext: UserEvaluationContext = {
        ...baseContext,
        preferences: {
          ...baseContext.preferences,
          checkin_nudges: true,
        },
        todayTransactionsCount: 2, // Active user
      }
      const results = evaluateUserNotifications(activeUserContext, simulatedEvening)
      expect(results.find((r) => r.type === "checkin_nudge")).toBeUndefined()
    })
  })

  describe("8. Payday Arrival Alert Trigger", () => {
    it("fires on configured payday (31st) during morning hours", () => {
      const results = evaluateUserNotifications(baseContext, simulatedMorning)
      const payday = results.find((r) => r.type === "payday_arrival")
      expect(payday).toBeDefined()
      expect(payday?.payload.title).toContain("Payday is Here")
    })
  })

  describe("9. Deduplication & Idempotency", () => {
    it("prevents second send when notification is already in existingLogs", () => {
      const loggedContext: UserEvaluationContext = {
        ...baseContext,
        existingLogs: new Set([
          "bill_due_reminder:bill-1:2026-09-03",
          "budget_threshold_crossed:cat-food:2026-08",
          "budget_exceeded:cat-shopping:2026-08",
          "goal_milestone:goal-1:milestone_50",
          "debt_due_reminder:debt-1:2026-08-31",
          "receivable_expected_reminder:rec-1:2026-08-31",
          "payday_arrival:payday:2026-08-31",
        ]),
      }

      const results = evaluateUserNotifications(loggedContext, simulatedMorning)
      expect(results.length).toBe(0)
    })
  })

  describe("10. Granular Preference Toggles", () => {
    it("suppresses all notifications when master_enabled is false", () => {
      const disabledContext: UserEvaluationContext = {
        ...baseContext,
        preferences: {
          ...baseContext.preferences,
          master_enabled: false,
        },
      }
      const results = evaluateUserNotifications(disabledContext, simulatedMorning)
      expect(results.length).toBe(0)
    })

    it("suppresses specific category when only that toggle is disabled", () => {
      const specificDisabled: UserEvaluationContext = {
        ...baseContext,
        preferences: {
          ...baseContext.preferences,
          bill_due_reminders: false,
          budget_threshold_alerts: false,
        },
      }
      const results = evaluateUserNotifications(specificDisabled, simulatedMorning)
      expect(results.find((r) => r.type === "bill_due_reminder")).toBeUndefined()
      expect(results.find((r) => r.type === "budget_threshold_crossed")).toBeUndefined()
      expect(results.find((r) => r.type === "budget_exceeded")).toBeDefined() // Still on
      expect(results.find((r) => r.type === "goal_milestone")).toBeDefined() // Still on
    })
  })
})
