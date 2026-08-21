"use client"

import { useState } from "react"
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
} from "lucide-react"
import { formatMoney, getWalletBrandLogo, type Wallet } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { AddWalletModal } from "../add-wallet-modal"
import { TransferModal } from "../transfer-modal"
import { TransactionEntryModal } from "../transaction-entry-modal"
import { AccountDetailsView } from "../account-details-view"

type AccountFilter = "all" | "assets" | "liabilities"

const DAILY_DOTS = [
  { day: "T", height: 25 },
  { day: "W", height: 40 },
  { day: "T", height: 75 },
  { day: "F", height: 90 },
  { day: "S", height: 15 },
  { day: "S", height: 50 },
  { day: "M", height: 30 },
]

export function WalletsScreen() {
  const { wallets } = useStore()

  const [activeFilter, setActiveFilter] = useState<AccountFilter>("all")
  const [showBalance, setShowBalance] = useState(true)
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txKind, setTxKind] = useState<"income" | "expense">("expense")

  // If a wallet is selected, show the rich AccountDetailsView (Images 3, 4, 5)
  if (selectedWallet) {
    // Keep reference updated in store
    const currentWallet = wallets.find((w) => w.id === selectedWallet.id) || selectedWallet
    return (
      <AccountDetailsView
        wallet={currentWallet}
        onBack={() => setSelectedWallet(null)}
        onOpenTransfer={() => setIsTransferOpen(true)}
        onOpenAddExpense={() => {
          setTxKind("expense")
          setTxModalOpen(true)
        }}
        onOpenAddIncome={() => {
          setTxKind("income")
          setTxModalOpen(true)
        }}
      />
    )
  }

  // Calculate Asset vs Liability totals
  const assetWallets = wallets.filter((w) => !w.isLiability)
  const liabilityWallets = wallets.filter((w) => w.isLiability)

  const totalAssetsPhp = assetWallets.reduce(
    (sum, w) => sum + (w.currency === "USD" ? w.balance * 57 : w.balance),
    0
  )
  const totalLiabilitiesPhp = liabilityWallets.reduce(
    (sum, w) => sum + (w.currency === "USD" ? w.balance * 57 : w.balance),
    0
  )

  // Categorize wallets by group
  const eWallets = wallets.filter((w) => w.group === "ewallet" || (!w.group && w.type === "ewallet"))
  const bankAccounts = wallets.filter(
    (w) => w.group === "bank" || (!w.group && (w.type === "savings" || w.type === "cash"))
  )
  const creditCards = wallets.filter((w) => w.group === "credit" || (!w.group && w.type === "card"))
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

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-28">
      {/* Top Header (Image 1) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Accounts</h1>
          <p className="text-xs text-muted-foreground font-medium">Manage your wallets and balances</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground hover:bg-secondary transition-colors"
            title="Archive"
          >
            <Folder className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1 rounded-2xl border border-[#3D784E]/30 bg-[#3D784E]/10 px-3 py-2 text-xs font-black text-[#3D784E] hover:bg-[#3D784E]/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Hero Mascot Banner: Assets Total (Image 1) */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#3D784E] p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          {/* Mascot in cap on left */}
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/10 p-1">
            <Image
              src="/pawi-holding-wallet.png"
              alt="Pawi"
              fill
              className="object-contain"
            />
          </div>

          {/* White card on right with Assets and Filter */}
          <div className="flex-1 rounded-[1.75rem] bg-white p-3.5 text-foreground shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  ASSETS
                </span>
                <p className="mt-0.5 text-xl font-black tracking-tight text-foreground tabular-nums">
                  {showBalance ? formatMoney(totalAssetsPhp || 270494.22) : "••••••••"}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Accounts and receivables
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
            <div className="mt-3 flex items-center gap-1.5 rounded-full bg-secondary/70 p-1">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "flex-1 rounded-full py-1 text-[10px] font-black transition-all",
                  activeFilter === "all" ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("assets")}
                className={cn(
                  "flex-1 rounded-full py-1 text-[10px] font-black transition-all",
                  activeFilter === "assets" ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground"
                )}
              >
                Assets
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("liabilities")}
                className={cn(
                  "flex-1 rounded-full py-1 text-[10px] font-black transition-all",
                  activeFilter === "liabilities" ? "bg-[#3D784E] text-white shadow-xs" : "text-muted-foreground"
                )}
              >
                Liabilities
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Insight & Daily Balance Row (Image 1) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Insight Card */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-black">
            <span className="uppercase tracking-wider text-[#3D784E]">INSIGHT</span>
            <span className="text-muted-foreground flex items-center gap-0.5">Forecast &gt;</span>
          </div>
          <p className="my-2 text-[11px] leading-tight font-medium text-foreground/80">
            &quot;You&apos;re in the zone where the money starts looking deliberate and mature, not just well-behaved.&quot;
          </p>
        </div>

        {/* Daily Balance Mini Chart */}
        <div className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-3.5 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            DAILY BALANCE
          </p>
          <div className="my-1 flex h-14 items-end justify-between gap-1 px-1">
            {DAILY_DOTS.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className="h-10 w-full flex items-end justify-center">
                  <div
                    className="w-2 rounded-full bg-[#3D784E]/30"
                    style={{ height: `${d.height}%` }}
                  />
                </div>
                <span className="text-[8px] font-bold text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reorder text */}
      <p className="text-[10px] text-muted-foreground font-semibold px-1">
        Press and hold an account card to rearrange it.
      </p>

      {/* Account Categories (Images 1 & 2) */}
      <div className="space-y-4">
        {/* 1. E-wallets */}
        {shouldShowAssets && eWallets.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-xs font-black text-foreground">E-wallets</h2>
              <span className="text-xs font-black text-foreground tabular-nums">
                {formatMoney(eWalletsTotal)}
              </span>
            </div>

            <div className="space-y-2.5">
              {eWallets.map((wallet) => {
                const logo = getWalletBrandLogo(wallet.name)
                return (
                  <div
                    key={wallet.id}
                    onClick={() => setSelectedWallet(wallet)}
                    className="group relative flex cursor-pointer flex-col justify-between rounded-[1.75rem] p-4 text-white shadow-md transition-all active:scale-[0.99]"
                    style={{ backgroundColor: wallet.accent || "#1A73E8" }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/20 p-1">
                          {logo ? (
                            <Image src={logo} alt={wallet.name} fill className="object-contain p-0.5" />
                          ) : (
                            <Smartphone className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black leading-none">{wallet.name}</p>
                          <p className="text-[10px] text-white/80 font-medium mt-0.5">{wallet.subtitle}</p>
                        </div>
                      </div>
                      <MoreHorizontal className="h-4 w-4 text-white/70" />
                    </div>

                    <div className="mt-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/70">
                        BALANCE
                      </span>
                      <p className="text-xl font-black tracking-tight tabular-nums">
                        {formatMoney(wallet.balance, wallet.currency)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 2. Bank Accounts (2 per row grid) */}
        {shouldShowAssets && bankAccounts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-xs font-black text-foreground">Bank Accounts</h2>
              <span className="text-xs font-black text-foreground tabular-nums">
                {formatMoney(bankAccountsTotal)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {bankAccounts.map((wallet) => {
                const logo = getWalletBrandLogo(wallet.name)
                return (
                  <div
                    key={wallet.id}
                    onClick={() => setSelectedWallet(wallet)}
                    className="relative flex cursor-pointer flex-col justify-between rounded-[1.75rem] p-4 text-white shadow-md transition-all active:scale-[0.99] min-h-[140px]"
                    style={{ backgroundColor: wallet.accent || "#E53E3E" }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/20 p-1">
                        {logo ? (
                          <Image src={logo} alt={wallet.name} fill className="object-contain p-0.5" />
                        ) : (
                          <Building className="h-4 w-4" />
                        )}
                      </div>
                      <MoreHorizontal className="h-4 w-4 text-white/70" />
                    </div>

                    <div>
                      <p className="text-xs font-black leading-tight truncate">{wallet.name}</p>
                      <p className="text-[9px] text-white/80 font-medium truncate mt-0.5">
                        {wallet.interestRate || wallet.subtitle}
                      </p>
                    </div>

                    <div className="mt-2">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/70">
                        BALANCE
                      </span>
                      <p className="text-base font-black tracking-tight tabular-nums">
                        {formatMoney(wallet.balance, wallet.currency)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 3. Credit Cards (Liabilities with credit progress meters) */}
        {shouldShowLiabilities && creditCards.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-xs font-black text-foreground">Credit Cards</h2>
              <span className="text-xs font-black text-rose-500 tabular-nums">
                -{formatMoney(creditCardsTotal)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {creditCards.map((wallet) => {
                const logo = getWalletBrandLogo(wallet.name)
                const used = wallet.usedCredit ?? wallet.balance
                const limit = wallet.creditLimit ?? 50000
                const pct = limit > 0 ? Math.round((used / limit) * 100) : 16
                const left = Math.max(0, limit - used)

                return (
                  <div
                    key={wallet.id}
                    onClick={() => setSelectedWallet(wallet)}
                    className="relative flex cursor-pointer flex-col justify-between rounded-[1.75rem] p-4 text-white shadow-md transition-all active:scale-[0.99] min-h-[160px]"
                    style={{ backgroundColor: wallet.accent || "#D97706" }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/20 p-1">
                        {logo ? (
                          <Image src={logo} alt={wallet.name} fill className="object-contain p-0.5" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                      </div>
                      <MoreHorizontal className="h-4 w-4 text-white/70" />
                    </div>

                    <div className="my-1">
                      <p className="text-xs font-black leading-tight truncate">{wallet.name}</p>
                      <p className="text-[9px] text-white/80 font-medium truncate mt-0.5">
                        Credit · PHP · due day {wallet.dueDay || 12}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[8px] font-black text-white/80 mb-1">
                        <span>USED CREDIT</span>
                        <span>{pct}% used</span>
                      </div>
                      {/* Meter Bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/20">
                        <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[8px] font-bold text-white/80 mt-1">
                        <span className="text-xs font-black text-white">{formatMoney(used)}</span>
                        <span>{formatMoney(left)} left</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 4. Loans */}
        {shouldShowLiabilities && loans.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-xs font-black text-foreground">Loans</h2>
              <span className="text-xs font-black text-rose-500 tabular-nums">
                -{formatMoney(loansTotal)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {loans.map((wallet) => (
                <div
                  key={wallet.id}
                  onClick={() => setSelectedWallet(wallet)}
                  className="relative flex cursor-pointer flex-col justify-between rounded-[1.75rem] p-4 text-white shadow-md transition-all active:scale-[0.99] min-h-[140px]"
                  style={{ backgroundColor: wallet.accent || "#0D9488" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <FileText className="h-4 w-4" />
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-white/70" />
                  </div>

                  <div>
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
      <TransferModal open={isTransferOpen} onClose={() => setIsTransferOpen(false)} />
      <TransactionEntryModal
        open={txModalOpen}
        kind={txKind}
        onClose={() => setTxModalOpen(false)}
      />
    </div>
  )
}
