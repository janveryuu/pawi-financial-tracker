"use client"

import { useState } from "react"
import { Target, Plus, Wallet, X } from "lucide-react"
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
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)

  const handleAddFunds = () => {
    if (!fundsModalGoal || !fundsAmount) return
    addFundsToGoal(fundsModalGoal.id, Number(fundsAmount))
    setFundsModalGoal(null)
    setFundsAmount("")
  }

  return (
    <div className="flex flex-col gap-8 px-5 pt-6 pb-24">
      {/* Top Header & Stats */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Plan</h1>
            <p className="text-sm text-muted-foreground">Goals, milestones, and upcoming schedule</p>
          </div>
          <button
            type="button"
            onClick={() => setIsGoalModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Goal
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <p className="text-xl font-bold text-foreground">{activeGoals}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <p className="text-xl font-bold text-foreground">{completedGoals}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completed</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <p className="text-[15px] font-bold text-foreground">{formatMoney(totalTarget)}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Target</p>
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
          return (
            <div key={goal.id} className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-2xl">
                    {goal.icon || "🎯"}
                  </span>
                  <div>
                    <p className="font-bold text-foreground">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">{goal.due ? `Due ${goal.due}` : "No deadline"}</p>
                  </div>
                </div>
                <span className="text-2xl font-bold tabular-nums text-foreground">{pct}%</span>
              </div>
              
              <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: goal.accent }}
                />
              </div>

              <div className="mb-5 flex items-baseline justify-between">
                <div>
                  <p className="text-base font-semibold text-foreground">{formatMoney(goal.saved)}</p>
                  <p className="text-xs text-muted-foreground">- {formatMoney(Math.max(0, goal.target - goal.saved))} remaining</p>
                </div>
                <p className="text-xs text-muted-foreground">of {formatMoney(goal.target)}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFundsModalGoal(goal)}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  + Add Funds
                </button>
                <button className="rounded-xl border border-border bg-secondary/50 px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary">
                  Edit
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Budgets Section */}
      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm mt-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Wallet className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Monthly Budgets
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsBudgetModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
          >
            <Plus className="h-3.5 w-3.5" />
            Budget
          </button>
        </div>
        <div className="flex flex-col gap-6">
          {budgets.map((budget) => {
            const pct = Math.round((budget.spent / budget.limit) * 100)
            const over = budget.spent > budget.limit
            return (
              <div key={budget.id}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {budget.category}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      over ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {formatMoney(budget.spent)} / {formatMoney(budget.limit)}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      backgroundColor: over
                        ? "var(--destructive)"
                        : budget.accent,
                    }}
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
