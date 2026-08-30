"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, Plus, Trash2, Edit2, Sparkles, PieChart, X } from "lucide-react"
import { formatMoney, Budget, getBrandLogo } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { AddBudgetModal } from "../add-budget-modal"

interface PlanBudgetsScreenProps {
  onBack: () => void
}

export function PlanBudgetsScreen({ onBack }: PlanBudgetsScreenProps) {
  const { budgets, deleteBudget, editBudget } = useStore()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [editCategory, setEditCategory] = useState("")
  const [editLimit, setEditLimit] = useState("")

  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
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
              {formatMoney(totalSpent)} / {formatMoney(totalLimit)}
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
        {budgets.map((b) => {
          const pct = b.limit > 0 ? Math.min(100, Math.round((b.spent / b.limit) * 100)) : 0
          const isOver = b.spent > b.limit
          const remaining = Math.max(0, b.limit - b.spent)
          const brandLogo = getBrandLogo(b.category) || (b.icon && b.icon.startsWith("/") ? b.icon : undefined)

          return (
            <div
              key={b.id}
              className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
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
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">{b.category}</h3>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {isOver ? (
                        <span className="text-rose-500 font-bold">
                          Over by {formatMoney(b.spent - b.limit)}
                        </span>
                      ) : (
                        `${formatMoney(remaining)} left`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-foreground tabular-nums mr-1">
                    {formatMoney(b.spent)} / {formatMoney(b.limit)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(b)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBudget(b.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isOver ? "#EF4444" : b.accent || "#3D784E",
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

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
