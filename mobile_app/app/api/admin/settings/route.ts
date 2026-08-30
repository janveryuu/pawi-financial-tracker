import { NextRequest, NextResponse } from "next/server"
import { withAdminAuth, logAdminAudit } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(async (req: NextRequest, auth) => {
  try {
    const supabase = createAdminClient()
    const { data: settings, error } = await supabase
      .from("admin_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: settings || {
        id: "global",
        budget_alert_threshold: 80,
        enable_ai_receipt_parser: true,
        weekly_digest_email: true,
        require_2fa: false,
        auto_sync_exchange: true,
        maintenance_mode: false,
        announcement_banner: "",
        announcement_active: false,
      },
    })
  } catch (err: any) {
    console.error("[Admin Settings GET Error]:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
})

export const POST = withAdminAuth(async (req: NextRequest, auth) => {
  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const updatedSettings = {
      id: "global",
      budget_alert_threshold: Number(body.budget_alert_threshold) || 80,
      enable_ai_receipt_parser: Boolean(body.enable_ai_receipt_parser ?? true),
      weekly_digest_email: Boolean(body.weekly_digest_email ?? true),
      require_2fa: Boolean(body.require_2fa ?? false),
      auto_sync_exchange: Boolean(body.auto_sync_exchange ?? true),
      maintenance_mode: Boolean(body.maintenance_mode ?? false),
      announcement_banner: body.announcement_banner || null,
      announcement_active: Boolean(body.announcement_active ?? false),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("admin_settings")
      .upsert(updatedSettings)
      .select()
      .single()

    if (error) {
      throw error
    }

    await logAdminAudit({
      action: "UPDATE_PLATFORM_SETTINGS",
      details: `Updated platform global settings`,
      metadata: updatedSettings,
    })

    return NextResponse.json({
      success: true,
      data,
      message: "Platform settings updated successfully.",
    })
  } catch (err: any) {
    console.error("[Admin Settings POST Error]:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
})
