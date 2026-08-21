"use client"

import { useState } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Search,
  Trash2,
  X,
  CreditCard,
} from "lucide-react"
import { formatMoney, type Transaction } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { PawiTip } from "../pawi-tip"

export function HistoryScreen() {
  const { transactions, deleteTransaction } = useStore()
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<Transaction | null>(null)

  const monthlyIncome = transactions
    .filter((t) => t.kind === "income")
    .reduce((s, t) => s + t.amount, 0)
  const monthlyExpense = transactions
    .filter((t) => t.kind === "expense")
    .reduce((s, t) => s + t.amount, 0)
  const netFlow = monthlyIncome - monthlyExpense
  const isPositiveFlow = netFlow >= 0

  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== "all" && t.kind !== filterType) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        t.label.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.account.toLowerCase().includes(q) ||
        t.amount.toString().includes(q)
      )
    }
    return true
  })

  return (
    <div className="flex flex-col gap-4 px-4 pt-3 pb-28">
      {/* Title & Net Monthly Summary Card */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Transaction Ledger</h1>
            <p className="text-xs text-muted-foreground font-medium">
              Comprehensive record of income & expenses
            </p>
          </div>
          <span className="rounded-2xl bg-secondary px-3 py-1.5 text-xs font-black text-foreground">
            {transactions.length} Total
          </span>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-[#3D784E]/30 bg-gradient-to-br from-[#3D784E]/15 via-[#3D784E]/5 to-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3D784E]/15 px-3 py-1 text-[11px] font-black text-[#3D784E]">
                <Sparkles className="h-3 w-3" />
                Net Cashflow
              </span>
              <div className="mt-2">
                <span
                  className={cn(
                    "text-2xl font-black tracking-tight",
                    isPositiveFlow ? "text-emerald-600" : "text-rose-500"
                  )}
                >
                  {isPositiveFlow ? "+" : ""}
                  {formatMoney(netFlow)}
                </span>
                <span className="text-xs font-bold text-muted-foreground ml-2">this month</span>
              </div>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/20 text-[#3D784E]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Income & Expense Mini Cards */}
      <section className="grid grid-cols-2 gap-2.5">
        <div className="rounded-3xl border border-emerald-500/25 bg-card p-3.5 shadow-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
              <ArrowUpRight className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
              Inflow
            </span>
          </div>
          <p className="text-lg font-black tabular-nums text-foreground">
            {formatMoney(monthlyIncome)}
          </p>
        </div>

        <div className="rounded-3xl border border-rose-500/25 bg-card p-3.5 shadow-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">
              Outflow
            </span>
          </div>
          <p className="text-lg font-black tabular-nums text-foreground">
            {formatMoney(monthlyExpense)}
          </p>
        </div>
      </section>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by note, category, wallet..."
          className="h-11 w-full rounded-2xl border border-border/80 bg-card pl-10 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#3D784E]/40"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={cn(
            "rounded-2xl px-3.5 py-1.5 text-xs font-black transition-all",
            filterType === "all"
              ? "bg-[#3D784E] text-white shadow-xs"
              : "border border-border/70 bg-card text-muted-foreground hover:bg-secondary"
          )}
        >
          All ({transactions.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType("income")}
          className={cn(
            "flex items-center gap-1 rounded-2xl px-3.5 py-1.5 text-xs font-black transition-all",
            filterType === "income"
              ? "bg-emerald-600 text-white shadow-xs"
              : "border border-border/70 bg-card text-muted-foreground hover:bg-secondary"
          )}
        >
          <ArrowUpRight className="h-3 w-3" />
          Income
        </button>
        <button
          type="button"
          onClick={() => setFilterType("expense")}
          className={cn(
            "flex items-center gap-1 rounded-2xl px-3.5 py-1.5 text-xs font-black transition-all",
            filterType === "expense"
              ? "bg-rose-600 text-white shadow-xs"
              : "border border-border/70 bg-card text-muted-foreground hover:bg-secondary"
          )}
        >
          <ArrowDownLeft className="h-3 w-3" />
          Expenses
        </button>
      </div>

      {/* Transaction List */}
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xs divide-y divide-border/40">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((tx) => {
            const isIncome = tx.kind === "income"
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 transition-colors hover:bg-secondary/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                      isIncome ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-500"
                    )}
                  >
                    {isIncome ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-foreground">{tx.label}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {tx.category} • {tx.account} {tx.time ? `• ${tx.time}` : ""}
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
                    onClick={() => setDeleteConfirmTx(tx)}
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
            No transactions found.
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-extrabold text-foreground">Delete Transaction?</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete &quot;{deleteConfirmTx.label}&quot; (
              {formatMoney(deleteConfirmTx.amount)})? Your wallet balance will automatically reverse.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmTx(null)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTransaction(deleteConfirmTx.id)
                  setDeleteConfirmTx(null)
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                Delete & Reverse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
