"use client"

import { useState } from "react"
import { ChevronLeft, Plus, Trash2, Edit2, Flag, Wallet, X } from "lucide-react"
import { formatMoney, Goal } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { AddGoalModal } from "../add-goal-modal"

interface PlanGoalsScreenProps {
  onBack: () => void
}

export function PlanGoalsScreen({ onBack }: PlanGoalsScreenProps) {
  const { goals, deleteGoal, addFundsToGoal, editGoal, wallets } = useStore()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [fundsModalGoal, setFundsModalGoal] = useState<Goal | null>(null)
  const [fundsAmount, setFundsAmount] = useState("")
  const [sourceWallet, setSourceWallet] = useState(wallets[0]?.name || "Cash")

  const [depositError, setDepositError] = useState<string | null>(null)

  const totalSaved = goals.reduce((s, g) => s + g.saved, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target, 0)
  const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0

  const handleAddFunds = () => {
    if (!fundsModalGoal || !fundsAmount) return
    const amt = parseFloat(fundsAmount)
    if (isNaN(amt) || amt <= 0) {
      setDepositError("Please enter a valid deposit amount.")
      return
    }

    const selectedAcc = wallets.find((w) => w.name.toLowerCase() === sourceWallet.toLowerCase())
    if (selectedAcc && selectedAcc.balance < amt) {
      setDepositError(
        `Insufficient balance in ${selectedAcc.name}. Available: ${formatMoney(selectedAcc.balance, selectedAcc.currency)}`
      )
      return
    }

    setDepositError(null)
    addFundsToGoal(fundsModalGoal.id, amt, sourceWallet)
    setFundsModalGoal(null)
    setFundsAmount("")
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-28 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-black text-foreground">Personal Goals</h2>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#3D784E]/30 bg-[#3D784E]/10 text-[#3D784E] hover:bg-[#3D784E]/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              SAVINGS GOALS PROGRESS
            </p>
            <p className="text-xl font-black text-foreground tabular-nums mt-0.5">
              {formatMoney(totalSaved)} / {formatMoney(totalTarget)}
            </p>
          </div>
          <span className="rounded-2xl bg-[#3D784E]/15 px-3 py-1 text-xs font-black text-[#3D784E]">
            {overallPct}% reached
          </span>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {goals.map((g) => {
          const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0
          const isCompleted = g.target > 0 && g.saved >= g.target
          const remaining = Math.max(0, g.target - g.saved)

          return (
            <div
              key={g.id}
              className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-base">
                    {g.icon || "🎯"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-extrabold text-foreground">{g.name}</h3>
                      {isCompleted && (
                        <span className="rounded-full bg-[#3D784E]/15 px-2 py-0.5 text-[9px] font-black text-[#3D784E]">
                          Completed 🎉
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Target: {formatMoney(g.target)} {g.due ? `• Due ${g.due}` : ""}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteGoal(g.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1">
                  <span>Saved {formatMoney(g.saved)}</span>
                  <span>{pct}% ({formatMoney(remaining)} left)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-[#3D784E] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Deposit Action */}
              <button
                type="button"
                onClick={() => {
                  setDepositError(null)
                  setFundsModalGoal(g)
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#3D784E]/10 py-2 text-xs font-black text-[#3D784E] hover:bg-[#3D784E]/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Deposit Funds
              </button>
            </div>
          )
        })}
      </div>

      {/* Deposit Modal */}
      {fundsModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-foreground">Add to {fundsModalGoal.name}</h3>
              <button
                type="button"
                onClick={() => {
                  setDepositError(null)
                  setFundsModalGoal(null)
                }}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Deposit Amount (₱)
                </label>
                <input
                  type="number"
                  value={fundsAmount}
                  onChange={(e) => {
                    setDepositError(null)
                    setFundsAmount(e.target.value)
                  }}
                  placeholder="0.00"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-base font-black outline-none focus:ring-2 focus:ring-[#3D784E]"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Source Account
                </label>
                <select
                  value={sourceWallet}
                  onChange={(e) => {
                    setDepositError(null)
                    setSourceWallet(e.target.value)
                  }}
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3 text-xs font-bold outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.name}>
                      {w.name} ({formatMoney(w.balance, w.currency)})
                    </option>
                  ))}
                </select>
              </div>

              {depositError && (
                <p className="text-xs font-bold text-rose-500 bg-rose-500/10 p-2.5 rounded-xl">
                  {depositError}
                </p>
              )}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDepositError(null)
                  setFundsModalGoal(null)
                }}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddFunds}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46]"
              >
                Confirm Deposit
              </button>
            </div>
          </div>
        </div>
      )}

      <AddGoalModal open={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  )
}
