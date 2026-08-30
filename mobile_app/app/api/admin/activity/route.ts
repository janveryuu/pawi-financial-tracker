import { NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(async (req: NextRequest, auth) => {
  try {
    const supabase = createAdminClient()
    const url = new URL(req.url)
    const eventType = url.searchParams.get("eventType") || "all"
    const search = url.searchParams.get("search")?.toLowerCase().trim() || ""
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get("limit") || "30", 10)))

    let query = supabase
      .from("activity_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })

    if (eventType !== "all") {
      query = query.eq("event_type", eventType)
    }

    if (search) {
      query = query.or(`description.ilike.%${search}%,performed_by.ilike.%${search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: logs, count, error } = await query

    if (error) {
      throw error
    }

    // Optionally enrich with user names/emails
    const userIds = Array.from(
      new Set((logs || []).map((l) => l.related_user_id).filter(Boolean))
    )

    let profilesMap = new Map()
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds)

      profilesMap = new Map((profiles || []).map((p) => [p.id, p]))
    }

    const enrichedLogs = (logs || []).map((l) => ({
      ...l,
      userProfile: l.related_user_id ? profilesMap.get(l.related_user_id) || null : null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        logs: enrichedLogs,
        pagination: {
          page,
          limit,
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    })
  } catch (err: any) {
    console.error("[Admin Activity Log Error]:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
})
