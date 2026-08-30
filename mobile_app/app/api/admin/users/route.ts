import { NextRequest, NextResponse } from "next/server"
import { withAdminAuth, logAdminAudit } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(async (req: NextRequest, auth) => {
  try {
    const supabase = createAdminClient()
    const url = new URL(req.url)
    const search = url.searchParams.get("search")?.toLowerCase().trim() || ""
    const statusFilter = url.searchParams.get("status") || "all" // all | active | suspended | student
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get("limit") || "25", 10)))

    // 1. Fetch auth users via Supabase Admin Auth API
    const { data: authUsersData, error: authErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    const authUsers = authUsersData?.users || []

    // 2. Fetch all profiles, accounts, and transactions for aggregation
    const [{ data: profilesData }, { data: accountsData }, { data: transactionsData }] =
      await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("accounts").select("id, user_id, balance, currency, is_liability"),
        supabase.from("transactions").select("id, user_id, amount, type"),
      ])

    const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]))

    // Aggregate accounts and transactions per user
    const userAccountsMap = new Map<string, { count: number; totalBalance: number }>()
    ;(accountsData || []).forEach((acc) => {
      const existing = userAccountsMap.get(acc.user_id) || { count: 0, totalBalance: 0 }
      existing.count += 1
      if (!acc.is_liability) {
        existing.totalBalance += Number(acc.balance) || 0
      }
      userAccountsMap.set(acc.user_id, existing)
    })

    const userTxMap = new Map<string, { count: number; totalSpent: number; totalIncome: number }>()
    ;(transactionsData || []).forEach((tx) => {
      const existing = userTxMap.get(tx.user_id) || { count: 0, totalSpent: 0, totalIncome: 0 }
      existing.count += 1
      const amt = Number(tx.amount) || 0
      if (tx.type === "expense") existing.totalSpent += amt
      else if (tx.type === "income") existing.totalIncome += amt
      userTxMap.set(tx.user_id, existing)
    })

    // Combine all user data into unified enriched user objects
    let enrichedUsers = authUsers.map((u) => {
      const profile = profilesMap.get(u.id) || ({} as any)
      const accStats = userAccountsMap.get(u.id) || { count: 0, totalBalance: 0 }
      const txStats = userTxMap.get(u.id) || { count: 0, totalSpent: 0, totalIncome: 0 }

      const isSuspended = !!profile.is_suspended || !!u.banned_until
      const isStudent = !!profile.is_student || profile.profile_type === "student"

      return {
        id: u.id,
        email: u.email || "No email",
        name: profile.name || u.user_metadata?.full_name || u.user_metadata?.name || "Pawi User",
        avatarUrl: profile.avatar_url || u.user_metadata?.avatar_url || null,
        initials: profile.initials || "PU",
        currency: profile.currency || "PHP",
        profileType: profile.profile_type || (isStudent ? "student" : "general"),
        isAdmin: !!profile.is_admin || u.email === "janvermanlapaz@gmail.com",
        isSuspended,
        suspendedReason: profile.suspended_reason || null,
        suspendedAt: profile.suspended_at || null,
        createdAt: u.created_at || profile.created_at || new Date().toISOString(),
        lastSignInAt: u.last_sign_in_at || profile.last_seen_at || null,
        totalWallets: accStats.count,
        totalBalance: accStats.totalBalance,
        totalTransactions: txStats.count,
        totalSpent: txStats.totalSpent,
        totalIncome: txStats.totalIncome,
        onboardingCompleted: !!profile.onboarding_completed,
      }
    })

    // If there are profiles not in authUsers (e.g. demo/mock/migrated profiles)
    ;(profilesData || []).forEach((p) => {
      if (!enrichedUsers.some((u) => u.id === p.id)) {
        const accStats = userAccountsMap.get(p.id) || { count: 0, totalBalance: 0 }
        const txStats = userTxMap.get(p.id) || { count: 0, totalSpent: 0, totalIncome: 0 }
        enrichedUsers.push({
          id: p.id,
          email: "user_" + p.id.slice(0, 8) + "@pawi.app",
          name: p.name || "Pawi User",
          avatarUrl: p.avatar_url || null,
          initials: p.initials || "PU",
          currency: p.currency || "PHP",
          profileType: p.profile_type || (p.is_student ? "student" : "general"),
          isAdmin: !!p.is_admin,
          isSuspended: !!p.is_suspended,
          suspendedReason: p.suspended_reason || null,
          suspendedAt: p.suspended_at || null,
          createdAt: p.created_at || new Date().toISOString(),
          lastSignInAt: p.last_seen_at || null,
          totalWallets: accStats.count,
          totalBalance: accStats.totalBalance,
          totalTransactions: txStats.count,
          totalSpent: txStats.totalSpent,
          totalIncome: txStats.totalIncome,
          onboardingCompleted: !!p.onboarding_completed,
        })
      }
    })

    // Apply Search Filter
    if (search) {
      enrichedUsers = enrichedUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.id.toLowerCase().includes(search)
      )
    }

    // Apply Status Filter
    if (statusFilter === "active") {
      enrichedUsers = enrichedUsers.filter((u) => !u.isSuspended)
    } else if (statusFilter === "suspended") {
      enrichedUsers = enrichedUsers.filter((u) => u.isSuspended)
    } else if (statusFilter === "student") {
      enrichedUsers = enrichedUsers.filter((u) => u.profileType === "student")
    }

    // Sort by latest created
    enrichedUsers.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const totalCount = enrichedUsers.length
    const totalPages = Math.ceil(totalCount / limit)
    const startIndex = (page - 1) * limit
    const paginatedUsers = enrichedUsers.slice(startIndex, startIndex + limit)

    return NextResponse.json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
        },
      },
    })
  } catch (err: any) {
    console.error("[Admin Users Error]:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
})

