"use client"

import { useState, useMemo } from "react"
import {
  Search,
  CheckCircle,
  BarChart2,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Trash2,
  Edit2,
  X,
  Plus,
  Utensils,
  Store,
  Gamepad2,
  Coffee,
  ShoppingBag,
  Briefcase,
  ShoppingCart,
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  CalendarCheck,
  Filter,
} from "lucide-react"
import { formatMoney, Transaction, formatMoney as fmt } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const CATEGORY_ICON_MAP: Record<string, { icon: any; bg: string; text: string }> = {
  Food: { icon: Utensils, bg: "bg-orange-500/10", text: "text-orange-600" },
  "Dining Out": { icon: Utensils, bg: "bg-orange-500/10", text: "text-orange-600" },
  "Food & Dining": { icon: Utensils, bg: "bg-orange-500/10", text: "text-orange-600" },
  "Online Selling": { icon: Store, bg: "bg-amber-500/10", text: "text-amber-600" },
  "Side Hustle": { icon: Store, bg: "bg-amber-500/10", text: "text-amber-600" },
  Entertainment: { icon: Gamepad2, bg: "bg-emerald-500/10", text: "text-emerald-600" },
  Fun: { icon: Gamepad2, bg: "bg-emerald-500/10", text: "text-emerald-600" },
  Coffee: { icon: Coffee, bg: "bg-amber-500/10", text: "text-amber-600" },
  Shopping: { icon: ShoppingBag, bg: "bg-pink-500/10", text: "text-pink-600" },
  Salary: { icon: Briefcase, bg: "bg-blue-500/10", text: "text-blue-600" },
  Freelance: { icon: Briefcase, bg: "bg-blue-500/10", text: "text-blue-600" },
  Groceries: { icon: ShoppingCart, bg: "bg-emerald-500/10", text: "text-emerald-600" },
  Allowance: { icon: WalletIcon, bg: "bg-purple-500/10", text: "text-purple-600" },
}

