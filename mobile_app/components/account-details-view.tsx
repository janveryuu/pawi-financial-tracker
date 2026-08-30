"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import {
  ChevronLeft,
  Flag,
  Trash2,
  Edit2,
  ArrowRightLeft,
  SlidersHorizontal,
  MinusCircle,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Image as ImageIcon,
  Check,
  HelpCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  X,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, Transaction, formatMoney, getWalletBrandLogo, getWalletBrandColor } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface AccountDetailsViewProps {
  wallet: Wallet
  onBack: () => void
  onOpenTransfer: (walletName: string) => void
  onOpenAddExpense: (walletName: string) => void
  onOpenAddIncome: (walletName: string) => void
}

export function AccountDetailsView({
  wallet,
  onBack,
  onOpenTransfer,
  onOpenAddExpense,
  onOpenAddIncome,
}: AccountDetailsViewProps) {
  const { transactions, goals = [], plannedPayments = [], deleteWallet, updateWalletNotes, adjustWalletBalance, deleteTransaction } = useStore()

  const [isFlipped, setIsFlipped] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [notesText, setNotesText] = useState(wallet.notes || "")
  const [savedNotesMessage, setSavedNotesMessage] = useState(false)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState(wallet.balance.toString())
  const [adjustReason, setAdjustReason] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showSpendableHelp, setShowSpendableHelp] = useState(false)

  const brandLogo = getWalletBrandLogo(wallet.name)
  const walletTransactions = transactions.filter(
    (t) =>
      t.account.toLowerCase() === wallet.name.toLowerCase() ||
      t.account.toLowerCase().includes(wallet.name.toLowerCase())
  )

  const goalsLinked = goals
    .filter((g) => (g as any).category?.toLowerCase() === wallet.name.toLowerCase() || g.name.toLowerCase().includes(wallet.name.toLowerCase()))
    .reduce((s, g) => s + (Number(g.saved) || 0), 0)

  const netBalance = wallet.balance
  const spendable = wallet.spendable ?? Math.max(0, wallet.balance - goalsLinked)

  // Calculate totals for stats
  const walletIncome = walletTransactions
    .filter((t) => t.kind === "income")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const walletExpense = walletTransactions
    .filter((t) => t.kind === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

  const netIn = walletIncome - walletExpense
  const totalFlow = walletIncome + walletExpense
  const inflowPercent = totalFlow > 0 ? Math.round((walletIncome / totalFlow) * 100) : 100
  const outflowPercent = 100 - inflowPercent

  // Compute expected out from real planned payments for this account
  const expectedOut = plannedPayments
    .filter((p) => p.account?.toLowerCase() === wallet.name.toLowerCase() || p.account?.toLowerCase().includes(wallet.name.toLowerCase()))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  // Dynamic 7-day flow for this account
  const live7DayBars = useMemo(() => {
    const dayLetters = ["S", "M", "T", "W", "T", "F", "S"]
    const result = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const dayIdx = d.getDay()

      const dayExpense = walletTransactions
        .filter((t) => t.kind === "expense" && t.date && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

      const dayIncome = walletTransactions
        .filter((t) => t.kind === "income" && t.date && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

      result.push({
        day: dayLetters[dayIdx],
        amount: dayExpense + dayIncome,
        isExpense: dayExpense > dayIncome,
      })
    }

    const maxAmount = Math.max(...result.map((r) => r.amount), 0)
    const hasData = maxAmount > 0

    return result.map((r) => ({
      day: r.day,
      height: hasData ? Math.max(15, Math.min(100, Math.round((r.amount / maxAmount) * 100))) : 8,
      color: r.isExpense ? "#E05353" : "#3D784E",
    }))
  }, [walletTransactions])

  const handleSaveNotes = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateWalletNotes(wallet.id, notesText)
    setSavedNotesMessage(true)
    setTimeout(() => {
      setSavedNotesMessage(false)
      setIsFlipped(false)
    }, 900)
  }

  const handleConfirmAdjustment = () => {
    const newBal = parseFloat(adjustAmount)
    if (!isNaN(newBal)) {
      adjustWalletBalance(wallet.id, newBal, adjustReason)
      setShowAdjustmentModal(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-28 bg-background min-h-screen">
      {/* Top Bar (Image 3) */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Goals Badge Pill */}
        <div className="flex items-center gap-1.5 rounded-full border border-[#3D784E]/25 bg-[#3D784E]/10 px-3.5 py-1 text-xs font-black text-[#3D784E]">
          <Flag className="h-3.5 w-3.5 fill-[#3D784E]" />
          <span>Goals {formatMoney(goalsLinked, wallet.currency)}</span>
        </div>

        {/* Actions (Delete + Edit) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-colors"
            title="Delete Wallet"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground hover:bg-secondary transition-colors"
            title="Edit Details"
          >
            <Edit2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* 3D Flippable Hero Card (Images 3 & 4) */}
      <div
        className="perspective-1000 relative h-48 w-full cursor-pointer select-none"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="preserve-3d relative h-full w-full rounded-[2rem] shadow-xl"
        >
          {/* Card Front (Image 3) */}
          <div
            className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-[2rem] p-5 text-white shadow-md overflow-hidden"
            style={{ backgroundColor: getWalletBrandColor(wallet.name, wallet.type, wallet.accent) }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/20 p-1.5 shadow-inner">
                  {brandLogo ? (
                    <Image src={brandLogo} alt={wallet.name} fill className="object-contain p-1" />
                  ) : (
                    <span className="text-sm font-black">💳</span>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight leading-tight">{wallet.name}</h2>
                  <p className="text-xs text-white/80 font-medium">
                    {wallet.interestRate || wallet.subtitle}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs">
                {wallet.isLiability ? "Credit" : "Debit"}
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                  BALANCE
                </p>
                <p className="text-2xl font-black tracking-tight tabular-nums">
                  {formatMoney(wallet.balance, wallet.currency)}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-white/60">
                <RotateCw className="h-3 w-3" />
                <span>Tap to flip</span>
              </div>
            </div>
          </div>

          {/* Card Back (Image 4) */}
          <div
            className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-[2rem] p-5 text-white shadow-md overflow-hidden"
            style={{ backgroundColor: getWalletBrandColor(wallet.name, wallet.type, wallet.accent) }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-white/80">
                Notes
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    alert("Photo attachment feature enabled for offline receipts.")
                  }}
                  className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-white/30 transition-colors"
                >
                  <ImageIcon className="h-3 w-3" />
                  Add photo
                </button>
                <button
                  type="button"
                  onClick={() => setIsFlipped(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Note Area inside back of card */}
            <div className="my-1 flex-1 rounded-2xl bg-black/15 p-2.5 border border-white/10">
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Add account numbers, payment instructions, branch details, or a reminder"
                className="h-full w-full resize-none bg-transparent text-xs font-medium text-white placeholder:text-white/50 outline-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="flex items-center gap-1 rounded-full bg-white px-3.5 py-1 text-xs font-black text-foreground shadow-sm hover:bg-white/90 active:scale-95 transition-all"
              >
                {savedNotesMessage ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Balance & Actions Section (Images 3 & 5) */}
      <div className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm space-y-4">
        {/* Net Balance & Spendable Row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              NET BALANCE
            </p>
            <p className="mt-0.5 text-xl font-black tracking-tight text-foreground tabular-nums">
              {formatMoney(netBalance, wallet.currency)}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                SPENDABLE
              </p>
              <button
                type="button"
                onClick={() => setShowSpendableHelp(!showSpendableHelp)}
                className="text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-0.5 text-xl font-black tracking-tight text-foreground tabular-nums">
              {formatMoney(spendable, wallet.currency)}
            </p>
          </div>
        </div>

        {showSpendableHelp && (
          <p className="rounded-xl bg-secondary/60 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
            Spendable amount is your net balance minus linked goals & active reserves.
          </p>
        )}

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onOpenTransfer(wallet.name)}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-border/70 bg-secondary/40 py-2.5 text-xs font-black text-foreground hover:bg-secondary active:scale-95 transition-all"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-[#3D784E]" />
            Transfer
          </button>
          <button
            type="button"
            onClick={() => {
              setAdjustAmount(wallet.balance.toString())
              setShowAdjustmentModal(true)
            }}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-border/70 bg-secondary/40 py-2.5 text-xs font-black text-foreground hover:bg-secondary active:scale-95 transition-all"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#3D784E]" />
            Adjustment
          </button>
        </div>

        {/* Show / Hide Statistics Button */}
        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-secondary/50 py-2.5 text-xs font-black text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {showStats ? (
            <>
              <ChevronUp className="h-4 w-4" />
              <span>Hide statistics</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              <span>Show statistics</span>
            </>
          )}
        </button>

        {/* Expandable Graphs & Cashflow Section (Image 5) */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-2 border-t border-border/40 overflow-hidden"
            >
              {/* Rest of Month Cashflow */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black text-foreground">Rest of month</p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    EXPECTED CASHFLOW
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#3D784E]">
                      ↓ EXPECTED IN
                    </p>
                    <p className="mt-1 text-sm font-black text-emerald-600 tabular-nums">
                      +₱0.00
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                      ↑ EXPECTED OUT
                    </p>
                    <p className="mt-1 text-sm font-black text-rose-600 tabular-nums">
                      {expectedOut > 0 ? `-${formatMoney(expectedOut)}` : "₱0.00"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2 Graphs Row: In/Out Bar Chart + Donut Ring Chart */}
              <div className="grid grid-cols-2 gap-3">
                {/* 7-Day Bar Chart */}
                <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-background/50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                    7-DAY FLOW
                  </p>
                  <div className="my-2 flex h-16 items-end justify-between gap-1 px-1">
                    {live7DayBars.map((bar, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        <div className="h-12 w-full flex items-end justify-center">
                          <div
                            className="w-2 rounded-full transition-all"
                            style={{ height: `${bar.height}%`, backgroundColor: bar.color }}
                          />
                        </div>
                        <span className="text-[8px] font-bold text-muted-foreground">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Donut Ring Chart */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-background/50 p-3 text-center">
                  <div className="relative flex h-20 w-20 items-center justify-center">
                    {/* SVG Donut Ring */}
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      {/* Background ring */}
                      <path
                        className="text-border/60"
                        strokeWidth="4"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* Inflow green segment */}
                      {walletIncome > 0 && (
                        <path
                          className="text-[#3D784E]"
                          strokeDasharray={`${inflowPercent}, 100`}
                          strokeWidth="4"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      )}
                      {/* Outflow red segment */}
                      {walletExpense > 0 && (
                        <path
                          className="text-rose-500"
                          strokeDasharray={`${outflowPercent}, 100`}
                          strokeDashoffset={`-${inflowPercent}`}
                          strokeWidth="4"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      )}
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-[10px] font-black text-foreground leading-none">
                        {netIn === 0 ? "₱0.00" : formatMoney(Math.abs(netIn), wallet.currency)}
                      </span>
                      <span className="text-[7px] font-bold text-[#3D784E] uppercase">
                        {netIn >= 0 ? "NET IN" : "NET OUT"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Expense & Add Income Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onOpenAddExpense(wallet.name)}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-rose-500/10 py-3 text-xs font-black text-rose-600 hover:bg-rose-500/20 active:scale-95 transition-all"
          >
            <MinusCircle className="h-4 w-4" />
            Add expense
          </button>
          <button
            type="button"
            onClick={() => onOpenAddIncome(wallet.name)}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#3D784E]/12 py-3 text-xs font-black text-[#3D784E] hover:bg-[#3D784E]/20 active:scale-95 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            Add income
          </button>
        </div>
      </div>

      {/* Account Transaction History (Image 3) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-extrabold text-foreground">Transaction history</h3>
            <p className="text-[11px] text-muted-foreground font-medium">
              Expenses, income, balance adjustments, card payments, and transfers under this account.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xs divide-y divide-border/40">
          {walletTransactions.length > 0 ? (
            walletTransactions.map((tx) => {
              const isIncome = tx.kind === "income"
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3.5 transition-colors hover:bg-secondary/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        isIncome ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-500"
                      )}
                    >
                      {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-foreground">{tx.label}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {tx.category} {tx.date ? `• ${tx.date}` : tx.time ? `• ${tx.time}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "text-xs font-black tabular-nums",
                        isIncome ? "text-emerald-600" : "text-foreground"
                      )}
                    >
                      {isIncome ? "+" : "-"}
                      {formatMoney(tx.amount, tx.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteTransaction(tx.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground font-medium">
              No transactions recorded for this wallet yet.
            </div>
          )}
        </div>
      </div>

      {/* Balance Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-foreground">Adjust Balance</h3>
              <button
                type="button"
                onClick={() => setShowAdjustmentModal(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Enter the real verified balance of {wallet.name}. A balance adjustment entry will be recorded.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  New Balance ({wallet.currency})
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-sm font-black outline-none focus:ring-2 focus:ring-[#3D784E]"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Reason / Note
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Monthly statement reconciliation"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowAdjustmentModal(false)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjustment}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46]"
              >
                Save Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Wallet Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-extrabold text-foreground">Delete {wallet.name}?</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove this account ({formatMoney(wallet.balance, wallet.currency)})? Past transactions will remain in ledger.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteWallet(wallet.id)
                  setShowDeleteModal(false)
                  onBack()
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
