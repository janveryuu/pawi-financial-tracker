"use client"

import { ChevronLeft, TrendingUp, Sparkles, Target, Wallet, ShieldCheck } from "lucide-react"
import { formatMoney } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"

interface PlanOverviewScreenProps {
  onBack: () => void
}

export function PlanOverviewScreen({ onBack }: PlanOverviewScreenProps) {
  const { wallets, goals, budgets, debts, receivables, plannedPayments } = useStore()

  const totalAssets = wallets
    .filter((w) => !w.isLiability)
    .reduce((s, w) => s + (w.currency === "USD" ? w.balance * 57 : w.balance), 0)

  const totalDebts = debts.reduce((s, d) => s + d.amount, 0)
  const netWorth = totalAssets - totalDebts
  const totalGoals = goals.reduce((s, g) => s + g.saved, 0)
  const totalBudgetsLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalBudgetsSpent = budgets.reduce((s, b) => s + b.spent, 0)

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-28 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-black text-foreground">Financial Overview</h2>
        <div className="w-9" />
      </div>

      {/* Net Worth Card */}
      <div className="rounded-[2rem] bg-[#3D784E] p-5 text-white shadow-md">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
          ESTIMATED NET WORTH
        </p>
        <p className="mt-1 text-3xl font-black tracking-tight tabular-nums">
          {formatMoney(netWorth)}
        </p>
        <p className="text-xs text-white/70 mt-1">
          Assets {formatMoney(totalAssets)} · Debts {formatMoney(totalDebts)}
        </p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            ACTIVE GOALS
          </p>
          <p className="text-xl font-black text-foreground tabular-nums mt-1">
            {formatMoney(totalGoals)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{goals.length} active targets</p>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            BUDGET USAGE
          </p>
          <p className="text-xl font-black text-foreground tabular-nums mt-1">
            {formatMoney(totalBudgetsSpent)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            of {formatMoney(totalBudgetsLimit)} cap
          </p>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            RECEIVABLES
          </p>
          <p className="text-xl font-black text-emerald-600 tabular-nums mt-1">
            {receivables.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Owed to you</p>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            PLANNED BILLS
          </p>
          <p className="text-xl font-black text-foreground tabular-nums mt-1">
            {plannedPayments.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Scheduled items</p>
        </div>
      </div>
    </div>
  )
}
