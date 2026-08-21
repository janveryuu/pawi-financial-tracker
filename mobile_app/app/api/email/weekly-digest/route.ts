import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { sendWeeklyDigestEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Check global admin setting
    const { data: adminSettings } = await supabaseAdmin
      .from("admin_settings")
      .select("weekly_digest_email")
      .eq("id", "global")
      .single()

    if (adminSettings && adminSettings.weekly_digest_email === false) {
      return NextResponse.json({ message: "Weekly digest emails are disabled in admin settings" })
    }

    // 2. Fetch users with profiles
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, name, notifications_enabled")

    if (profErr || !profiles || profiles.length === 0) {
      return NextResponse.json({ message: "No user profiles found for digest" })
    }

    let emailsDispatched = 0

    for (const profile of profiles) {
      if (profile.notifications_enabled === false) continue

      // Calculate 7-day flow
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const dateFilter = sevenDaysAgo.toISOString().split("T")[0]

      const [{ data: txs }, { data: goals }] = await Promise.all([
        supabaseAdmin
          .from("transactions")
          .select("amount, type, merchant")
          .eq("user_id", profile.id)
          .gte("transaction_date", dateFilter),
        supabaseAdmin.from("savings_goals").select("title, current_amount, target_amount").eq("user_id", profile.id).limit(1),
      ])

      const totalIncome = (txs || [])
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

      const totalExpense = (txs || [])
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

      const netSavings = totalIncome - totalExpense

      // Find top spending merchant/category
      const categoryMap: Record<string, number> = {}
      ;(txs || [])
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          const cat = t.merchant || "General"
          categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount || 0)
        })

      let topCategory = "General"
      let topCategoryAmount = 0
      Object.entries(categoryMap).forEach(([cat, amt]) => {
        if (amt > topCategoryAmount) {
          topCategory = cat
          topCategoryAmount = amt
        }
      })

      const topGoal = goals?.[0]
      const goalPct = topGoal && topGoal.target_amount > 0 ? Math.min(100, Math.round((topGoal.current_amount / topGoal.target_amount) * 100)) : 0

      // In real scenario, retrieve email from auth.users or profile
      await sendWeeklyDigestEmail({
        to: "user@pawi.app",
        userName: profile.name || "Pawi Friend",
        totalIncome,
        totalExpense,
        netSavings,
        topCategory,
        topCategoryAmount,
        goalName: topGoal?.title,
        goalProgressPct: goalPct,
      })

      emailsDispatched++
    }

    return NextResponse.json({ success: true, count: emailsDispatched })
  } catch (error: any) {
    console.error("Weekly digest email error:", error)
    return NextResponse.json({ error: error?.message || "Failed to send digest" }, { status: 500 })
  }
}
