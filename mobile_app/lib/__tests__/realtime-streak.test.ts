import { calculateStreak, getLocalDateStr, getPreviousDayStr, parseTxDateToYYYYMMDD } from "../store"
import type { Transaction } from "../types"

describe("Realtime Streak Engine", () => {
  it("normalizes diverse date formats to YYYY-MM-DD", () => {
    expect(parseTxDateToYYYYMMDD("2026-09-04")).toBe("2026-09-04")
    expect(parseTxDateToYYYYMMDD("2026-09-04T12:30:00Z")).toBe("2026-09-04")
    expect(parseTxDateToYYYYMMDD(null)).toBeNull()
  })

  it("calculates streak correctly with consecutive active check-in dates", () => {
    const today = getLocalDateStr(new Date())
    const yest = getPreviousDayStr(today)
    const dayBefore = getPreviousDayStr(yest)

    const activeDates = [today, yest, dayBefore]
    const streak = calculateStreak([], activeDates)
    expect(streak).toBe(3)
  })

  it("combines transactions and check-in dates seamlessly", () => {
    const today = getLocalDateStr(new Date())
    const yest = getPreviousDayStr(today)
    const dayBefore = getPreviousDayStr(yest)

    const tx: Transaction[] = [
      {
        id: "tx-1",
        label: "Coffee",
        amount: 150,
        currency: "PHP",
        category: "Food",
        account: "GCash",
        kind: "expense",
        date: today,
        time: "09:00 AM",
      },
    ]

    // User logged in on previous two days, and made a transaction today
    const extraDates = [yest, dayBefore]
    const streak = calculateStreak(tx, extraDates)
    expect(streak).toBe(3)
  })

  it("returns 7-day streak when user has been active for a full week", () => {
    const now = new Date()
    const weekDates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      weekDates.push(getLocalDateStr(d))
    }

    const streak = calculateStreak([], weekDates)
    expect(streak).toBe(7)
  })

  it("breaks streak when there is a missing day before yesterday", () => {
    const today = getLocalDateStr(new Date())
    const threeDaysAgo = getPreviousDayStr(getPreviousDayStr(getPreviousDayStr(today)))

    // Gap between today and 3 days ago
    const streak = calculateStreak([], [today, threeDaysAgo])
    expect(streak).toBe(1)
  })
})
