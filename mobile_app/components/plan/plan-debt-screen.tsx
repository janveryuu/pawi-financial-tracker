"use client"

import { useState } from "react"
import { ChevronLeft, Plus, Trash2, X } from "lucide-react"
import { formatMoney, Debt } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"

interface PlanDebtScreenProps {
  onBack: () => void
}

export function PlanDebtScreen({ onBack }: PlanDebtScreenProps) {
  const { debts, addDebt, deleteDebt } = useStore()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [lender, setLender] = useState("")
  const [amount, setAmount] = useState("")
  const [monthlyPayment, setMonthlyPayment] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [notes, setNotes] = useState("")

  const totalDebt = debts.reduce((s, d) => s + d.amount, 0)
  const totalMonthly = debts.reduce((s, d) => s + d.monthlyPayment, 0)

  const handleAddDebt = () => {
    const amt = parseFloat(amount)
    const monthly = parseFloat(monthlyPayment)
    if (!lender || isNaN(amt) || amt <= 0) return

    addDebt({
      lender,
      amount: amt,
      monthlyPayment: isNaN(monthly) ? 0 : monthly,
      dueDate: dueDate || "Monthly",
      interestRate: interestRate || "0%",
      notes: notes || "",
      accent: "#E53E3E",
    })

    setLender("")
    setAmount("")
    setMonthlyPayment("")
    setDueDate("")
    setInterestRate("")
    setNotes("")
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
        <h2 className="text-base font-black text-foreground">Debt Tracker</h2>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#3D784E]/30 bg-[#3D784E]/10 text-[#3D784E] hover:bg-[#3D784E]/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-3xl border border-rose-500/25 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">
              TOTAL OUTSTANDING DEBT
            </p>
            <p className="text-xl font-black text-foreground tabular-nums mt-0.5">
              {formatMoney(totalDebt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              MONTHLY AMORTIZATION
            </p>
            <p className="text-sm font-black text-foreground tabular-nums mt-0.5">
              {formatMoney(totalMonthly)}/mo
            </p>
          </div>
        </div>
      </div>

      {/* Debt List */}
      <div className="space-y-3">
        {debts.length > 0 ? (
          debts.map((d) => (
            <div
              key={d.id}
              className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">{d.lender}</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Due: {d.dueDate} • Rate: {d.interestRate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-rose-500 tabular-nums">
                    {formatMoney(d.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteDebt(d.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {d.monthlyPayment > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
                  <span>Monthly Payment</span>
                  <span className="text-foreground">{formatMoney(d.monthlyPayment)}</span>
                </div>
              )}

              {d.notes && <p className="text-[10px] text-muted-foreground font-medium">{d.notes}</p>}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground font-medium">
            No active debts tracked. Tap + to add one.
          </div>
        )}
      </div>

      {/* Add Debt Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-foreground">Add Debt</h3>
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
                  Lender / Provider Name
                </label>
                <input
                  type="text"
                  value={lender}
                  onChange={(e) => setLender(e.target.value)}
                  placeholder="e.g. Bank Personal Loan, Home Credit"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#3D784E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total Amount (₱)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-black outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Monthly Due (₱)
                  </label>
                  <input
                    type="number"
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-black outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Due Schedule
                </label>
                <input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="e.g. 15th of every month"
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
                onClick={handleAddDebt}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46]"
              >
                Add Debt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
