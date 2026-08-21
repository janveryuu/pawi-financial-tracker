import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { userId, endpoint, p256dh, auth, deviceLabel } = await req.json()

    if (!userId || !endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Missing required push subscription fields" }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        device_label: deviceLabel || "Web Browser",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    )

    if (error) {
      console.warn("Push subscription save notice:", error)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Push subscribe API error:", err)
    return NextResponse.json({ error: "Failed to save push subscription" }, { status: 500 })
  }
}
