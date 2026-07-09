import { useState } from "react"
import {
  AlertTriangle,
  WifiOff,
  Sun,
  Moon,
  BookOpen,
  Sparkles,
  Activity,
  Printer,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useStore } from "@/lib/store"

import { StoryOfPawiModal } from "./story-of-pawi-modal"

export interface SettingsModuleProps {
  onStartTutorial?: () => void
}

export function SettingsModule({ onStartTutorial }: SettingsModuleProps) {
  const { theme, setTheme } = useTheme()
  const { defaultCurrency, setDefaultCurrency, resetAccountData, loadSampleData, wallets, goals, budgets } = useStore()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)

  // Calculate quick health metrics
  const totalWalletsCount = wallets?.length || 0
  const totalBalance = (wallets || []).reduce((sum, w) => sum + (w.balance || 0), 0)
  const overBudgetCount = (budgets || []).filter(b => b.spent > b.limit).length
  const healthScore = overBudgetCount === 0 ? 95 : Math.max(60, 95 - overBudgetCount * 15)

  return (
    <section className="flex flex-col gap-4 pb-24">
      {/* Tutorial & Story Section */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onStartTutorial}
          className="flex items-center gap-3 rounded-3xl border border-primary/25 bg-primary/10 p-4 text-left transition-colors hover:bg-primary/15"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Replay Tutorial</p>
            <p className="text-[11px] text-muted-foreground">Learn Pawi basics</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowStoryModal(true)}
          className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-4 text-left shadow-sm transition-colors hover:bg-secondary"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Story of Pawi</p>
            <p className="text-[11px] text-muted-foreground">Why a sea turtle?</p>
          </div>
        </button>
      </div>

      {/* Offline Banner */}
      <div className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <WifiOff className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Offline-First Enabled
          </p>
          <p className="text-[11px] text-muted-foreground">
            All changes save locally to IndexedDB immediately and sync automatically.
          </p>
        </div>
      </div>

      {/* Theme & Currency Preferences */}
      <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Dark Mode</p>
              <p className="text-[11px] text-muted-foreground">Switch to {theme === 'dark' ? 'light' : 'dark'} theme</p>
            </div>
          </div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === "dark" ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Default Currency</p>
            <p className="text-[11px] text-muted-foreground">Used for total net worth</p>
          </div>
          <select
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value as any)}
            className="rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground outline-none"
          >
            <option value="PHP">₱ PHP</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
            <option value="JPY">¥ JPY</option>
          </select>
        </div>
      </div>

      {/* Useful Financial Tools */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setShowAuditModal(true)}
          className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/10 p-3.5 text-left transition-colors hover:bg-primary/20"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Activity className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-foreground">
              Health Checkup
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Audit score & tips
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-3.5 text-left transition-colors hover:bg-secondary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Printer className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-foreground">
              Print Report
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Save PDF summary
            </span>
          </span>
        </button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-3xl border border-destructive/30 bg-destructive/8 p-4 mt-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-semibold text-destructive">
            Danger Zone
          </h3>
        </div>
        <p className="mt-1.5 text-pretty text-xs leading-relaxed text-muted-foreground">
          Permanently delete all data associated with your account. This action
          cannot be undone.
        </p>
        <button
          type="button"
          onClick={async () => {
            if (confirm("⚠️ DANGER: Are you sure you want to permanently delete all data associated with your account? This action cannot be undone.")) {
              await resetAccountData?.()
              alert("All account data has been permanently wiped.")
            }
          }}
          className="mt-3 w-full rounded-2xl bg-destructive py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Wipe Account Data
        </button>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowLogoutDialog(true)}
          className="w-full rounded-2xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-destructive"
        >
          Log Out
        </button>
      </div>

      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 rounded-3xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">Log Out</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to log out of your account? You will need to log in again to access your data.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 rounded-xl bg-muted py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { auth } = await import("@/lib/firebase")
                  await auth.signOut()
                  setShowLogoutDialog(false)
                }}
                className="flex-1 rounded-xl bg-destructive py-3 text-sm font-semibold text-white transition-colors hover:bg-destructive/90"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Financial Checkup</h3>
                  <p className="text-xs text-muted-foreground">Pawi&apos;s live health audit</p>
                </div>
              </div>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                Score: {healthScore}/100
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-secondary/60 p-3.5">
                <span className="text-xs font-semibold text-muted-foreground">Active Wallets</span>
                <span className="text-sm font-bold text-foreground">{totalWalletsCount} Accounts</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-secondary/60 p-3.5">
                <span className="text-xs font-semibold text-muted-foreground">Budget Health</span>
                <span className={`text-sm font-bold ${overBudgetCount === 0 ? "text-primary" : "text-destructive"}`}>
                  {overBudgetCount === 0 ? "All On Track ✓" : `${overBudgetCount} Over Budget`}
                </span>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3.5">
                <p className="text-xs font-bold text-primary">🐢 Pawi&apos;s Recommendation</p>
                <p className="mt-1 text-xs text-foreground/90">
                  {overBudgetCount === 0
                    ? "Great job maintaining positive flow across your wallets! Keep funding your top goals consistently."
                    : "Review your spending limits and consider reallocating funds to stay within your targets."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAuditModal(false)}
              className="mt-6 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <StoryOfPawiModal open={showStoryModal} onClose={() => setShowStoryModal(false)} />
    </section>
  )
}
