"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import {
  Flame,
  Bell,
  Users,
  Settings,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Wallet,
  Flag,
  ChevronRight,
  CreditCard,
  Clock,
  Banknote,
  Plus,
  Utensils,
  Store,
  Gamepad2,
  Coffee,
  ShoppingBag,
  Briefcase,
  ShoppingCart,
  Wallet as WalletIcon,
  MoreHorizontal,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useProfile } from "@/lib/use-profile"
import { useStore } from "@/lib/store"
import { formatMoney, getBrandLogo, getTransactionMerchantLogo } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"
import { PaydaySetupModal } from "../payday-setup-modal"
import {
  computeStatementDueCards,
  computeTopGoals,
  computeDebtSummary,
  computeReceivableSummary,
} from "@/lib/home-sections-engine"

interface HomeScreenProps {
  onOpenSettings: () => void
  onOpenNotifications: () => void
  onNavigateToPlan?: () => void
  onNavigateToGoals?: () => void
  onNavigateToDebt?: () => void
  onNavigateToReceivables?: () => void
  onNavigateToWallets?: (walletId?: string) => void
}

// Category icon map — same as HistoryScreen, kept consistent
const CATEGORY_ICON_MAP: Record<string, { icon: any; bg: string; text: string }> = {
  Food: { icon: Utensils, bg: "bg-orange-500/10", text: "text-orange-600" },
  "Dining Out": { icon: Utensils, bg: "bg-orange-500/10", text: "text-orange-600" },
  "Food & Dining": { icon: Utensils, bg: "bg-orange-500/10", text: "text-orange-600" },
  "Online Selling": { icon: Store, bg: "bg-amber-500/10", text: "text-amber-600" },
  "Side Hustle": { icon: Store, bg: "bg-amber-500/10", text: "text-amber-600" },
  Entertainment: { icon: Gamepad2, bg: "bg-emerald-500/10", text: "text-emerald-600" },
  Fun: { icon: Gamepad2, bg: "bg-emerald-500/10", text: "text-emerald-600" },
  Coffee: { icon: Coffee, bg: "bg-amber-500/10", text: "text-amber-600" },
  Shopping: { icon: ShoppingBag, bg: "bg-pink-500/10", text: "text-pink-600" },
  Salary: { icon: Briefcase, bg: "bg-blue-500/10", text: "text-blue-600" },
  Freelance: { icon: Briefcase, bg: "bg-blue-500/10", text: "text-blue-600" },
  Groceries: { icon: ShoppingCart, bg: "bg-emerald-500/10", text: "text-emerald-600" },
  Allowance: { icon: WalletIcon, bg: "bg-purple-500/10", text: "text-purple-600" },
}

