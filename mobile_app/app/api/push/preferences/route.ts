import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/push-engine"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const preferences = data || {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      user_id: userId,
    }

    return NextResponse.json({ success: true, preferences })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch preferences" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, preferences } = body

    if (!userId || !preferences) {
      return NextResponse.json({ error: "Missing userId or preferences" }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.from("notification_preferences").upsert(
      {
        user_id: userId,
        master_enabled: preferences.master_enabled ?? true,
        bill_due_reminders: preferences.bill_due_reminders ?? true,
        bill_overdue_alerts: preferences.bill_overdue_alerts ?? true,
        daily_overdue_nag: preferences.daily_overdue_nag ?? false,
        budget_threshold_alerts: preferences.budget_threshold_alerts ?? true,
        budget_exceeded_alerts: preferences.budget_exceeded_alerts ?? true,
        goal_milestone_alerts: preferences.goal_milestone_alerts ?? true,
        debt_due_reminders: preferences.debt_due_reminders ?? true,
        receivable_expected_reminders: preferences.receivable_expected_reminders ?? true,
        checkin_nudges: preferences.checkin_nudges ?? false,
        payday_alerts: preferences.payday_alerts ?? true,
        weekly_digest_push: preferences.weekly_digest_push ?? true,
        quiet_hours_start: preferences.quiet_hours_start ?? "22:00",
        quiet_hours_end: preferences.quiet_hours_end ?? "07:00",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to save preferences" }, { status: 500 })
  }
}
