"use client"

import { useState } from "react"
import { ChevronLeft, Plus, Trash2, Calendar, Repeat, X } from "lucide-react"
import { formatMoney, PlannedPayment } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"

interface PlanPaymentsScreenProps {
  onBack: () => void
}

export function PlanPaymentsScreen({ onBack }: PlanPaymentsScreenProps) {
  const { plannedPayments, addPlannedPayment, deletePlannedPayment, wallets } = useStore()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [frequency, setFrequency] = useState<"recurring" | "one-time">("recurring")
  const [category, setCategory] = useState("Bills")
  const [account, setAccount] = useState(wallets[0]?.name || "GCash")

  const recurringCount = plannedPayments.filter((p) => p.frequency === "recurring").length
  const oneTimeCount = plannedPayments.filter((p) => p.frequency === "one-time").length
  const totalMonthlyCommitment = plannedPayments.reduce((s, p) => s + p.amount, 0)

  const handleAddPayment = () => {
    const amt = parseFloat(amount)
    if (!label || isNaN(amt) || amt <= 0) return

    addPlannedPayment({
      label,
      amount: amt,
      dueDate: dueDate || "Next cutoff",
      frequency,
      category,
      account,
      icon: "📅",
    })

    setLabel("")
    setAmount("")
    setDueDate("")
    setIsAddOpen(false)
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
        <h2 className="text-base font-black text-foreground">Planned Payments</h2>
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
              COMMITTED CASHFLOW
            </p>
            <p className="text-xl font-black text-foreground tabular-nums mt-0.5">
              {formatMoney(totalMonthlyCommitment)}
            </p>
          </div>
          <span className="rounded-2xl bg-secondary px-3 py-1 text-xs font-bold text-foreground">
            {recurringCount} recurring · {oneTimeCount} one-time
          </span>
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-3">
        {plannedPayments.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-base">
                {p.icon || "📅"}
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">{p.label}</h3>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Due: {p.dueDate} • {p.account} • {p.frequency}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-rose-500 tabular-nums">
                -{formatMoney(p.amount)}
              </span>
              <button
                type="button"
                onClick={() => deletePlannedPayment(p.id)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-foreground">Add Planned Payment</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Payment Title
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Meralco, Rent, Netflix"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#3D784E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Amount (₱)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-base font-black outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-2 text-xs font-bold outline-none"
                  >
                    <option value="recurring">Recurring</option>
                    <option value="one-time">One-Time</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Due Date
                </label>
                <input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="e.g. 15th of the month, or Aug 30, 2026"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddPayment}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46]"
              >
                Add Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
