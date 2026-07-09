"use client"

import { useState } from "react"
import { Target, Plus, Wallet, X, Sparkles, Trophy, TrendingUp, CheckCircle2, Flame } from "lucide-react"
import { formatMoney } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { AddGoalModal } from "../add-goal-modal"
import { AddBudgetModal } from "../add-budget-modal"
import { PawiTip } from "../pawi-tip"

export function PlanScreen() {
  const { goals, budgets, addFundsToGoal } = useStore()
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)

  // Add Funds Modal state
  const [fundsModalGoal, setFundsModalGoal] = useState<any>(null)
  const [fundsAmount, setFundsAmount] = useState("")

  const activeGoals = goals.filter(g => g.saved < g.target).length
  const completedGoals = goals.filter(g => g.saved >= g.target).length
  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)
  const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0

  const handleAddFunds = () => {
    if (!fundsModalGoal || !fundsAmount) return
    addFundsToGoal(fundsModalGoal.id, Number(fundsAmount))
    setFundsModalGoal(null)
    setFundsAmount("")
  }

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-24">
      {/* Top Title & New Goal Action */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Savings Goals</h1>
            <p className="text-xs text-muted-foreground">Track aspirations & accelerate milestones</p>
          </div>
          <button
            type="button"
            onClick={() => setIsGoalModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New Goal
          </button>
        </div>

        {/* Hero Overall Target Progress Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-card p-5 shadow-lg mb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-[11px] font-bold text-primary">
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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/25 text-primary shadow-inner">
              <Trophy className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-muted-foreground">Combined Goal Progress</span>
              <span className="text-primary">{overallPct}% Completed</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3 Premium Glowing Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/10 to-card p-3.5 shadow-sm transition-all hover:border-emerald-500/40">
            <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500">
              <Target className="h-4 w-4" />
            </div>
            <p className="text-lg font-black text-foreground">{activeGoals}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Active</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-3xl border border-amber-500/25 bg-gradient-to-b from-amber-500/10 to-card p-3.5 shadow-sm transition-all hover:border-amber-500/40">
            <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500">
              <Trophy className="h-4 w-4" />
            </div>
            <p className="text-lg font-black text-foreground">{completedGoals}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Achieved</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-3xl border border-blue-500/25 bg-gradient-to-b from-blue-500/10 to-card p-3.5 shadow-sm transition-all hover:border-blue-500/40">
            <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-500">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="text-sm font-black truncate max-w-[85px] text-foreground">{formatMoney(totalTarget)}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Target</p>
          </div>
        </div>
      </div>
      
      <div className="-mx-5 -my-2">
        <PawiTip
          image="/pawi-darting.png"
          tip="A goal without a plan is just a wish. Keep tracking your progress to make it a reality!"
          trivia="Turtles are famous for taking it slow. Remember the Tortoise and the Hare? Slow, steady, compound interest always wins the financial race!"
        />
      </div>

      {/* Goals List */}
      <div className="flex flex-col gap-4">
        {goals.map((goal) => {
          const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
          const isDone = pct >= 100
          return (
            <div
              key={goal.id}
              className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/40"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/80 text-2xl shadow-inner">
                    {goal.icon || "🎯"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-foreground">{goal.name}</p>
                      {isDone && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                          Achieved ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{goal.due ? `Due ${goal.due}` : "No deadline set"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black tabular-nums text-foreground">{pct}%</span>
                </div>
              </div>

              <div className="mb-3.5 h-3 w-full overflow-hidden rounded-full bg-secondary/80 p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${pct}%`, backgroundColor: goal.accent || "#10b981" }}
                />
              </div>

              <div className="mb-5 flex items-baseline justify-between">
                <div>
                  <p className="text-base font-bold text-foreground">{formatMoney(goal.saved)}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    {isDone ? "Goal reached!" : `${formatMoney(Math.max(0, goal.target - goal.saved))} left to reach target`}
                  </p>
                </div>
                <p className="text-xs font-bold text-muted-foreground">of {formatMoney(goal.target)}</p>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setFundsModalGoal(goal)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Add Funds
                </button>
                <button className="rounded-2xl border border-border bg-secondary/60 px-5 py-3 text-xs font-bold text-foreground transition-colors hover:bg-secondary">
                  Edit
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Budgets Section */}
      <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-md mt-4">
        <div className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                Monthly Budgets
              </h2>
              <p className="text-xs text-muted-foreground">Category spending limits</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsBudgetModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-primary/15 px-3.5 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/25"
          >
            <Plus className="h-3.5 w-3.5" />
            New Budget
          </button>
        </div>
        <div className="flex flex-col gap-6">
          {budgets.map((budget) => {
            const pct = Math.round((budget.spent / budget.limit) * 100)
            const over = budget.spent > budget.limit
            return (
              <div key={budget.id} className="rounded-2xl bg-secondary/40 p-4 border border-border/40">
                <div className="mb-2.5 flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold text-foreground">
                      {budget.category}
                    </p>
                    {over && (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                        Over Budget
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-bold tabular-nums",
                      over ? "text-destructive" : "text-primary",
                    )}
                  >
                    {pct}% used
                  </span>
                </div>
                <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      over ? "bg-destructive" : "bg-primary",
                    )}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                {over && (
                  <p className="mt-1.5 text-xs font-semibold text-destructive">
                    Over budget by {formatMoney(budget.spent - budget.limit)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <AddGoalModal open={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} />
      <AddBudgetModal open={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} />

      {/* Add Funds Modal */}
      {fundsModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 rounded-3xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Add Funds to {fundsModalGoal.icon} {fundsModalGoal.name}</h3>
              <button onClick={() => setFundsModalGoal(null)} className="rounded-full p-1 hover:bg-secondary">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            
            <p className="mb-4 text-sm text-muted-foreground">
              Current progress: {formatMoney(fundsModalGoal.saved)} / {formatMoney(fundsModalGoal.target)}
            </p>

            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount to Add</label>
              <input
                type="number"
                value={fundsAmount}
                onChange={(e) => setFundsAmount(e.target.value)}
                placeholder="0.00"
                className="flex h-12 w-full rounded-xl border border-border/60 bg-secondary/40 px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFundsModalGoal(null)}
                className="flex-1 rounded-xl bg-muted py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddFunds}
                disabled={!fundsAmount}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Add Funds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
