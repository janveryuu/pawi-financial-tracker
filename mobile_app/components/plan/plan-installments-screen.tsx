"use client"

import { useState } from "react"
import { ChevronLeft, Plus, Trash2, CreditCard, X } from "lucide-react"
import { formatMoney, Installment } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"

interface PlanInstallmentsScreenProps {
  onBack: () => void
}

export function PlanInstallmentsScreen({ onBack }: PlanInstallmentsScreenProps) {
  const { installments, addInstallment, deleteInstallment } = useStore()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [monthsTotal, setMonthsTotal] = useState("12")
  const [monthsPaid, setMonthsPaid] = useState("0")
  const [card, setCard] = useState("BDO Mastercard")

  const totalRemaining = installments.reduce((s, i) => s + i.remaining, 0)
  const totalMonthly = installments.reduce((s, i) => s + i.monthlyAmount, 0)

  const handleAddInstallment = () => {
    const total = parseFloat(totalAmount)
    const mTotal = parseInt(monthsTotal) || 12
    const mPaid = parseInt(monthsPaid) || 0
    if (!name || isNaN(total) || total <= 0) return

    const monthly = Math.round(total / mTotal)
    const paid = monthly * mPaid
    const remaining = Math.max(0, total - paid)

    addInstallment({
      name,
      totalAmount: total,
      paid,
      remaining,
      monthlyAmount: monthly,
      card,
      monthsTotal: mTotal,
      monthsPaid: mPaid,
      endDate: "In " + (mTotal - mPaid) + " mos",
    })

    setName("")
    setTotalAmount("")
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
        <h2 className="text-base font-black text-foreground">Installments</h2>
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
              OUTSTANDING BALANCE
            </p>
            <p className="text-xl font-black text-foreground tabular-nums mt-0.5">
              {formatMoney(totalRemaining)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              MONTHLY CHARGE
            </p>
            <p className="text-sm font-black text-rose-500 tabular-nums mt-0.5">
              -{formatMoney(totalMonthly)}/mo
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {installments.map((inst) => {
          const pct = inst.monthsTotal > 0 ? Math.round((inst.monthsPaid / inst.monthsTotal) * 100) : 0
          return (
            <div
              key={inst.id}
              className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">{inst.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {inst.card} • {inst.monthsPaid}/{inst.monthsTotal} mos ({inst.endDate})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-foreground tabular-nums">
                    {formatMoney(inst.monthlyAmount)}/mo
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteInstallment(inst.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1">
                  <span>Paid: {formatMoney(inst.paid)}</span>
                  <span>{formatMoney(inst.remaining)} left ({pct}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-[#3D784E] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-foreground">Add Installment</h3>
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
                  Item or Purchase Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. iPhone, Laptop, Appliance"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#3D784E]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total Contract Amount (₱)
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-base font-black outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tenure (Months)
                  </label>
                  <input
                    type="number"
                    value={monthsTotal}
                    onChange={(e) => setMonthsTotal(e.target.value)}
                    className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Months Already Paid
                  </label>
                  <input
                    type="number"
                    value={monthsPaid}
                    onChange={(e) => setMonthsPaid(e.target.value)}
                    className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                  />
                </div>
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
                onClick={handleAddInstallment}
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
