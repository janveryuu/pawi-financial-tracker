"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import {
  Folder,
  Plus,
  Eye,
  EyeOff,
  ChevronRight,
  MoreHorizontal,
  FileText,
  CreditCard,
  Building,
  Smartphone,
  Banknote,
  Sparkles,
  Layers,
  X,
} from "lucide-react"
import { formatMoney, getWalletBrandLogo, type Wallet } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { AddWalletModal } from "../add-wallet-modal"
import { TransferModal } from "../transfer-modal"
import { TransactionEntryModal } from "../transaction-entry-modal"
import { AccountDetailsView } from "../account-details-view"

type AccountFilter = "all" | "assets" | "liabilities"

export function WalletsScreen() {
  const { wallets, transactions = [] } = useStore()

  const [activeFilter, setActiveFilter] = useState<AccountFilter>("all")
  const [showBalance, setShowBalance] = useState(true)
  const [walletTipIndex, setWalletTipIndex] = useState(0)
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null)
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [transferPresetWallet, setTransferPresetWallet] = useState<string | undefined>(undefined)
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txKind, setTxKind] = useState<"income" | "expense">("expense")
  const [txPresetWallet, setTxPresetWallet] = useState<string | undefined>(undefined)
  const [showFolderModal, setShowFolderModal] = useState(false)

  // Calculate Asset vs Liability totals
  const assetWallets = wallets.filter((w) => !w.isLiability)
  const liabilityWallets = wallets.filter((w) => w.isLiability)

  const totalAssetsPhp = assetWallets.reduce(
    (sum, w) => sum + (w.currency === "USD" ? w.balance * 57 : w.balance),
    0
  )
  const totalLiabilitiesPhp = liabilityWallets.reduce(
    (sum, w) => sum + (w.currency === "USD" ? (w.usedCredit || w.balance) * 57 : (w.usedCredit || w.balance)),
    0
  )
  const netWorthPhp = totalAssetsPhp - totalLiabilitiesPhp

  // Dynamic Banner Configuration depending on Active Filter
  const bannerConfig = {
    all: {
      title: "TOTAL NET WORTH",
      amount: netWorthPhp > 0 ? netWorthPhp : (totalAssetsPhp || 77810),
      subtitle: "Total net balance across accounts",
    },
    assets: {
      title: "ASSETS",
      amount: totalAssetsPhp || 77810,
      subtitle: "Accounts and receivables",
    },
    liabilities: {
      title: "LIABILITIES",
      amount: totalLiabilitiesPhp || 0,
      subtitle: "Debts and credit cards",
    },
  }[activeFilter]

  // Categorize wallets by group
  const eWallets = wallets.filter((w) => !w.isLiability && (w.group === "ewallet" || (!w.group && w.type === "ewallet")))
  const bankAccounts = wallets.filter(
    (w) => !w.isLiability && (w.group === "bank" || (!w.group && (w.type === "savings" || w.type === "cash")))
  )
  const creditCards = wallets.filter((w) => w.isLiability || w.group === "credit" || (!w.group && w.type === "card"))
  const loans = wallets.filter((w) => w.group === "loan" || (!w.group && w.type === "loan"))

  const eWalletsTotal = eWallets.reduce((s, w) => s + w.balance, 0)
  const bankAccountsTotal = bankAccounts.reduce(
    (s, w) => s + (w.currency === "USD" ? w.balance * 57 : w.balance),
    0
  )
  const creditCardsTotal = creditCards.reduce((s, w) => s + (w.usedCredit || w.balance), 0)
  const loansTotal = loans.reduce((s, w) => s + w.balance, 0)

  const shouldShowAssets = activeFilter === "all" || activeFilter === "assets"
  const shouldShowLiabilities = activeFilter === "all" || activeFilter === "liabilities"

  // 1. Dynamic 7-day calculation ending on today
  const dailyBalanceData = useMemo(() => {
    const dayLetters = ["S", "M", "T", "W", "T", "F", "S"]
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const result = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const dayIdx = d.getDay()

      // Calculate total expenses for this day from store transactions
      const dayExpenses = (transactions || [])
        .filter((t) => {
          if (t.kind !== "expense") return false
          if (t.date && t.date.startsWith(dateStr)) return true
          return false
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

      result.push({
        dateStr,
        day: dayLetters[dayIdx],
        dayName: dayNames[dayIdx],
        isToday: i === 0,
        amount: dayExpenses,
        fallbackHeight: [35, 50, 75, 95, 20, 60, 85][6 - i],
      })
    }

    const maxSpend = Math.max(...result.map((r) => r.amount), 0)
    const hasRealData = maxSpend > 0

    return result.map((r) => {
      const heightPercent = hasRealData
        ? Math.max(18, Math.min(100, Math.round((r.amount / maxSpend) * 100)))
        : r.fallbackHeight
      const displayAmount = hasRealData ? r.amount : r.fallbackHeight * 25

      return {
        ...r,
        heightPercent,
        displayAmount,
      }
    })
  }, [transactions])

  const total7DaySpend = dailyBalanceData.reduce((sum, d) => sum + d.displayAmount, 0)
  const avgDailySpend = Math.round(total7DaySpend / 7)

  // 2. Dynamic smart insights based on account state & active filter
  const currentInsights = useMemo(() => {
    const insights: string[] = []

    if (activeFilter === "liabilities") {
      if (totalLiabilitiesPhp > 0) {
        insights.push(
          `May ₱${totalLiabilitiesPhp.toLocaleString()} kang kabuuang liabilities. Bayaran bago ang cut-off para iwas interest!`,
          "Panatilihing mababa sa 30% ang credit utilization mo para manatiling stellar ang credit rating.",
          "Mag-set ng auto-debit para sa minimum payment para hindi ma-late sa due date."
        )
      } else {
        insights.push(
          "Walang active liabilities! Malinis ang record mo at 100% debt-free ka ngayon.",
          "Gamitin ang credit card bilang tool para sa rewards at cashbacks, basta bayaran agad in full.",
          "Laging i-review ang SOA (Statement of Account) para ma-spot agad ang unauthorized charges."
        )
      }
    } else {
      const topWallet = [...assetWallets].sort((a, b) => b.balance - a.balance)[0]
      if (topWallet && topWallet.balance > 0) {
        insights.push(
          `Pinakamalaki ang pondo mo sa ${topWallet.name} (${formatMoney(topWallet.balance)}). Ligtas at lumalago!`,
          netWorthPhp > 50000
            ? `Nasa ₱${netWorthPhp.toLocaleString()} na ang net worth mo! Napakagandang pundasyon para sa future.`
            : "Nasa green zone ka ngayon! Proud ako sa'yo, kontrolado mo ang finances mo.",
          "Ugaliing magtabi agad ng savings pagdating ng sahod bago magsimulang gumastos.",
          "Maliit man ang simula, kapag tuloy-tuloy, malaki ang mararating ng iyong ipon!",
          "Subaybayan ang bawat bayarin para maiwasan ang mga penalties at surprise fees."
        )
      } else {
        insights.push(
          "Nasa green zone ka ngayon! Proud ako sa'yo, kontrolado mo ang finances mo.",
          "Ang bawat pisong naiipon mo ngayon ay pundasyon ng iyong kalayaan bukas.",
          "Ugaliing magtabi agad ng savings pagdating ng sahod bago magsimulang gumastos.",
          "Maliit man ang simula, kapag tuloy-tuloy, malaki ang mararating ng iyong ipon!",
          "Subaybayan ang bawat bayarin para maiwasan ang mga penalties at interest."
        )
      }
    }

    return insights
  }, [activeFilter, assetWallets, totalLiabilitiesPhp, netWorthPhp])

  const safeTipIndex = walletTipIndex % (currentInsights.length || 1)
  const currentTip = currentInsights[safeTipIndex] || currentInsights[0]

  const handleNextWalletTip = () => {
    setWalletTipIndex((prev) => (prev + 1) % currentInsights.length)
  }

  // If a wallet is selected, show the rich AccountDetailsView
  if (selectedWallet) {
    const currentWallet = wallets.find((w) => w.id === selectedWallet.id) || selectedWallet
    return (
      <>
        <AccountDetailsView
          wallet={currentWallet}
          onBack={() => setSelectedWallet(null)}
          onOpenTransfer={(wName) => {
            setTransferPresetWallet(wName)
            setIsTransferOpen(true)
          }}
          onOpenAddExpense={(wName) => {
            setTxPresetWallet(wName)
            setTxKind("expense")
            setTxModalOpen(true)
          }}
          onOpenAddIncome={(wName) => {
            setTxPresetWallet(wName)
            setTxKind("income")
            setTxModalOpen(true)
          }}
        />

        {/* Modals placed here so they open over AccountDetailsView */}
        <AddWalletModal open={isAddOpen} onClose={() => setIsAddOpen(false)} />
        <TransferModal
          open={isTransferOpen}
          initialFrom={transferPresetWallet}
          onClose={() => setIsTransferOpen(false)}
        />
        <TransactionEntryModal
          open={txModalOpen}
          kind={txKind}
          initialAccount={txPresetWallet}
          onClose={() => setTxModalOpen(false)}
        />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Accounts</h1>
          <p className="text-xs text-muted-foreground font-semibold">Manage your wallets and balances</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFolderModal(true)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground hover:bg-secondary transition-colors"
            title="Archive & Categories"
          >
            <Folder className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1 rounded-2xl border border-[#3D784E]/30 bg-[#3D784E]/10 px-3 py-2 text-xs font-black text-[#3D784E] hover:bg-[#3D784E]/20 transition-colors shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Hero Mascot Banner: Tight Capsule with Big Pop-Out Mascot */}
      <div className="relative rounded-[2.25rem] bg-[#3D784E] p-1.5 pl-2 text-white shadow-md select-none mt-2">
        <div className="flex items-center gap-2">
          {/* Pop-out Mascot Graphic: Centered vertically in the green rectangle */}
          <div className="relative -my-7 -ml-2 h-28 w-28 shrink-0 z-10 pointer-events-none">
            <Image
              src="/pawi-holding-wallet.png"
              alt="Pawi"
              fill
              priority
              className="object-contain drop-shadow-xl scale-150 origin-center"
            />
          </div>

          {/* White Speech Bubble Card on Right */}
          <div className="relative z-0 flex-1 rounded-[1.75rem] bg-white px-3.5 py-2 text-foreground shadow-xs">
            {/* Speech bubble pointer arrow */}
            <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-white" />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  {bannerConfig.title}
                </span>
                <p className="text-xl font-black tracking-tight text-foreground tabular-nums leading-tight">
                  {showBalance ? formatMoney(bannerConfig.amount) : "••••••••"}
                </p>
                <p className="text-[9px] text-muted-foreground font-semibold">
                  {bannerConfig.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Toggle balance visibility"
              >
                {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>

            {/* Filter Pills [All] [Assets] [Liabilities] */}
            <div className="mt-1.5 flex items-center gap-1 rounded-full bg-secondary/80 p-0.5 border border-border/60">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "flex-1 rounded-full py-0.5 text-[10px] font-black transition-all",
                  activeFilter === "all" ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("assets")}
                className={cn(
                  "flex-1 rounded-full py-0.5 text-[10px] font-black transition-all",
                  activeFilter === "assets" ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Assets
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("liabilities")}
                className={cn(
                  "flex-1 rounded-full py-0.5 text-[10px] font-black transition-all",
                  activeFilter === "liabilities" ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Liabilities
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Insight & Daily Balance Row */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Insight Card: Interactive Pawi Wisdom */}
        <div
          onClick={handleNextWalletTip}
          className="group relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-3.5 shadow-xs cursor-pointer hover:border-[#3D784E]/50 active:scale-[0.98] transition-all select-none min-h-[145px]"
          title="Tap to cycle next tip from Pawi!"
        >
          <div>
            <div className="flex items-center justify-between text-[10px] font-black">
              <span className="uppercase tracking-wider text-[#3D784E] flex items-center gap-1">
                <span>💡</span> INSIGHT
              </span>
              <span className="text-[9px] text-muted-foreground/80 font-bold group-hover:text-[#3D784E] transition-colors flex items-center gap-0.5">
                Next →
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-snug font-bold text-foreground line-clamp-4">
              {currentTip}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[9px] font-black text-[#2E683E] dark:text-[#4ADE80]">
              Pawi Wisdom 🐢
            </span>
            {/* Dots indicator */}
            <div className="flex items-center gap-1">
              {currentInsights.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i === safeTipIndex ? "w-2.5 bg-[#3D784E]" : "w-1 bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Daily Balance Mini Chart */}
        <div className="relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-3.5 shadow-xs select-none min-h-[145px]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              {activeFilter === "liabilities" ? "DEBT TREND" : "DAILY BALANCE"}
            </p>
            <span className="text-[9px] font-black text-[#3D784E]">
              {activeFilter === "liabilities" ? "Controlled" : "+12% wk"}
            </span>
          </div>

          {/* 7 Vertical Bars */}
          <div className="my-1.5 flex h-14 items-end justify-between gap-1 px-0.5">
            {dailyBalanceData.map((dot, idx) => {
              const isHovered = hoveredBarIndex === idx
              return (
                <div
                  key={idx}
                  onClick={() => setHoveredBarIndex(hoveredBarIndex === idx ? null : idx)}
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                  className="group/bar relative flex flex-col items-center gap-1 flex-1 cursor-pointer"
                >
                  {/* Tooltip on hover/tap */}
                  {isHovered && (
                    <div className="absolute -top-7 z-20 whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 text-[8px] font-black text-background shadow-md pointer-events-none">
                      {dot.dayName}: ₱{dot.displayAmount.toLocaleString()}
                    </div>
                  )}

                  <div className="h-10 w-full flex items-end justify-center">
                    <div
                      className={cn(
                        "w-2.5 min-h-[6px] rounded-full transition-all duration-300",
                        activeFilter === "liabilities"
                          ? dot.isToday
                            ? "bg-rose-500 shadow-2xs scale-y-105"
                            : isHovered
                            ? "bg-rose-500/70"
                            : "bg-rose-500/30"
                          : dot.isToday
                          ? "bg-[#3D784E] shadow-2xs scale-y-105"
                          : isHovered
                          ? "bg-[#3D784E]/70"
                          : "bg-[#3D784E]/30"
                      )}
                      style={{ height: `${dot.heightPercent}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-black transition-colors",
                      dot.isToday ? "text-[#3D784E] font-extrabold" : "text-muted-foreground"
                    )}
                  >
                    {dot.day}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground/80">
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground/60">
              7-Day Track
            </span>
            <span>Avg: ₱{avgDailySpend.toLocaleString()}/day</span>
          </div>
        </div>
      </div>

      {/* Dynamic Account Groups */}
      <div className="space-y-4">
        {/* 1. E-Wallets Section */}
        {shouldShowAssets && eWallets.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-[#3D784E]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  E-Wallets
                </h3>
              </div>
              <span className="text-xs font-black text-[#3D784E] tabular-nums">
                {formatMoney(eWalletsTotal)}
              </span>
            </div>

            <div className={cn("grid gap-2.5", eWallets.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
              {eWallets.map((wallet) => {
                const brandLogo = getWalletBrandLogo(wallet.name)
                return (
                  <div
                    key={wallet.id}
                    onClick={() => setSelectedWallet(wallet)}
                    className="flex flex-col justify-between rounded-3xl p-4 text-white shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: wallet.accent || "#007DFE" }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full drop-shadow-sm">
                        {brandLogo ? (
                          <Image src={brandLogo} alt={wallet.name} fill className="object-contain" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-white/20 text-xs font-black">
                            {wallet.name.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <MoreHorizontal className="h-4 w-4 text-white/70" />
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-black leading-tight truncate">{wallet.name}</p>
                      <p className="text-[9px] text-white/80 font-medium truncate mt-0.5">{wallet.subtitle}</p>
                    </div>

                    <div className="mt-2">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/70">
                        BALANCE
                      </span>
                      <p className="text-sm font-black tracking-tight tabular-nums">
                        {formatMoney(wallet.balance, wallet.currency)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 2. Bank Accounts Section */}
        {shouldShowAssets && bankAccounts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Building className="h-4 w-4 text-[#3D784E]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Bank Accounts & Cash
                </h3>
              </div>
              <span className="text-xs font-black text-[#3D784E] tabular-nums">
                {formatMoney(bankAccountsTotal)}
              </span>
            </div>

            <div className={cn("grid gap-2.5", bankAccounts.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
              {bankAccounts.map((wallet) => {
                const brandLogo = getWalletBrandLogo(wallet.name)
                return (
                  <div
                    key={wallet.id}
                    onClick={() => setSelectedWallet(wallet)}
                    className="flex flex-col justify-between rounded-3xl p-4 text-white shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: wallet.accent || "#0033A0" }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full drop-shadow-sm">
                        {brandLogo ? (
                          <Image src={brandLogo} alt={wallet.name} fill className="object-contain" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-white/20 text-xs font-black">
                            {wallet.name.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <MoreHorizontal className="h-4 w-4 text-white/70" />
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-black leading-tight truncate">{wallet.name}</p>
                      <p className="text-[9px] text-white/80 font-medium truncate mt-0.5">{wallet.subtitle}</p>
                    </div>

                    <div className="mt-2">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/70">
                        BALANCE
                      </span>
                      <p className="text-sm font-black tracking-tight tabular-nums">
                        {formatMoney(wallet.balance, wallet.currency)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 3. Credit Cards Section */}
        {shouldShowLiabilities && creditCards.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-rose-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Credit Cards
                </h3>
              </div>
              <span className="text-xs font-black text-rose-500 tabular-nums">
                {formatMoney(creditCardsTotal)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {creditCards.map((wallet) => {
                const brandLogo = getWalletBrandLogo(wallet.name)
                const used = wallet.usedCredit || wallet.balance || 0
                const limit = wallet.creditLimit || 50000
                const percentUsed = Math.min(100, Math.round((used / limit) * 100)) || 16
                const remaining = Math.max(0, limit - used)

                return (
                  <div
                    key={wallet.id}
                    onClick={() => setSelectedWallet(wallet)}
                    className="flex flex-col justify-between rounded-3xl p-4 text-white shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: wallet.accent || "#7C3AED" }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full drop-shadow-sm">
                        {brandLogo ? (
                          <Image src={brandLogo} alt={wallet.name} fill className="object-contain" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-white/20">
                            <CreditCard className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <MoreHorizontal className="h-4 w-4 text-white/70" />
                    </div>

                    <div className="mt-2.5">
                      <p className="text-xs font-black leading-tight truncate">{wallet.name}</p>
                      <p className="text-[9px] text-white/80 font-medium truncate mt-0.5">
                        Credit · {wallet.currency} · due day {wallet.dueDay || 15}
                      </p>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-white/80">
                        <span>USED CREDIT</span>
                        <span>{percentUsed}% used</span>
                      </div>
                      {/* Progress Bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full rounded-full bg-white transition-all"
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-xs font-black tracking-tight tabular-nums">
                          {formatMoney(used, wallet.currency)}
                        </span>
                        <span className="text-[8px] font-semibold text-white/80 tabular-nums">
                          {formatMoney(remaining, wallet.currency)} left
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 4. Loans & Debts Section */}
        {shouldShowLiabilities && loans.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Loans & Payables
                </h3>
              </div>
              <span className="text-xs font-black text-amber-500 tabular-nums">
                {formatMoney(loansTotal)}
              </span>
            </div>

            <div className={cn("grid gap-2.5", loans.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
              {loans.map((wallet) => (
                <div
                  key={wallet.id}
                  onClick={() => setSelectedWallet(wallet)}
                  className="flex flex-col justify-between rounded-3xl p-4 text-white shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: wallet.accent || "#0D9488" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <FileText className="h-4 w-4" />
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-white/70" />
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-black leading-tight truncate">{wallet.name}</p>
                    <p className="text-[9px] text-white/80 font-medium truncate mt-0.5">{wallet.subtitle}</p>
                  </div>

                  <div className="mt-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/70">
                      AMOUNT OWED
                    </span>
                    <p className="text-sm font-black tracking-tight tabular-nums">
                      {formatMoney(wallet.balance, wallet.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddWalletModal open={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <TransferModal
        open={isTransferOpen}
        initialFrom={transferPresetWallet}
        onClose={() => setIsTransferOpen(false)}
      />
      <TransactionEntryModal
        open={txModalOpen}
        kind={txKind}
        initialAccount={txPresetWallet}
        onClose={() => setTxModalOpen(false)}
      />

      {/* Archive & Categories Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-2xl text-foreground animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
                  <Folder className="h-4 w-4" />
                </div>
                <h3 className="text-base font-black text-foreground">Accounts Archive</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              All {wallets.length} accounts are currently active. You can archive accounts to hide them from daily reports without losing past transaction history.
            </p>
            <button
              type="button"
              onClick={() => setShowFolderModal(false)}
              className="w-full rounded-2xl bg-[#3D784E] py-3 text-xs font-black text-white shadow-md shadow-[#3D784E]/25 hover:bg-[#356B46]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
