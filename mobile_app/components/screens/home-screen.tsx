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
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useStore } from "@/lib/store"
import { formatMoney } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"

interface HomeScreenProps {
  onOpenSettings: () => void
  onOpenNotifications: () => void
}

const UPCOMING_INCOME = [
  {
    id: "inc-1",
    title: "Online selling payout",
    date: "Apr 25",
    amount: 4500,
    icon: "G",
    iconBg: "bg-[#1A73E8]",
  },
]

const UPCOMING_EXPENSES = [
  {
    id: "exp-1",
    title: "Globe postpaid",
    date: "Apr 23",
    amount: 999,
    badge: "3 DAYS LEFT",
    iconType: "globe",
  },
  {
    id: "exp-2",
    title: "Netflix Premium",
    date: "Apr 26",
    amount: 249,
    iconType: "netflix",
  },
  {
    id: "exp-3",
    title: "Converge internet",
    date: "Apr 28",
    amount: 1699,
    iconType: "converge",
  },
  {
    id: "exp-4",
    title: "RCBC Visa",
    date: "May 02",
    amount: 1500,
    iconType: "rcbc",
  },
]

const LAST_7_DAYS_BARS = [
  { day: "T", height: 28, isToday: false },
  { day: "W", height: 50, isToday: false },
  { day: "T", height: 85, isToday: false },
  { day: "F", height: 95, isToday: false },
  { day: "S", height: 20, isToday: false },
  { day: "S", height: 45, isToday: false },
  { day: "M", height: 35, isToday: true },
]

