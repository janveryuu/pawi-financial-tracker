"use client"

import { useState } from "react"
import { ChevronLeft, Plus, Trash2, CheckCircle2, X } from "lucide-react"
import { formatMoney, Receivable } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"

interface PlanReceivablesScreenProps {
  onBack: () => void
}

export function PlanReceivablesScreen({ onBack }: PlanReceivablesScreenProps) {
  const { receivables, addReceivable, deleteReceivable, editReceivable } = useStore()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [borrower, setBorrower] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")

  const totalOwed = receivables
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.amount, 0)

  const handleAddReceivable = () => {
    const amt = parseFloat(amount)
    if (!borrower || isNaN(amt) || amt <= 0) return

    addReceivable({
      borrower,
      amount: amt,
      dueDate: dueDate || "Upcoming",
      notes: notes || "",
      status: "pending",
      accent: "#3D784E",
    })

    setBorrower("")
    setAmount("")
    setDueDate("")
    setNotes("")
    setIsAddOpen(false)
  }

  const handleMarkReceived = (r: Receivable) => {
    editReceivable({
      ...r,
      status: r.status === "received" ? "pending" : "received",
    })
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
        <h2 className="text-base font-black text-foreground">Money Owed to You</h2>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#3D784E]/30 bg-[#3D784E]/10 text-[#3D784E] hover:bg-[#3D784E]/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-3xl border border-emerald-500/25 bg-card p-4 shadow-xs">
        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
          TOTAL EXPECTED RECEIVABLES
        </p>
        <p className="text-xl font-black text-foreground tabular-nums mt-0.5">
          {formatMoney(totalOwed)}
        </p>
      </div>

      {/* Receivables List */}
      <div className="space-y-3">
        {receivables.map((r) => {
          const isReceived = r.status === "received"
          return (
            <div
              key={r.id}
              className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-foreground">{r.borrower}</h3>
                    {isReceived && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black text-emerald-600">
                        Received
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Expected: {r.dueDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-emerald-600 tabular-nums">
                    {formatMoney(r.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteReceivable(r.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {r.notes && <p className="text-[10px] text-muted-foreground font-medium">{r.notes}</p>}

              <button
                type="button"
                onClick={() => handleMarkReceived(r)}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-secondary/50 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[#3D784E]" />
                {isReceived ? "Mark as Pending" : "Mark as Paid / Received"}
              </button>
            </div>
          )
        })}
      </div>

      {/* Add Receivable Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-foreground">Add Receivable</h3>
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
                  Person or Client Name
                </label>
                <input
                  type="text"
                  value={borrower}
                  onChange={(e) => setBorrower(e.target.value)}
                  placeholder="e.g. Alex, Design Client"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#3D784E]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Amount Owed (₱)
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
                  Expected Return Date
                </label>
                <input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="e.g. May 15, 2026"
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
                onClick={handleAddReceivable}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
