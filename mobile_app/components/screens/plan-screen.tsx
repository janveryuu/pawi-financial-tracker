"use client"

import { useState } from "react"
import {
  PieChart,
  Flag,
  FileText,
  Banknote,
  Calendar,
  CreditCard,
  Plane,
  Tag,
  Wrench,
  LayoutGrid,
  ChevronRight,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { PlanBudgetsScreen } from "../plan/plan-budgets-screen"
import { PlanGoalsScreen } from "../plan/plan-goals-screen"
import { PlanDebtScreen } from "../plan/plan-debt-screen"
import { PlanReceivablesScreen } from "../plan/plan-receivables-screen"
import { PlanPaymentsScreen } from "../plan/plan-payments-screen"
import { PlanInstallmentsScreen } from "../plan/plan-installments-screen"
import { PlanTravelScreen } from "../plan/plan-travel-screen"
import { PlanTagsScreen } from "../plan/plan-tags-screen"
import { PlanToolsScreen } from "../plan/plan-tools-screen"
import { PlanOverviewScreen } from "../plan/plan-overview-screen"

export type PlanSubScreen =
  | "budgets"
  | "goals"
  | "debt"
  | "receivables"
  | "payments"
  | "installments"
  | "travel"
  | "tags"
  | "tools"
  | "overview"
  | null

interface PlanScreenProps {
  initialSubScreen?: PlanSubScreen
}

export function PlanScreen({ initialSubScreen = null }: PlanScreenProps) {
  const { budgets, goals, debts, receivables, plannedPayments } = useStore()
  const [subScreen, setSubScreen] = useState<PlanSubScreen>(initialSubScreen)

  // Sync if initialSubScreen changes from parent
  useState(() => {
    if (initialSubScreen !== subScreen) {
      setSubScreen(initialSubScreen)
    }
  })

  // Sub-screen routers
  if (subScreen === "budgets") return <PlanBudgetsScreen onBack={() => setSubScreen(null)} />
  if (subScreen === "goals") return <PlanGoalsScreen onBack={() => setSubScreen(null)} />
  if (subScreen === "debt") return <PlanDebtScreen onBack={() => setSubScreen(null)} />
  if (subScreen === "receivables") return <PlanReceivablesScreen onBack={() => setSubScreen(null)} />
  if (subScreen === "payments") return <PlanPaymentsScreen onBack={() => setSubScreen(null)} />
  if (subScreen === "installments") return <PlanInstallmentsScreen onBack={() => setSubScreen(null)} />
  if (subScreen === "travel") return <PlanTravelScreen onBack={() => setSubScreen(null)} />
  if (subScreen === "tags") return <PlanTagsScreen onBack={() => setSubScreen(null)} />
  if (subScreen === "tools") return <PlanToolsScreen onBack={() => setSubScreen(null)} />
  if (subScreen === "overview") return <PlanOverviewScreen onBack={() => setSubScreen(null)} />

  const recurringCount = plannedPayments.filter((p) => p.frequency === "recurring").length
  const oneTimeCount = plannedPayments.filter((p) => p.frequency === "one-time").length

  return (
    <div className="flex flex-col gap-3.5 px-4 pt-2 pb-28 min-h-screen bg-background">
      {/* Top Header (Image 1) */}
      <div className="py-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Plan</h1>
        <p className="text-xs text-muted-foreground font-medium">Manage your budgets, goals, and more.</p>
      </div>

      {/* 6 Full-Width List Items */}
      <div className="space-y-2.5">
        {/* 1. Category budgets */}
        <button
          type="button"
          onClick={() => setSubScreen("budgets")}
          className="flex w-full items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-xs text-left hover:bg-secondary/40 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-[#3D784E]">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Category budgets</p>
              <p className="text-xs text-muted-foreground font-medium">
                {budgets.length} {budgets.length === 1 ? "active budget" : "active budgets"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
        </button>

        {/* 2. Personal goals */}
        <button
          type="button"
          onClick={() => setSubScreen("goals")}
          className="flex w-full items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-xs text-left hover:bg-secondary/40 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-[#3D784E]">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Personal goals</p>
              <p className="text-xs text-muted-foreground font-medium">
                {goals.length} {goals.length === 1 ? "goal in progress" : "goals in progress"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
        </button>

        {/* 3. Debt */}
        <button
          type="button"
          onClick={() => setSubScreen("debt")}
          className="flex w-full items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-xs text-left hover:bg-secondary/40 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Debt</p>
              <p className="text-xs text-muted-foreground font-medium">
                {debts.length} {debts.length === 1 ? "debt tracked" : "debts tracked"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
        </button>

        {/* 4. Money owed to you */}
        <button
          type="button"
          onClick={() => setSubScreen("receivables")}
          className="flex w-full items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-xs text-left hover:bg-secondary/40 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Money owed to you</p>
              <p className="text-xs text-muted-foreground font-medium">
                {receivables.length} {receivables.length === 1 ? "receivable tracked" : "receivables tracked"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
        </button>

        {/* 5. Planned payments */}
        <button
          type="button"
          onClick={() => setSubScreen("payments")}
          className="flex w-full items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-xs text-left hover:bg-secondary/40 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-[#3D784E]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Planned payments</p>
              <p className="text-xs text-muted-foreground font-medium">
                {recurringCount} recurring • {oneTimeCount} one-time planned
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
        </button>

        {/* 6. Installments */}
        <button
          type="button"
          onClick={() => setSubScreen("installments")}
          className="flex w-full items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-xs text-left hover:bg-secondary/40 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-[#3D784E]">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Installments</p>
              <p className="text-xs text-muted-foreground font-medium">
                Track credit card installment plans
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
        </button>
      </div>

      {/* 2x2 Compact Grid (Image 1) */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        {/* Travel */}
        <button
          type="button"
          onClick={() => setSubScreen("travel")}
          className="flex items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-xs hover:bg-secondary/40 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Plane className="h-4 w-4 text-[#3D784E]" />
            <span className="text-xs font-black text-foreground">Travel</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
        </button>

        {/* Tags */}
        <button
          type="button"
          onClick={() => setSubScreen("tags")}
          className="flex items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-xs hover:bg-secondary/40 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Tag className="h-4 w-4 text-[#3D784E]" />
            <span className="text-xs font-black text-foreground">Tags</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
        </button>

        {/* Tools */}
        <button
          type="button"
          onClick={() => setSubScreen("tools")}
          className="flex items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-xs hover:bg-secondary/40 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Wrench className="h-4 w-4 text-[#3D784E]" />
            <span className="text-xs font-black text-foreground">Tools</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
        </button>

        {/* Overview */}
        <button
          type="button"
          onClick={() => setSubScreen("overview")}
          className="flex items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-xs hover:bg-secondary/40 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="h-4 w-4 text-[#3D784E]" />
            <span className="text-xs font-black text-foreground">Overview</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
        </button>
      </div>
    </div>
  )
}
