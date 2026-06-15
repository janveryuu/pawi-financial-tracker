"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Zap } from "lucide-react"
import { PawiHeader } from "@/components/pawi-header"
import { GreetingCard } from "@/components/greeting-card"
import { NetWorthCard } from "@/components/net-worth-card"
import { WalletCarousel } from "@/components/wallet-carousel"
import { RecentTransactions } from "@/components/recent-transactions"
import { GoalsPreview } from "@/components/goals-preview"
import { SettingsModule } from "@/components/settings-module"
import { WalletsScreen } from "@/components/screens/wallets-screen"
import { PlanScreen } from "@/components/screens/plan-screen"
import { HistoryScreen } from "@/components/screens/history-screen"
import { ChatScreen } from "@/components/screens/chat-screen"
import { BottomNav, type TabId } from "@/components/bottom-nav"
import { QuickLogModal } from "@/components/quick-log-modal"
import { PawiMascot } from "@/components/pawi-mascot"
import { PawiTip } from "@/components/pawi-tip"

const titles: Record<TabId, string> = {
  dashboard: "Dashboard",
  wallets: "Wallets",
  plan: "Plan",
  history: "History",
  chat: "Pawi AI Chat",
  settings: "Settings",
}

export default function Page() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [logOpen, setLogOpen] = useState(false)
  const [tab, setTab] = useState<TabId>("dashboard")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-pulse rounded-full bg-primary/20" />
      </div>
    )
  }

  return (
    <main className="relative mx-auto min-h-screen max-w-md bg-background pb-24">
      <PawiHeader />

      {tab !== "dashboard" && (
        <h1 className="px-5 pt-5 text-2xl font-bold tracking-tight text-foreground">
          {titles[tab]}
        </h1>
      )}

      {tab === "dashboard" && (
        <div className="flex flex-col gap-5 px-5 pt-4">
          <GreetingCard />
          <NetWorthCard />
          <WalletCarousel onViewAll={() => setTab("wallets")} />
          <RecentTransactions onSeeAll={() => setTab("history")} />
          <GoalsPreview onAddGoal={() => setTab("plan")} />
          <div className="-mx-5">
            <PawiTip
              image="/Pawikan-Original.png"
              tip="Consistency is key! Logging even your smallest expenses helps you see the bigger picture."
              trivia="Did you know turtles don't have teeth? That's right! Good thing too, because biting off more debt than you can chew is a terrible idea."
            />
          </div>
        </div>
      )}

      {tab === "wallets" && <WalletsScreen />}
      {tab === "plan" && <PlanScreen />}
      {tab === "history" && <HistoryScreen />}
      {tab === "chat" && <ChatScreen />}
      {tab === "settings" && (
        <div className="px-5 pt-4">
          <SettingsModule />
        </div>
      )}

      {/* Quick Log FAB */}
      {tab !== "chat" && (
        <button
          type="button"
          onClick={() => setLogOpen(true)}
          className="fixed bottom-20 right-[max(1.25rem,calc(50%-13.25rem))] z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
        >
          <Zap className="h-[18px] w-[18px]" />
          Quick Log
        </button>
      )}

      <BottomNav active={tab} onChange={setTab} />
      <QuickLogModal open={logOpen} onClose={() => setLogOpen(false)} />
      
      <PawiMascot />
    </main>
  )
}
