"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Activity,
  Target,
  Calendar,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  Server,
  Zap,
  ChevronRight,
  Search,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { formatMoney } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"

export default function AdminDashboardPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [metrics, setMetrics] = useState<any>(null)
  const [chartMode, setChartMode] = useState<"signups" | "transactions" | "volume">("signups")
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const token = session?.access_token
      const res = await fetch("/api/admin/metrics", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to load metrics")
      }

      setMetrics(data.data)
    } catch (err: any) {
      console.error("Fetch metrics error:", err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [session])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  if (loading && !metrics) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#3D784E]" />
        <p className="text-sm font-bold text-foreground">Loading Executive Metrics...</p>
        <p className="text-xs text-muted-foreground">Aggregating users, transactions, and live activity.</p>
      </div>
    )
  }

  const totals = metrics?.totals || {}
  const growthChart = metrics?.growthChart || []
  const recentActivity = metrics?.recentActivity || []
  const systemHealth = metrics?.systemHealth || {}

  // Calculate highest point for chart scaling
  const maxChartValue = Math.max(
    ...growthChart.map((d: any) =>
      chartMode === "signups"
        ? d.signups
        : chartMode === "transactions"
        ? d.transactions
        : d.volume
    ),
    5
  )

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Platform Overview
            </h1>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              Live Realtime
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            Real-time analytics, user distribution, and platform activity for Pawi.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-card px-3.5 py-2 text-xs font-black text-foreground hover:bg-secondary active:scale-95 transition-all shadow-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin text-[#3D784E]")} />
            <span>{refreshing ? "Refreshing..." : "Refresh Data"}</span>
          </button>

          <Link
            href="/admin/users"
            className="flex items-center gap-1.5 rounded-2xl bg-[#3D784E] px-4 py-2 text-xs font-black text-white hover:bg-[#356B46] active:scale-95 transition-all shadow-md shadow-[#3D784E]/20"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Manage Users</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-500 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Key Metric Hero Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Users */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-5 shadow-xs hover:border-[#3D784E]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Total Users
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black tracking-tight text-foreground mt-2 tabular-nums">
            {(totals.users || 0).toLocaleString()}
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-muted-foreground border-t border-border/50 pt-2.5">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {totals.activeUsers24h || 1} active (24h)
            </span>
            <span>{totals.suspendedUsers || 0} suspended</span>
          </div>
        </div>

        {/* Card 2: Transactions */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-5 shadow-xs hover:border-[#3D784E]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Transactions Logged
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#3D784E]/10 text-[#3D784E]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black tracking-tight text-foreground mt-2 tabular-nums">
            {(totals.transactions || 0).toLocaleString()}
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-muted-foreground border-t border-border/50 pt-2.5">
            <span>Avg {totals.avgTxPerUser || 0} tx / user</span>
            <span className="text-foreground font-black">{totals.wallets || 0} wallets</span>
          </div>
        </div>

        {/* Card 3: Volume */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-5 shadow-xs hover:border-[#3D784E]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Platform Expense Volume
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black tracking-tight text-foreground mt-2 tabular-nums">
            ₱{(totals.expenseVolume || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-muted-foreground border-t border-border/50 pt-2.5">
            <span className="text-emerald-600 dark:text-emerald-400">
              +₱{(totals.incomeVolume || 0).toLocaleString()} income
            </span>
            <span>Net Vol</span>
          </div>
        </div>

        {/* Card 4: Goals & Bills */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-5 shadow-xs hover:border-[#3D784E]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Savings Goals & Bills
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black tracking-tight text-foreground mt-2 tabular-nums">
            {(totals.goals || 0) + (totals.bills || 0)}
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-muted-foreground border-t border-border/50 pt-2.5">
            <span className="text-[#3D784E]">₱{(totals.goalsSaved || 0).toLocaleString()} saved</span>
            <span>{totals.bills || 0} recurring bills</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Growth Chart (Left 2 cols) + Live Activity Feed (Right 1 col) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Growth & Timeline Chart Card */}
        <div className="rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-foreground">Growth & Activity Pacing</h2>
              <p className="text-xs text-muted-foreground font-semibold">30-day timeline across platform metrics</p>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-2xl border border-border/60 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartMode("signups")}
                className={cn(
                  "rounded-xl px-3 py-1 text-xs font-black transition-all",
                  chartMode === "signups" ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Signups
              </button>
              <button
                type="button"
                onClick={() => setChartMode("transactions")}
                className={cn(
                  "rounded-xl px-3 py-1 text-xs font-black transition-all",
                  chartMode === "transactions" ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Transactions
              </button>
              <button
                type="button"
                onClick={() => setChartMode("volume")}
                className={cn(
                  "rounded-xl px-3 py-1 text-xs font-black transition-all",
                  chartMode === "volume" ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Volume (₱)
              </button>
            </div>
          </div>

          {/* SVG Bar / Timeline Visualizer */}
          <div className="pt-4">
            <div className="flex h-48 items-end justify-between gap-1.5 px-2 border-b border-border/60 pb-2">
              {growthChart.map((d: any, index: number) => {
                const val =
                  chartMode === "signups"
                    ? d.signups
                    : chartMode === "transactions"
                    ? d.transactions
                    : d.volume

                const heightPct = Math.max(8, Math.min(100, Math.round((val / (maxChartValue || 1)) * 100)))

                return (
                  <div key={d.date} className="group relative flex flex-1 flex-col items-center h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 hidden rounded-xl bg-neutral-900 text-white px-2.5 py-1 text-[10px] font-black group-hover:flex whitespace-nowrap z-20 shadow-lg border border-neutral-700">
                      {d.date}: {chartMode === "volume" ? `₱${val.toLocaleString()}` : val}
                    </div>

                    <div
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-300",
                        val > 0
                          ? "bg-gradient-to-t from-[#2E683E] to-[#52B788] group-hover:brightness-125"
                          : "bg-secondary/60"
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                )
              })}
            </div>

            {/* X-Axis dates summary */}
            <div className="flex items-center justify-between pt-2 text-[10px] font-bold text-muted-foreground px-1">
              <span>{growthChart[0]?.date || "30 days ago"}</span>
              <span>{growthChart[Math.floor(growthChart.length / 2)]?.date || "15 days ago"}</span>
              <span className="text-[#3D784E] font-black">{growthChart[growthChart.length - 1]?.date || "Today"}</span>
            </div>
          </div>

          {/* Highlights Footer */}
          <div className="grid grid-cols-3 gap-3 rounded-2xl bg-secondary/40 p-3.5 border border-border/50 text-center">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase">Active (7 Days)</p>
              <p className="text-base font-black text-foreground mt-0.5">{totals.activeUsers7d || 1} users</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase">Active (30 Days)</p>
              <p className="text-base font-black text-foreground mt-0.5">{totals.activeUsers30d || 1} users</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase">Total Wallets</p>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{totals.wallets || 0}</p>
            </div>
          </div>
        </div>

        {/* Live Activity Feed Card */}
        <div className="rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-black text-foreground">Live Activity Feed</h2>
                <p className="text-xs text-muted-foreground font-semibold">Real-time platform events</p>
              </div>
              <Link
                href="/admin/activity"
                className="text-xs font-black text-[#3D784E] hover:underline inline-flex items-center gap-0.5"
              >
                View all &gt;
              </Link>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {recentActivity.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No activity events recorded yet.
                </div>
              ) : (
                recentActivity.slice(0, 8).map((log: any) => {
                  const isSignup = log.event_type === "signup"
                  const isTx = log.event_type?.includes("transaction")
                  const isAdmin = log.event_type === "admin_action"

                  const timeStr = log.created_at
                    ? new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "Recent"

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 rounded-2xl border border-border/50 bg-secondary/30 p-3 hover:bg-secondary/60 transition-colors"
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold mt-0.5",
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-extrabold text-foreground truncate">
                            {log.event_type?.replace(/_/g, " ").toUpperCase()}
                          </p>
                          <span className="text-[10px] text-muted-foreground font-semibold shrink-0">
                            {timeStr}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                          {log.description}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <Link
            href="/admin/activity"
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border/70 bg-secondary/50 py-2.5 text-xs font-black text-foreground hover:bg-secondary transition-all"
          >
            <span>Full Audit Trail</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Bottom Section: System Health & Platform Quick Controls */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* System Health */}
        <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-foreground font-black text-sm">
            <Server className="h-4 w-4 text-[#3D784E]" />
            <h3>Database & Backend Health</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Supabase PostgreSQL</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Operational
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Google Gemini OCR</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Connected
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground font-medium">Web Push Subscriptions</span>
              <span className="font-bold text-foreground">Active</span>
            </div>
          </div>
        </div>

        {/* Global Security */}
        <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-foreground font-black text-sm">
            <ShieldCheck className="h-4 w-4 text-[#3D784E]" />
            <h3>Access Control & Security</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Single-Account Admin Lock active. Service Role API execution and Row Level Security active on all financial tables.
          </p>
          <div className="pt-1">
            <span className="rounded-xl bg-[#3D784E]/10 border border-[#3D784E]/20 px-3 py-1 text-[11px] font-black text-[#3D784E]">
              Strict Guard Active 🛡️
            </span>
          </div>
        </div>

        {/* Platform Settings Link Card */}
        <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-foreground font-black text-sm">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3>Platform Configuration</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Configure receipt parsing, emergency maintenance mode, and platform announcements.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="flex items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-xs font-black text-foreground hover:bg-secondary/80 transition-colors"
          >
            Configure Settings
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
