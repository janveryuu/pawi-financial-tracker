"use client"

import { useState } from "react"
import {
  Target,
  Plus,
  Wallet,
  X,
  Sparkles,
  Trophy,
  TrendingUp,
  Trash2,
  Edit2,
  ChevronDown,
  Calendar,
} from "lucide-react"
import { formatMoney, Goal, Budget } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { AddGoalModal } from "../add-goal-modal"
import { AddBudgetModal } from "../add-budget-modal"
import { PawiTip } from "../pawi-tip"

export function PlanScreen() {
  const { goals, budgets, addFundsToGoal, deleteGoal, editGoal, deleteBudget, editBudget, wallets } = useStore()
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)

  // Add Funds Modal state
  const [fundsModalGoal, setFundsModalGoal] = useState<Goal | null>(null)
  const [fundsAmount, setFundsAmount] = useState("")
  const [sourceWallet, setSourceWallet] = useState(wallets[0]?.name || "Cash")

  // Edit Goal Modal state
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [editGoalName, setEditGoalName] = useState("")
  const [editGoalTarget, setEditGoalTarget] = useState("")
  const [editGoalDue, setEditGoalDue] = useState("")

  // Edit Budget Modal state
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [editBudgetCategory, setEditBudgetCategory] = useState("")
  const [editBudgetLimit, setEditBudgetLimit] = useState("")

  const activeGoals = goals.filter((g) => g.saved < g.target).length
  const completedGoals = goals.filter((g) => g.saved >= g.target).length
  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)
  const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0

  const handleAddFunds = () => {
    if (!fundsModalGoal || !fundsAmount) return
    const amt = parseFloat(fundsAmount) || 0
    if (amt <= 0) return

    addFundsToGoal(fundsModalGoal.id, amt, sourceWallet)
    setFundsModalGoal(null)
    setFundsAmount("")
  }

  const handleOpenEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setEditGoalName(goal.name)
    setEditGoalTarget(goal.target.toString())
    setEditGoalDue(goal.due || "")
  }

  const handleSaveGoalEdit = () => {
    if (!editingGoal || !editGoalName || !editGoalTarget) return
    editGoal({
      ...editingGoal,
      name: editGoalName,
      target: parseFloat(editGoalTarget) || editingGoal.target,
      due: editGoalDue || null,
    })
    setEditingGoal(null)
  }

  const handleOpenEditBudget = (budget: Budget) => {
    setEditingBudget(budget)
    setEditBudgetCategory(budget.category)
    setEditBudgetLimit(budget.limit.toString())
  }

  const handleSaveBudgetEdit = () => {
    if (!editingBudget || !editBudgetCategory || !editBudgetLimit) return
    editBudget({
      ...editingBudget,
      category: editBudgetCategory,
      limit: parseFloat(editBudgetLimit) || editingBudget.limit,
    })
    setEditingBudget(null)
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-3 pb-28">
      {/* Top Title & New Goal Action */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Savings Goals</h1>
            <p className="text-xs text-muted-foreground font-medium">
              Track aspirations & accelerate milestones
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsGoalModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#3D784E] px-4 py-2.5 text-xs font-black text-white shadow-md shadow-[#3D784E]/20 transition-all hover:bg-[#356B46] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New Goal
          </button>
        </div>

        {/* Hero Overall Target Progress Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-[#3D784E]/30 bg-gradient-to-br from-[#3D784E]/15 via-[#3D784E]/5 to-card p-5 shadow-sm mb-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3D784E]/15 px-3 py-1 text-[11px] font-black text-[#3D784E]">
                <Sparkles className="h-3 w-3" />
                Overall Goals Mastery
              </span>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-foreground">
                  {formatMoney(totalSaved)}
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  / {formatMoney(totalTarget)} target
                </span>
              </div>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/20 text-[#3D784E] shadow-inner">
              <Trophy className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-muted-foreground">Combined Progress</span>
              <span className="text-[#3D784E] font-black">{overallPct}% Completed</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#3D784E]/15">
              <div
                className="h-full rounded-full bg-[#3D784E] transition-all duration-700"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3 Stat Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-500/20 bg-card p-3 shadow-xs">
            <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
              <Target className="h-4 w-4" />
            </div>
            <p className="text-lg font-black text-foreground">{activeGoals}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Active</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-3xl border border-amber-500/20 bg-card p-3 shadow-xs">
            <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
              <Trophy className="h-4 w-4" />
            </div>
            <p className="text-lg font-black text-foreground">{completedGoals}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Achieved</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-3xl border border-blue-500/20 bg-card p-3 shadow-xs">
            <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="text-xs font-black truncate max-w-[85px] text-foreground">
              {formatMoney(totalTarget)}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Target</p>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="flex flex-col gap-3.5">
        {goals.map((goal) => {
          const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
          const isDone = pct >= 100
          return (
            <div
              key={goal.id}
              className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:border-[#3D784E]/40"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-2xl">
                    {goal.icon || "🎯"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-foreground">{goal.name}</p>
                      {isDone && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          Achieved ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {goal.due ? `Due ${goal.due}` : "No deadline set"}
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-black tabular-nums text-foreground">{pct}%</span>
              </div>

              <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: goal.accent || "#3D784E" }}
                />
              </div>

              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <p className="text-sm font-black text-foreground">{formatMoney(goal.saved)}</p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {isDone ? "Goal reached!" : `${formatMoney(Math.max(0, goal.target - goal.saved))} left`}
                  </p>
                </div>
                <p className="text-xs font-bold text-muted-foreground">of {formatMoney(goal.target)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFundsModalGoal(goal)
                    setFundsAmount("")
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-[#3D784E] py-2.5 text-xs font-black text-white shadow-xs hover:bg-[#356B46] active:scale-95 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Funds
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditGoal(goal)}
                  className="flex items-center justify-center gap-1 rounded-2xl border border-border/70 bg-secondary/60 px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
                >
                  <Edit2 className="h-3 w-3 text-muted-foreground" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteGoal(goal.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Delete goal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Budgets Section */}
      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm mt-2">
        <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#3D784E]/15 text-[#3D784E]">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-foreground">Monthly Budgets</h2>
              <p className="text-[11px] text-muted-foreground font-medium">Category spending limits</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsBudgetModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#3D784E]/12 px-3 py-1.5 text-xs font-extrabold text-[#3D784E] hover:bg-[#3D784E]/20 transition-colors"
          >
            <Plus className="h-3 w-3" />
            New Budget
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {budgets.map((budget) => {
            const pct = budget.limit > 0 ? Math.round((budget.spent / budget.limit) * 100) : 0
            const over = budget.spent > budget.limit
            return (
              <div key={budget.id} className="rounded-2xl bg-secondary/40 p-3.5 border border-border/40">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-foreground">{budget.category}</p>
                    {over && (
                      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold text-rose-600">
                        Over Budget
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-black tabular-nums",
                        over ? "text-rose-500" : "text-[#3D784E]"
                      )}
                    >
                      {pct}% used
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditBudget(budget)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBudget(budget.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      over ? "bg-rose-500" : "bg-[#3D784E]"
                    )}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                  <span>Spent: {formatMoney(budget.spent)}</span>
                  <span>Limit: {formatMoney(budget.limit)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Add Funds Modal */}
      {fundsModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-foreground">
                Add Funds: {fundsModalGoal.icon} {fundsModalGoal.name}
              </h3>
              <button
                type="button"
                onClick={() => setFundsModalGoal(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-3 text-xs text-muted-foreground">
              Current progress: {formatMoney(fundsModalGoal.saved)} / {formatMoney(fundsModalGoal.target)}
            </p>

            {/* Source Wallet Picker */}
            <div className="space-y-1 mb-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                DEDUCT FROM WALLET
              </label>
              <select
                value={sourceWallet}
                onChange={(e) => setSourceWallet(e.target.value)}
                className="h-10 w-full rounded-xl border border-border/70 bg-secondary/40 px-3 text-xs font-bold text-foreground outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name} ({formatMoney(w.balance, w.currency)})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount input */}
            <div className="space-y-1 mb-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                AMOUNT TO ADD
              </label>
              <input
                type="number"
                value={fundsAmount}
                onChange={(e) => setFundsAmount(e.target.value)}
                placeholder="0.00"
                className="flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-sm font-black outline-none focus:ring-2 focus:ring-[#3D784E]"
                autoFocus
              />
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2 mb-5">
              {[500, 1000, 2500, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFundsAmount(preset.toString())}
                  className="flex-1 rounded-lg border border-border/60 bg-secondary/60 py-1 text-[10px] font-bold hover:bg-secondary transition-colors"
                >
                  +₱{preset.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setFundsModalGoal(null)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground hover:bg-secondary/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddFunds}
                disabled={!fundsAmount || parseFloat(fundsAmount) <= 0}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46] disabled:opacity-50"
              >
                Deposit Funds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-foreground">Edit Goal</h3>
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={editGoalName}
                  onChange={(e) => setEditGoalName(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Target Amount (₱)
                </label>
                <input
                  type="number"
                  value={editGoalTarget}
                  onChange={(e) => setEditGoalTarget(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Target Deadline (e.g. Dec 25)
                </label>
                <input
                  type="text"
                  value={editGoalDue}
                  onChange={(e) => setEditGoalDue(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGoalEdit}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-foreground">Edit Budget</h3>
              <button
                type="button"
                onClick={() => setEditingBudget(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Category Name
                </label>
                <input
                  type="text"
                  value={editBudgetCategory}
                  onChange={(e) => setEditBudgetCategory(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Monthly Limit (₱)
                </label>
                <input
                  type="number"
                  value={editBudgetLimit}
                  onChange={(e) => setEditBudgetLimit(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
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
                onClick={handleSaveBudgetEdit}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46]"
              >
                Save Budget
              </button>
            </div>
          </div>
        </div>
      )}

      <AddGoalModal open={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} />
      <AddBudgetModal open={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} />
    </div>
  )
}
