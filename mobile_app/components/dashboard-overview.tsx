"use client"

import { useState } from "react"
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
  Sparkles,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useStore } from "@/lib/store"
import { formatMoney } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"

interface DashboardOverviewProps {
  onOpenSettings: () => void
  onOpenNotifications: () => void
}

const UPCOMING_INCOME = [
  {
    id: "inc-1",
    title: "Online selling payout",
    date: "Apr 25",
    amount: 4500,
    icon: "/gcash.png",
    bg: "bg-blue-500",
  },
]

const UPCOMING_EXPENSES = [
  {
    id: "exp-1",
    title: "Globe postpaid",
    date: "Apr 23",
    amount: 999,
    badge: "3 DAYS LEFT",
    badgeColor: "text-rose-500 bg-rose-500/10",
    iconBg: "bg-indigo-600",
  },
  {
    id: "exp-2",
    title: "Netflix Premium",
    date: "Apr 26",
    amount: 249,
    badge: null,
    iconBg: "bg-black text-red-600",
  },
  {
    id: "exp-3",
    title: "Converge internet",
    date: "Apr 28",
    amount: 1699,
    badge: null,
    iconBg: "bg-purple-600",
  },
]

const WEEKDAY_BARS = [
  { day: "T", height: 35 },
  { day: "W", height: 60 },
  { day: "T", height: 90 },
  { day: "F", height: 95 },
  { day: "S", height: 15 },
  { day: "S", height: 45 },
  { day: "M", height: 25 },
]

export function DashboardOverview({
  onOpenSettings,
  onOpenNotifications,
}: DashboardOverviewProps) {
  const { user } = useAuth()
  const { streakDays, daysUntilPayday, paydayAmount, paydayDate, transactions, wallets } = useStore()
  const [timeFilter, setTimeFilter] = useState<"day" | "week" | "month">("day")

  const displayName = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Bryl"
  const todayDateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toUpperCase()

  // Calculate today's flow
  const todayIncome = transactions
    .filter((t) => t.kind === "income")
    .reduce((sum, t) => sum + t.amount, 0)
  const todayExpense = transactions
    .filter((t) => t.kind === "expense")
    .reduce((sum, t) => sum + t.amount, 0)

  const displayIncome = todayIncome > 0 ? todayIncome : 2200
  const displayExpense = todayExpense > 0 ? todayExpense : 469

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-28">
      {/* Top Bar: Streak + Action Buttons (Image 1) */}
      <div className="flex items-center justify-between">
        {/* Streak pill */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-900 dark:text-amber-300 shadow-2xs">
          <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
          <span>x{streakDays} day streak!</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border/70 text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border/70 text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Community"
          >
            <Users className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border/70 text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Greeting Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {todayDateStr}
        </p>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Good morning, {displayName}!
        </h1>
      </div>

      {/* Mascot Advice Banner (Image 1) */}
      <div className="relative overflow-hidden rounded-3xl bg-[#3D784E] p-4 text-white shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/10 p-1">
            <Image
              src="/pawi-dashboard-clean.png"
              alt="Pawi"
              fill
              className="object-contain"
            />
          </div>
          <div className="flex-1 rounded-2xl bg-white p-3 text-foreground shadow-sm">
            <p className="text-xs font-black text-[#3D784E]">Pawi</p>
            <p className="text-[11px] font-medium leading-tight text-foreground/80 mt-0.5">
              Nasa green zone ka ngayon! Essentials muna hanggang may pumasok ulit na money.
            </p>
          </div>
        </div>
      </div>

      {/* 2 Big Widgets Row: Last 7 Days + Today (Image 1) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Widget 1: Last 7 Days */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            LAST 7 DAYS
          </p>
          <div className="my-2 flex h-20 items-end justify-between gap-1 px-1">
            {WEEKDAY_BARS.map((bar, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <div className="h-16 w-full flex items-end justify-center">
                  <div
                    className="w-2.5 rounded-full bg-[#3D784E]/30 hover:bg-[#3D784E] transition-all"
                    style={{ height: `${bar.height}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold text-muted-foreground">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 2: Today Flow */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-xs font-black text-foreground">Today</p>
          <div className="my-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-black text-foreground tabular-nums">
                {formatMoney(displayIncome)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowDownLeft className="h-4 w-4 text-rose-500 shrink-0" />
              <span className="text-sm font-black text-foreground tabular-nums">
                {formatMoney(displayExpense)}
              </span>
            </div>
          </div>
          {/* Time Filter Pills */}
          <div className="flex items-center rounded-xl bg-secondary/70 p-0.5">
            <button
              type="button"
              onClick={() => setTimeFilter("day")}
              className={cn(
                "flex-1 rounded-lg py-1 text-[10px] font-extrabold transition-all",
                timeFilter === "day" ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground"
              )}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("week")}
              className={cn(
                "flex-1 rounded-lg py-1 text-[10px] font-extrabold transition-all",
                timeFilter === "week" ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground"
              )}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("month")}
              className={cn(
                "flex-1 rounded-lg py-1 text-[10px] font-extrabold transition-all",
                timeFilter === "month" ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground"
              )}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Payday Countdown Card (Image 1) */}
      <div className="flex items-center justify-between rounded-3xl border border-[#3D784E]/25 bg-gradient-to-r from-[#3D784E]/12 via-[#3D784E]/6 to-transparent p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/20 text-[#3D784E]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#3D784E]">
              DAYS UNTIL PAYDAY
            </p>
            <p className="text-lg font-black text-foreground">
              {daysUntilPayday} days
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-foreground tabular-nums">
            {formatMoney(paydayAmount)}
          </p>
          <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
            {paydayDate}
          </p>
        </div>
      </div>

      {/* Upcoming Planned & Recurring Moves (Image 1) */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground">Upcoming</h2>
            <p className="text-[11px] text-muted-foreground font-medium">
              Planned and recurring money moves
            </p>
          </div>
        </div>

        {/* Income Subheading */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#3D784E] mb-2 px-1">
            INCOME
          </p>
          {UPCOMING_INCOME.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 border-b border-border/40 last:border-none"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white font-bold text-xs">
                  G
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{item.date}</p>
                </div>
              </div>
              <span className="text-xs font-black text-foreground tabular-nums">
                {formatMoney(item.amount)}
              </span>
            </div>
          ))}
        </div>

        {/* Expenses Subheading */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-rose-500 mb-2 px-1">
            EXPENSES
          </p>
          <div className="space-y-1">
            {UPCOMING_EXPENSES.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-border/40 last:border-none"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground text-xs font-black">
                    💳
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{item.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  {item.badge && (
                    <span className="block text-[9px] font-extrabold uppercase tracking-wide text-rose-600 mb-0.5">
                      {item.badge}
                    </span>
                  )}
                  <span className="text-xs font-black text-foreground tabular-nums">
                    {formatMoney(item.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
