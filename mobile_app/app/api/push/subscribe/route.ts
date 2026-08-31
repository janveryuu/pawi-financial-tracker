import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { userId, endpoint, p256dh, auth, deviceLabel, platform } = await req.json()

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
        platform: platform || "web",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    )

    if (error) {
      console.warn("Push subscription save notice:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Push subscribe API error:", err)
    return NextResponse.json({ error: "Failed to save push subscription" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, endpoint } = await req.json()

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    let query = supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", endpoint)
    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Push unsubscribe API error:", err)
    return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 })
  }
}