export const POST = withAdminAuth(async (req: NextRequest, auth) => {
  try {
    const body = await req.json()
    const { action, userId, reason } = body

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: userId, action" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    if (action === "suspend") {
      const suspensionReason = reason || "Suspended by Administrator"
      const now = new Date().toISOString()

      // Update profiles
      await supabase
        .from("profiles")
        .update({
          is_suspended: true,
          suspended_reason: suspensionReason,
          suspended_at: now,
        })
        .eq("id", userId)

      // Optionally invalidate sessions
      try {
        await supabase.auth.admin.signOut(userId)
      } catch (e) {
        console.warn("Could not signOut auth user:", e)
      }

      await logAdminAudit({
        action: "SUSPEND_USER",
        targetUserId: userId,
        details: `Suspended user with reason: ${suspensionReason}`,
        metadata: { reason: suspensionReason },
      })

      return NextResponse.json({
        success: true,
        message: "User successfully suspended.",
      })
    }

    if (action === "unsuspend") {
      await supabase
        .from("profiles")
        .update({
          is_suspended: false,
          suspended_reason: null,
          suspended_at: null,
        })
        .eq("id", userId)

      await logAdminAudit({
        action: "UNSUSPEND_USER",
        targetUserId: userId,
        details: `Restored user account access`,
      })

      return NextResponse.json({
        success: true,
        message: "User successfully unsuspended and restored.",
      })
    }

    if (action === "kick") {
      // Invalidate active session tokens
      try {
        await supabase.auth.admin.signOut(userId)
      } catch (e: any) {
        console.warn("SignOut API notice:", e.message)
      }

      await logAdminAudit({
        action: "KICK_USER",
        targetUserId: userId,
        details: `Terminated active user sessions and kicked from platform`,
      })

      return NextResponse.json({
        success: true,
        message: "User session revoked and kicked successfully.",
      })
    }

    if (action === "delete") {
      // Permanent deletion of user account
      try {
        await supabase.auth.admin.deleteUser(userId)
      } catch (e) {
        console.warn("deleteUser auth error:", e)
      }
      await supabase.from("profiles").delete().eq("id", userId)

      await logAdminAudit({
        action: "DELETE_USER",
        targetUserId: userId,
        details: `Permanently deleted user account`,
      })

      return NextResponse.json({
        success: true,
        message: "User permanently deleted.",
      })
    }

    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}` },
      { status: 400 }
    )
  } catch (err: any) {
    console.error("[Admin Users Mutation Error]:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
})
