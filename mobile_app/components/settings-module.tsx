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
import { useAuth } from "@/lib/auth-context"
import { User, LogOut } from "lucide-react"

import { StoryOfPawiModal } from "./story-of-pawi-modal"

export interface SettingsModuleProps {
  onStartTutorial?: () => void
}

export function SettingsModule({ onStartTutorial }: SettingsModuleProps) {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { defaultCurrency, setDefaultCurrency, resetAccountData, loadSampleData, wallets, goals, budgets } = useStore()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showWipeDialog, setShowWipeDialog] = useState(false)
  const [showWipeSuccessModal, setShowWipeSuccessModal] = useState(false)
  const [showPopupWarningModal, setShowPopupWarningModal] = useState(false)

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User"
  const userEmail = user?.email || "Offline User"


  // Calculate quick health metrics
  const totalWalletsCount = wallets?.length || 0
  const totalBalance = (wallets || []).reduce((sum, w) => sum + (w.balance || 0), 0)
  const totalGoalsSaved = (goals || []).reduce((sum, g) => sum + (g.saved || 0), 0)
  const overBudgetCount = (budgets || []).filter(b => b.spent > b.limit).length
  const healthScore = overBudgetCount === 0 ? 95 : Math.max(60, 95 - overBudgetCount * 15)

  const symbolMap: Record<string, string> = { PHP: "₱", USD: "$", EUR: "€", GBP: "£", JPY: "¥" }
  const currSym = symbolMap[defaultCurrency] || "₱"

  const handlePrintPDF = () => {
    const formattedTotal = `${currSym}${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const printWin = window.open("", "_blank")
    if (!printWin) {
      setShowPopupWarningModal(true)
      return
    }

    const walletRows = (wallets || []).map(w => {
      const share = totalBalance > 0 ? ((w.balance / totalBalance) * 100).toFixed(1) : "0.0"
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${w.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${w.subtitle || w.type}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${currSym}${(w.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #059669; font-weight: 600;">${share}%</td>
        </tr>
      `
    }).join("")

    const goalRows = (goals || []).map(g => {
      const prog = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${g.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${g.category}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${currSym}${(g.saved || 0).toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${currSym}${(g.target || 0).toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #059669;">${prog}%</td>
        </tr>
      `
    }).join("")

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pawi Wealth & Savings Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 24px; font-weight: 800; color: #065f46; margin: 0; }
          .subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
          .summary-card { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 24px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
          .summary-label { font-size: 12px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-val { font-size: 30px; font-weight: 800; color: #065f46; margin-top: 4px; }
          .section-title { font-size: 17px; font-weight: 700; color: #111827; margin-top: 30px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
          th { background: #f3f4f6; text-align: left; padding: 12px 10px; font-weight: 700; color: #374151; border-bottom: 2px solid #e5e7eb; }
          .footer { text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">PAWI FINANCIAL AUDIT & WEALTH SUMMARY</h1>
            <div class="subtitle">Personal Savings, Wallets & Net Worth Statement • Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
          <div style="font-size: 28px;">🐢</div>
        </div>

        <div class="summary-card">
          <div>
            <div class="summary-label">Total Liquid Net Worth</div>
            <div class="summary-val">${formattedTotal}</div>
          </div>
          <div style="text-align: right;">
            <div class="summary-label">Active Savings Accounts</div>
            <div style="font-size: 22px; font-weight: 700; color: #047857; margin-top: 4px;">${wallets?.length || 0} Wallets</div>
          </div>
        </div>

        <div class="section-title">Wallet Savings Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Wallet Account</th>
              <th>Category</th>
              <th style="text-align: right;">Balance (${defaultCurrency})</th>
              <th style="text-align: right;">% of Net Worth</th>
            </tr>
          </thead>
          <tbody>
            ${walletRows || '<tr><td colspan="4" style="padding: 12px; text-align: center; color: #9ca3af;">No active wallets found</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">Savings Goals Progress</div>
        <table>
          <thead>
            <tr>
              <th>Goal Name</th>
              <th>Category</th>
              <th style="text-align: right;">Saved</th>
              <th style="text-align: right;">Target</th>
              <th style="text-align: right;">Progress</th>
            </tr>
          </thead>
          <tbody>
            ${goalRows || '<tr><td colspan="5" style="padding: 12px; text-align: center; color: #9ca3af;">No savings goals found</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Official Financial Summary Statement generated by Pawi Personal Finance Tracker • Secure Offline & Cloud Audit
        </div>
      </body>
      </html>
    `)
    printWin.document.close()
    printWin.focus()
    setTimeout(() => {
      printWin.print()
    }, 250)
  }

  return (
    <section className="flex flex-col gap-4 pb-24">
      {/* User Profile Card */}
      <div className="flex items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E] font-black text-base">
            {displayName[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-extrabold text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowLogoutDialog(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

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
          onClick={() => setShowReportModal(true)}
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
          onClick={() => setShowWipeDialog(true)}
          className="mt-3 w-full rounded-2xl bg-destructive py-3 text-sm font-bold text-white shadow-md shadow-destructive/20 transition-all hover:bg-destructive/90 active:scale-95"
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
                  await signOut()
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

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 rounded-3xl border border-border bg-card p-6 shadow-2xl scrollbar-hide">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Savings & Net Worth</h3>
                  <p className="text-xs text-muted-foreground">Pawi Wealth Summary Statement</p>
                </div>
              </div>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                {wallets?.length || 0} Wallets
              </span>
            </div>

            {/* Total Net Worth Box */}
            <div className="mt-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 to-primary/5 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Total Liquid Net Worth</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">
                {currSym}{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Wallet Savings Table */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Wallet Savings Breakdown</h4>
              <div className="space-y-2">
                {(wallets || []).map((w) => {
                  const share = totalBalance > 0 ? ((w.balance / totalBalance) * 100).toFixed(1) : "0.0"
                  return (
                    <div key={w.id} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3.5 py-2.5">
                      <div>
                        <p className="text-sm font-bold text-foreground">{w.name}</p>
                        <p className="text-[11px] text-muted-foreground">{w.subtitle || w.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{currSym}{(w.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-[11px] font-semibold text-primary">{share}% of total</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Goals Savings Table */}
            {(goals && goals.length > 0) && (
              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Savings Goals Progress</h4>
                <div className="space-y-2">
                  {goals.map((g) => {
                    const prog = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0
                    return (
                      <div key={g.id} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3.5 py-2.5">
                        <div>
                          <p className="text-sm font-bold text-foreground">{g.name}</p>
                          <p className="text-[11px] text-muted-foreground">{g.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{currSym}{(g.saved || 0).toLocaleString()} / {currSym}{(g.target || 0).toLocaleString()}</p>
                          <p className="text-[11px] font-semibold text-primary">{prog}% saved</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="flex-1 rounded-2xl border border-border bg-card py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintPDF}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Luxury Wipe Confirmation Modal */}
      {showWipeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm animate-in zoom-in-95 duration-200 rounded-3xl border border-destructive/40 bg-card p-6 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/15 border border-destructive/30 text-destructive shadow-lg shadow-destructive/20">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-foreground">Wipe All Account Data?</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              You are about to permanently reset all wallets, transactions, savings goals, and budgets. <span className="font-bold text-destructive">This action cannot be undone.</span>
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowWipeDialog(false)}
                className="flex-1 rounded-2xl border border-border bg-secondary/80 py-3.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resetAccountData?.()
                  setShowWipeDialog(false)
                  setShowWipeSuccessModal(true)
                }}
                className="flex-1 rounded-2xl bg-destructive py-3.5 text-xs font-bold text-white shadow-lg shadow-destructive/25 transition-all hover:bg-destructive/90 active:scale-95"
              >
                Yes, Wipe Clean
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Luxury Wipe Success Modal */}
      {showWipeSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm animate-in zoom-in-95 duration-200 rounded-3xl border border-emerald-500/40 bg-card p-6 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-foreground">Account Cleaned!</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              All financial records have been wiped cleanly. Your Pawi tracker is ready for a fresh start!
            </p>
            <button
              type="button"
              onClick={() => setShowWipeSuccessModal(false)}
              className="mt-6 w-full rounded-2xl bg-primary py-3.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Custom Popup Warning Modal */}
      {showPopupWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm animate-in zoom-in-95 duration-200 rounded-3xl border border-amber-500/40 bg-card p-6 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-lg shadow-amber-500/20">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-foreground">Popups Blocked</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Please allow browser popups on this site to print or download your PDF financial report.
            </p>
            <button
              type="button"
              onClick={() => setShowPopupWarningModal(false)}
              className="mt-6 w-full rounded-2xl bg-primary py-3.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      <StoryOfPawiModal open={showStoryModal} onClose={() => setShowStoryModal(false)} />
    </section>
  )
}
