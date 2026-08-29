"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useProfile } from "@/lib/use-profile"
import { AnimatePresence, motion } from "framer-motion"
import { HomeScreen } from "@/components/screens/home-screen"
import { WalletsScreen } from "@/components/screens/wallets-screen"
import { PlanScreen } from "@/components/screens/plan-screen"
import { HistoryScreen } from "@/components/screens/history-screen"
import { ChatScreen } from "@/components/screens/chat-screen"
import { SettingsModule } from "@/components/settings-module"
import { BottomNav, type TabId } from "@/components/bottom-nav"
import { TransactionEntryModal } from "@/components/transaction-entry-modal"
import { TransferModal } from "@/components/transfer-modal"
import { QuickLogModal } from "@/components/quick-log-modal"
import { NotificationsPanel } from "@/components/notifications-panel"
import { PawiTutorialModal } from "@/components/pawi-tutorial-modal"
import { PawiOnboardingFlow } from "@/components/pawi-onboarding-flow"

export default function Page() {
  const { user, loading, isGuest } = useAuth()
  const { profile, loadingProfile, completeTutorial } = useProfile()
  const router = useRouter()

  const [tab, setTab] = useState<TabId>("home")
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txKind, setTxKind] = useState<"income" | "expense">("income")
  const [transferOpen, setTransferOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Onboarding gate: show for new authenticated (non-guest) users who haven't completed onboarding, or if ?onboarding=true is in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("onboarding") === "true" || params.get("onboarding") === "1" || window.location.hash === "#onboarding") {
        setShowOnboarding(true)
        return
      }
    }

    if (!loading && !loadingProfile && user && !isGuest) {
      if (profile && !profile.onboarding_completed) {
        setShowOnboarding(true)
      } else if (profile && profile.onboarding_completed) {
        setShowOnboarding(false)
      }
    }
  }, [loading, loadingProfile, user, isGuest, profile])

  // Tutorial gate: show after onboarding is complete, ONLY if tutorial_completed is false on profiles
  useEffect(() => {
    if (!loading && !loadingProfile && user && !isGuest && !showOnboarding) {
      if (profile && profile.onboarding_completed && !profile.tutorial_completed) {
        const timer = setTimeout(() => {
          setTutorialOpen(true)
        }, 600)
        return () => clearTimeout(timer)
      }
    }
  }, [user, loading, loadingProfile, isGuest, showOnboarding, profile])

  // Onboarding complete handler — dismiss onboarding, let tutorial follow naturally via profiles check
  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    if (typeof window !== "undefined" && window.location.search.includes("onboarding")) {
      router.replace("/")
    }
  }

  // Tutorial close handler — mark tutorial as completed in Supabase profiles
  const handleTutorialClose = () => {
    setTutorialOpen(false)
    if (user && !isGuest && profile && !profile.tutorial_completed) {
      completeTutorial()
    }
  }

  if (loading || loadingProfile || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#3D784E]/25" />
      </div>
    )
  }

  // Render onboarding flow when triggered
  if (showOnboarding) {
    return <PawiOnboardingFlow onComplete={handleOnboardingComplete} />
  }

  return (
    <main className="relative mx-auto min-h-screen max-w-md bg-background text-foreground overflow-x-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.99 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {(tab === "home" || tab === "dashboard") && (
            <HomeScreen
              onOpenSettings={() => setTab("settings")}
              onOpenNotifications={() => setNotifOpen(true)}
            />
          )}

          {tab === "wallets" && <WalletsScreen />}
          {tab === "plan" && <PlanScreen />}
          {tab === "history" && <HistoryScreen />}
          {tab === "chat" && <ChatScreen onBack={() => setTab("home")} />}
          {tab === "settings" && (
            <div className="px-5 pt-4">
              <SettingsModule
                onStartTutorial={() => setTutorialOpen(true)}
                onStartOnboarding={() => setShowOnboarding(true)}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Floating Bottom Nav with Speed Dial */}
      <BottomNav
        active={tab}
        onChange={setTab}
        onOpenIncome={() => {
          setTxKind("income")
          setTxModalOpen(true)
        }}
        onOpenExpense={() => {
          setTxKind("expense")
          setTxModalOpen(true)
        }}
        onOpenTransfer={() => setTransferOpen(true)}
        onOpenScan={() => setScanOpen(true)}
      />

      {/* Modals */}
      <TransactionEntryModal
        open={txModalOpen}
        kind={txKind}
        onClose={() => setTxModalOpen(false)}
      />
      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
      />
      <QuickLogModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
      />
      <NotificationsPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
      <PawiTutorialModal
        open={tutorialOpen}
        onClose={handleTutorialClose}
      />
    </main>
  )
}
