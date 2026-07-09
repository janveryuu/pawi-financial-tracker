"use client"

import {
  LayoutDashboard,
  Wallet,
  CalendarRange,
  History,
  Settings,
  MessageCircle,
} from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export type TabId = "dashboard" | "wallets" | "plan" | "history" | "chat" | "settings"

const items: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "wallets", label: "Wallets", icon: Wallet },
  { id: "plan", label: "Plan", icon: CalendarRange },
  { id: "history", label: "History", icon: History },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "settings", label: "Settings", icon: Settings },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: TabId
  onChange: (id: TabId) => void
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-center justify-around border-t border-border/70 bg-background/95 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl shadow-lg">
      {items.map((item) => {
        const isActive = active === item.id
        return (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={isActive ? "page" : undefined}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.88 }}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 px-1 text-[10px] font-bold transition-colors select-none",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 rounded-2xl bg-primary/15 -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <motion.div
              animate={isActive ? { scale: [1, 1.18, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <item.icon
                className="h-5 w-5"
                strokeWidth={isActive ? 2.5 : 1.8}
              />
            </motion.div>
            <span>{item.label}</span>
          </motion.button>
        )
      })}
    </nav>
  )
}
