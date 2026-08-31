/**
 * push-types.ts
 *
 * Client-safe and server-shared types, default configurations,
 * timezone helpers, and pure trigger evaluation algorithms.
 */

export type NotificationType =
  | "bill_due_reminder"
  | "bill_overdue_alert"
  | "budget_threshold_crossed"
  | "budget_exceeded"
  | "goal_milestone"
  | "debt_due_reminder"
  | "receivable_expected_reminder"
  | "checkin_nudge"
  | "payday_arrival"
  | "weekly_digest_push"

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url: string
  tag: string
  data?: Record<string, any>
}

export interface UserNotificationPreferences {
  master_enabled: boolean
  bill_due_reminders: boolean
  bill_overdue_alerts: boolean
  daily_overdue_nag: boolean
  budget_threshold_alerts: boolean
  budget_exceeded_alerts: boolean
  goal_milestone_alerts: boolean
  debt_due_reminders: boolean
  receivable_expected_reminders: boolean
  checkin_nudges: boolean
  payday_alerts: boolean
  weekly_digest_push: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
}

export const DEFAULT_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  master_enabled: true,
  bill_due_reminders: true,
  bill_overdue_alerts: true,
  daily_overdue_nag: false,
  budget_threshold_alerts: true,
  budget_exceeded_alerts: true,
  goal_milestone_alerts: true,
  debt_due_reminders: true,
  receivable_expected_reminders: true,
  checkin_nudges: false, // Opt-in by default
  payday_alerts: true,
  weekly_digest_push: true,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
}

// ─── Timezone Helpers ────────────────────────────────────────────────────────

export function getUserLocalDateString(now: Date = new Date(), timezone = "Asia/Manila"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    return formatter.format(now)
  } catch {
    return now.toISOString().split("T")[0]
  }
}

export function getUserLocalHour(now: Date = new Date(), timezone = "Asia/Manila"): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    })
    return parseInt(formatter.format(now), 10)
  } catch {
    return now.getUTCHours()
  }
}

export function getUserLocalDayOfWeek(now: Date = new Date(), timezone = "Asia/Manila"): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(now)
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    return map[parts] ?? now.getDay()
  } catch {
    return now.getDay()
  }
}

export function isInQuietHours(
  now: Date = new Date(),
  timezone = "Asia/Manila",
  quietStart = "22:00",
  quietEnd = "07:00"
): boolean {
  const currentHour = getUserLocalHour(now, timezone)
  const startHour = parseInt(quietStart.split(":")[0], 10) || 22
  const endHour = parseInt(quietEnd.split(":")[0], 10) || 7

  if (startHour > endHour) {
    return currentHour >= startHour || currentHour < endHour
  } else {
    return currentHour >= startHour && currentHour < endHour
  }
}

export function diffDays(dateA: string, dateB: string): number {
  const [y1, m1, d1] = dateA.split("-").map(Number)
  const [y2, m2, d2] = dateB.split("-").map(Number)
  const utc1 = Date.UTC(y1, m1 - 1, d1)
  const utc2 = Date.UTC(y2, m2 - 1, d2)
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24))
}

// ─── Trigger Evaluators ──────────────────────────────────────────────────────

export interface EvaluationItem {
  type: NotificationType
  relatedEntityId: string
  cycleIdentifier: string
  payload: NotificationPayload
}

export interface UserEvaluationContext {
  userId: string
  timezone: string
  preferences: UserNotificationPreferences
  recurringBills: Array<{
    id: string
    name: string
    amount: number
    next_due_date: string
    reminder_days_before?: number
    enabled?: boolean
    is_paid?: boolean
  }>
  categories: Array<{
    id: string
    name: string
    spent: number
    limit: number
  }>
  adminBudgetThreshold: number
  goals: Array<{
    id: string
    name: string
    saved: number
    target: number
  }>
  debts: Array<{
    id: string
    lender: string
    amount: number
    monthlyPayment?: number
    due_date?: string
  }>
  receivables: Array<{
    id: string
    borrower: string
    amount: number
    due_date?: string
    status: string
  }>
  paydayConfig?: {
    configured: boolean
    day1?: number
    day2?: number
    frequency?: "monthly" | "semi-monthly" | "weekly" | "custom"
  }
  todayTransactionsCount: number
  existingLogs: Set<string>
}

