"use client"

import { useState } from "react"
import {
  ChevronLeft,
  TrendingUp,
  Sparkles,
  Target,
  Wallet,
  ShieldCheck,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  Activity,
  CheckCircle2,
} from "lucide-react"
import Image from "next/image"
import { formatMoney } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface PlanOverviewScreenProps {
  onBack: () => void
}

export function PlanOverviewScreen({ onBack }: PlanOverviewScreenProps) {
  const { wallets, goals, budgets, debts, receivables, plannedPayments } = useStore()

  const [timeRange, setTimeRange] = useState<"month" | "year" | "all">("month")

  const totalAssets = wallets
    .filter((w) => !w.isLiability)
    .reduce((s, w) => s + (w.currency === "USD" ? w.balance * 57 : w.balance), 0)

  const totalDebts = debts.reduce((s, d) => s + d.amount, 0)
  const netWorth = totalAssets - totalDebts
  const totalGoalsSaved = goals.reduce((s, g) => s + g.saved, 0)
  const totalGoalsTarget = goals.reduce((s, g) => s + g.target, 0)
  const goalsProgress = totalGoalsTarget > 0 ? Math.round((totalGoalsSaved / totalGoalsTarget) * 100) : 0

  const totalBudgetsLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalBudgetsSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const budgetUsagePercent = totalBudgetsLimit > 0 ? Math.round((totalBudgetsSpent / totalBudgetsLimit) * 100) : 0

  const overBudgetCount = budgets.filter((b) => b.spent > b.limit).length
  const healthScore = totalDebts > totalAssets
    ? Math.max(50, 75 - Math.round((totalDebts / (totalAssets || 1)) * 10))
    : overBudgetCount > 0
    ? Math.max(60, 95 - overBudgetCount * 10)
    : 95

  const healthZone = healthScore >= 80 ? "Green Zone" : healthScore >= 60 ? "Yellow Zone" : "Red Zone"
  const healthBadge = healthScore >= 80 ? "Optimal" : healthScore >= 60 ? "Fair" : "Needs Attention"
  const totalReceivables = receivables
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.amount, 0)
  const totalPlannedBills = plannedPayments.reduce((s, p) => s + p.amount, 0)

  const runwayMonths = totalBudgetsSpent > 0
    ? (totalAssets / totalBudgetsSpent).toFixed(1)
    : totalAssets > 0
    ? "3.0+"
    : "0.0"

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-28 min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <div className="flex items-center justify-between py-1">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground hover:bg-secondary transition-colors shadow-2xs"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h1 className="text-base font-black tracking-tight text-foreground">Financial Overview</h1>
          <p className="text-[10px] text-muted-foreground font-semibold">Comprehensive wealth health</p>
        </div>
        <div className="w-9" />
      </div>

      {/* Hero Mascot Banner: Net Worth Capsule */}
      <div className="relative rounded-3xl bg-[#3D784E] py-3 px-3.5 text-white shadow-md select-none overflow-visible">
        <div className="flex items-center gap-3">
          {/* Pop-out Mascot Graphic */}
          <div className="relative -mt-7 -mb-5 -ml-1 h-24 w-24 shrink-0 z-10 pointer-events-none">
            <Image
              src="/pawi-holding-wallet.png"
              alt="Pawi"
              fill
              priority
              className="object-contain drop-shadow-lg scale-125 origin-bottom"
            />
          </div>

          {/* White Card Speech Bubble */}
          <div className="relative z-0 flex-1 rounded-2xl bg-white p-3.5 text-foreground shadow-xs">
            {/* Speech bubble pointer arrow */}
            <div className="absolute -left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-white" />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  ESTIMATED NET WORTH
                </span>
                <p className="mt-0.5 text-2xl font-black tracking-tight text-foreground tabular-nums leading-none">
                  {formatMoney(netWorth)}
                </p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#3D784E]/15 text-[#3D784E]">
                <Activity className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1 text-[#2E683E]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3D784E]" />
                Assets: {formatMoney(totalAssets)}
              </span>
              <span className="flex items-center gap-1 text-rose-600">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Debts: {formatMoney(totalDebts)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pawi Health Score Card */}
      <div className="flex items-center justify-between rounded-3xl border border-border/80 bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-foreground">{healthZone} · {healthScore}/100</span>
              <span className="rounded-full bg-[#3D784E]/20 px-2 py-0.2 text-[9px] font-black text-[#3D784E]">
                {healthBadge}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              {runwayMonths} months emergency runway & {totalDebts > 0 ? "active liabilities" : "zero liabilities"}
            </p>
          </div>
        </div>
      </div>

      {/* Core 4 Metric Highlights Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* 1. Active Goals */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-4 shadow-xs hover:border-[#3D784E]/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                ACTIVE GOALS
              </span>
              <Target className="h-3.5 w-3.5 text-[#3D784E]" />
            </div>
            <p className="text-lg font-black text-foreground tabular-nums mt-1">
              {formatMoney(totalGoalsSaved)}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              {goals.length} targets ({goalsProgress}% of goal)
            </p>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-[#3D784E] transition-all"
              style={{ width: `${Math.min(100, goalsProgress)}%` }}
            />
          </div>
        </div>

        {/* 2. Budget Usage */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-4 shadow-xs hover:border-[#3D784E]/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                BUDGET USAGE
              </span>
              <PieChart className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-lg font-black text-foreground tabular-nums mt-1">
              {formatMoney(totalBudgetsSpent)}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              of {formatMoney(totalBudgetsLimit)} cap ({budgetUsagePercent}%)
            </p>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                budgetUsagePercent > 90 ? "bg-rose-500" : "bg-amber-500"
              )}
              style={{ width: `${Math.min(100, budgetUsagePercent)}%` }}
            />
          </div>
        </div>

        {/* 3. Receivables */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-4 shadow-xs hover:border-[#3D784E]/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                RECEIVABLES
              </span>
              <ArrowDownLeft className="h-3.5 w-3.5 text-[#3D784E]" />
            </div>
            <p className="text-lg font-black text-[#3D784E] tabular-nums mt-1">
              {receivables.length > 0 ? formatMoney(totalReceivables) : "₱0.00"}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              {receivables.length} incoming item{receivables.length !== 1 ? "s" : ""} owed to you
            </p>
          </div>
          <span className="mt-2 text-[9px] font-bold text-[#3D784E] inline-flex items-center gap-0.5">
            Collecting on schedule &gt;
          </span>
        </div>

        {/* 4. Planned Bills */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-4 shadow-xs hover:border-[#3D784E]/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                PLANNED BILLS
              </span>
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-lg font-black text-foreground tabular-nums mt-1">
              {plannedPayments.length > 0 ? formatMoney(totalPlannedBills) : "₱0.00"}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              {plannedPayments.length} scheduled recurring bill{plannedPayments.length !== 1 ? "s" : ""}
            </p>
          </div>
          <span className="mt-2 text-[9px] font-bold text-muted-foreground inline-flex items-center gap-0.5">
            Auto-allocated &gt;
          </span>
        </div>
      </div>

      {/* Asset Breakdown Visual Bar */}
      <div className="rounded-3xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-foreground">Asset & Liability Ratio</span>
          <span className="text-[10px] font-bold text-muted-foreground">
            {Math.round((totalAssets / (totalAssets + totalDebts || 1)) * 100)}% Equity
          </span>
        </div>

        {/* Stacked Ratio Bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary gap-0.5">
          <div
            className="h-full bg-[#3D784E] rounded-l-full transition-all"
            style={{ width: `${Math.round((totalAssets / (totalAssets + totalDebts || 1)) * 100)}%` }}
            title="Assets"
          />
          <div
            className="h-full bg-rose-500 rounded-r-full transition-all"
            style={{ width: `${Math.round((totalDebts / (totalAssets + totalDebts || 1)) * 100)}%` }}
            title="Debts"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="flex items-center gap-2 rounded-2xl bg-secondary/40 p-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#3D784E]" />
            <div>
              <p className="text-[10px] text-muted-foreground font-bold">Total Liquid Assets</p>
              <p className="text-xs font-black text-foreground tabular-nums">{formatMoney(totalAssets)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-secondary/40 p-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <div>
              <p className="text-[10px] text-muted-foreground font-bold">Total Liabilities</p>
              <p className="text-xs font-black text-foreground tabular-nums">{formatMoney(totalDebts)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
