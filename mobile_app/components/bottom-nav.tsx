"use client"

import { useState } from "react"
import {
  Home,
  Wallet,
  Calendar,
  Clock,
  Plus,
  X,
  MessageSquare,
  ArrowRightLeft,
  Scan,
  ArrowDown,
  ArrowUp,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export type TabId = "dashboard" | "wallets" | "plan" | "history" | "chat" | "settings"

const navItems: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "wallets", label: "Wallet", icon: Wallet },
  { id: "plan", label: "Plan", icon: Calendar },
  { id: "history", label: "History", icon: Clock },
]

interface BottomNavProps {
  active: TabId
  onChange: (id: TabId) => void
  onOpenIncome?: () => void
  onOpenExpense?: () => void
  onOpenTransfer?: () => void
  onOpenScan?: () => void
}

export function BottomNav({
  active,
  onChange,
  onOpenIncome,
  onOpenExpense,
  onOpenTransfer,
  onOpenScan,
}: BottomNavProps) {
  const [speedDialOpen, setSpeedDialOpen] = useState(false)

  const handleAction = (callback?: () => void) => {
    setSpeedDialOpen(false)
    if (callback) callback()
  }

  return (
    <>
      {/* Speed Dial Backdrop */}
      <AnimatePresence>
        {speedDialOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSpeedDialOpen(false)}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {/* Speed Dial Floating Menu (Image 3) */}
      <AnimatePresence>
        {speedDialOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed bottom-24 right-[max(1.25rem,calc(50%-12.75rem))] z-50 w-56 overflow-hidden rounded-[2rem] border border-border/80 bg-card/98 p-2 shadow-2xl backdrop-blur-xl divide-y divide-border/40"
          >
            {/* 1. Chat */}
            <button
              type="button"
              onClick={() => {
                setSpeedDialOpen(false)
                onChange("chat")
              }}
              className="flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors hover:bg-secondary/60 active:scale-95"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground">
                <MessageSquare className="h-5 w-5" />
              </div>
              <span className="text-sm font-extrabold text-foreground">Chat</span>
            </button>

            {/* 2. Transfer */}
            <button
              type="button"
              onClick={() => handleAction(onOpenTransfer)}
              className="flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors hover:bg-secondary/60 active:scale-95"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <span className="text-sm font-extrabold text-foreground">Transfer</span>
            </button>

            {/* 3. Scan Receipt */}
            <button
              type="button"
              onClick={() => handleAction(onOpenScan)}
              className="flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors hover:bg-secondary/60 active:scale-95"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground">
                <Scan className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-foreground leading-none">Scan receipt</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Hold for camera</p>
              </div>
            </button>

            {/* 4. Income */}
            <button
              type="button"
              onClick={() => handleAction(onOpenIncome)}
              className="flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors hover:bg-secondary/60 active:scale-95"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center text-emerald-600">
                <ArrowDown className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-foreground leading-none">Income</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Hold for templates</p>
              </div>
            </button>

            {/* 5. Expense */}
            <button
              type="button"
              onClick={() => handleAction(onOpenExpense)}
              className="flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors hover:bg-secondary/60 active:scale-95"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center text-rose-500">
                <ArrowUp className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-foreground leading-none">Expense</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Hold for templates</p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Nav Container (Image 2) */}
      <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between px-5 pointer-events-none">
        {/* Left Floating Navigation Pill */}
        <nav className="pointer-events-auto flex flex-1 items-center justify-between rounded-full border border-border/80 bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-xl">
          {navItems.map((item) => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 px-2 text-xs font-bold transition-all select-none",
                  isActive
                    ? "text-[#3D784E] font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    className="absolute inset-0 rounded-full bg-[#3D784E]/12 border border-[#3D784E]/20"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <item.icon
                  className={cn("h-[18px] w-[18px]", isActive ? "stroke-[2.5]" : "stroke-[1.8]")}
                />
                <span className="text-[11px]">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Right Floating FAB Button (Image 2 & 3) */}
        <div className="pointer-events-auto ml-3">
          <motion.button
            type="button"
            onClick={() => setSpeedDialOpen(!speedDialOpen)}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-[1.4rem] shadow-xl transition-all",
              speedDialOpen
                ? "bg-muted-foreground/30 text-foreground border border-border/60"
                : "bg-[#3D784E] text-white shadow-[#3D784E]/30 hover:bg-[#356B46]"
            )}
            aria-label="Add transaction or action"
          >
            <motion.div
              animate={{ rotate: speedDialOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {speedDialOpen ? (
                <X className="h-6 w-6 stroke-[2.5]" />
              ) : (
                <Plus className="h-7 w-7 stroke-[2.5]" />
              )}
            </motion.div>
          </motion.button>
        </div>
      </div>
    </>
  )
}
