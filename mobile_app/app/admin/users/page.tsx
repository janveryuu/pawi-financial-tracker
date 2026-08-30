"use client"

import React, { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserX,
  UserCheck,
  Zap,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Wallet,
  ArrowDownLeft,
  Calendar,
  X,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { formatMoney } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"

export default function AdminUsersPage() {
  const { session } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all") // all | active | suspended | student
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 25, totalCount: 0, totalPages: 1 })

  // Modal / Drawer states
  const [inspectUserId, setInspectUserId] = useState<string | null>(null)
  const [inspectUserData, setInspectUserData] = useState<any | null>(null)
  const [inspectLoading, setInspectLoading] = useState(false)

  const [suspendTargetUser, setSuspendTargetUser] = useState<any | null>(null)
  const [suspendReason, setSuspendReason] = useState("Policy violation or irregular activity")
  const [actionLoading, setActionLoading] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const token = session?.access_token
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        status: statusFilter,
        ...(search ? { search } : {}),
      })

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to load users")

      setUsers(data.data.users || [])
      setPagination(data.data.pagination || { page: 1, limit: 25, totalCount: 0, totalPages: 1 })
    } catch (err: any) {
      console.error("Fetch users error:", err)
      setFeedbackMessage({ type: "error", text: err.message })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [session, page, statusFilter, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Deep inspect user
  const handleInspectUser = async (userId: string) => {
    setInspectUserId(userId)
    setInspectLoading(true)
    setInspectUserData(null)

    try {
      const token = session?.access_token
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const data = await res.json()
      if (data.success) {
        setInspectUserData(data.data)
      }
    } catch (err) {
      console.error("Inspect user error:", err)
    } finally {
      setInspectLoading(false)
    }
  }

  // User Actions: Suspend, Unsuspend, Kick
  const handleUserAction = async (action: "suspend" | "unsuspend" | "kick", userId: string, reason?: string) => {
    setActionLoading(true)
    try {
      const token = session?.access_token
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action,
          userId,
          reason,
        }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Action failed")

      setFeedbackMessage({ type: "success", text: data.message || `Action ${action} succeeded.` })
      setSuspendTargetUser(null)
      fetchUsers(true)

      // If currently inspecting this user, refresh inspector
      if (inspectUserId === userId) {
        handleInspectUser(userId)
      }
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              User Management
            </h1>
            <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-black text-blue-600 dark:text-blue-400">
              {pagination.totalCount} Registered
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            View user profiles, inspect financial accounts, and manage platform access controls.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchUsers(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-card px-3.5 py-2 text-xs font-black text-foreground hover:bg-secondary active:scale-95 transition-all shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin text-[#3D784E]")} />
          <span>{refreshing ? "Refreshing..." : "Refresh Users"}</span>
        </button>
      </div>

      {feedbackMessage && (
        <div
          className={cn(
            "rounded-2xl p-4 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200",
            feedbackMessage.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-500"
          )}
        >
          <span>{feedbackMessage.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 rounded-3xl border border-border/80 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search by name, email, or user ID..."
            className="h-10 w-full rounded-2xl border border-border/60 bg-secondary/50 pl-10 pr-4 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#3D784E]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none self-start sm:self-auto">
          {[
            { label: "All Users", value: "all" },
            { label: "Active", value: "active" },
            { label: "Suspended", value: "suspended" },
            { label: "Students", value: "student" },
          ].map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => {
                setStatusFilter(pill.value)
                setPage(1)
              }}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-black transition-all whitespace-nowrap",
                statusFilter === pill.value
                  ? "bg-[#3D784E] text-white shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Data Table */}
      <div className="rounded-[2.5rem] border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/70 bg-secondary/50 text-muted-foreground font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Wallets & Balance</th>
                <th className="px-4 py-3.5">Activity (Tx)</th>
                <th className="px-4 py-3.5">Joined</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-semibold">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#3D784E] mb-2" />
                    Loading user registry...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-semibold">
                    No users matching the criteria found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const joinedDate = u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"

                  return (
                    <tr key={u.id} className="hover:bg-secondary/30 transition-colors">
                      {/* User Column */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E] font-black text-xs">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} className="h-full w-full rounded-2xl object-cover" />
                            ) : (
                              u.initials || "PU"
                            )}
                          </div>
                          <div className="min-w-0 max-w-[200px] sm:max-w-xs">
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-foreground truncate">{u.name}</p>
                              {u.isAdmin && (
                                <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 text-[9px] font-black text-amber-600 dark:text-amber-400">
                                  ADMIN
                                </span>
                              )}
                              {u.profileType === "student" && (
                                <span className="rounded-md bg-blue-500/10 px-1 py-0.2 text-[9px] font-bold text-blue-500">
                                  STUDENT
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="px-4 py-3.5">
                        {u.isSuspended ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[10px] font-black text-rose-500">
                            <UserX className="h-3 w-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        )}
                      </td>

                      {/* Wallets & Balance */}
                      <td className="px-4 py-3.5">
                        <p className="font-extrabold text-foreground tabular-nums">
                          ₱{(u.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-semibold">
                          {u.totalWallets || 0} {u.totalWallets === 1 ? "wallet" : "wallets"}
                        </p>
                      </td>

                      {/* Activity & Tx */}
                      <td className="px-4 py-3.5">
                        <p className="font-extrabold text-foreground tabular-nums">
                          {u.totalTransactions || 0} logged
                        </p>
                        <p className="text-[10px] text-rose-500 font-semibold">
                          -₱{(u.totalSpent || 0).toLocaleString()} spent
                        </p>
                      </td>

                      {/* Joined Date */}
                      <td className="px-4 py-3.5 text-muted-foreground font-medium text-[11px]">
                        {joinedDate}
                      </td>

                      {/* Action Menu */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Button */}
                          <button
                            type="button"
                            onClick={() => handleInspectUser(u.id)}
                            className="rounded-xl border border-border/80 bg-card px-2.5 py-1.5 text-[11px] font-black text-foreground hover:bg-secondary active:scale-95 transition-all shadow-2xs"
                            title="Inspect User Details"
                          >
                            Inspect
                          </button>

                          {/* Kick Session */}
                          <button
                            type="button"
                            onClick={() => handleUserAction("kick", u.id)}
                            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-1.5 text-amber-600 hover:bg-amber-500/20 active:scale-95 transition-all"
                            title="Revoke session / Kick"
                          >
                            <Zap className="h-3.5 w-3.5" />
                          </button>

                          {/* Suspend / Restore */}
                          {u.isSuspended ? (
                            <button
                              type="button"
                              onClick={() => handleUserAction("unsuspend", u.id)}
                              className="rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-emerald-700 active:scale-95 transition-all"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSuspendTargetUser(u)}
                              className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 text-[11px] font-black text-rose-500 hover:bg-rose-500 hover:text-white active:scale-95 transition-all"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 text-xs text-muted-foreground bg-secondary/30">
          <span>
            Page {pagination.page} of {pagination.totalPages || 1} ({pagination.totalCount} users)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card text-foreground disabled:opacity-40 hover:bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card text-foreground disabled:opacity-40 hover:bg-secondary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Inspection Modal / Drawer */}
      {inspectUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-2xl text-foreground animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E] font-black">
                  {inspectUserData?.profile?.name?.charAt(0) || "U"}
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground">
                    {inspectUserData?.profile?.name || "User Details"}
                  </h2>
                  <p className="text-xs text-muted-foreground">{inspectUserData?.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectUserId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
              {inspectLoading ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#3D784E] mb-2" />
                  Loading comprehensive user financial records...
                </div>
              ) : inspectUserData ? (
                <>
                  {/* Account Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-2xl bg-secondary/50 p-3 border border-border/50">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Wallets</p>
                      <p className="text-base font-black text-foreground mt-0.5">
                        {inspectUserData.accounts?.length || 0}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-secondary/50 p-3 border border-border/50">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Transactions</p>
                      <p className="text-base font-black text-foreground mt-0.5">
                        {inspectUserData.transactions?.length || 0}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-secondary/50 p-3 border border-border/50">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Savings Goals</p>
                      <p className="text-base font-black text-foreground mt-0.5">
                        {inspectUserData.goals?.length || 0}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-secondary/50 p-3 border border-border/50">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Recurring Bills</p>
                      <p className="text-base font-black text-foreground mt-0.5">
                        {inspectUserData.recurringBills?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Wallets List */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase text-muted-foreground">Wallets & Accounts</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {inspectUserData.accounts?.map((acc: any) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/30 p-3"
                        >
                          <div>
                            <p className="text-xs font-bold text-foreground">{acc.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{acc.type} • {acc.currency}</p>
                          </div>
                          <span className="text-xs font-black text-foreground tabular-nums">
                            ₱{Number(acc.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase text-muted-foreground">Recent Transactions</h3>
                    <div className="divide-y divide-border/40 rounded-2xl border border-border/60 bg-secondary/20 overflow-hidden">
                      {inspectUserData.transactions?.length === 0 ? (
                        <p className="p-4 text-center text-xs text-muted-foreground">No transactions recorded.</p>
                      ) : (
                        inspectUserData.transactions?.slice(0, 10).map((tx: any) => (
                          <div key={tx.id} className="flex items-center justify-between p-3">
                            <div>
                              <p className="text-xs font-bold text-foreground">{tx.title}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {tx.transaction_date} • {tx.account_id || "Cash"} • {tx.category_id || "General"}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "text-xs font-black tabular-nums",
                                tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                              )}
                            >
                              {tx.type === "income" ? "+" : "-"}₱{Number(tx.amount || 0).toLocaleString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-semibold">User ID: {inspectUserId}</span>
              <button
                type="button"
                onClick={() => setInspectUserId(null)}
                className="rounded-xl bg-secondary px-4 py-2 text-xs font-black text-foreground hover:bg-secondary/80"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2.5rem] border border-rose-500/30 bg-card p-6 shadow-2xl text-foreground space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Suspend User Account</h3>
                <p className="text-xs text-muted-foreground">{suspendTargetUser.name} ({suspendTargetUser.email})</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Suspended users will be immediately locked out of their session and denied API access until manually unsuspended.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-foreground">Suspension Reason</label>
              <input
                type="text"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Reason for suspension..."
                className="h-10 w-full rounded-xl border border-border/60 bg-secondary/50 px-3.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuspendTargetUser(null)}
                className="rounded-xl border border-border/80 bg-card px-4 py-2.5 text-xs font-black text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUserAction("suspend", suspendTargetUser.id, suspendReason)}
                className="rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-600 active:scale-95 transition-all shadow-md"
              >
                {actionLoading ? "Suspending..." : "Confirm Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
