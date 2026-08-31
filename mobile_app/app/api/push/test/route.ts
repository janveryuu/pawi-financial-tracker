import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@pawi.app"

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({
        success: false,
        error: "VAPID keys not configured in environment.",
      })
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    const supabaseAdmin = createAdminClient()
    const { data: subs, error: subsErr } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)

    if (subsErr || !subs || subs.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No active push subscriptions found for this device. Please enable notifications first.",
      })
    }

    const payload = JSON.stringify({
      title: "Pawi Test Notification 🐢✨",
      body: "Push notifications are working perfectly on this device!",
      icon: "/pawikan-logo.png",
      badge: "/pawikan-logo.png",
      url: "/?tab=home",
      tag: `test_push_${Date.now()}`,
      data: { url: "/?tab=home", type: "test" },
    })

    let sent = 0
    let failed = 0

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
        sent++
      } catch (err: any) {
        failed++
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id)
        }
      }
    }

    return NextResponse.json({ success: true, devicesSent: sent, devicesFailed: failed })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to send test push" }, { status: 500 })
  }
}
