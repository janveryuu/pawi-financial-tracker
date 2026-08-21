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
} from "lucide-react"
import { formatMoney, Transaction, formatMoney as fmt } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const CATEGORY_ICON_MAP: Record<string, { icon: any; bg: string; text: string }> = {
  Food: { icon: Utensils, bg: "bg-orange-500/10", text: "text-orange-600" },
  "Dining Out": { icon: Utensils, bg: "bg-orange-500/10", text: "text-orange-600" },
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
  const [showFilters, setShowFilters] = useState(false)
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
  }, [transactions, filterType, selectedAccount, searchQuery])

  // Group by date header (e.g. Today, Yesterday, or custom date)
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
    <div className="flex flex-col gap-3.5 px-4 pt-2 pb-28 min-h-screen bg-background">
      {/* Top Header (Image 2) */}
      <div className="flex items-center justify-between py-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground">History</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-[#3D784E] hover:bg-secondary transition-colors"
            title="Statistics"
          >
            <BarChart2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-[#3D784E] hover:bg-secondary transition-colors"
            title="Calendar View"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Bar (Image 2) */}
      <div className="relative flex items-center rounded-3xl border border-border/80 bg-card px-3.5 py-2.5 shadow-xs">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-emerald-600 mr-2">
          <CheckCircle className="h-5 w-5 text-emerald-600/80" />
        </div>
        <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes, categories, or accounts"
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

      {/* Collapsible FILTERS Accordion (Image 2) */}
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
                  filterType === "all" ? "bg-[#3D784E] text-white" : "bg-secondary text-muted-foreground"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType("income")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-black transition-all",
                  filterType === "income" ? "bg-emerald-600 text-white" : "bg-secondary text-muted-foreground"
                )}
              >
                Inflow
              </button>
              <button
                type="button"
                onClick={() => setFilterType("expense")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-black transition-all",
                  filterType === "expense" ? "bg-rose-600 text-white" : "bg-secondary text-muted-foreground"
                )}
              >
                Outflow
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grouped Transactions List (Image 2) */}
      <div className="space-y-6">
        {groupedTransactions.length > 0 ? (
          groupedTransactions.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              {/* Group Header */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base font-black tracking-tight text-foreground">
                    {group.header}
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {group.dateSubtitle}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {group.totalExpense > 0 && (
                    <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-black text-rose-600">
                      -{formatMoney(group.totalExpense)}
                    </span>
                  )}
                  {group.totalIncome > 0 && (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-black text-emerald-600">
                      +{formatMoney(group.totalIncome)}
                    </span>
                  )}
                </div>
              </div>

              {/* Transactions Timeline */}
              <div className="relative space-y-3.5 pl-3">
                {/* Vertical Timeline Guide Line */}
                <div className="absolute left-[17px] top-3 bottom-3 w-[1.5px] bg-border/60" />

                {group.items.map((tx) => {
                  const isIncome = tx.kind === "income"
                  const iconCfg = CATEGORY_ICON_MAP[tx.category] ||
                    CATEGORY_ICON_MAP[tx.label] || {
                      icon: isIncome ? ArrowUpRight : ArrowDownLeft,
                      bg: "bg-secondary",
                      text: isIncome ? "text-emerald-600" : "text-rose-500",
                    }
                  const IconComp = iconCfg.icon

                  return (
                    <div key={tx.id} className="relative space-y-1">
                      {/* Timestamp above */}
                      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground pl-6">
                        {/* Timeline Colored Dot */}
                        <div
                          className={cn(
                            "absolute left-0 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background",
                            isIncome ? "bg-emerald-500" : "bg-rose-500"
                          )}
                        />
                        <span>{tx.time || "12:00 PM"}</span>
                      </div>

                      {/* Transaction Card */}
                      <div className="ml-5 flex items-center justify-between rounded-3xl border border-border/70 bg-card p-3.5 shadow-xs transition-colors hover:bg-secondary/30">
                        {/* Left: Icon + Category + Tag + Note */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                              iconCfg.bg,
                              iconCfg.text
                            )}
                          >
                            <IconComp className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-foreground">
                                {tx.label || tx.category}
                              </span>
                              {tx.tag && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                                  🏷️ {tx.tag}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
                              {tx.note || tx.category}
                            </p>
                          </div>
                        </div>

                        {/* Right: Amount + Account Pill + Options */}
                        <div className="flex items-center gap-2.5 shrink-0 ml-2">
                          <div className="text-right">
                            <p
                              className={cn(
                                "text-xs font-black tabular-nums",
                                isIncome ? "text-emerald-600" : "text-foreground"
                              )}
                            >
                              {isIncome ? "+" : "-"}
                              {formatMoney(tx.amount, tx.currency)}
                            </p>
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                              💳 {tx.account}
                            </span>
                          </div>

                          {/* ⋯ 3 dots menu button */}
                          <button
                            type="button"
                            onClick={() => setActiveMenuTx(tx)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-border/70 bg-card p-10 text-center text-xs text-muted-foreground font-medium">
            No transactions match your search or filter.
          </div>
        )}
      </div>

      {/* Transaction Options Modal (From ⋯ button) */}
      {activeMenuTx && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[2rem] border border-border bg-card p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-foreground">{activeMenuTx.label}</h3>
                <p className="text-[11px] text-muted-foreground">
                  {formatMoney(activeMenuTx.amount)} • {activeMenuTx.account}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMenuTx(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(activeMenuTx)}
                className="flex w-full items-center gap-2.5 rounded-2xl bg-secondary/60 p-3 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
              >
                <Edit2 className="h-4 w-4 text-[#3D784E]" />
                Edit Transaction
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmTx(activeMenuTx)
                  setActiveMenuTx(null)
                }}
                className="flex w-full items-center gap-2.5 rounded-2xl bg-rose-500/10 p-3 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete & Reverse Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-foreground">Edit Transaction</h3>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Label / Title
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#3D784E]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Amount (₱)
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-base font-black outline-none focus:ring-2 focus:ring-[#3D784E]"
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

            <div className="flex gap-2.5">
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
