import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "./supabase"
import { logActivity } from "./activity-log"

export const AUTHORIZED_ADMIN_EMAIL = "janvermanlapaz@gmail.com"

export interface AdminAuthResult {
  authorized: boolean
  userId?: string
  email?: string
  error?: string
  status?: number
}

/**
 * Server-side Admin Auth Verification
 * Strictly checks that:
 * 1. A valid JWT / Bearer token is provided or passed via header / cookies
 * 2. Supabase Auth validates the user session
 * 3. The email is strictly `janvermanlapaz@gmail.com`
 * 4. The user exists in the `admin_users` table in PostgreSQL
 */
export async function verifyAdminAuth(req: NextRequest | Request): Promise<AdminAuthResult> {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null

    // Fallback: check custom session header or cookies if token is not in Authorization header
    let sessionToken = token
    if (!sessionToken && "cookies" in req) {
      const cookieStore = (req as NextRequest).cookies
      sessionToken =
        cookieStore.get("sb-access-token")?.value ||
        cookieStore.get("supabase-auth-token")?.value ||
        cookieStore.get("sb:token")?.value ||
        null
    }

    if (!sessionToken) {
      return {
        authorized: false,
        error: "Missing authorization token. Access denied.",
        status: 401,
      }
    }

    const supabaseAdmin = createAdminClient()
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(sessionToken)

    if (userError || !userData?.user) {
      return {
        authorized: false,
        error: "Invalid or expired session. Please log in again.",
        status: 401,
      }
    }

    const user = userData.user
    const email = (user.email || "").toLowerCase().trim()

    // 1. Strict Email Check
    if (email !== AUTHORIZED_ADMIN_EMAIL) {
      console.warn(`[SECURITY ALERT] Unauthorized admin access attempt by ${email} (${user.id})`)
      return {
        authorized: false,
        error: "Forbidden: You do not have administrative privileges on Pawi.",
        status: 403,
      }
    }

    // 2. Database `admin_users` and `profiles.is_admin` Verification (Defense-in-depth)
    const { data: adminRecord, error: adminErr } = await supabaseAdmin
      .from("admin_users")
      .select("user_id, email")
      .eq("user_id", user.id)
      .maybeSingle()

    // If not in admin_users table yet (e.g. fresh migration), ensure entry and update profile
    if (!adminRecord) {
      await supabaseAdmin.from("admin_users").upsert({
        user_id: user.id,
        email: AUTHORIZED_ADMIN_EMAIL,
        granted_at: new Date().toISOString(),
      })
      await supabaseAdmin.from("profiles").update({ is_admin: true }).eq("id", user.id)
    }

    return {
      authorized: true,
      userId: user.id,
      email: AUTHORIZED_ADMIN_EMAIL,
    }
  } catch (err: any) {
    console.error("[Admin Auth Exception]:", err)
    return {
      authorized: false,
      error: "Authentication service error.",
      status: 500,
    }
  }
}

/**
 * Route Handler wrapper for all `/api/admin/*` endpoints
 */
export function withAdminAuth(
  handler: (req: NextRequest, auth: AdminAuthResult) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const auth = await verifyAdminAuth(req)
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || "Forbidden" },
        { status: auth.status || 403 }
      )
    }
    return handler(req, auth)
  }
}

/**
 * Audit Logger for Admin Operations
 */
export async function logAdminAudit({
  action,
  targetUserId,
  details,
  metadata = {},
}: {
  action: string
  targetUserId?: string
  details: string
  metadata?: Record<string, any>
}) {
  await logActivity({
    eventType: "admin_action" as any,
    description: `[ADMIN ACTION] ${action}: ${details}`,
    userId: targetUserId,
    performedBy: AUTHORIZED_ADMIN_EMAIL,
    metadata: {
      action,
      targetUserId,
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  })
}
