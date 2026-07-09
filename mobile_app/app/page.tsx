"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Zap } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
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
import { PawiTutorialModal } from "@/components/pawi-tutorial-modal"
import { PawiTutorialBanner } from "@/components/pawi-tutorial-banner"

export default function Page() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [logOpen, setLogOpen] = useState(false)
  const [tab, setTab] = useState<TabId>("dashboard")
  const [tutorialOpen, setTutorialOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    try {
      if (localStorage.getItem("pawi_has_seen_tutorial") !== "true") {
        const timer = setTimeout(() => {
          setTutorialOpen(true)
        }, 1200)
        return () => clearTimeout(timer)
      }
    } catch {
      // ignore
    }
  }, [])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-pulse rounded-full bg-primary/20" />
      </div>
    )
  }

  return (
    <main className="relative mx-auto min-h-screen max-w-md bg-background pb-24 overflow-x-hidden">
      <PawiHeader />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.985 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {tab === "dashboard" && (
            <div className="flex flex-col gap-5 px-5 pt-4">
              <PawiTutorialBanner onStartTour={() => setTutorialOpen(true)} />
              <GreetingCard />
              <NetWorthCard />
              <WalletCarousel onViewAll={() => setTab("wallets")} />
              <RecentTransactions onSeeAll={() => setTab("history")} />
              <GoalsPreview onAddGoal={() => setTab("plan")} />
              <div className="-mx-5">
                <PawiTip
                  image="/pawi-dashboard-clean.png"
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
              <SettingsModule onStartTutorial={() => setTutorialOpen(true)} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Quick Log FAB */}
      {tab !== "chat" && (
        <motion.button
          type="button"
          onClick={() => setLogOpen(true)}
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-20 right-[max(1.25rem,calc(50%-13.25rem))] z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors"
        >
          <Zap className="h-[18px] w-[18px]" />
          Quick Log
        </motion.button>
      )}

      <BottomNav active={tab} onChange={setTab} />
      <QuickLogModal open={logOpen} onClose={() => setLogOpen(false)} />
      <PawiTutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      
      <PawiMascot />
    </main>
  )
}