export function HistoryScreen() {
  const { transactions, deleteTransaction, editTransaction } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  const [selectedAccount, setSelectedAccount] = useState<string>("all")
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [activeMenuTx, setActiveMenuTx] = useState<Transaction | null>(null)
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<Transaction | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editNote, setEditNote] = useState("")

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== "all" && t.kind !== filterType) return false
      if (selectedAccount !== "all" && t.account.toLowerCase() !== selectedAccount.toLowerCase()) return false

      if (selectedDateFilter !== "all") {
        if (selectedDateFilter === "today") {
          const isToday = t.dateHeader?.toLowerCase().includes("today") || t.date?.includes("APRIL 20")
          if (!isToday) return false
        } else if (selectedDateFilter === "yesterday") {
          const isYesterday = t.dateHeader?.toLowerCase().includes("yesterday") || t.date?.includes("APRIL 19")
          if (!isYesterday) return false
        } else if (selectedDateFilter === "month") {
          const isApril = t.date?.includes("APRIL") || t.dateHeader?.includes("April")
          if (!isApril) return false
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchLabel = t.label.toLowerCase().includes(q)
        const matchCategory = t.category.toLowerCase().includes(q)
        const matchAccount = t.account.toLowerCase().includes(q)
        const matchNote = t.note ? t.note.toLowerCase().includes(q) : false
        const matchTag = t.tag ? t.tag.toLowerCase().includes(q) : false
        const matchAmount = t.amount.toString().includes(q)

        return matchLabel || matchCategory || matchAccount || matchNote || matchTag || matchAmount
      }
      return true
    })
  }, [transactions, filterType, selectedAccount, selectedDateFilter, searchQuery])

  // Statistics calculation for Stats Modal
  const stats = useMemo(() => {
    const totalIncome = filtered
      .filter((t) => t.kind === "income")
      .reduce((s, t) => s + t.amount, 0)
    const totalExpense = filtered
      .filter((t) => t.kind === "expense")
      .reduce((s, t) => s + t.amount, 0)
    const netCashflow = totalIncome - totalExpense

    const categoryMap: Record<string, number> = {}
    filtered
      .filter((t) => t.kind === "expense")
      .forEach((t) => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount
      })

    const categories = Object.entries(categoryMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percent: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    return { totalIncome, totalExpense, netCashflow, categories }
  }, [filtered])

  // Group by date header
  const groupedTransactions = useMemo(() => {
    const groups: {
      header: string
      dateSubtitle: string
      totalExpense: number
      totalIncome: number
      items: Transaction[]
    }[] = []

    filtered.forEach((tx) => {
      const header = tx.dateHeader || (tx.date === "APRIL 20, 2026" ? "Today" : tx.date ? tx.date : "Recent")
      const dateSub = tx.date || "APRIL 20, 2026"

      let existing = groups.find((g) => g.header === header)
      if (!existing) {
        existing = {
          header,
          dateSubtitle: dateSub,
          totalExpense: 0,
          totalIncome: 0,
          items: [],
        }
        groups.push(existing)
      }

      existing.items.push(tx)
      if (tx.kind === "expense") {
        existing.totalExpense += tx.amount
      } else {
        existing.totalIncome += tx.amount
      }
    })

    return groups
  }, [filtered])

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setEditLabel(tx.label)
    setEditAmount(tx.amount.toString())
    setEditNote(tx.note || "")
    setActiveMenuTx(null)
  }

  const handleSaveEdit = () => {
    if (!editingTx || !editLabel) return
    const amt = parseFloat(editAmount)
    if (isNaN(amt) || amt <= 0) return

    editTransaction({
      ...editingTx,
      label: editLabel,
      amount: amt,
      note: editNote,
    })
    setEditingTx(null)
  }

  return (
    <div className="flex flex-col gap-3.5 px-4 pt-2 pb-28 min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <div className="flex items-center justify-between py-1">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">History</h1>
          <p className="text-xs text-muted-foreground font-semibold">Track and review past transactions</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 1. Statistics & Analytics Button */}
          <button
            type="button"
            onClick={() => setShowStatsModal(true)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-2xl border transition-all shadow-2xs",
              showStatsModal
                ? "border-[#3D784E] bg-[#3D784E] text-white"
                : "border-border/70 bg-card text-[#3D784E] hover:bg-secondary"
            )}
            title="Spending Analytics"
          >
            <BarChart2 className="h-4 w-4" />
          </button>

          {/* 2. Calendar Date Filter Button */}
          <button
            type="button"
            onClick={() => setShowCalendarModal(true)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-2xl border transition-all shadow-2xs",
              selectedDateFilter !== "all" || showCalendarModal
                ? "border-[#3D784E] bg-[#3D784E] text-white"
                : "border-border/70 bg-card text-[#3D784E] hover:bg-secondary"
            )}
            title="Calendar Filter"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active Date Filter Chip Banner (if active) */}
      {selectedDateFilter !== "all" && (
        <div className="flex items-center justify-between rounded-2xl border border-[#3D784E]/30 bg-[#3D784E]/10 px-3.5 py-2 text-xs font-bold text-[#3D784E]">
          <span className="flex items-center gap-1.5">
            <CalendarCheck className="h-4 w-4" />
            Filtered by: <span className="capitalize font-black">{selectedDateFilter}</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedDateFilter("all")}
            className="flex items-center gap-1 text-[10px] font-black underline hover:opacity-80"
          >
            Reset
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative flex items-center rounded-3xl border border-border/80 bg-card px-3.5 py-2.5 shadow-xs">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#3D784E] mr-2">
          <CheckCircle className="h-5 w-5 text-[#3D784E]" />
        </div>
        <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes, categories, or accounts..."
          className="w-full bg-transparent text-xs font-semibold text-foreground placeholder:text-muted-foreground/70 outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapsible FILTERS Accordion */}
      <div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-foreground hover:text-[#3D784E] px-1 py-1 transition-colors"
        >
          <span>FILTERS</span>
          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showFilters && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-xs animate-in fade-in-50 duration-150">
            {/* Kind filter */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-black transition-all",
                  filterType === "all" ? "bg-[#3D784E] text-white shadow-2xs" : "bg-secondary text-muted-foreground"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType("income")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-black transition-all",
                  filterType === "income" ? "bg-[#3D784E] text-white shadow-2xs" : "bg-secondary text-muted-foreground"
                )}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setFilterType("expense")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-black transition-all",
                  filterType === "expense" ? "bg-[#3D784E] text-white shadow-2xs" : "bg-secondary text-muted-foreground"
                )}
              >
                Expense
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History List Grouped by Date */}
      <div className="space-y-4">
        {groupedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-2">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-sm font-black text-foreground">No transactions found</p>
            <p className="text-xs text-muted-foreground">Try clearing your filters or search query.</p>
          </div>
        ) : (
          groupedTransactions.map((group) => (
            <div key={group.header} className="space-y-1.5">
              {/* Date Group Header */}
              <div className="flex items-center justify-between px-1 text-[11px] font-black text-muted-foreground">
                <span className="uppercase tracking-wider">{group.header}</span>
                <span className="text-[10px] text-muted-foreground/80 font-bold">{group.dateSubtitle}</span>
              </div>

              {/* Transactions in Group */}
              <div className="rounded-3xl border border-border/80 bg-card overflow-hidden divide-y divide-border/40 shadow-xs">
                {group.items.map((tx) => {
                  const categoryMeta = CATEGORY_ICON_MAP[tx.category] || {
                    icon: Utensils,
                    bg: "bg-[#3D784E]/10",
                    text: "text-[#3D784E]",
                  }
                  const IconComp = categoryMeta.icon

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3.5 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                            categoryMeta.bg,
                            categoryMeta.text
                          )}
                        >
                          <IconComp className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-foreground leading-tight">{tx.label}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                            {tx.account} · {tx.category}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p
                            className={cn(
                              "text-xs font-black tabular-nums tracking-tight",
                              tx.kind === "income" ? "text-[#3D784E]" : "text-foreground"
                            )}
                          >
                            {tx.kind === "income" ? "+" : "-"}
                            {formatMoney(tx.amount, tx.currency)}
                          </p>
                          <p className="text-[9px] text-muted-foreground font-medium">{tx.time}</p>
                        </div>

                        {/* Options Menu Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuTx(activeMenuTx?.id === tx.id ? null : tx)}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {activeMenuTx?.id === tx.id && (
                            <div className="absolute right-0 top-8 z-30 flex w-28 flex-col rounded-2xl border border-border/80 bg-card p-1 shadow-xl text-xs font-bold animate-in fade-in-50 zoom-in-95">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(tx)}
                                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-foreground hover:bg-secondary"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfirmTx(tx)
                                  setActiveMenuTx(null)
                                }}
                                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-rose-600 hover:bg-rose-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 📊 STATS & ANALYTICS MODAL */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-2xl text-foreground animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
                  <BarChart2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Spending Breakdown</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold">Cashflow & category ratios</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cashflow Summary Pill */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-2xl border border-border/70 bg-secondary/40 p-3">
                <p className="text-[9px] font-black uppercase text-muted-foreground">TOTAL IN</p>
                <p className="text-sm font-black text-[#3D784E] tabular-nums mt-0.5">
                  +{formatMoney(stats.totalIncome)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-secondary/40 p-3">
                <p className="text-[9px] font-black uppercase text-muted-foreground">TOTAL OUT</p>
                <p className="text-sm font-black text-rose-600 tabular-nums mt-0.5">
                  -{formatMoney(stats.totalExpense)}
                </p>
              </div>
            </div>

            {/* Category Bars */}
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {stats.categories.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No expense records found.</p>
              ) : (
                stats.categories.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground">{cat.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatMoney(cat.amount)} ({cat.percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-[#3D784E] transition-all"
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowStatsModal(false)}
              className="mt-5 w-full rounded-2xl bg-[#3D784E] py-3 text-xs font-black text-white shadow-md shadow-[#3D784E]/25 hover:bg-[#356B46]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 📅 CALENDAR DATE PICKER MODAL */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-2xl text-foreground animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Filter by Date</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold">Select range or specific cutoff</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today (Apr 20)" },
                { id: "yesterday", label: "Yesterday (Apr 19)" },
                { id: "month", label: "This Month (April)" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSelectedDateFilter(preset.id)
                    setShowCalendarModal(false)
                  }}
                  className={cn(
                    "rounded-2xl border p-3 text-xs font-bold transition-all text-left",
                    selectedDateFilter === preset.id
                      ? "border-[#3D784E] bg-[#3D784E]/15 text-[#3D784E]"
                      : "border-border/70 bg-secondary/40 text-foreground hover:bg-secondary"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedDateFilter("all")
                setShowCalendarModal(false)
              }}
              className="w-full rounded-2xl border border-border/80 bg-card py-2.5 text-xs font-bold text-muted-foreground hover:bg-secondary"
            >
              Reset to All Dates
            </button>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-extrabold text-foreground">Edit Transaction</h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Label
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Amount (PHP)
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Note
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-extrabold text-foreground">Delete Transaction?</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete &quot;{deleteConfirmTx.label}&quot; (
              {formatMoney(deleteConfirmTx.amount)})? Your account balance will automatically reverse.
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
