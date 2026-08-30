"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  Flame,
  Bell,
  Users,
  Settings,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Sparkles,
  Wallet,
  Target,
  ChevronRight,
  ChevronLeft,
  Plus,
  AlertTriangle,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useProfile } from "@/lib/use-profile"
import { useStore } from "@/lib/store"
import { formatMoney, getBrandLogo, Goal } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"
import { PaydaySetupModal } from "../payday-setup-modal"
import { AddGoalModal } from "../add-goal-modal"
import {
  computeHomeHeroMetrics,
  computeGoalBudgetSpotlight,
  computePacingMetrics,
  computeQuickInsight,
  computeMascotDialogue,
  SpotlightItem,
} from "@/lib/home-dashboard-engine"

interface HomeScreenProps {
  onOpenSettings: () => void
  onOpenNotifications: () => void
  onNavigateToPlan?: () => void
}

export function HomeScreen({
  onOpenSettings,
  onOpenNotifications,
  onNavigateToPlan,
}: HomeScreenProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const {
    streakDays,
    paydayCountdown,
    transactions = [],
    goals = [],
    budgets = [],
    plannedPayments = [],
    wallets = [],
    addFundsToGoal,
  } = useStore()

  const [showCommunityModal, setShowCommunityModal] = useState(false)
  const [showPaydayModal, setShowPaydayModal] = useState(false)
  const [showAddGoalModal, setShowAddGoalModal] = useState(false)
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  // Spotlight carousel index
  const [spotlightIndex, setSpotlightIndex] = useState(0)

  // Quick Deposit modal state for spotlighted goal
  const [depositGoalTarget, setDepositGoalTarget] = useState<Goal | null>(null)
  const [depositAmount, setDepositAmount] = useState("")
  const [depositSourceWallet, setDepositSourceWallet] = useState(wallets[0]?.name || "Cash")
  const [depositError, setDepositError] = useState<string | null>(null)

  // Keep live time updated
  useEffect(() => {
    setCurrentDate(new Date())
    const interval = setInterval(() => {
      setCurrentDate(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Determine user name
  const rawName =
    (profile?.name && profile.name !== "Pawi User" && profile.name.trim()) ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    user?.displayName ||
    (profile?.name && profile.name.trim()) ||
    user?.identities?.[0]?.identity_data?.name ||
    user?.identities?.[0]?.identity_data?.full_name ||
    user?.email?.split("@")[0] ||
    "Janver"

  const cleanName = rawName.includes("@") ? rawName.split("@")[0] : rawName
  const displayName = cleanName
    .split(" ")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")

  const hour = currentDate.getHours()
  let greeting = "Good morning"
  if (hour >= 12 && hour < 18) {
    greeting = "Good afternoon"
  } else if (hour >= 18 || hour < 5) {
    greeting = "Good evening"
  }

  const liveDateHeader = currentDate
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Manila",
    })
    .toUpperCase()

  // 1. Compute Data-Driven Home Hero Metrics
  const heroMetrics = useMemo(() => {
    return computeHomeHeroMetrics(transactions, currentDate)
  }, [transactions, currentDate])

  // 2. Compute Goal / Budget Spotlight Items
  const spotlightData = useMemo(() => {
    return computeGoalBudgetSpotlight(goals, budgets)
  }, [goals, budgets])

  // 3. Compute Allowance & Payday Pacing
  const pacingMetrics = useMemo(() => {
    return computePacingMetrics(profile, transactions, paydayCountdown, currentDate)
  }, [profile, transactions, paydayCountdown, currentDate])

  // 4. Compute Quick Insight
  const quickInsight = useMemo(() => {
    return computeQuickInsight(transactions, goals, budgets, plannedPayments, profile)
  }, [transactions, goals, budgets, plannedPayments, profile])

  // 5. Compute Mascot Dialogue
  const todayStr = currentDate.toISOString().split("T")[0]
  const hasLoggedToday = transactions.some((t) => t.date && t.date.startsWith(todayStr))
  const todayExpenses = transactions
    .filter((t) => t.kind === "expense" && t.date && t.date.startsWith(todayStr))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const todayIncomes = transactions
    .filter((t) => t.kind === "income" && t.date && t.date.startsWith(todayStr))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const isOverspending = todayExpenses > todayIncomes && todayExpenses > 0

  const pawiDialogueList = useMemo(() => {
    return computeMascotDialogue({
      transactions,
      goals,
      budgets,
      streakDays,
      hour,
      isOverspending,
      paydayCountdown,
    })
  }, [transactions, goals, budgets, streakDays, hour, isOverspending, paydayCountdown])

  const [dialogueIndex, setDialogueIndex] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setDialogueIndex((prev) => (prev + 1) % pawiDialogueList.length)
    }, 300000) // 5 minutes
    return () => clearInterval(interval)
  }, [pawiDialogueList.length])

  const currentPawiMessage = pawiDialogueList[dialogueIndex % pawiDialogueList.length] || pawiDialogueList[0]

  const handleNextMessage = () => {
    setDialogueIndex((prev) => (prev + 1) % pawiDialogueList.length)
  }

  // Handle Spotlight Action
  const activeSpotlightItem: SpotlightItem | undefined =
    spotlightData.items[spotlightIndex % Math.max(1, spotlightData.items.length)]

  const handleSpotlightAction = (item: SpotlightItem) => {
    if (item.type === "goal") {
      const realGoal = goals.find((g) => `goal-${g.id}` === item.id)
      if (realGoal) {
        setDepositGoalTarget(realGoal)
        setDepositAmount("")
        setDepositError(null)
      }
    } else if (onNavigateToPlan) {
      onNavigateToPlan()
    }
  }

  const handleExecuteDeposit = async () => {
    if (!depositGoalTarget || !depositAmount) return
    const amt = parseFloat(depositAmount)
    if (isNaN(amt) || amt <= 0) {
      setDepositError("Please enter a valid deposit amount.")
      return
    }

    const selectedAcc = wallets.find((w) => w.name.toLowerCase() === depositSourceWallet.toLowerCase())
    if (selectedAcc && selectedAcc.balance < amt) {
      setDepositError(
        `Insufficient balance in ${selectedAcc.name}. Available: ${formatMoney(selectedAcc.balance, selectedAcc.currency)}`
      )
      return
    }

    setDepositError(null)
    await addFundsToGoal(depositGoalTarget.id, amt, depositSourceWallet)
    setDepositGoalTarget(null)
    setDepositAmount("")
  }

  // Check if streak is at risk (past 6 PM and no log today)
  const isStreakAtRisk = streakDays > 0 && hour >= 18 && !hasLoggedToday

  return (
    <div className="flex flex-col gap-3.5 px-4 pt-2 pb-28 min-h-screen bg-background text-foreground animate-in fade-in duration-300">
      {/* 1. Top Command Header */}
      <div className="flex items-center justify-between py-1">
        {/* Dynamic Streak Achievement Pill */}
        <div
          data-tutorial-id="pawi-streak-pill"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition-all shadow-2xs select-none",
            isStreakAtRisk
              ? "border border-amber-400/60 bg-amber-500/20 text-amber-900 dark:text-amber-200 animate-pulse"
              : streakDays > 0
              ? "border border-amber-300/50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/20 text-amber-900 dark:text-amber-300"
              : "border border-border/80 bg-secondary/80 text-muted-foreground"
          )}
        >
          <Flame
            className={cn(
              "h-4 w-4 transition-transform",
              isStreakAtRisk
                ? "text-amber-600 fill-amber-500 animate-bounce"
                : streakDays > 0
                ? "text-orange-500 fill-orange-500 scale-110"
                : "text-muted-foreground"
            )}
          />
          <span>
            {streakDays > 0
              ? isStreakAtRisk
                ? `x${streakDays} streak at risk!`
                : `x${streakDays} day streak!`
              : "Start streak! 🔥"}
          </span>
        </div>

        {/* Action Buttons: Notifications, Community, Settings */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card border border-border/70 text-muted-foreground hover:bg-secondary active:scale-95 transition-all shadow-2xs"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowCommunityModal(true)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card border border-border/70 text-muted-foreground hover:bg-secondary active:scale-95 transition-all shadow-2xs"
            aria-label="Community"
          >
            <Users className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card border border-border/70 text-muted-foreground hover:bg-secondary active:scale-95 transition-all shadow-2xs"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Date & Personalized Greeting */}
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {liveDateHeader}
        </p>
        <h1 className="text-2xl font-black tracking-tight text-foreground mt-0.5">
          {greeting}, <span className="text-foreground">{displayName}!</span>
        </h1>
      </div>

      {/* 3. Mascot Card: Data-Driven Pawi Speech Bubble */}
      <div
        data-tutorial-id="pawi-mascot-banner"
        onClick={handleNextMessage}
        className="relative rounded-3xl bg-gradient-to-r from-[#3D784E] to-[#2E683E] py-2 px-3 text-white shadow-md mt-1 cursor-pointer transition-transform active:scale-[0.99] select-none"
        title="Tap for next tip from Pawi!"
      >
        <div className="flex items-center gap-2.5">
          {/* Mascot Graphic */}
          <div className="relative -mt-6 -mb-4 -ml-1 h-20 w-20 shrink-0 z-10 pointer-events-none">
            <Image
              src="/pawi-v2-hi.png"
              alt="Pawi Mascot"
              fill
              priority
              className="object-contain drop-shadow-lg scale-135 origin-bottom"
            />
          </div>

          {/* Speech Bubble with Tail */}
          <div className="relative z-0 flex-1 rounded-2xl bg-white px-3 py-2 text-foreground shadow-xs">
            <div className="absolute -left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-white" />

            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black text-[#2E683E] leading-tight">Pawi</p>
              <span className="text-[9px] font-bold text-muted-foreground/70">Tap for tip 💡</span>
            </div>
            <p className="text-[11px] font-semibold leading-tight text-neutral-800 mt-0.5">
              {currentPawiMessage}
            </p>
          </div>
        </div>
      </div>

      {/* 4. NEW — "THIS WEEK AT A GLANCE" HERO SECTION */}
      <div className="relative overflow-hidden rounded-[2rem] border border-[#3D784E]/30 bg-gradient-to-br from-[#3D784E]/12 via-[#3D784E]/5 to-card p-5 shadow-sm space-y-4">
        {/* Top Tag & Net Position */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-[#3D784E]/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#3D784E]">
                This Week At a Glance
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">Rolling 7 Days</span>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-bold text-muted-foreground">Weekly Net Cashflow</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span
                  className={cn(
                    "text-2xl sm:text-3xl font-black tabular-nums tracking-tight",
                    heroMetrics.weeklyNet > 0
                      ? "text-[#3D784E]"
                      : heroMetrics.weeklyNet < 0
                      ? "text-rose-500"
                      : "text-foreground"
                  )}
                >
                  {heroMetrics.weeklyNet > 0 ? "+" : ""}
                  {formatMoney(heroMetrics.weeklyNet)}
                </span>
                {heroMetrics.weeklyNet !== 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center text-[10px] font-black rounded-md px-1.5 py-0.5",
                      heroMetrics.isPositive
                        ? "bg-[#3D784E]/15 text-[#3D784E]"
                        : "bg-rose-500/15 text-rose-500"
                    )}
                  >
                    {heroMetrics.isPositive ? (
                      <ArrowUpRight className="h-3 w-3 mr-0.5 stroke-[3]" />
                    ) : (
                      <ArrowDownLeft className="h-3 w-3 mr-0.5 stroke-[3]" />
                    )}
                    {heroMetrics.isPositive ? "Surplus" : "Deficit"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Income & Expense Breakdown Pills */}
          <div className="flex flex-col gap-1.5 text-right shrink-0">
            <div className="flex items-center justify-end gap-1 text-[11px] font-black text-[#3D784E] bg-[#3D784E]/10 px-2.5 py-1 rounded-xl border border-[#3D784E]/20">
              <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="tabular-nums">{formatMoney(heroMetrics.weeklyIncome)}</span>
            </div>
            <div className="flex items-center justify-end gap-1 text-[11px] font-black text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20">
              <ArrowDownLeft className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="tabular-nums">{formatMoney(heroMetrics.weeklyExpense)}</span>
            </div>
          </div>
        </div>

        {/* 7-Day Sparkline Bar Chart */}
        <div className="rounded-2xl bg-card/80 border border-border/60 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">
            <span>Daily Spending Distribution</span>
            <span className="text-[#3D784E]">Live Pulse</span>
          </div>

          <div className="flex h-20 items-end justify-between gap-1.5 px-1 pt-2">
            {heroMetrics.days.map((bar, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1 group">
                <div className="h-14 w-full flex items-end justify-center">
                  <div
                    className={cn(
                      "w-3 rounded-full transition-all duration-300",
                      bar.isToday
                        ? "bg-[#3D784E] shadow-xs scale-y-105"
                        : bar.expense > 0
                        ? "bg-[#3D784E]/40 group-hover:bg-[#3D784E]/70"
                        : "bg-secondary"
                    )}
                    style={{ height: `${bar.height}%` }}
                    title={`${bar.dateStr}: ${formatMoney(bar.expense)}`}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "text-[9px] font-black leading-none",
                      bar.isToday ? "text-[#3D784E] font-black" : "text-muted-foreground"
                    )}
                  >
                    {bar.day}
                  </span>
                  {bar.isToday && <span className="mt-0.5 h-1 w-1 rounded-full bg-[#3D784E]" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Standout Callout Line */}
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#3D784E]/10 border border-[#3D784E]/25 p-3 text-foreground">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#3D784E] text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-foreground truncate">{heroMetrics.callout}</p>
            {heroMetrics.calloutSubtext && (
              <p className="text-[10px] text-muted-foreground font-semibold truncate">
                {heroMetrics.calloutSubtext}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 5. NEW — GOAL & BUDGET SPOTLIGHT (PRIMARY HOOK CARD) */}
      <div className="rounded-[2rem] border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
        {/* Header with Carousel Controls if Multiple Items */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3D784E]/15 text-[#3D784E]">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
                Spotlight & Targets
              </h2>
              <p className="text-[10px] text-muted-foreground font-semibold">
                {spotlightData.hasData
                  ? "Real stakes and progress at a glance"
                  : "Your savings milestones start here"}
              </p>
            </div>
          </div>

          {spotlightData.items.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setSpotlightIndex(
                    (prev) => (prev - 1 + spotlightData.items.length) % spotlightData.items.length
                  )
                }
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Previous Spotlight Item"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] font-black text-muted-foreground px-1">
                {(spotlightIndex % spotlightData.items.length) + 1}/{spotlightData.items.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSpotlightIndex((prev) => (prev + 1) % spotlightData.items.length)
                }
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Next Spotlight Item"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Spotlight Content: Active Goal/Budget vs Empty Day-1 State */}
        {spotlightData.hasData && activeSpotlightItem ? (
          <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg shadow-2xs"
                  style={{ backgroundColor: `${activeSpotlightItem.accent}20` }}
                >
                  {activeSpotlightItem.icon || "🎯"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-black text-foreground truncate">
                      {activeSpotlightItem.title}
                    </p>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[9px] font-black shrink-0",
                        activeSpotlightItem.statusType === "success"
                          ? "bg-[#3D784E]/15 text-[#3D784E]"
                          : activeSpotlightItem.statusType === "warning"
                          ? "bg-amber-500/15 text-amber-600"
                          : activeSpotlightItem.statusType === "caution"
                          ? "bg-rose-500/15 text-rose-500"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {activeSpotlightItem.statusLabel}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground truncate mt-0.5">
                    {activeSpotlightItem.subtitle}
                  </p>
                </div>
              </div>

              {/* Progress Percentage Badge */}
              <div className="text-right shrink-0">
                <span className="text-base font-black text-foreground tabular-nums">
                  {activeSpotlightItem.percent}%
                </span>
              </div>
            </div>

            {/* Visual Animated Progress Bar */}
            <div className="space-y-1">
              <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, activeSpotlightItem.percent)}%`,
                    backgroundColor: activeSpotlightItem.accent,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                <span>{formatMoney(activeSpotlightItem.current)}</span>
                <span>{formatMoney(activeSpotlightItem.target)}</span>
              </div>
            </div>

            {/* Quick Action Button */}
            <button
              type="button"
              onClick={() => handleSpotlightAction(activeSpotlightItem)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#3D784E] py-2 text-xs font-black text-white hover:bg-[#356B46] active:scale-[0.98] transition-all shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{activeSpotlightItem.ctaLabel}</span>
            </button>
          </div>
        ) : (
          /* Honest Day-1 Invitation Callout */
          <div className="rounded-2xl border border-dashed border-[#3D784E]/40 bg-[#3D784E]/5 p-4 text-center space-y-2.5">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black text-foreground">Save for something special</p>
              <p className="text-[11px] text-muted-foreground font-medium max-w-xs mx-auto mt-0.5">
                Set an emergency fund, tuition, or dream purchase to watch your money grow slow and
                steady.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddGoalModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#3D784E] px-4 py-2 text-xs font-black text-white hover:bg-[#356B46] active:scale-95 transition-all shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Your First Goal</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. WEEKLY ALLOWANCE / PAYDAY PACING TOOL */}
      {pacingMetrics.type === "allowance" ? (
        <div
          onClick={onOpenSettings}
          className="flex flex-col gap-2.5 rounded-[2rem] border border-[#3D784E]/25 bg-gradient-to-r from-[#3D784E]/10 via-[#3D784E]/5 to-transparent p-4 shadow-xs cursor-pointer hover:border-[#3D784E]/40 active:scale-[0.99] transition-all select-none"
          title="Tap to manage allowance in Settings"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#3D784E]">
                  {pacingMetrics.title}
                </p>
                <p className="text-sm font-black text-foreground mt-0.5">
                  {formatMoney(pacingMetrics.totalBudget)} / week
                </p>
              </div>
            </div>

            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-black",
                pacingMetrics.statusTone === "healthy"
                  ? "bg-[#3D784E]/15 text-[#3D784E]"
                  : pacingMetrics.statusTone === "warning"
                  ? "bg-amber-500/15 text-amber-600"
                  : "bg-rose-500/15 text-rose-500"
              )}
            >
              {pacingMetrics.statusText}
            </span>
          </div>

          {/* Dual Pacing Gauge Bar */}
          <div className="space-y-1">
            <div className="relative h-2 w-full rounded-full bg-secondary overflow-hidden">
              {/* Spent Fill */}
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  pacingMetrics.percentSpent > pacingMetrics.percentTimeElapsed + 15
                    ? "bg-amber-500"
                    : "bg-[#3D784E]"
                )}
                style={{ width: `${Math.min(100, pacingMetrics.percentSpent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
              <span>{formatMoney(pacingMetrics.spent)} spent</span>
              {pacingMetrics.dailySpendable !== undefined && (
                <span className="text-[#3D784E]">
                  ~{formatMoney(pacingMetrics.dailySpendable)}/day safe pace
                </span>
              )}
              <span>{formatMoney(pacingMetrics.remaining)} left</span>
            </div>
          </div>
        </div>
      ) : pacingMetrics.type === "payday" ? (
        <div
          onClick={() => setShowPaydayModal(true)}
          className="flex items-center justify-between rounded-[2rem] border border-[#3D784E]/25 bg-gradient-to-r from-[#3D784E]/10 via-[#3D784E]/5 to-transparent p-4 shadow-xs cursor-pointer hover:border-[#3D784E]/40 active:scale-[0.99] transition-all select-none"
          title="Tap to edit payday schedule"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#3D784E]">
                DAYS UNTIL PAYDAY
              </p>
              <p className="text-base font-black text-foreground mt-0.5">
                {pacingMetrics.daysRemaining === 0
                  ? "Payday today! 🎉"
                  : `${pacingMetrics.daysRemaining ?? 0} ${(pacingMetrics.daysRemaining ?? 0) === 1 ? "day" : "days"}`}
              </p>
            </div>
          </div>

          <div className="text-right">
            {(pacingMetrics.totalBudget || 0) > 0 && (
              <p className="text-sm font-black text-foreground tabular-nums">
                {formatMoney(pacingMetrics.totalBudget)}
              </p>
            )}
            <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
              {pacingMetrics.formattedTargetDate || "Next Payout"}
            </p>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setShowPaydayModal(true)}
          className="flex items-center justify-between rounded-[2rem] border border-dashed border-[#3D784E]/40 bg-[#3D784E]/5 p-4 shadow-xs cursor-pointer hover:bg-[#3D784E]/10 active:scale-[0.99] transition-all select-none"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#3D784E]">
                PAYDAY COUNTDOWN
              </p>
              <p className="text-xs font-bold text-foreground mt-0.5">Set your salary schedule</p>
              <p className="text-[10px] text-muted-foreground">
                Track days left & safe daily budget pacing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowPaydayModal(true)
            }}
            className="rounded-full bg-[#3D784E] px-3.5 py-1.5 text-[11px] font-black text-white shadow-xs hover:bg-[#356B46] active:scale-95 transition-all"
          >
            Configure
          </button>
        </div>
      )}

      {/* 7. NEW — DATA-DRIVEN QUICK INSIGHT CARD */}
      <div className="rounded-[2rem] border border-border/80 bg-card p-4 shadow-xs flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl shadow-2xs mt-0.5"
          style={{
            backgroundColor: `${quickInsight.accentColor}15`,
            color: quickInsight.accentColor,
          }}
        >
          {quickInsight.iconName === "sparkles" ? (
            <Sparkles className="h-4 w-4" />
          ) : quickInsight.iconName === "trending-up" ? (
            <TrendingUp className="h-4 w-4" />
          ) : quickInsight.iconName === "alert-triangle" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : quickInsight.iconName === "calendar" ? (
            <Calendar className="h-4 w-4" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[9px] font-black uppercase tracking-wider"
              style={{ color: quickInsight.accentColor }}
            >
              {quickInsight.tag}
            </span>
          </div>
          <p className="text-xs font-black text-foreground mt-0.5">{quickInsight.title}</p>
          <p className="text-[11px] text-muted-foreground font-medium leading-relaxed mt-0.5">
            {quickInsight.body}
          </p>
        </div>
      </div>

      {/* 8. UPCOMING BILLS & RECURRING MOVES */}
      <div className="rounded-[2rem] border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
                Upcoming Moves
              </h2>
              <p className="text-[10px] text-muted-foreground font-semibold">
                Planned bills and recurring schedules
              </p>
            </div>
          </div>

          {onNavigateToPlan && (
            <button
              type="button"
              onClick={onNavigateToPlan}
              className="text-xs font-bold text-[#3D784E] hover:underline"
            >
              Plan Tab →
            </button>
          )}
        </div>

        {plannedPayments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-4 text-center">
            <p className="text-xs font-bold text-foreground">No upcoming bills scheduled</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Add subscriptions, bills, or installments under the Plan tab to track them here.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {plannedPayments.slice(0, 4).map((item) => {
              const itemLogo =
                getBrandLogo(item.label) ||
                getBrandLogo(item.category) ||
                (item.icon && item.icon.startsWith("/") ? item.icon : undefined)

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-border/40 last:border-none"
                >
                  <div className="flex items-center gap-2.5">
                    {itemLogo ? (
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card border border-border/60 p-1 shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={itemLogo}
                          alt={item.label}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-base">
                        {item.icon || "📅"}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-foreground">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {item.dueDate}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-foreground tabular-nums">
                    {formatMoney(item.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Payday Setup Modal */}
      <PaydaySetupModal open={showPaydayModal} onClose={() => setShowPaydayModal(false)} />

      {/* Add Goal Modal */}
      <AddGoalModal open={showAddGoalModal} onClose={() => setShowAddGoalModal(false)} />

      {/* Quick Deposit to Goal Modal */}
      {depositGoalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-2xl text-foreground animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Deposit to Goal</h3>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    {depositGoalTarget.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDepositGoalTarget(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-secondary/50 p-3 flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-bold">Goal Target:</span>
              <span className="font-black text-foreground">
                {formatMoney(depositGoalTarget.saved)} / {formatMoney(depositGoalTarget.target)}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Deposit Amount (₱)
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-base font-black text-foreground focus:border-[#3D784E] focus:outline-none"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Deduct from Wallet
              </label>
              <select
                value={depositSourceWallet}
                onChange={(e) => setDepositSourceWallet(e.target.value)}
                className="w-full rounded-2xl border border-border/80 bg-background px-3 py-2.5 text-xs font-bold text-foreground focus:border-[#3D784E] focus:outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name} ({formatMoney(w.balance, w.currency)})
                  </option>
                ))}
              </select>
            </div>

            {depositError && (
              <p className="text-xs font-bold text-rose-500 bg-rose-500/10 p-2.5 rounded-xl">
                {depositError}
              </p>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDepositGoalTarget(null)}
                className="flex-1 rounded-2xl border border-border/80 bg-secondary/50 py-3 text-xs font-bold text-foreground hover:bg-secondary active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeposit}
                className="flex-1 rounded-2xl bg-[#3D784E] py-3 text-xs font-black text-white shadow-md shadow-[#3D784E]/25 hover:bg-[#356B46] active:scale-95 transition-all"
              >
                Confirm Deposit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Financial Community & Circles Modal */}
      {showCommunityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-2xl text-foreground animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Pawi Community</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    Shared financial circles & paluwagan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCommunityModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 mb-5">
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/40 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#3D784E]/20 text-[#3D784E] font-black text-xs">
                  🏆
                </div>
                <div>
                  <p className="text-xs font-black text-foreground">Tipid Challenge #4</p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    1,420 members tracking ₱0 spend days
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/40 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 font-black text-xs">
                  🤝
                </div>
                <div>
                  <p className="text-xs font-black text-foreground">Family & Partner Budget</p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Sync shared household expenses securely
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCommunityModal(false)}
              className="w-full rounded-2xl bg-[#3D784E] py-3 text-xs font-black text-white shadow-md shadow-[#3D784E]/25 hover:bg-[#356B46]"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
