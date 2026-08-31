import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import {
  evaluateUserNotifications,
  dispatchNotificationToUser,
  DEFAULT_NOTIFICATION_PREFERENCES,
  UserEvaluationContext,
  getUserLocalDateString,
} from "@/lib/push-engine"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const targetUserId = body.userId || null
    const eventType = body.eventType || "cron_evaluation"

    const supabaseAdmin = createAdminClient()

    // 1. Fetch admin global settings (e.g. budget alert threshold)
    const { data: adminSettings } = await supabaseAdmin
      .from("admin_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle()

    const adminBudgetThreshold = adminSettings?.budget_alert_threshold || 80

    // 2. Fetch users to evaluate
    let userQuery = supabaseAdmin.from("profiles").select("id, name, timezone, payday_config")
    if (targetUserId) {
      userQuery = userQuery.eq("id", targetUserId)
    }

    const { data: profiles, error: profErr } = await userQuery
    if (profErr || !profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No profiles to evaluate" })
    }

    const now = new Date()
    let totalEvaluated = 0
    let totalTriggered = 0
    let totalDelivered = 0
    let totalCleanedSubs = 0
    const dispatchSummaries = []

    for (const profile of profiles) {
      totalEvaluated++
      const userId = profile.id
      const userTimezone = profile.timezone || "Asia/Manila"
      const todayStr = getUserLocalDateString(now, userTimezone)

      // Fetch user's notification preferences
      const { data: prefData } = await supabaseAdmin
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      const preferences = prefData || { ...DEFAULT_NOTIFICATION_PREFERENCES, user_id: userId }
      if (!preferences.master_enabled) continue

      // Fetch recurring bills / planned payments
      const { data: bills } = await supabaseAdmin
        .from("recurring_bills")
        .select("*")
        .eq("user_id", userId)

      // Fetch categories & budgets
      const { data: categories } = await supabaseAdmin
        .from("categories")
        .select("*")
        .eq("user_id", userId)

      // Fetch goals
      const { data: goals } = await supabaseAdmin
        .from("savings_goals")
        .select("*")
        .eq("user_id", userId)

      // Fetch debts
      const { data: debts } = await supabaseAdmin
        .from("debts")
        .select("*")
        .eq("user_id", userId)

      // Fetch receivables
      const { data: receivables } = await supabaseAdmin
        .from("receivables")
        .select("*")
        .eq("user_id", userId)

      // Fetch transactions today (for check-in nudge and real budget spent)
      const { data: transactionsToday } = await supabaseAdmin
        .from("transactions")
        .select("id, category_id, amount, kind")
        .eq("user_id", userId)
        .eq("transaction_date", todayStr)

      // Fetch notification_log (for deduplication)
      const { data: logs } = await supabaseAdmin
        .from("notification_log")
        .select("notification_type, related_entity_id, cycle_identifier")
        .eq("user_id", userId)

      const existingLogs = new Set<string>()
      if (logs) {
        for (const l of logs) {
          existingLogs.add(`${l.notification_type}:${l.related_entity_id}:${l.cycle_identifier}`)
        }
      }

      // Build evaluation context
      const context: UserEvaluationContext = {
        userId,
        timezone: userTimezone,
        preferences,
        recurringBills: (bills || []).map((b) => ({
          id: b.id,
          name: b.name || b.label || "Bill",
          amount: Number(b.amount) || 0,
          next_due_date: b.next_due_date || "",
          reminder_days_before: Number(b.reminder_days_before) || 3,
          enabled: b.enabled !== false,
          is_paid: false,
        })),
        categories: (categories || []).map((c) => ({
          id: c.id,
          name: c.name || c.category || "Category",
          spent: Number(c.spent) || 0,
          limit: Number(c.limit) || Number(c.budget) || 0,
        })),
        adminBudgetThreshold,
        goals: (goals || []).map((g) => ({
          id: g.id,
          name: g.title || g.name || "Goal",
          saved: Number(g.current_amount) || Number(g.saved) || 0,
          target: Number(g.target_amount) || Number(g.target) || 0,
        })),
        debts: (debts || []).map((d) => ({
          id: d.id,
          lender: d.lender || d.name || "Lender",
          amount: Number(d.amount) || 0,
          monthlyPayment: Number(d.monthly_payment) || 0,
          due_date: d.due_date || "",
        })),
        receivables: (receivables || []).map((r) => ({
          id: r.id,
          borrower: r.borrower || r.name || "Borrower",
          amount: Number(r.amount) || 0,
          due_date: r.due_date || "",
          status: r.status || "pending",
        })),
        paydayConfig: profile.payday_config || undefined,
        todayTransactionsCount: (transactionsToday || []).length,
        existingLogs,
      }

      // Evaluate triggers
      const itemsToDispatch = evaluateUserNotifications(context, now)

      for (const item of itemsToDispatch) {
        totalTriggered++
        const dispatchRes = await dispatchNotificationToUser(item, userId)
        totalDelivered += dispatchRes.devicesSent
        totalCleanedSubs += dispatchRes.cleanedSubscriptions
        dispatchSummaries.push(dispatchRes)
      }
    }

    return NextResponse.json({
      success: true,
      evaluatedUsers: totalEvaluated,
      triggeredCount: totalTriggered,
      deliveredDevices: totalDelivered,
      cleanedSubscriptions: totalCleanedSubs,
      summaries: dispatchSummaries,
    })
  } catch (error: any) {
    console.error("Push evaluate error:", error)
    return NextResponse.json({ error: error?.message || "Failed to process push notifications" }, { status: 500 })
  }
}
