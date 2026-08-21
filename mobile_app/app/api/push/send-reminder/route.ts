import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@pawi.app"

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({
        success: false,
        message: "VAPID keys not configured. Reminders simulated successfully.",
      })
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    const supabaseAdmin = createAdminClient()

    // 1. Fetch active push subscriptions
    const { data: subs, error: subsErr } = await supabaseAdmin.from("push_subscriptions").select("*")
    if (subsErr || !subs || subs.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No active push subscriptions" })
    }

    // 2. Fetch admin threshold settings
    const { data: settings } = await supabaseAdmin.from("admin_settings").select("*").eq("id", "global").single()
    const threshold = settings?.budget_alert_threshold || 80

    let sentCount = 0

    for (const sub of subs) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }

      // Check upcoming recurring bills
      const { data: bills } = await supabaseAdmin
        .from("recurring_bills")
        .select("*")
        .eq("user_id", sub.user_id)
        .eq("enabled", true)

      if (bills && bills.length > 0) {
        const upcomingBill = bills[0]
        const payload = JSON.stringify({
          title: `Upcoming Bill Reminder: ${upcomingBill.name} 🐢`,
          body: `₱${upcomingBill.amount} is due on ${upcomingBill.next_due_date}. Don't forget to allocate funds!`,
          icon: "/pawikan-logo.png",
          badge: "/pawikan-logo.png",
          url: "/?tab=plan",
        })

        try {
          await webpush.sendNotification(pushConfig, payload)
          sentCount++
        } catch (pushErr: any) {
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            // Subscription expired or unsubscribed
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id)
          }
        }
      }
    }

    return NextResponse.json({ success: true, sentCount })
  } catch (error: any) {
    console.error("Push send reminder error:", error)
    return NextResponse.json({ error: error?.message || "Failed to process push notifications" }, { status: 500 })
  }
}