export function evaluateUserNotifications(
  ctx: UserEvaluationContext,
  now: Date = new Date()
): EvaluationItem[] {
  const items: EvaluationItem[] = []
  const { preferences, timezone, existingLogs } = ctx

  if (!preferences.master_enabled) {
    return items
  }

  const todayStr = getUserLocalDateString(now, timezone)
  const currentHour = getUserLocalHour(now, timezone)
  const currentMonthStr = todayStr.slice(0, 7)
  const dayOfWeek = getUserLocalDayOfWeek(now, timezone)

  const isLogged = (type: NotificationType, entityId: string, cycle: string) => {
    return existingLogs.has(`${type}:${entityId}:${cycle}`)
  }

  // 1. Bill Due Reminder
  if (preferences.bill_due_reminders) {
    for (const bill of ctx.recurringBills) {
      if (bill.enabled === false || bill.is_paid) continue
      if (!bill.next_due_date) continue

      const reminderDays = typeof bill.reminder_days_before === "number" ? bill.reminder_days_before : 3
      const daysUntilDue = diffDays(todayStr, bill.next_due_date)

      if (daysUntilDue === reminderDays && daysUntilDue >= 0) {
        const cycle = bill.next_due_date
        if (!isLogged("bill_due_reminder", bill.id, cycle)) {
          items.push({
            type: "bill_due_reminder",
            relatedEntityId: bill.id,
            cycleIdentifier: cycle,
            payload: {
              title: `Bill Due Soon: ${bill.name} 🐢`,
              body: `₱${bill.amount.toLocaleString()} is due in ${reminderDays} day${reminderDays > 1 ? "s" : ""} on ${bill.next_due_date}. Don't forget to allocate funds!`,
              icon: "/pawikan-logo.png",
              badge: "/pawikan-logo.png",
              url: `/?tab=plan&subTab=bills&billId=${bill.id}`,
              tag: `bill_due_${bill.id}_${cycle}`,
            },
          })
        }
      }
    }
  }

  // 2. Bill Overdue Alert
  if (preferences.bill_overdue_alerts) {
    for (const bill of ctx.recurringBills) {
      if (bill.enabled === false || bill.is_paid) continue
      if (!bill.next_due_date) continue

      const daysOverdue = diffDays(bill.next_due_date, todayStr)
      const shouldTrigger = preferences.daily_overdue_nag ? daysOverdue >= 1 : daysOverdue === 1

      if (shouldTrigger) {
        const cycle = preferences.daily_overdue_nag ? `${bill.next_due_date}_day_${todayStr}` : bill.next_due_date
        if (!isLogged("bill_overdue_alert", bill.id, cycle)) {
          items.push({
            type: "bill_overdue_alert",
            relatedEntityId: bill.id,
            cycleIdentifier: cycle,
            payload: {
              title: `⚠️ Overdue Bill: ${bill.name}`,
              body: `₱${bill.amount.toLocaleString()} was due on ${bill.next_due_date}. Tap to record payment or reschedule.`,
              icon: "/pawikan-logo.png",
              badge: "/pawikan-logo.png",
              url: `/?tab=plan&subTab=bills&billId=${bill.id}`,
              tag: `bill_overdue_${bill.id}_${bill.next_due_date}`,
            },
          })
        }
      }
    }
  }

  // 3. Budget Threshold Crossed (80%)
  if (preferences.budget_threshold_alerts) {
    for (const cat of ctx.categories) {
      if (!cat.limit || cat.limit <= 0) continue
      const ratio = (cat.spent / cat.limit) * 100
      const threshold = ctx.adminBudgetThreshold || 80

      if (ratio >= threshold && ratio < 100) {
        const cycle = currentMonthStr
        if (!isLogged("budget_threshold_crossed", cat.id, cycle)) {
          items.push({
            type: "budget_threshold_crossed",
            relatedEntityId: cat.id,
            cycleIdentifier: cycle,
            payload: {
              title: `Budget Alert: ${cat.name} (${Math.round(ratio)}%) 💡`,
              body: `You've used ${Math.round(ratio)}% of your ₱${cat.limit.toLocaleString()} budget for ${cat.name} (₱${cat.spent.toLocaleString()} spent).`,
              icon: "/pawikan-logo.png",
              badge: "/pawikan-logo.png",
              url: `/?tab=plan&subTab=budgets&category=${encodeURIComponent(cat.name)}`,
              tag: `budget_thresh_${cat.id}_${cycle}`,
            },
          })
        }
      }
    }
  }

  // 4. Budget Exceeded (100%+)
  if (preferences.budget_exceeded_alerts) {
    for (const cat of ctx.categories) {
      if (!cat.limit || cat.limit <= 0) continue
      if (cat.spent >= cat.limit) {
        const cycle = currentMonthStr
        if (!isLogged("budget_exceeded", cat.id, cycle)) {
          const overAmount = cat.spent - cat.limit
          items.push({
            type: "budget_exceeded",
            relatedEntityId: cat.id,
            cycleIdentifier: cycle,
            payload: {
              title: `🚨 Budget Exceeded: ${cat.name}`,
              body: `You've exceeded your ${cat.name} budget by ₱${overAmount.toLocaleString()}. Tap to adjust or review your expenses.`,
              icon: "/pawikan-logo.png",
              badge: "/pawikan-logo.png",
              url: `/?tab=plan&subTab=budgets&category=${encodeURIComponent(cat.name)}`,
              tag: `budget_exceeded_${cat.id}_${cycle}`,
            },
          })
        }
      }
    }
  }

  // 5. Goal Milestones (25%, 50%, 75%, 100%)
  if (preferences.goal_milestone_alerts) {
    for (const goal of ctx.goals) {
      if (!goal.target || goal.target <= 0) continue
      const pct = (goal.saved / goal.target) * 100
      const milestones = [100, 75, 50, 25]

      for (const m of milestones) {
        if (pct >= m) {
          const cycle = `milestone_${m}`
          if (!isLogged("goal_milestone", goal.id, cycle)) {
            const isCompleted = m === 100
            items.push({
              type: "goal_milestone",
              relatedEntityId: goal.id,
              cycleIdentifier: cycle,
              payload: {
                title: isCompleted
                  ? `Goal Completed! ${goal.name} 🎉`
                  : `Goal Milestone: ${m}% Reached! 🎯`,
                body: isCompleted
                  ? `Congratulations! You have fully funded ${goal.name} (₱${goal.saved.toLocaleString()} / ₱${goal.target.toLocaleString()})!`
                  : `You've reached ${m}% of your ${goal.name} target (₱${goal.saved.toLocaleString()} saved). Keep going!`,
                icon: "/pawikan-logo.png",
                badge: "/pawikan-logo.png",
                url: `/?tab=plan&subTab=goals&goalId=${goal.id}`,
                tag: `goal_${goal.id}_${m}`,
              },
            })
          }
          break
        }
      }
    }
  }

  // 6. Debt Due Reminder
  if (preferences.debt_due_reminders) {
    for (const debt of ctx.debts) {
      if (!debt.due_date || debt.amount <= 0) continue
      const isDueToday = debt.due_date.includes(todayStr) || debt.due_date === todayStr
      if (isDueToday) {
        const cycle = todayStr
        if (!isLogged("debt_due_reminder", debt.id, cycle)) {
          items.push({
            type: "debt_due_reminder",
            relatedEntityId: debt.id,
            cycleIdentifier: cycle,
            payload: {
              title: `Debt Payment Due: ${debt.lender} 🐢`,
              body: `Payment of ₱${(debt.monthlyPayment || debt.amount).toLocaleString()} towards ${debt.lender} is due today.`,
              icon: "/pawikan-logo.png",
              badge: "/pawikan-logo.png",
              url: `/?tab=plan&subTab=debt&debtId=${debt.id}`,
              tag: `debt_${debt.id}_${cycle}`,
            },
          })
        }
      }
    }
  }

  // 7. Receivable Expected Reminder
  if (preferences.receivable_expected_reminders) {
    for (const rec of ctx.receivables) {
      if (rec.status === "received" || rec.amount <= 0) continue
      if (!rec.due_date) continue

      const isExpectedToday = rec.due_date.includes(todayStr) || rec.due_date === todayStr
      if (isExpectedToday) {
        const cycle = todayStr
        if (!isLogged("receivable_expected_reminder", rec.id, cycle)) {
          items.push({
            type: "receivable_expected_reminder",
            relatedEntityId: rec.id,
            cycleIdentifier: cycle,
            payload: {
              title: `Money Expected Today: ${rec.borrower} 💰`,
              body: `₱${rec.amount.toLocaleString()} from ${rec.borrower} is expected today. Tap to record when received.`,
              icon: "/pawikan-logo.png",
              badge: "/pawikan-logo.png",
              url: `/?tab=plan&subTab=receivables&recId=${rec.id}`,
              tag: `rec_${rec.id}_${cycle}`,
            },
          })
        }
      }
    }
  }

  // 8. Daily Check-in Nudge
  if (preferences.checkin_nudges) {
    const isEvening = currentHour >= 19 && currentHour <= 22
    if (isEvening && ctx.todayTransactionsCount === 0) {
      const cycle = todayStr
      if (!isLogged("checkin_nudge", "daily_checkin", cycle)) {
        items.push({
          type: "checkin_nudge",
          relatedEntityId: "daily_checkin",
          cycleIdentifier: cycle,
          payload: {
            title: `Evening Financial Check-In 🌙`,
            body: `Did you make any purchases today? Take 10 seconds to log them and keep your streak alive!`,
            icon: "/pawikan-logo.png",
            badge: "/pawikan-logo.png",
            url: `/?action=new-tx`,
            tag: `checkin_${cycle}`,
          },
        })
      }
    }
  }

  // 9. Payday Arrival
  if (preferences.payday_alerts && ctx.paydayConfig?.configured) {
    const todayDayOfMonth = parseInt(todayStr.split("-")[2], 10)
    const isPayday =
      todayDayOfMonth === ctx.paydayConfig.day1 ||
      (ctx.paydayConfig.day2 && todayDayOfMonth === ctx.paydayConfig.day2)

    if (isPayday && currentHour >= 8 && currentHour <= 14) {
      const cycle = todayStr
      if (!isLogged("payday_arrival", "payday", cycle)) {
        items.push({
          type: "payday_arrival",
          relatedEntityId: "payday",
          cycleIdentifier: cycle,
          payload: {
            title: `Payday is Here! 🎉 💸`,
            body: `Your payday has arrived! Allocate your savings, fund your goals, and budget your cutoff with Pawi.`,
            icon: "/pawikan-logo.png",
            badge: "/pawikan-logo.png",
            url: `/?tab=plan`,
            tag: `payday_${cycle}`,
          },
        })
      }
    }
  }

  // 10. Weekly Digest Push
  if (preferences.weekly_digest_push) {
    const isSundayEvening = dayOfWeek === 0 && currentHour >= 17 && currentHour <= 21
    if (isSundayEvening) {
      const cycle = `week_${todayStr}`
      if (!isLogged("weekly_digest_push", "weekly_digest", cycle)) {
        items.push({
          type: "weekly_digest_push",
          relatedEntityId: "weekly_digest",
          cycleIdentifier: cycle,
          payload: {
            title: `Your Weekly Financial Snapshot 📊`,
            body: `See how you did with your savings and budget this week. Tap to review your insights!`,
            icon: "/pawikan-logo.png",
            badge: "/pawikan-logo.png",
            url: `/?tab=home`,
            tag: `digest_${cycle}`,
          },
        })
      }
    }
  }

  return items
}
