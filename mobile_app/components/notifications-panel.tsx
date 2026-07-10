"use client"

import { useEffect, useMemo } from "react"
import { AlertCircle, Target, Lightbulb, Calendar, X, Bell } from "lucide-react"
import { useStore } from "@/lib/store"
import { formatMoney } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"

export type NotificationItem = {
  id: string
  title: string
  message: string
  icon: typeof AlertCircle
  color: "destructive" | "primary" | "secondary" | "accent"
}

export function useSmartNotifications() {
  const { budgets, goals, wallets } = useStore()

  return useMemo(() => {
    const items: NotificationItem[] = []

    // 1. Negative wallet balances
    wallets.forEach(w => {
      if (w.balance < 0) {
        items.push({
          id: `neg-bal-${w.id}`,
          title: "Negative Wallet Balance",
          message: `Your ${w.name} wallet balance is below zero (${formatMoney(w.balance, w.currency)}). Check if any deposit or salary was missed!`,
          icon: AlertCircle,
          color: "destructive"
        })
      }
    })

    // 2. Duplicate wallet detection
    const nameCounts = wallets.reduce<Record<string, number>>((acc, w) => {
      const n = w.name.trim().toLowerCase()
      acc[n] = (acc[n] || 0) + 1
      return acc
    }, {})
    Object.entries(nameCounts).forEach(([name, count]) => {
      if (count > 1) {
        items.push({
          id: `dup-wallet-${name}`,
          title: "Duplicate Wallet Detected",
          message: `You have ${count} wallets named '${name}'. You can remove duplicate wallets on the Wallets screen.`,
          icon: AlertCircle,
          color: "secondary"
        })
      }
    })

    // 3. Budgets
    budgets.forEach(b => {
      if (b.spent >= b.limit) {
        items.push({
          id: `budget-over-${b.id}`,
          title: "Budget Exceeded",
          message: `Warning: You have exceeded your ${b.category} budget by ${formatMoney(b.spent - b.limit)}.`,
          icon: AlertCircle,
          color: "destructive"
        })
      } else if (b.spent >= b.limit * 0.8) {
        const pct = Math.round((b.spent / b.limit) * 100)
        items.push({
          id: `budget-near-${b.id}`,
          title: "Budget Nearing Limit",
          message: `Heads up! You've used ${pct}% of your ${b.category} budget.`,
          icon: AlertCircle,
          color: "secondary"
        })
      }
    })

    // 4. Goals
    goals.forEach(g => {
      if (g.saved >= g.target) {
        items.push({
          id: `goal-done-${g.id}`,
          title: "Goal Completed! 🎉",
          message: `Awesome job! You've fully funded your ${g.name} goal!`,
          icon: Target,
          color: "primary"
        })
      } else if (g.saved >= g.target * 0.5) {
        items.push({
          id: `goal-half-${g.id}`,
          title: "Halfway There!",
          message: `Keep it up! You've reached 50% of your ${g.name} target.`,
          icon: Target,
          color: "primary"
        })
      }

      if (g.due && g.saved < g.target) {
        items.push({
          id: `goal-due-${g.id}`,
          title: "Upcoming Deadline",
          message: `Friendly reminder: Your ${g.name} goal is due ${g.due}!`,
          icon: Calendar,
          color: "secondary"
        })
      }
    })

    // 5. Idle Cash
    wallets.forEach(w => {
      if (w.type === "cash" && w.balance >= 15000) {
        items.push({
          id: `insight-cash-${w.id}`,
          title: "Pawi's Insight 💡",
          message: `You have ${formatMoney(w.balance, w.currency)} in ${w.name}. Consider placing a portion in high-yield savings to grow your wealth!`,
          icon: Lightbulb,
          color: "accent"
        })
      }
    })

    if (items.length === 0) {
      items.push({
        id: "all-good",
        title: "All Good!",
        message: "You have no urgent financial alerts. Keep building steady habits!",
        icon: Bell,
        color: "primary"
      })
    }

    return items
  }, [budgets, goals, wallets])
}

interface NotificationsPanelProps {
  open: boolean
  onClose: () => void
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const notifications = useSmartNotifications()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bell className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Notifications
            </h2>
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {notifications.filter(n => n.id !== "all-good").length}
            </span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-2 pb-4">
          {notifications.map((notif) => {
            const Icon = notif.icon
            
            let iconBgClass = "bg-primary/15 text-primary"
            if (notif.color === "destructive") iconBgClass = "bg-destructive/15 text-destructive"
            if (notif.color === "secondary") iconBgClass = "bg-secondary text-foreground"
            if (notif.color === "accent") iconBgClass = "bg-blue-500/15 text-blue-600 dark:text-blue-400"

            return (
              <div key={notif.id} className="flex gap-4 rounded-2xl border border-border/40 bg-secondary/20 p-4 shadow-sm">
                <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", iconBgClass)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{notif.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{notif.message}</p>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
