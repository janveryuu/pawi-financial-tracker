import { useState } from "react"
import {
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  WifiOff,
  Sun,
  Moon,
  BookOpen,
  Sparkles,
  RefreshCw,
  Database,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useStore } from "@/lib/store"

import { StoryOfPawiModal } from "./story-of-pawi-modal"

const dataActions = [
  { label: "Export JSON", icon: FileJson, kind: "export" as const },
  { label: "Import JSON", icon: FileJson, kind: "import" as const },
  { label: "Export CSV", icon: FileSpreadsheet, kind: "export" as const },
  { label: "Import CSV", icon: FileSpreadsheet, kind: "import" as const },
]

export interface SettingsModuleProps {
  onStartTutorial?: () => void
}

export function SettingsModule({ onStartTutorial }: SettingsModuleProps) {
  const { theme, setTheme } = useTheme()
  const { defaultCurrency, setDefaultCurrency, resetAccountData, loadSampleData } = useStore()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)

  return (
    <section className="flex flex-col gap-4 pb-24">
      
      {/* Story of Pawi Card */}
      <button
        onClick={() => setShowStoryModal(true)}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 to-primary/5 p-5 text-left shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">The Story of Pawi</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Read the backstory of your financial guide.</p>
          </div>
        </div>
      </button>

      {/* Replay Pawi's Interactive Tour */}
      {onStartTutorial && (
        <button
          onClick={onStartTutorial}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/15 via-primary/10 to-card p-5 text-left shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/25 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Interactive Tour with Pawi</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Replay Pawi&apos;s guided onboarding tutorial.</p>
            </div>
          </div>
        </button>
      )}

      <div className="flex items-center gap-2 mt-2">
        <WifiOff className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Data Management
        </h2>
      </div>
      <p className="-mt-2 text-pretty text-xs leading-relaxed text-muted-foreground">
        Your data is securely synced to the cloud. You can still export a backup anytime.
      </p>

      <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm mb-2">
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
            className="rounded-xl border border-border/60 bg-secondary/50 px-3 py-1.5 text-sm font-medium text-foreground outline-none focus:border-primary"
          >
            <option value="PHP">PHP (₱)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {dataActions.map((action) => {
          const Arrow = action.kind === "export" ? Download : Upload
          return (
            <button
              key={action.label}
              type="button"
              className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-3.5 text-left transition-colors hover:bg-secondary"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <action.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {action.label}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Arrow className="h-3 w-3" />
                  {action.kind === "export" ? "Save locally" : "Restore data"}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Reset & Sample Data Management */}
      <div className="grid grid-cols-2 gap-3 mt-1">
        <button
          type="button"
          onClick={async () => {
            if (confirm("Reset account database to a clean empty state? All transactions and goals will be cleared.")) {
              await resetAccountData?.()
              alert("Account reset to clean state successfully!")
            }
          }}
          className="flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-left transition-colors hover:bg-red-500/20"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-500">
            <RefreshCw className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-red-500">
              Reset Clean
            </span>
            <span className="block text-[11px] text-red-500/80">
              Wipe sample data
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={async () => {
            if (confirm("Load Pawi sample demo data (wallets, goals, transactions)?")) {
              await loadSampleData?.()
              alert("Sample demo data loaded successfully!")
            }
          }}
          className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-3.5 text-left transition-colors hover:bg-secondary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Database className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-foreground">
              Demo Data
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Load sample items
            </span>
          </span>
        </button>
      </div>

      <div className="rounded-3xl border border-destructive/30 bg-destructive/8 p-4">
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

      <StoryOfPawiModal open={showStoryModal} onClose={() => setShowStoryModal(false)} />
    </section>
  )
}