export function HomeScreen({
  onOpenSettings,
  onOpenNotifications,
}: HomeScreenProps) {
  const { user } = useAuth()
  const { streakDays, daysUntilPayday, paydayAmount, paydayDate, transactions } = useStore()
  const [timeFilter, setTimeFilter] = useState<"day" | "week" | "month">("day")

  // Determine user name
  const rawName = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Bryl"
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  // Dynamic greeting based on current hour
  const hour = new Date().getHours()
  let greeting = "Good morning"
  if (hour >= 12 && hour < 18) {
    greeting = "Good afternoon"
  } else if (hour >= 18 || hour < 5) {
    greeting = "Good evening"
  }

  // Calculate today's flow
  const todayIncome = transactions
    .filter((t) => t.kind === "income")
    .reduce((sum, t) => sum + t.amount, 0)
  const todayExpense = transactions
    .filter((t) => t.kind === "expense")
    .reduce((sum, t) => sum + t.amount, 0)

  // Default matching screenshot values if fresh
  const displayIncome = todayIncome > 0 ? todayIncome : 2200
  const displayExpense = todayExpense > 0 ? todayExpense : 469

  // Dynamic Tarsi message based on spending
  const isOverspending = displayExpense > displayIncome
  const tarsiMessage = isOverspending
    ? "Nasa red ka na ngayon. Essentials muna hanggang may pumasok ulit na money."
    : "Nasa green zone ka ngayon! Essentials muna hanggang may pumasok ulit na money."

  return (
    <div className="flex flex-col gap-3.5 px-4 pt-2 pb-28 min-h-screen bg-background text-foreground">
      {/* Top Bar: Streak Pill (Left) + Action Buttons (Right) */}
      <div className="flex items-center justify-between py-1">
        {/* Streak Pill */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-900 dark:text-amber-300 shadow-2xs">
          <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
          <span>x{streakDays || 6} day streak!</span>
        </div>

        {/* Action Buttons: Bell, Community, Settings */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card border border-border/70 text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card border border-border/70 text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Community"
          >
            <Users className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card border border-border/70 text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Date & Greeting Header */}
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          MONDAY, APRIL 20
        </p>
        <h1 className="text-2xl font-black tracking-tight text-foreground mt-0.5">
          {greeting}, <span className="text-foreground">{displayName}!</span>
        </h1>
      </div>

      {/* Mascot Card: Tarsi Banner */}
      <div className="relative rounded-[2rem] bg-[#3D784E] p-4 text-white shadow-md mt-2">
        <div className="flex items-center gap-3">
          {/* Bigger Pop-out Mascot Graphic (Breaks out over border) */}
          <div className="relative -mt-8 -mb-4 -ml-2 h-28 w-28 shrink-0 z-10 pointer-events-none">
            <Image
              src="/pawi-v2-hi.png"
              alt="Pawi Mascot"
              fill
              priority
              className="object-contain drop-shadow-xl scale-125 origin-bottom"
            />
          </div>

          {/* White Speech Bubble with Tail */}
          <div className="relative z-0 flex-1 rounded-2xl bg-white p-3.5 text-foreground shadow-sm">
            {/* Speech bubble pointer arrow */}
            <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-white" />

            <p className="text-xs font-black text-[#2E683E] leading-none">Tarsi</p>
            <p className="text-[11px] font-semibold leading-snug text-neutral-800 mt-1">
              {tarsiMessage}
            </p>
          </div>
        </div>
      </div>

      {/* 2 Big Widgets: Last 7 Days + Today Flow */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left Widget: LAST 7 DAYS */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            LAST 7 DAYS
          </p>

          {/* 7 Vertical Bars */}
          <div className="my-2 flex h-24 items-end justify-between gap-1 px-1">
            {LAST_7_DAYS_BARS.map((bar, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <div className="h-16 w-full flex items-end justify-center">
                  <div
                    className={cn(
                      "w-2.5 rounded-full transition-all",
                      bar.isToday
                        ? "bg-[#3D784E]"
                        : "bg-[#3D784E]/30 hover:bg-[#3D784E]/60"
                    )}
                    style={{ height: `${bar.height}%` }}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "text-[9px] font-black",
                      bar.isToday ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {bar.day}
                  </span>
                  {bar.isToday && (
                    <div className="h-1 w-1 rounded-full bg-[#3D784E] mt-0.5" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Widget: Today Flow */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-4 shadow-xs">
          <p className="text-sm font-black text-foreground">Today</p>

          {/* Income & Expense rows */}
          <div className="my-2 space-y-2">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-emerald-600 stroke-[2.5] shrink-0" />
              <span className="text-sm font-black text-foreground tabular-nums">
                {formatMoney(displayIncome)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowDownLeft className="h-4 w-4 text-rose-500 stroke-[2.5] shrink-0" />
              <span className="text-sm font-black text-foreground tabular-nums">
                {formatMoney(displayExpense)}
              </span>
            </div>
          </div>

          {/* Time Filter Pills: Day / Week / Month */}
          <div className="flex items-center rounded-xl bg-secondary/80 p-0.5">
            <button
              type="button"
              onClick={() => setTimeFilter("day")}
              className={cn(
                "flex-1 rounded-lg py-1 text-[10px] font-black transition-all",
                timeFilter === "day"
                  ? "bg-[#3D784E] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("week")}
              className={cn(
                "flex-1 rounded-lg py-1 text-[10px] font-black transition-all",
                timeFilter === "week"
                  ? "bg-[#3D784E] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("month")}
              className={cn(
                "flex-1 rounded-lg py-1 text-[10px] font-black transition-all",
                timeFilter === "month"
                  ? "bg-[#3D784E] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Payday Countdown Card */}
      <div className="flex items-center justify-between rounded-3xl border border-[#3D784E]/20 bg-gradient-to-r from-[#3D784E]/10 via-[#3D784E]/5 to-transparent p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#3D784E]">
              DAYS UNTIL PAYDAY
            </p>
            <p className="text-base font-black text-foreground mt-0.5">
              {daysUntilPayday || 25} days
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-black text-foreground tabular-nums">
            {formatMoney(paydayAmount || 18500)}
          </p>
          <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
            {paydayDate || "May 15"}
          </p>
        </div>
      </div>

      {/* Upcoming Section */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground">Upcoming</h2>
            <p className="text-[11px] text-muted-foreground font-medium">
              Planned and recurring money moves
            </p>
          </div>
        </div>

        {/* INCOME Subheading */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#3D784E] mb-2 px-0.5">
            INCOME
          </p>
          {UPCOMING_INCOME.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 border-b border-border/40 last:border-none"
            >
              <div className="flex items-center gap-3">
                {/* Blue G icon matching reference */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1A73E8] text-white font-black text-sm shadow-xs">
                  G
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{item.date}</p>
                </div>
              </div>
              <span className="text-xs font-black text-[#3D784E] tabular-nums">
                {formatMoney(item.amount)}
              </span>
            </div>
          ))}
        </div>

        {/* EXPENSES Subheading */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-rose-500 mb-2 px-0.5">
            EXPENSES
          </p>
          <div className="space-y-1">
            {UPCOMING_EXPENSES.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-border/40 last:border-none"
              >
                <div className="flex items-center gap-3">
                  {/* Styled Brand Icons */}
                  {item.iconType === "globe" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-black text-sm shadow-xs">
                      🌐
                    </div>
                  )}
                  {item.iconType === "netflix" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-red-600 font-black text-base shadow-xs">
                      N
                    </div>
                  )}
                  {item.iconType === "converge" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-700 text-white font-black text-sm shadow-xs">
                      C
                    </div>
                  )}
                  {item.iconType === "rcbc" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0284C7] text-white font-black text-xs shadow-xs">
                      💳
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-foreground">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{item.date}</p>
                  </div>
                </div>

                <div className="text-right">
                  {item.badge && (
                    <span className="block text-[9px] font-black uppercase tracking-wider text-rose-600 mb-0.5">
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
