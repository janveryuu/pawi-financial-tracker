"use client"

import { useMemo } from "react"
import {
  ChevronLeft,
  Target,
  ShieldCheck,
  Calendar,
  ArrowDownLeft,
  PieChart,
  Activity,
  AlertTriangle,
} from "lucide-react"
import Image from "next/image"
import { formatMoney } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface PlanOverviewScreenProps {
  onBack: () => void
}

export function PlanOverviewScreen({ onBack }: PlanOverviewScreenProps) {
  const { wallets, goals, budgets, debts, receivables, plannedPayments, transactions } = useStore()

  // 1. Assets (All non-liability wallets converted to PHP if USD)
  const assetWallets = useMemo(() => wallets.filter((w) => !w.isLiability), [wallets])
  const totalAssets = useMemo(
    () => assetWallets.reduce((s, w) => s + (w.currency === "USD" ? w.balance * 57 : w.balance), 0),
    [assetWallets]
  )

  // 2. Liabilities (Liability wallets like Credit Cards, Loans + Standalone Debts)
  const liabilityWallets = useMemo(() => wallets.filter((w) => w.isLiability), [wallets])
  const walletLiabilities = useMemo(
    () =>
      liabilityWallets.reduce(
        (s, w) => s + (w.currency === "USD" ? (w.usedCredit || w.balance) * 57 : (w.usedCredit || w.balance)),
        0
      ),
    [liabilityWallets]
  )
  const debtsTotal = useMemo(() => debts.reduce((s, d) => s + d.amount, 0), [debts])
  const totalLiabilities = walletLiabilities + debtsTotal

  // 3. True Net Worth & Zone
  const netWorth = totalAssets - totalLiabilities
  const isRedZone = netWorth < 0 || (totalAssets <= 0 && totalLiabilities > 0)

  // 4. Active Goals
  const totalGoalsSaved = useMemo(() => goals.reduce((s, g) => s + (g.saved || 0), 0), [goals])
  const totalGoalsTarget = useMemo(() => goals.reduce((s, g) => s + (g.target || 0), 0), [goals])
  const goalsProgress =
    totalGoalsTarget > 0 ? Math.min(100, Math.round((totalGoalsSaved / totalGoalsTarget) * 100)) : 0

  // 5. Budgets
  const totalBudgetsLimit = useMemo(() => budgets.reduce((s, b) => s + (b.limit || 0), 0), [budgets])
  const totalBudgetsSpent = useMemo(() => budgets.reduce((s, b) => s + (b.spent || 0), 0), [budgets])
  const budgetUsagePercent =
    totalBudgetsLimit > 0 ? Math.min(100, Math.round((totalBudgetsSpent / totalBudgetsLimit) * 100)) : 0
  const overBudgetCount = useMemo(() => budgets.filter((b) => b.spent > b.limit).length, [budgets])

  // 6. Receivables & Planned Bills
  const pendingReceivables = useMemo(() => receivables.filter((r) => r.status === "pending"), [receivables])
  const totalReceivables = useMemo(
    () => pendingReceivables.reduce((s, r) => s + r.amount, 0),
    [pendingReceivables]
  )
  const totalPlannedBills = useMemo(() => plannedPayments.reduce((s, p) => s + p.amount, 0), [plannedPayments])

  // 7. 30-Day Expense & Monthly Burn Rate for accurate Runway
  const recent30DaysSpend = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return (transactions || [])
      .filter((t) => {
        if (t.kind !== "expense") return false
        if (!t.date) return false
        const txDate = new Date(t.date)
        return !isNaN(txDate.getTime()) && txDate >= thirtyDaysAgo
      })
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  }, [transactions])

  const monthlyBurnRate = useMemo(() => {
    if (totalBudgetsLimit > 0) return Math.max(totalBudgetsLimit, totalBudgetsSpent)
    if (recent30DaysSpend > 0) return recent30DaysSpend
    if (totalPlannedBills > 0) return totalPlannedBills
    return totalBudgetsSpent
  }, [totalBudgetsLimit, totalBudgetsSpent, recent30DaysSpend, totalPlannedBills])

  const runwayMonths = useMemo(() => {
    if (totalAssets <= 0) return "0.0"
    if (monthlyBurnRate <= 0) return "12.0+"
    const months = totalAssets / monthlyBurnRate
    if (months > 24) return "24.0+"
    return months.toFixed(1)
  }, [totalAssets, monthlyBurnRate])

  // 8. Health Score (0 - 100)
  const healthScore = useMemo(() => {
    if (totalAssets === 0 && totalLiabilities === 0) return 70

    // Factor 1: Net Worth & Debt Ratio (Max 50 pts)
    let debtScore = 50
    if (totalLiabilities > 0) {
      const totalPool = totalAssets + totalLiabilities
      const debtRatio = totalLiabilities / (totalPool || 1)
      if (debtRatio > 0.8) debtScore = 5
      else if (debtRatio > 0.5) debtScore = 15
      else if (debtRatio > 0.3) debtScore = 25
      else if (debtRatio > 0.1) debtScore = 38
      else debtScore = 45
    }

    // Factor 2: Emergency Runway (Max 30 pts)
    let runwayScore = 10
    const runwayNum = parseFloat(runwayMonths)
    if (runwayMonths === "24.0+" || runwayNum >= 6) runwayScore = 30
    else if (runwayNum >= 3) runwayScore = 24
    else if (runwayNum >= 1) runwayScore = 16
    else if (runwayNum > 0) runwayScore = 8
    else runwayScore = 0

    // Factor 3: Budget Control (Max 20 pts)
    let budgetScore = 20
    if (totalBudgetsLimit > 0) {
      if (overBudgetCount > 0) {
        budgetScore = Math.max(0, 20 - overBudgetCount * 8)
      } else if (budgetUsagePercent > 90) {
        budgetScore = 12
      } else {
        budgetScore = 20
      }
    }

    return Math.max(10, Math.min(100, Math.round(debtScore + runwayScore + budgetScore)))
  }, [totalAssets, totalLiabilities, runwayMonths, totalBudgetsLimit, overBudgetCount, budgetUsagePercent])

  const healthZone = healthScore >= 80 ? "Green Zone" : healthScore >= 60 ? "Yellow Zone" : "Red Zone"
  const healthBadge = healthScore >= 80 ? "Optimal" : healthScore >= 60 ? "Fair" : "Needs Attention"

  // 9. Asset & Liability Ratio percentages
  const totalPool = totalAssets + totalLiabilities
  const assetRatioPercent =
    totalPool > 0 ? Math.round((totalAssets / totalPool) * 100) : totalAssets > 0 ? 100 : 0
  const debtRatioPercent = totalPool > 0 ? 100 - assetRatioPercent : 0

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
      <div
        className={cn(
          "relative rounded-3xl py-3 px-3.5 text-white shadow-md select-none overflow-visible transition-all duration-300",
          isRedZone
            ? "bg-gradient-to-r from-[#991B1B] via-[#B91C1C] to-[#881337] border border-rose-500/30 shadow-rose-950/25"
            : "bg-[#3D784E] border border-[#4E9362]/30 shadow-[#3D784E]/20"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Pop-out Mascot Graphic */}
          <div className="relative -mt-7 -mb-5 -ml-1 h-24 w-24 shrink-0 z-10 pointer-events-none">
            <Image
              src={isRedZone ? "/pawi-empty-wallet-new.png" : "/pawi-happy-wallet-new.png"}
              alt="Pawi Mascot"
              fill
              priority
              className="object-contain drop-shadow-lg scale-125 origin-bottom transition-all duration-300"
            />
          </div>

          {/* White Card Speech Bubble */}
          <div className="relative z-0 flex-1 rounded-2xl bg-white p-3.5 text-foreground shadow-xs">
            {/* Speech bubble pointer arrow */}
            <div className="absolute -left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-white" />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  ESTIMATED NET WORTH {isRedZone ? "⚠️" : ""}
                </span>
                <p
                  className={cn(
                    "mt-0.5 text-2xl font-black tracking-tight tabular-nums leading-none",
                    isRedZone && netWorth < 0 ? "text-[#B91C1C]" : "text-foreground"
                  )}
                >
                  {formatMoney(netWorth)}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-xl",
                  isRedZone
                    ? "bg-rose-500/15 text-rose-600"
                    : "bg-[#3D784E]/15 text-[#3D784E]"
                )}
              >
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
                Liabilities: {formatMoney(totalLiabilities)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pawi Health Score Card */}
      <div
        className={cn(
          "flex items-center justify-between rounded-3xl border bg-card p-4 shadow-xs transition-all",
          isRedZone ? "border-rose-300/60 dark:border-rose-900/50" : "border-border/80"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              isRedZone
                ? "bg-rose-500/15 text-rose-600"
                : "bg-[#3D784E]/15 text-[#3D784E]"
            )}
          >
            {isRedZone ? <AlertTriangle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-foreground">
                {healthZone} · {healthScore}/100
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-black",
                  healthScore >= 80
                    ? "bg-[#3D784E]/20 text-[#3D784E]"
                    : healthScore >= 60
                    ? "bg-amber-500/20 text-amber-600"
                    : "bg-rose-500/20 text-rose-600"
                )}
              >
                {healthBadge}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              {runwayMonths} months emergency runway &{" "}
              {totalLiabilities > 0 ? `${formatMoney(totalLiabilities)} liabilities` : "zero liabilities"}
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
              {goals.length} target{goals.length !== 1 ? "s" : ""} ({goalsProgress}% of goal)
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
              <PieChart
                className={cn(
                  "h-3.5 w-3.5",
                  overBudgetCount > 0 || budgetUsagePercent > 90 ? "text-rose-500" : "text-amber-500"
                )}
              />
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
                budgetUsagePercent > 90 || overBudgetCount > 0 ? "bg-rose-500" : "bg-amber-500"
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
              {pendingReceivables.length > 0 ? formatMoney(totalReceivables) : "₱0.00"}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              {pendingReceivables.length} incoming item{pendingReceivables.length !== 1 ? "s" : ""} owed to you
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
          <span
            className={cn(
              "text-[10px] font-bold",
              netWorth < 0 ? "text-rose-600 dark:text-rose-400 font-black" : "text-muted-foreground"
            )}
          >
            {netWorth >= 0
              ? `${assetRatioPercent}% Equity`
              : `${debtRatioPercent}% Debt Burden (Deficit)`}
          </span>
        </div>

        {/* Stacked Ratio Bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary gap-0.5">
          <div
            className="h-full bg-[#3D784E] rounded-l-full transition-all"
            style={{ width: `${assetRatioPercent}%` }}
            title="Assets"
          />
          <div
            className="h-full bg-rose-500 rounded-r-full transition-all"
            style={{ width: `${debtRatioPercent}%` }}
            title="Liabilities"
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
              <p
                className={cn(
                  "text-xs font-black tabular-nums",
                  totalLiabilities > 0 ? "text-rose-600" : "text-foreground"
                )}
              >
                {formatMoney(totalLiabilities)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
