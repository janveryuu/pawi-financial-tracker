"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
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

export default function Page() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<TabId>("home")
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txKind, setTxKind] = useState<"income" | "expense">("income")
  const [transferOpen, setTransferOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#3D784E]/25" />
      </div>
    )
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
              <SettingsModule onStartTutorial={() => setTutorialOpen(true)} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Floating Bottom Nav with Speed Dial (Image 2 & 3) */}
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
        onClose={() => setTutorialOpen(false)}
      />
    </main>
  )
}
