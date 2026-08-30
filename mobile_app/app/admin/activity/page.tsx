"use client"

import React, { useEffect, useState, useCallback } from "react"
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Shield,
  User,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Code,
  X,
  FileText,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

export default function AdminActivityPage() {
  const { session } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [eventType, setEventType] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 30, totalCount: 0, totalPages: 1 })
  const [inspectLog, setInspectLog] = useState<any | null>(null)

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const token = session?.access_token
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "30",
        eventType,
        ...(search ? { search } : {}),
      })

      const res = await fetch(`/api/admin/activity?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to load activity logs")

      setLogs(data.data.logs || [])
      setPagination(data.data.pagination || { page: 1, limit: 30, totalCount: 0, totalPages: 1 })
    } catch (err) {
      console.error("Fetch activity error:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [session, page, eventType, search])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const eventPills = [
    { label: "All Events", value: "all" },
    { label: "Signups", value: "signup" },
    { label: "Logins", value: "login" },
    { label: "Transactions", value: "transaction_created" },
    { label: "Goals", value: "goal_completed" },
    { label: "Admin Actions", value: "admin_action" },
  ]

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Platform Audit & Activity Trail
            </h1>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              Immutable Trail
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            Real-time audit log of user registrations, security events, financial transactions, and admin operations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-card px-3.5 py-2 text-xs font-black text-foreground hover:bg-secondary active:scale-95 transition-all shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin text-[#3D784E]")} />
          <span>{refreshing ? "Refreshing..." : "Refresh Stream"}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 rounded-3xl border border-border/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search by event description, user, or performed by..."
            className="h-10 w-full rounded-2xl border border-border/60 bg-secondary/50 pl-10 pr-4 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#3D784E]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none self-start sm:self-auto">
          {eventPills.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => {
                setEventType(pill.value)
                setPage(1)
              }}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-black transition-all whitespace-nowrap",
                eventType === pill.value
                  ? "bg-[#3D784E] text-white shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-xs space-y-4">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#3D784E] mb-2" />
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            No activity records matching criteria found.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {logs.map((log) => {
              const isSignup = log.event_type === "signup"
              const isTx = log.event_type?.includes("transaction")
              const isAdmin = log.event_type === "admin_action"
              const timeFormatted = log.created_at
                ? new Date(log.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "Recent"

              return (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 hover:bg-secondary/20 px-2 rounded-2xl transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-bold mt-0.5",
                        isSignup
                          ? "bg-blue-500/15 text-blue-500"
                          : isTx
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : isAdmin
                          ? "bg-rose-500/15 text-rose-500"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {isSignup ? "✨" : isTx ? "💰" : isAdmin ? "🛡️" : "⚡"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-black uppercase text-foreground">
                          {log.event_type?.replace(/_/g, " ")}
                        </span>
                        {log.performed_by && (
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            by {log.performed_by}
                          </span>
                        )}
                        {log.userProfile?.name && (
                          <span className="text-[11px] font-bold text-foreground">
                            • {log.userProfile.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-foreground mt-1 leading-snug">
                        {log.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {timeFormatted}
                    </span>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setInspectLog(log)}
                        className="rounded-xl border border-border/80 bg-secondary/50 px-2.5 py-1 text-[10px] font-black text-foreground hover:bg-secondary active:scale-95 transition-all"
                      >
                        Metadata
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages || 1} ({pagination.totalCount} events)
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

      {/* Metadata Inspector Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-2xl text-foreground space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-[#3D784E]" />
                <h3 className="text-sm font-black">Event Metadata Payload</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-foreground">{inspectLog.description}</p>
              <p className="text-[10px] text-muted-foreground">Log ID: {inspectLog.id}</p>
            </div>

            <pre className="max-h-64 overflow-y-auto rounded-2xl bg-secondary/80 p-3.5 text-[11px] font-mono text-foreground border border-border/60">
              {JSON.stringify(inspectLog.metadata || {}, null, 2)}
            </pre>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="rounded-xl bg-secondary px-4 py-2 text-xs font-black text-foreground hover:bg-secondary/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
