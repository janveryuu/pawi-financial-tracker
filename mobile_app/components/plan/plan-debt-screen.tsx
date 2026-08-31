"use client"

import { useState } from "react"
import { ChevronLeft, Plus, Trash2, X, Wallet as WalletIcon, CheckCircle2, ArrowRightLeft } from "lucide-react"
import { formatMoney, Debt, getWalletBrandLogo, getWalletBrandColor } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface PlanDebtScreenProps {
  onBack: () => void
}

export function PlanDebtScreen({ onBack }: PlanDebtScreenProps) {
  const { debts, addDebt, deleteDebt, editDebt, wallets, addTransaction, defaultCurrency } = useStore()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [lender, setLender] = useState("")
  const [amount, setAmount] = useState("")
  const [monthlyPayment, setMonthlyPayment] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [notes, setNotes] = useState("")

  // Payment modal state
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [sourceWalletName, setSourceWalletName] = useState(wallets[0]?.name || "GCash")
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isSubmittingPay, setIsSubmittingPay] = useState(false)

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

  const handleOpenPay = (d: Debt) => {
    setPayingDebt(d)
    setPayAmount(d.monthlyPayment > 0 ? d.monthlyPayment.toString() : d.amount.toString())
    setSourceWalletName(wallets[0]?.name || "GCash")
    setPaymentError(null)
  }

  const handleConfirmPayment = async () => {
    if (!payingDebt) return
    const amt = parseFloat(payAmount)
    if (isNaN(amt) || amt <= 0) {
      setPaymentError("Please enter a valid payment amount.")
      return
    }

    const sourceWallet = wallets.find(
      (w) => w.name.toLowerCase() === sourceWalletName.toLowerCase()
    )

    if (sourceWallet && sourceWallet.balance < amt) {
      setPaymentError(
        `Insufficient balance in ${sourceWallet.name}. Available: ${formatMoney(
          sourceWallet.balance,
          sourceWallet.currency
        )}`
      )
      return
    }

    setIsSubmittingPay(true)
    setPaymentError(null)

    try {
      // 1. Log transaction
      await addTransaction({
        label: `Debt Payment: ${payingDebt.lender}`,
        amount: amt,
        category: "Debt Payment",
        kind: "expense",
        account: sourceWalletName,
        currency: defaultCurrency || "PHP",
        dateHeader: "Today",
      })

      // 2. Reduce debt balance or delete if fully paid
      const newBalance = Math.max(0, payingDebt.amount - amt)
      if (newBalance === 0) {
        await deleteDebt(payingDebt.id)
      } else {
        await editDebt({
          ...payingDebt,
          amount: newBalance,
        })
      }

      setPayingDebt(null)
    } catch (e: any) {
      setPaymentError(e?.message || "Could not process payment")
    } finally {
      setIsSubmittingPay(false)
    }
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

              {/* Pay / Settle Button */}
              <button
                type="button"
                onClick={() => handleOpenPay(d)}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-rose-500/10 py-2.5 text-xs font-black text-rose-500 hover:bg-rose-500/20 active:scale-[0.98] transition-all"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Make Payment / Settle
              </button>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground font-medium">
            No active debts tracked. Tap + to add one.
          </div>
        )}
      </div>

      {/* Pay Debt Modal */}
      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[2.5rem] border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Pay Towards {payingDebt.lender}</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    Current Balance: {formatMoney(payingDebt.amount)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayingDebt(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {paymentError && (
              <div className="mb-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] font-bold text-rose-500">
                {paymentError}
              </div>
            )}

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Payment Amount (₱)
                </label>
                <input
                  type="number"
                  step="any"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="mt-1 flex h-11 w-full rounded-2xl border border-border bg-secondary/40 px-3.5 text-base font-black outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="mt-1.5 flex gap-1.5">
                  {payingDebt.monthlyPayment > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(payingDebt.monthlyPayment.toString())}
                      className="rounded-xl border border-border/70 bg-secondary/60 px-2.5 py-1 text-[10px] font-bold text-foreground hover:bg-secondary"
                    >
                      Monthly ({formatMoney(payingDebt.monthlyPayment)})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPayAmount(payingDebt.amount.toString())}
                    className="rounded-xl border border-border/70 bg-secondary/60 px-2.5 py-1 text-[10px] font-bold text-foreground hover:bg-secondary"
                  >
                    Full Balance ({formatMoney(payingDebt.amount)})
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Pay From Wallet / Account
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {wallets.filter((w) => !w.isLiability).map((w) => {
                    const isSelected = sourceWalletName.toLowerCase() === w.name.toLowerCase()
                    const logo = getWalletBrandLogo(w.name)
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setSourceWalletName(w.name)}
                        className={cn(
                          "flex items-center gap-2 rounded-2xl border p-2 text-left transition-all",
                          isSelected
                            ? "border-rose-500 bg-rose-500/10 text-foreground font-extrabold"
                            : "border-border/70 bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                        )}
                      >
                        {logo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={logo} alt={w.name} className="h-5 w-5 rounded-full object-contain" />
                        ) : (
                          <WalletIcon className="h-4 w-4" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold">{w.name}</p>
                          <p className="text-[9px] text-muted-foreground tabular-nums">
                            {formatMoney(w.balance, w.currency)}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPayingDebt(null)}
                className="flex-1 rounded-2xl border border-border bg-secondary py-3 text-xs font-bold text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingPay}
                onClick={handleConfirmPayment}
                className="flex-1 rounded-2xl bg-rose-500 py-3 text-xs font-extrabold text-white hover:bg-rose-600 shadow-sm shadow-rose-500/30 disabled:opacity-50"
              >
                {isSubmittingPay ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Debt Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[2.5rem] border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
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
                  className="mt-1 flex h-11 w-full rounded-2xl border border-border bg-secondary/40 px-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#3D784E]"
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
                    className="mt-1 flex h-11 w-full rounded-2xl border border-border bg-secondary/40 px-3.5 text-xs font-black outline-none"
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
                    className="mt-1 flex h-11 w-full rounded-2xl border border-border bg-secondary/40 px-3.5 text-xs font-black outline-none"
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
                  className="mt-1 flex h-11 w-full rounded-2xl border border-border bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="flex-1 rounded-2xl bg-secondary py-3 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDebt}
                className="flex-1 rounded-2xl bg-[#3D784E] py-3 text-xs font-black text-white hover:bg-[#356B46] shadow-sm shadow-[#3D784E]/30"
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
