import { NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(async (req: NextRequest, auth) => {
  try {
    const url = new URL(req.url)
    const segments = url.pathname.split("/")
    const userId = segments[segments.length - 1]

    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing user ID" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Fetch user auth & profile details
    const [
      { data: authUserData },
      { data: profileData },
      { data: accountsData },
      { data: txData },
      { data: goalsData },
      { data: billsData },
      { data: debtsData },
      { data: receivablesData },
      { data: activityData },
    ] = await Promise.all([
      supabase.auth.admin.getUserById(userId).catch(() => ({ data: null })),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("accounts").select("*").eq("user_id", userId),
      supabase.from("transactions").select("*").eq("user_id", userId).order("transaction_date", { ascending: false }).limit(50),
      supabase.from("savings_goals").select("*").eq("user_id", userId),
      supabase.from("recurring_bills").select("*").eq("user_id", userId),
      supabase.from("debts").select("*").eq("user_id", userId),
      supabase.from("receivables").select("*").eq("user_id", userId),
      supabase.from("activity_log").select("*").eq("related_user_id", userId).order("created_at", { ascending: false }).limit(20),
    ])

    const authUser = authUserData?.user

    const userDetails = {
      id: userId,
      email: authUser?.email || "No email",
      profile: profileData || {},
      authMetadata: {
        createdAt: authUser?.created_at || profileData?.created_at,
        lastSignInAt: authUser?.last_sign_in_at || profileData?.last_seen_at,
        emailConfirmedAt: authUser?.email_confirmed_at,
        bannedUntil: authUser?.banned_until,
      },
      accounts: accountsData || [],
      transactions: txData || [],
      goals: goalsData || [],
      recurringBills: billsData || [],
      debts: debtsData || [],
      receivables: receivablesData || [],
      activityLogs: activityData || [],
    }

    return NextResponse.json({
      success: true,
      data: userDetails,
    })
  } catch (err: any) {
    console.error("[Admin User Detail Error]:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
})
