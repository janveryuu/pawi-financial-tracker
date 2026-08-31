"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ChevronLeft,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  PieChart,
  X,
  Wallet as WalletIcon,
  Check,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react"
import { formatMoney, Budget, getBrandLogo, getWalletBrandLogo } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { AddBudgetModal } from "../add-budget-modal"

interface PlanBudgetsScreenProps {
  onBack: () => void
}

export function PlanBudgetsScreen({ onBack }: PlanBudgetsScreenProps) {
  const { budgets, deleteBudget, editBudget, wallets, addTransaction, defaultCurrency } = useStore()
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Edit Budget Modal state
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [editCategory, setEditCategory] = useState("")
  const [editLimit, setEditLimit] = useState("")

  // Top Up / Deposit to Budget Modal state
  const [topUpBudget, setTopUpBudget] = useState<Budget | null>(null)
  const [topUpAmount, setTopUpAmount] = useState("")
  const [deductFromWallet, setDeductFromWallet] = useState(false)
  const [selectedWalletName, setSelectedWalletName] = useState("")
  const [topUpError, setTopUpError] = useState<string | null>(null)
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false)

  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0)
  const totalLimit = budgets.reduce((s, b) => s + (b.limit || 0), 0)
  const overallPct = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0

  const handleOpenEdit = (b: Budget) => {
    setEditingBudget(b)
    setEditCategory(b.category)
    setEditLimit(b.limit.toString())
  }

  const handleSaveEdit = () => {
    if (!editingBudget || !editCategory || !editLimit) return
    const limitNum = parseFloat(editLimit)
    if (isNaN(limitNum) || limitNum <= 0) return

    const brandLogo = getBrandLogo(editCategory)

    editBudget({
      ...editingBudget,
      category: editCategory,
      limit: limitNum,
      icon: brandLogo || editingBudget.icon || "🍽️",
    })
    setEditingBudget(null)
  }

  const handleOpenTopUp = (b: Budget) => {
    setTopUpBudget(b)
    setTopUpAmount("")
    setTopUpError(null)
    setDeductFromWallet(false)
    setSelectedWalletName(wallets[0]?.name || "Cash")
  }

  const handleConfirmTopUp = async () => {
    if (!topUpBudget) return
    const amt = parseFloat(topUpAmount)
    if (isNaN(amt) || amt <= 0) {
      setTopUpError("Please enter a valid amount greater than 0.")
      return
    }

    if (deductFromWallet) {
      const sourceWallet = wallets.find(
        (w) => w.name.toLowerCase() === selectedWalletName.toLowerCase()
      )
      if (sourceWallet && sourceWallet.balance < amt) {
        setTopUpError(
          `Insufficient balance in ${sourceWallet.name} (Available: ${formatMoney(sourceWallet.balance, sourceWallet.currency)}).`
        )
        return
      }
    }

    setIsSubmittingTopUp(true)
    setTopUpError(null)

    try {
      // 1. If deducting from wallet, log a budget allocation expense
      if (deductFromWallet) {
        await addTransaction({
          label: `Budget Allocation: ${topUpBudget.category}`,
          amount: amt,
          category: "Savings",
          kind: "expense",
          account: selectedWalletName || (wallets[0]?.name ?? "Cash"),
          currency: defaultCurrency || "PHP",
          dateHeader: "Today",
        })
      }

      // 2. Increase the category budget limit
      const newLimit = (topUpBudget.limit || 0) + amt
      await editBudget({
        ...topUpBudget,
        limit: newLimit,
      })

      setTopUpBudget(null)
      setTopUpAmount("")
    } catch (err: any) {
      setTopUpError(err?.message || "Failed to add funds. Please try again.")
    } finally {
      setIsSubmittingTopUp(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-28 min-h-screen bg-background">
      {/* Top Header */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-black text-foreground">Category Budgets</h2>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#3D784E]/30 bg-[#3D784E]/10 text-[#3D784E] hover:bg-[#3D784E]/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Summary Card */}
      <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              MONTHLY BUDGET POOL
            </p>
            <p className="text-xl font-black text-foreground tabular-nums mt-0.5">
              {formatMoney(totalSpent, defaultCurrency)} / {formatMoney(totalLimit, defaultCurrency)}
            </p>
          </div>
          <span className="rounded-2xl bg-secondary px-3 py-1 text-xs font-black text-[#3D784E]">
            {overallPct}% spent
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              overallPct > 90 ? "bg-rose-500" : "bg-[#3D784E]"
            )}
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Budgets List */}
      <div className="space-y-3">
        {budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/60 p-8 text-center my-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#3D784E]/15 text-2xl mb-3">
              🎯
            </div>
            <h3 className="text-sm font-black text-foreground">No Category Budgets Yet</h3>
            <p className="text-xs text-muted-foreground font-medium max-w-xs mt-1 mb-5">
              Set spending limits for brands or categories like Groceries, Dining, Foodpanda, or Netflix.
            </p>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-[#3D784E] px-4 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#356B46] active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create Budget</span>
            </button>
          </div>
        ) : (
          budgets.map((b) => {
            const spent = b.spent || 0
            const limit = b.limit || 0
            const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
            const isOver = spent > limit
            const remaining = Math.max(0, limit - spent)
            const brandLogo = getBrandLogo(b.category) || (b.icon && b.icon.startsWith("/") ? b.icon : undefined)

            return (
              <div
                key={b.id}
                className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs space-y-3 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {brandLogo ? (
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card border border-border/60 p-1.5 shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={brandLogo}
                          alt={b.category}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-base">
                        {b.icon || "🍽️"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-foreground truncate">{b.category}</h3>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {isOver ? (
                          <span className="text-rose-500 font-bold">
                            Over by {formatMoney(spent - limit, defaultCurrency)}
                          </span>
                        ) : (
                          `${formatMoney(remaining, defaultCurrency)} left`
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-black text-foreground tabular-nums mr-1">
                      {formatMoney(spent, defaultCurrency)} / {formatMoney(limit, defaultCurrency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(b)}
                      title="Edit Budget"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBudget(b.id)}
                      title="Delete Budget"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isOver ? "#EF4444" : b.accent || "#3D784E",
                    }}
                  />
                </div>

                {/* Action Row with Direct Deposit / Top Up Button */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleOpenTopUp(b)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#3D784E]/10 py-2 text-xs font-black text-[#3D784E] hover:bg-[#3D784E]/20 active:scale-98 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Funds / Deposit to {b.category}</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Top Up / Add Funds to Budget Modal */}
      {topUpBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3D784E]/15 text-[#3D784E] font-bold">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Add Budget Funds</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">{topUpBudget.category}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTopUpBudget(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current Limit and Spent Info */}
            <div className="my-3 rounded-2xl bg-secondary/60 p-3 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">CURRENT SPENT</span>
                <p className="text-sm font-black text-foreground">{formatMoney(topUpBudget.spent || 0, defaultCurrency)}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">CURRENT LIMIT</span>
                <p className="text-sm font-black text-foreground">{formatMoney(topUpBudget.limit || 0, defaultCurrency)}</p>
              </div>
            </div>

            {/* Top Up Amount & Quick Chips */}
            <div className="space-y-2 mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Amount to Add (₱)
              </label>
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => {
                  setTopUpAmount(e.target.value)
                  setTopUpError(null)
                }}
                placeholder="0.00"
                autoFocus
                className="flex h-12 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-lg font-black outline-none focus:ring-2 focus:ring-[#3D784E]"
              />

              {/* Quick Amount Pills */}
              <div className="flex gap-1.5 pt-1 overflow-x-auto scrollbar-hide">
                {[200, 500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setTopUpAmount(amt.toString())
                      setTopUpError(null)
                    }}
                    className="rounded-xl border border-border/70 bg-secondary/60 px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-[#3D784E]/15 hover:border-[#3D784E]/40 transition-colors"
                  >
                    +{formatMoney(amt, defaultCurrency)}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated New Limit Preview */}
            {parseFloat(topUpAmount) > 0 && (
              <div className="mb-4 rounded-xl border border-[#3D784E]/30 bg-[#3D784E]/10 p-2.5 text-xs flex items-center justify-between">
                <span className="font-bold text-[#3D784E]">New Monthly Limit:</span>
                <span className="font-black text-foreground tabular-nums">
                  {formatMoney((topUpBudget.limit || 0) + parseFloat(topUpAmount), defaultCurrency)}
                </span>
              </div>
            )}

            {/* Deduct from Wallet Toggle & Selector */}
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deductFromWallet}
                  onChange={(e) => setDeductFromWallet(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#3D784E]"
                />
                <span className="text-xs font-bold text-foreground">
                  Deduct / Allocate directly from a Wallet
                </span>
              </label>

              {deductFromWallet && (
                <div className="pt-1 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {wallets.map((w) => {
                    const isSelected = selectedWalletName.toLowerCase() === w.name.toLowerCase()
                    const brandLogo = getWalletBrandLogo(w.name)

                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setSelectedWalletName(w.name)
                          setTopUpError(null)
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl border p-2 text-left transition-all",
                          isSelected
                            ? "border-[#3D784E] bg-[#3D784E]/10"
                            : "border-border/70 bg-card hover:bg-secondary/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {brandLogo ? (
                            <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={brandLogo} alt={w.name} className="h-full w-full object-contain" />
                            </div>
                          ) : (
                            <WalletIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="text-xs font-bold text-foreground">{w.name}</span>
                        </div>
                        <span className="text-xs font-extrabold text-muted-foreground tabular-nums">
                          {formatMoney(w.balance, w.currency)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Error Banner */}
            {topUpError && (
              <div className="mb-4 flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{topUpError}</span>
              </div>
            )}

            {/* Modal Buttons */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setTopUpBudget(null)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground hover:bg-secondary/80"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingTopUp || !topUpAmount}
                onClick={handleConfirmTopUp}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46] disabled:opacity-50 transition-all shadow-xs"
              >
                {isSubmittingTopUp ? "Adding..." : "Confirm Add Funds"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-foreground">Edit Budget</h3>
              <button
                type="button"
                onClick={() => setEditingBudget(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Category Name
                </label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#3D784E]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Monthly Limit (₱)
                </label>
                <input
                  type="number"
                  value={editLimit}
                  onChange={(e) => setEditLimit(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-sm font-black outline-none focus:ring-2 focus:ring-[#3D784E]"
                />
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setEditingBudget(null)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <AddBudgetModal open={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  )
}