export function HomeScreen({
  onOpenSettings,
  onOpenNotifications,
  onNavigateToPlan,
  onNavigateToGoals,
  onNavigateToDebt,
  onNavigateToReceivables,
  onNavigateToWallets,
}: HomeScreenProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const {
    streakDays,
    paydayCountdown,
    transactions = [],
    goals = [],
    debts = [],
    receivables = [],
    plannedPayments = [],
    wallets = [],
  } = useStore()

  const [timeFilter, setTimeFilter] = useState<"day" | "week" | "month">("day")
  const [showCommunityModal, setShowCommunityModal] = useState(false)
  const [showPaydayModal, setShowPaydayModal] = useState(false)
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  // Live clock refresh every 30s
  useEffect(() => {
    setCurrentDate(new Date())
    const interval = setInterval(() => setCurrentDate(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  // ── Name resolution ────────────────────────────────────────────────────────
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
    .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ")

  // ── Time & Greeting ────────────────────────────────────────────────────────
  const hour = currentDate.getHours()
  const greeting = hour >= 18 || hour < 5 ? "Good evening" : hour >= 12 ? "Good afternoon" : "Good morning"

  const liveDateHeader = currentDate
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" })
    .toUpperCase()

  // ── Today / Week / Month flow totals (for Today Flow card) ────────────────
  const todayStr = currentDate.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
  const weekStart = new Date(currentDate)
  weekStart.setDate(currentDate.getDate() - 6)
  const weekStartStr = weekStart.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
  const monthPrefix = todayStr.substring(0, 7)

  const filteredByTime = useMemo(() => {
    return transactions.filter((t) => {
      const txIso = t.date ? (t.date.includes("T") ? t.date.split("T")[0] : t.date) : ""
      const isToday = t.dateHeader?.toLowerCase().includes("today") || txIso.startsWith(todayStr)
      const isThisWeek =
        t.dateHeader?.toLowerCase().includes("today") ||
        t.dateHeader?.toLowerCase().includes("yesterday") ||
        txIso >= weekStartStr
      const isThisMonth = txIso.startsWith(monthPrefix)

      if (timeFilter === "day") return isToday
      if (timeFilter === "week") return isThisWeek
      return isThisMonth
    })
  }, [transactions, timeFilter, todayStr, weekStartStr, monthPrefix])

  const displayIncome = useMemo(
    () => filteredByTime.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount || 0), 0),
    [filteredByTime]
  )
  const displayExpense = useMemo(
    () => filteredByTime.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount || 0), 0),
    [filteredByTime]
  )
  const isOverspending = displayExpense > displayIncome

  // ── Last 7 Days Bars ──────────────────────────────────────────────────────
  const last7DaysBars = useMemo(() => {
    const dayLetters = ["S", "M", "T", "W", "T", "F", "S"]
    const now = new Date()
    const rawBars = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date()
      d.setDate(now.getDate() - (6 - idx))
      const dateStr = d.toISOString().split("T")[0]
      const amount = transactions
        .filter((t) => t.kind === "expense" && t.date && t.date.startsWith(dateStr))
        .reduce((s, t) => s + Number(t.amount || 0), 0)
      return { day: dayLetters[d.getDay()], isToday: idx === 6, amount }
    })

    const maxSpend = Math.max(...rawBars.map((r) => r.amount), 0)

    return rawBars.map((bar) => ({
      ...bar,
      height: maxSpend > 0 ? Math.max(15, Math.min(100, Math.round((bar.amount / maxSpend) * 100))) : 8,
    }))
  }, [transactions])

  // ── Mascot Dialogue ───────────────────────────────────────────────────────
  const pawiDialogueList = useMemo(() => {
    const list: string[] = []
    if (isOverspending) {
      list.push(
        "Medyo mataas ang gastos natin today, idol! Essentials muna bago mag-add to cart.",
        "Nasa red zone tayo ngayon. Konting hinay-hinay muna sa cravings hanggang next sahod!",
        "Double-check natin ang mga binili today, baka may unnecessary expenses na pwedeng iwasan."
      )
    } else {
      list.push(
        "Nasa green zone ka ngayon! Proud ako sa'yo, kontrolado mo ang finances mo.",
        "Ganda ng cashflow natin today! Tuloy-tuloy lang para lumaki pa ang emergency fund mo.",
        "Basta may natitira sa budget, panalo ka! Good job sa disiplina sa paggastos."
      )
    }
    if (paydayCountdown?.configured) {
      const days = paydayCountdown.daysRemaining ?? 0
      if (days <= 3 && days > 0) {
        list.push(`Konting tiis na lang, ${days} araw na lang sahod na! Ready na ba ang budget allocation mo?`)
      } else if (days === 0) {
        list.push("Payday na today! 🎉 Tabi agad ang 20% para sa savings bago gastusin ang iba.")
      } else {
        list.push(`${days} days pa bago mag-sahod. Tipid tip: Magbaon ng lunch at iwas sa impulsive milk tea!`)
      }
    } else {
      list.push("I-set ang iyong payday schedule para ma-track natin ang countdown at tamang pacing ng budget.")
    }
    if (hour >= 5 && hour < 12) {
      list.push("Magandang umaga! Simulan ang araw nang may plano sa budget para iwas-overspend.")
    } else if (hour >= 12 && hour < 18) {
      list.push("Kumain ka na ba ng lunch? I-log agad ang resibo gamit ang AI scanner natin!")
    } else {
      list.push("Magandang gabi! Balikan ang mga nagastos today at i-review ang wallet balance bago matulog.")
    }
    list.push(
      "Tandaan: Hindi sukatan ng yaman ang dami ng gastos, kundi ang naiipon mo!",
      "Bawat pisong naise-save mo ngayon, peace of mind at kalayaan mo 'yan bukas.",
      "Smart move ang pag-track araw-araw. Mas madaling maabot ang mga goals kapag may plano!"
    )
    return list
  }, [isOverspending, paydayCountdown, hour])

  const [dialogueIndex, setDialogueIndex] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setDialogueIndex((prev) => (prev + 1) % pawiDialogueList.length)
    }, 300000)
    return () => clearInterval(interval)
  }, [pawiDialogueList.length])

  const currentPawiMessage = pawiDialogueList[dialogueIndex % pawiDialogueList.length] || pawiDialogueList[0]
  const handleNextMessage = () => setDialogueIndex((prev) => (prev + 1) % pawiDialogueList.length)

  // ── Upcoming: sorted, income vs. expense subgroups ────────────────────────
  const upcomingIncome = useMemo(
    () => plannedPayments.filter((p: any) => p.kind === "income" || p.frequency === "income"),
    [plannedPayments]
  )
  const upcomingExpenses = useMemo(
    () => plannedPayments.filter((p: any) => p.kind !== "income" && p.frequency !== "income"),
    [plannedPayments]
  )

  // Due-soon badge: items due within next 5 days
  const isDueSoon = (dueDate: string): boolean => {
    const parsed = new Date(dueDate)
    if (isNaN(parsed.getTime())) return false
    const diffDays = Math.ceil((parsed.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 5
  }
  const getDaysLeft = (dueDate: string): number | null => {
    const parsed = new Date(dueDate)
    if (isNaN(parsed.getTime())) return null
    return Math.ceil((parsed.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  // ── New sections data (derived from engine — pure computations) ───────────
  const statementCards = useMemo(() => computeStatementDueCards(wallets, currentDate), [wallets, currentDate])
  const topGoals = useMemo(() => computeTopGoals(goals), [goals])
  const debtSummary = useMemo(() => computeDebtSummary(debts, currentDate), [debts, currentDate])
  const receivableSummary = useMemo(() => computeReceivableSummary(receivables, currentDate), [receivables, currentDate])

  // ── Date-grouped recent transactions (Today + Yesterday) ─────────────────
  const groupedTransactions = useMemo(() => {
    const now = new Date()
    const todayDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
    const yestDate = new Date(now.getTime() - 86400000)
    const yestDateStr = yestDate.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })

    const groups: Record<string, { header: string; items: typeof transactions }> = {}

    transactions.forEach((tx) => {
      const txIso = tx.date ? (tx.date.includes("T") ? tx.date.split("T")[0] : tx.date) : ""
      const isToday = tx.dateHeader?.toLowerCase().includes("today") || txIso.startsWith(todayDateStr)
      const isYesterday = tx.dateHeader?.toLowerCase().includes("yesterday") || txIso.startsWith(yestDateStr)

      let header: string
      if (isToday) header = "Today"
      else if (isYesterday) header = "Yesterday"
      else {
        // Format date for older transactions
        const parsed = txIso ? new Date(txIso + "T00:00:00") : null
        header = parsed && !isNaN(parsed.getTime())
          ? parsed.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
          : tx.dateHeader || "Earlier"
      }

      if (!groups[header]) groups[header] = { header, items: [] }
      groups[header].items.push(tx)
    })

    // Return in order: Today, Yesterday, then rest
    const priority = ["Today", "Yesterday"]
    const sorted = Object.values(groups).sort((a, b) => {
      const ai = priority.indexOf(a.header)
      const bi = priority.indexOf(b.header)
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return 0
    })
    return sorted
  }, [transactions])

  return (
    <div className="flex flex-col gap-3.5 px-4 pt-2 pb-28 min-h-screen bg-background text-foreground">

      {/* ─── 1. HEADER ROW ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between py-1">
        <div
          data-tutorial-id="pawi-streak-pill"
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-900 dark:text-amber-300 shadow-2xs"
        >
          <Flame className={cn("h-4 w-4", streakDays > 0 ? "text-orange-500 fill-orange-500" : "text-amber-400")} />
          <span>{streakDays > 0 ? `x${streakDays} day streak!` : "Start streak! 🔥"}</span>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onOpenNotifications}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card border border-border/70 text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setShowCommunityModal(true)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card border border-border/70 text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Community">
            <Users className="h-4 w-4" />
          </button>
          <button type="button" onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card border border-border/70 text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Settings">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── 2. GREETING + MASCOT TIP ──────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{liveDateHeader}</p>
        <h1 className="text-2xl font-black tracking-tight text-foreground mt-0.5">
          {greeting}, <span className="text-foreground">{displayName}!</span>
        </h1>
      </div>

      <div
        data-tutorial-id="pawi-mascot-banner"
        onClick={handleNextMessage}
        className="relative rounded-3xl bg-[#3D784E] py-2 px-3 text-white shadow-md mt-1 cursor-pointer transition-transform active:scale-[0.99] select-none"
        title="Tap for next tip from Pawi!"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative -mt-6 -mb-4 -ml-1 h-20 w-20 shrink-0 z-10 pointer-events-none">
            <Image src="/pawi-v2-hi.png" alt="Pawi Mascot" fill priority className="object-contain drop-shadow-lg scale-135 origin-bottom" />
          </div>
          <div className="relative z-0 flex-1 rounded-2xl bg-white px-3 py-2 text-foreground shadow-xs">
            <div className="absolute -left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-white" />
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black text-[#2E683E] leading-tight">Pawi</p>
              <span className="text-[9px] font-bold text-muted-foreground/60">Tap for tip 💡</span>
            </div>
            <p className="text-[11px] font-semibold leading-tight text-neutral-800 mt-0.5">{currentPawiMessage}</p>
          </div>
        </div>
      </div>

      {/* ─── 3. LAST 7 DAYS + TODAY FLOW ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Last 7 Days */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">LAST 7 DAYS</p>
          <div className="my-2 flex h-24 items-end justify-between gap-1 px-1">
            {last7DaysBars.map((bar, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <div className="h-16 w-full flex items-end justify-center">
                  <div
                    className={cn("w-2.5 rounded-full transition-all duration-300",
                      bar.isToday ? "bg-[#3D784E] shadow-2xs scale-y-105" : "bg-[#3D784E]/30 hover:bg-[#3D784E]/60")}
                    style={{ height: `${bar.height}%` }}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className={cn("text-[9px] font-black leading-none",
                    bar.isToday ? "text-foreground font-extrabold" : "text-muted-foreground")}>
                    {bar.day}
                  </span>
                  {bar.isToday && <span className="mt-0.5 h-1 w-1 rounded-full bg-[#3D784E]" />}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground/80">
            <span>Past 7 Days</span>
            <span className="text-[#3D784E]">Track Active</span>
          </div>
        </div>

        {/* Today Flow */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-4 shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-foreground">
                {timeFilter === "day" ? "Today" : timeFilter === "week" ? "This Week" : "This Month"}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground/70">Flow</span>
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <ArrowUpRight className="h-4 w-4 text-[#3D784E] stroke-[2.5] shrink-0" />
                <span className="text-sm font-black text-foreground tabular-nums">{formatMoney(displayIncome)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowDownLeft className="h-4 w-4 text-rose-500 stroke-[2.5] shrink-0" />
                <span className="text-sm font-black text-foreground tabular-nums">{formatMoney(displayExpense)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center rounded-xl bg-secondary/80 p-0.5 mt-2">
            {(["day", "week", "month"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setTimeFilter(f)}
                className={cn("flex-1 rounded-lg py-1 text-[10px] font-black transition-all",
                  timeFilter === f ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground hover:text-foreground")}>
                {f === "day" ? "Day" : f === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 4. ALLOWANCE / PAYDAY BANNER ──────────────────────────────────── */}
      {(profile?.profile_type === "student" || profile?.profile_type === "working_student" || (profile?.weekly_allowance || 0) > 0) ? (
        <div onClick={onOpenSettings}
          className="flex items-center justify-between rounded-3xl border border-[#3D784E]/20 bg-gradient-to-r from-[#3D784E]/10 via-[#3D784E]/5 to-transparent p-4 shadow-xs cursor-pointer hover:border-[#3D784E]/40 active:scale-[0.99] transition-all"
          title="Tap to manage allowance in Settings">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#3D784E]">WEEKLY ALLOWANCE PACING</p>
              <p className="text-base font-black text-foreground mt-0.5">
                {(profile?.weekly_allowance || 0) > 0
                  ? `${formatMoney(profile?.weekly_allowance || 0)} / week`
                  : "Allowance Tracking Active"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-[#3D784E]/15 px-2.5 py-1 text-[10px] font-black text-[#3D784E]">Active</span>
            <p className="text-[11px] font-semibold text-muted-foreground mt-1">Baon Tracker 🐢</p>
          </div>
        </div>
      ) : paydayCountdown?.configured ? (
        <div onClick={() => setShowPaydayModal(true)}
          className="flex items-center justify-between rounded-3xl border border-[#3D784E]/20 bg-gradient-to-r from-[#3D784E]/10 via-[#3D784E]/5 to-transparent p-4 shadow-xs cursor-pointer hover:border-[#3D784E]/40 active:scale-[0.99] transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#3D784E]">DAYS UNTIL PAYDAY</p>
              <p className="text-base font-black text-foreground mt-0.5">
                {paydayCountdown.daysRemaining === 0
                  ? "Payday today! 🎉"
                  : `${paydayCountdown.daysRemaining ?? 0} ${(paydayCountdown.daysRemaining ?? 0) === 1 ? "day" : "days"}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            {(paydayCountdown.amount || 0) > 0 && (
              <p className="text-sm font-black text-foreground tabular-nums">{formatMoney(paydayCountdown.amount || 0)}</p>
            )}
            <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">{paydayCountdown.formattedDate || ""}</p>
          </div>
        </div>
      ) : (
        <div onClick={() => setShowPaydayModal(true)}
          className="flex items-center justify-between rounded-3xl border border-dashed border-[#3D784E]/40 bg-[#3D784E]/5 p-4 shadow-xs cursor-pointer hover:bg-[#3D784E]/10 active:scale-[0.99] transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#3D784E]">PAYDAY COUNTDOWN</p>
              <p className="text-xs font-bold text-foreground mt-0.5">Set your payday schedule</p>
              <p className="text-[10px] text-muted-foreground">Track days left & salary budget pacing</p>
            </div>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); setShowPaydayModal(true) }}
            className="rounded-full bg-[#3D784E] px-3.5 py-1.5 text-[11px] font-black text-white shadow-xs hover:bg-[#356B46] active:scale-95 transition-all">
            Configure
          </button>
        </div>
      )}

      {/* ─── 5. UPCOMING ───────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground">Upcoming</h2>
            <p className="text-[11px] text-muted-foreground font-medium">Planned and recurring money moves</p>
          </div>
        </div>

        {plannedPayments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-5 text-center">
            <p className="text-xs font-bold text-foreground">No upcoming bills scheduled</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Add subscriptions, bills, or installments under the Plan tab to track them here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* INCOME sub-group */}
            {upcomingIncome.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#3D784E] mb-1.5">INCOME</p>
                <div className="space-y-0">
                  {upcomingIncome.map((item) => {
                    const logo = getBrandLogo(item.label) || getBrandLogo(item.category) || (item.icon?.startsWith("/") ? item.icon : undefined)
                    const dueSoon = isDueSoon(item.dueDate)
                    const daysLeft = getDaysLeft(item.dueDate)
                    return (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-none">
                        <div className="flex items-center gap-3">
                          {logo
                            ? <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card border border-border/60 p-1 shadow-2xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={logo} alt={item.label} className="h-full w-full object-contain" />
                              </div>
                            : <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-base">{item.icon || "📅"}</div>
                          }
                          <div>
                            <p className="text-xs font-bold text-foreground">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">{item.dueDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {dueSoon && daysLeft !== null && (
                            <span className="rounded-full bg-[#3D784E]/15 px-2 py-0.5 text-[9px] font-black text-[#3D784E] uppercase tracking-wide">
                              {daysLeft === 0 ? "TODAY" : `${daysLeft} DAYS LEFT`}
                            </span>
                          )}
                          <span className="text-xs font-black text-foreground tabular-nums">{formatMoney(item.amount)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* EXPENSES sub-group */}
            {upcomingExpenses.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-500 mb-1.5">EXPENSES</p>
                <div className="space-y-0">
                  {upcomingExpenses.map((item) => {
                    const logo = getBrandLogo(item.label) || getBrandLogo(item.category) || (item.icon?.startsWith("/") ? item.icon : undefined)
                    const dueSoon = isDueSoon(item.dueDate)
                    const daysLeft = getDaysLeft(item.dueDate)
                    return (
                      <div key={item.id}
                        className={cn("flex items-center justify-between py-2.5 px-3 rounded-2xl mb-1 last:mb-0",
                          dueSoon ? "bg-rose-500/5 border border-rose-500/15" : "border border-transparent")}>
                        <div className="flex items-center gap-3">
                          {logo
                            ? <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card border border-border/60 p-1 shadow-2xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={logo} alt={item.label} className="h-full w-full object-contain" />
                              </div>
                            : <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-base">{item.icon || "📅"}</div>
                          }
                          <div>
                            <p className="text-xs font-bold text-foreground">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">{item.dueDate}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          {dueSoon && daysLeft !== null && (
                            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] font-black text-rose-600 uppercase tracking-wide">
                              {daysLeft === 0 ? "TODAY" : `${daysLeft} DAYS LEFT`}
                            </span>
                          )}
                          <span className="text-xs font-black text-foreground tabular-nums">{formatMoney(item.amount)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 6. STATEMENT DUE (conditional — only when real credit balance exists) */}
      {statementCards.length > 0 && (
        <div
          onClick={() => onNavigateToWallets?.()}
          className="rounded-3xl border border-amber-300/40 bg-gradient-to-b from-[#FFFDF5] to-[#FFF8E6] dark:from-amber-950/20 dark:to-amber-900/10 p-4 shadow-xs space-y-3 cursor-pointer hover:border-amber-400/60 active:scale-[0.99] transition-all"
        >
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">STATEMENT DUE</p>
                <p className="text-[10px] font-semibold text-amber-800/70 dark:text-amber-300/70">
                  {statementCards.length} {statementCards.length === 1 ? "with due date" : "with due dates"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-amber-700 dark:text-amber-400 tabular-nums">
                {formatMoney(statementCards.reduce((s, c) => s + c.amountDue, 0))}
              </span>
              <ChevronRight className="h-4 w-4 text-amber-600" />
            </div>
          </div>

          {/* One row per credit card */}
          <div className="space-y-1.5 pt-0.5">
            {statementCards.map((card) => {
              const logo = getBrandLogo(card.name)
              return (
                <div
                  key={card.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onNavigateToWallets?.(card.id)
                  }}
                  className="flex items-center justify-between py-1.5 px-1.5 rounded-2xl cursor-pointer hover:bg-amber-100/60 dark:hover:bg-amber-900/30 active:scale-[0.99] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {logo ? (
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white border border-amber-200/60 p-1 shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logo} alt={card.name} className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                        style={{ backgroundColor: `${card.accent}20`, color: card.accent }}
                      >
                        <CreditCard className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{card.name}</p>
                      <p className="text-[10px] text-amber-800/70 dark:text-amber-400/80 font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {card.daysLeft !== null
                          ? `${card.daysLeft} days left · ${card.formattedDueDate}`
                          : card.formattedDueDate || "Due date set"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-400 tabular-nums shrink-0 ml-2">
                    {formatMoney(card.amountDue)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── 7. GOALS ──────────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-foreground">Goals</h2>
          <button
            type="button"
            onClick={onNavigateToGoals ?? onNavigateToPlan}
            className="text-xs font-bold text-[#3D784E] hover:underline"
          >
            View all
          </button>
        </div>

        {topGoals.length === 0 ? (
          <div
            onClick={onNavigateToGoals ?? onNavigateToPlan}
            className="rounded-3xl border border-dashed border-border/70 bg-card p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/10 text-[#3D784E]">
                <Flag className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">No goals yet — tap to set one</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Start tracking and saving for your targets in Plan.</p>
              </div>
            </div>
            <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#3D784E] text-white shadow-2xs">
              <Plus className="h-4 w-4" />
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {topGoals.map((g) => (
              <div
                key={g.id}
                onClick={onNavigateToGoals ?? onNavigateToPlan}
                className="rounded-3xl border border-border/80 bg-card p-4 shadow-xs space-y-2.5 cursor-pointer hover:border-[#3D784E]/30 active:scale-[0.99] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/10 text-[#3D784E] text-base">
                      {g.icon || <Flag className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-foreground truncate">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        {formatMoney(g.saved)} / {formatMoney(g.target)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-foreground shrink-0">{g.percent}%</span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-[#3D784E]"
                      style={{ width: `${g.percent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-right text-muted-foreground font-semibold">
                    {formatMoney(g.remaining)} left to go
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 8. DEBT SUMMARY CARD ──────────────────────────────────────────── */}
      {debtSummary.hasData ? (
        <div
          onClick={onNavigateToDebt ?? onNavigateToPlan}
          className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs cursor-pointer hover:border-[#3D784E]/30 active:scale-[0.99] transition-all space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
                <Banknote className="h-4 w-4" />
              </div>
              <span className="text-sm font-black text-foreground">Debt</span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-black text-muted-foreground uppercase">
                {debtSummary.count} ACTIVE {debtSummary.count === 1 ? "DEBT" : "DEBTS"}
              </span>
              {debtSummary.nextDueDaysLeft !== null && debtSummary.nextDueDaysLeft >= 0 && debtSummary.nextDueDaysLeft <= 5 && (
                <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-black text-rose-600 uppercase">
                  {debtSummary.nextDueDaysLeft === 0 ? "DUE TODAY" : `${debtSummary.nextDueDaysLeft} DAYS LEFT`}
                </span>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>

          {/* Total Amount */}
          <p className="text-2xl font-black text-foreground tabular-nums tracking-tight">
            {formatMoney(debtSummary.total)}
          </p>

          {/* Next Due Row */}
          {debtSummary.nextDue && (
            <div className="rounded-2xl border border-border/60 bg-secondary/40 px-3.5 py-2.5 flex items-center gap-2.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">NEXT DUE</p>
                <p className="text-xs font-bold text-foreground truncate">
                  {debtSummary.nextDue.lender}
                  {debtSummary.nextDue.dueDate ? ` · ${debtSummary.nextDue.dueDate}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={onNavigateToDebt ?? onNavigateToPlan}
          className="rounded-3xl border border-dashed border-border/70 bg-card px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-secondary/30 transition-colors"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Banknote className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">No active debts</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Track loan payments and due dates in Plan.</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      )}

      {/* ─── 9. MONEY OWED TO YOU (RECEIVABLES) ───────────────────────────── */}
      {receivableSummary.hasData ? (
        <div
          onClick={onNavigateToReceivables ?? onNavigateToPlan}
          className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs cursor-pointer hover:border-[#3D784E]/30 active:scale-[0.99] transition-all space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <span className="text-sm font-black text-foreground">Money owed to you</span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-black text-muted-foreground uppercase">
                {receivableSummary.count} OPEN {receivableSummary.count === 1 ? "RECEIVABLE" : "RECEIVABLES"}
              </span>
              {receivableSummary.nextExpectedDaysLeft !== null && receivableSummary.nextExpectedDaysLeft >= 0 && receivableSummary.nextExpectedDaysLeft <= 5 && (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-[#3D784E] uppercase">
                  {receivableSummary.nextExpectedDaysLeft === 0 ? "DUE TODAY" : `${receivableSummary.nextExpectedDaysLeft} DAYS LEFT`}
                </span>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>

          {/* Total Amount */}
          <p className="text-2xl font-black text-foreground tabular-nums tracking-tight">
            {formatMoney(receivableSummary.total)}
          </p>

          {/* Next Expected Row */}
          {receivableSummary.nextExpected && (
            <div className="rounded-2xl border border-border/60 bg-secondary/40 px-3.5 py-2.5 flex items-center gap-2.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#3D784E]/15 text-[#3D784E]">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">EXPECTED</p>
                <p className="text-xs font-bold text-foreground truncate">
                  {receivableSummary.nextExpected.borrower}
                  {receivableSummary.nextExpected.dueDate ? ` · ${receivableSummary.nextExpected.dueDate}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={onNavigateToReceivables ?? onNavigateToPlan}
          className="rounded-3xl border border-dashed border-border/70 bg-card px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-secondary/30 transition-colors"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/10 text-[#3D784E]">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">No open receivables</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Track money others owe you in Plan.</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      )}

      {/* ─── 10. VIEW ALL link ─────────────────────────────────────────────── */}
      <div className="flex justify-end -mt-1 mb-1">
        <button
          type="button"
          onClick={onNavigateToPlan}
          className="flex items-center gap-1 text-xs font-bold text-[#3D784E] hover:underline py-1"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ─── 11. TRANSACTION FEED (date-grouped timeline) ───────────────────── */}
      {groupedTransactions.length > 0 && (
        <div className="space-y-4 pt-1">
          {groupedTransactions.map((group) => (
            <div key={group.header} className="space-y-2.5">
              {/* Date group label */}
              <h3 className="text-base font-black tracking-tight text-foreground px-1">
                {group.header}
              </h3>

              <div className="space-y-2.5">
                {group.items.map((tx, idx) => {
                  const isLast = idx === group.items.length - 1
                  const merchantLogo = getTransactionMerchantLogo(tx.label, tx.category, tx.account)
                  const categoryMeta = CATEGORY_ICON_MAP[tx.category] || {
                    icon: Utensils,
                    bg: "bg-[#3D784E]/10",
                    text: "text-[#3D784E]",
                  }
                  const IconComp = categoryMeta.icon
                  const isIncome = tx.kind === "income"

                  return (
                    <div key={tx.id} className="relative flex items-stretch gap-2.5">
                      {/* Timeline left axis */}
                      <div className="flex flex-col items-center w-14 shrink-0 pt-0.5">
                        <span className="text-[9px] font-bold text-muted-foreground/80 tracking-tight leading-none mb-1">
                          {tx.time || "12:00 PM"}
                        </span>
                        <div className="relative flex flex-col items-center flex-1">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full ring-2 ring-background z-10 shrink-0",
                              isIncome ? "bg-[#3D784E]" : "bg-rose-500"
                            )}
                          />
                          {!isLast && <div className="w-0.5 bg-border/80 flex-1 my-0.5" />}
                        </div>
                      </div>

                      {/* Transaction Card */}
                      <div className="flex-1 rounded-3xl border border-border/80 bg-card p-3.5 shadow-xs hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {merchantLogo ? (
                              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card border border-border/60 p-1 shadow-2xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={merchantLogo} alt={tx.label} className="h-full w-full object-contain" />
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                                  categoryMeta.bg,
                                  categoryMeta.text
                                )}
                              >
                                <IconComp className="h-4 w-4" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-black text-foreground leading-tight truncate">
                                  {tx.label}
                                </p>
                                {tx.tag && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-secondary/60 px-1.5 py-0.2 text-[9px] font-bold text-muted-foreground">
                                    🏷 {tx.tag}
                                  </span>
                                )}
                              </div>
                              {(tx.note || (tx.category && tx.category !== tx.label)) && (
                                <p className="text-[10px] text-muted-foreground font-medium truncate mt-0.5">
                                  {tx.note || tx.category}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
                            <p
                              className={cn(
                                "text-xs font-black tabular-nums tracking-tight",
                                isIncome ? "text-[#3D784E]" : "text-foreground"
                              )}
                            >
                              {isIncome ? "+" : "-"}
                              {formatMoney(tx.amount, tx.currency)}
                            </p>
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-secondary/60 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                                <WalletIcon className="h-2.5 w-2.5" />
                                {tx.account}
                              </span>
                              <button
                                type="button"
                                className="text-muted-foreground/60 hover:text-foreground transition-colors p-0.5"
                                aria-label="More options"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MODALS ─────────────────────────────────────────────────────────── */}
      <PaydaySetupModal open={showPaydayModal} onClose={() => setShowPaydayModal(false)} />

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
                  <p className="text-[10px] text-muted-foreground font-semibold">Shared financial circles & paluwagan</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowCommunityModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 mb-5">
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/40 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#3D784E]/20 text-[#3D784E] font-black text-xs">🏆</div>
                <div>
                  <p className="text-xs font-black text-foreground">Tipid Challenge #4</p>
                  <p className="text-[10px] text-muted-foreground font-medium">1,420 members tracking ₱0 spend days</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/40 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 font-black text-xs">🤝</div>
                <div>
                  <p className="text-xs font-black text-foreground">Family & Partner Budget</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Sync shared household expenses securely</p>
                </div>
              </div>
            </div>

            <button type="button" onClick={() => setShowCommunityModal(false)}
              className="w-full rounded-2xl bg-[#3D784E] py-3 text-xs font-black text-white shadow-md shadow-[#3D784E]/25 hover:bg-[#356B46]">
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
