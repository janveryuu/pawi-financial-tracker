"use client"

import {
  LayoutDashboard,
  Wallet,
  CalendarRange,
  History,
  Settings,
  MessageCircle,
} from "lucide-react"
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
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-center justify-around border-t border-border/60 bg-background/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      {items.map((item) => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon
              className="h-5 w-5"
              strokeWidth={isActive ? 2.4 : 1.8}
            />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
