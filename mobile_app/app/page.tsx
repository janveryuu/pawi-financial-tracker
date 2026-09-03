"use client"

import { useEffect, useState, useCallback } from "react"
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
import { PawiSpotlightTour } from "@/components/pawi-spotlight-tour"
import { PawiOnboardingFlow } from "@/components/pawi-onboarding-flow"
import { PushPermissionPrompt } from "@/components/push-permission-prompt"
import { LandingCatcherScreen } from "@/components/landing-catcher-screen"
import { useAndroidBackButton } from "@/lib/use-android-back-button"

export default function Page() {
  const { user, loading, isGuest } = useAuth()
  const { profile, loadingProfile, completeTutorial, saveTutorialStep, refreshProfile } = useProfile()
  const router = useRouter()

  const [tab, setTab] = useState<TabId>("home")
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txKind, setTxKind] = useState<"income" | "expense">("income")
  const [transferOpen, setTransferOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialInitialStep, setTutorialInitialStep] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [planInitialSubScreen, setPlanInitialSubScreen] = useState<"goals" | "debt" | "receivables" | "budgets" | null>(null)
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)

  // Handle Android launcher shortcuts & notification deep links
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const action = params.get("action")
    const targetTab = params.get("tab") as TabId | null
    const subTab = params.get("subTab") as "goals" | "debt" | "receivables" | "budgets" | null

    if (action === "new-expense" || action === "new-tx") {
      setTxKind("expense")
      setTxModalOpen(true)
    } else if (action === "scan-receipt" || action === "scan") {
      setScanOpen(true)
    } else if (action === "transfer") {
      setTransferOpen(true)
    }

    if (targetTab && ["home", "wallets", "plan", "history", "chat", "settings"].includes(targetTab)) {
      setTab(targetTab)
      if (subTab) {
        setPlanInitialSubScreen(subTab)
      }
    }
  }, [])

  // Android Hardware Back Button & Gesture Navigation Handler
  const isAnyModalOpen = txModalOpen || transferOpen || scanOpen || notifOpen
  const handleCloseTopModal = useCallback(() => {
    if (txModalOpen) setTxModalOpen(false)
    else if (transferOpen) setTransferOpen(false)
    else if (scanOpen) setScanOpen(false)
    else if (notifOpen) setNotifOpen(false)
  }, [txModalOpen, transferOpen, scanOpen, notifOpen])

  useAndroidBackButton({
    isModalOpen: isAnyModalOpen,
    onCloseModal: handleCloseTopModal,
    currentTab: tab,
    onNavigateHome: () => setTab("home"),
  })

  // Onboarding gate
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

  // Tutorial gate: launch immediately on dashboard mount if tutorial is pending or requested
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("tutorial") === "true" || params.get("tutorial") === "1") {
        setTutorialInitialStep(0)
        setTutorialOpen(true)
        return
      }
    }

    if (!loading && !loadingProfile && user && !isGuest && !showOnboarding) {
      if (profile && profile.onboarding_completed && !profile.tutorial_completed) {
        const resumeStep = (profile.tutorial_step ?? 0) < 99 ? (profile.tutorial_step ?? 0) : 0
        setTutorialInitialStep(resumeStep)
        setTutorialOpen(true)
      }
    }
  }, [user, loading, loadingProfile, isGuest, showOnboarding, profile])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    // Directly launch tutorial immediately upon onboarding completion
    setTutorialInitialStep(0)
    setTutorialOpen(true)
    refreshProfile()
    if (typeof window !== "undefined" && window.location.search.includes("onboarding")) {
      router.replace("/")
    }
  }

  // Persist each step completion to Supabase
  const handleTourStepComplete = useCallback(
    (step: number) => {
      if (user && !isGuest) {
        saveTutorialStep(step + 1)
      }
    },
    [user, isGuest, saveTutorialStep]
  )

  // Tour completion
  const handleTutorialComplete = useCallback(() => {
    setTutorialOpen(false)
    if (user && !isGuest) {
      completeTutorial()
    }
  }, [user, isGuest, completeTutorial])

  // Tour requests expense modal open (for category grid step)
  const handleTourOpenExpense = useCallback(() => {
    setTxKind("expense")
    setTxModalOpen(true)
  }, [])

  // Tour done with expense modal
  const handleTourCloseExpense = useCallback(() => {
    setTxModalOpen(false)
  }, [])

  if (loading || (user && loadingProfile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A120D]">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#3D784E]/25" />
      </div>
    )
  }

  // Pre-Login Catcher Screen for unauthenticated visitors
  if (!user) {
    return <LandingCatcherScreen />
  }

  if (profile?.is_suspended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm rounded-[2.5rem] border border-rose-500/30 bg-card p-6 text-center space-y-4 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <span className="text-2xl">🛑</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground">Account Suspended</h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {profile.suspended_reason || "Your account has been temporarily suspended by an administrator."}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground bg-secondary/50 p-3 rounded-2xl">
            If you believe this is an error, please contact support at support@pawi.app.
          </p>
        </div>
      </div>
    )
  }

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
              onNavigateToPlan={() => {
                setPlanInitialSubScreen(null)
                setTab("plan")
              }}
              onNavigateToGoals={() => {
                setPlanInitialSubScreen("goals")
                setTab("plan")
              }}
              onNavigateToDebt={() => {
                setPlanInitialSubScreen("debt")
                setTab("plan")
              }}
              onNavigateToReceivables={() => {
                setPlanInitialSubScreen("receivables")
                setTab("plan")
              }}
              onNavigateToWallets={(walletId?: string) => {
                setSelectedWalletId(walletId || null)
                setTab("wallets")
              }}
            />
          )}

          {tab === "wallets" && (
            <WalletsScreen
              initialSelectedWalletId={selectedWalletId}
              initialFilter={selectedWalletId ? "liabilities" : "all"}
            />
          )}
          {tab === "plan" && <PlanScreen initialSubScreen={planInitialSubScreen} />}
          {tab === "history" && <HistoryScreen />}
          {tab === "chat" && <ChatScreen onBack={() => setTab("home")} />}
          {tab === "settings" && (
            <div className="px-5 pt-4">
              <SettingsModule
                onStartTutorial={() => {
                  setTutorialInitialStep(0)
                  setTutorialOpen(true)
                }}
                onStartOnboarding={() => setShowOnboarding(true)}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

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

      {/* Mandatory Spotlight Product Tour */}
      <PawiSpotlightTour
        open={tutorialOpen}
        initialStep={tutorialInitialStep}
        onStepComplete={handleTourStepComplete}
        onComplete={handleTutorialComplete}
        onOpenExpenseModal={handleTourOpenExpense}
        onCloseExpenseModal={handleTourCloseExpense}
      />

      {/* Contextual Push Permission Prompt */}
      <PushPermissionPrompt reason="onboarding_complete" />
    </main>
  )
}
