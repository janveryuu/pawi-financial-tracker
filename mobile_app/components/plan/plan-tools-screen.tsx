"use client"

import { useState } from "react"
import { ChevronLeft, Calculator, Percent, ShieldCheck, Sparkles } from "lucide-react"
import { formatMoney } from "@/lib/pawi-data"

interface PlanToolsScreenProps {
  onBack: () => void
}

export function PlanToolsScreen({ onBack }: PlanToolsScreenProps) {
  // Simple Compound Interest Calculator
  const [initialAmount, setInitialAmount] = useState("50000")
  const [monthlyContribution, setMonthlyContribution] = useState("5000")
  const [interestRate, setInterestRate] = useState("8")
  const [years, setYears] = useState("5")

  const principal = parseFloat(initialAmount) || 0
  const pmt = parseFloat(monthlyContribution) || 0
  const rate = (parseFloat(interestRate) || 0) / 100 / 12
  const n = (parseFloat(years) || 0) * 12

  let futureValue = principal * Math.pow(1 + rate, n)
  if (rate > 0) {
    futureValue += pmt * ((Math.pow(1 + rate, n) - 1) / rate)
  } else {
    futureValue += pmt * n
  }

  const totalInvested = principal + pmt * n
  const totalEarnedInterest = Math.max(0, futureValue - totalInvested)

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
        <h2 className="text-base font-black text-foreground">Financial Tools</h2>
        <div className="w-9" />
      </div>

      {/* Tool: Compound Interest Calculator */}
      <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3D784E]/15 text-[#3D784E]">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-foreground">Compound Growth Calculator</h3>
            <p className="text-[10px] text-muted-foreground font-medium">
              Forecast your wealth accumulation over time
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Starting (₱)
            </label>
            <input
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-xl border border-border/70 bg-secondary/40 px-3 text-xs font-bold outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Monthly Add (₱)
            </label>
            <input
              type="number"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-xl border border-border/70 bg-secondary/40 px-3 text-xs font-bold outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Annual Rate (%)
            </label>
            <input
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-xl border border-border/70 bg-secondary/40 px-3 text-xs font-bold outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Years
            </label>
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-xl border border-border/70 bg-secondary/40 px-3 text-xs font-bold outline-none"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-[#3D784E]/10 p-3.5 space-y-1.5 border border-[#3D784E]/20">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#3D784E]">
            ESTIMATED FUTURE VALUE
          </p>
          <p className="text-2xl font-black text-[#3D784E] tabular-nums">
            {formatMoney(futureValue)}
          </p>
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground pt-1 border-t border-[#3D784E]/15">
            <span>Principal Invested: {formatMoney(totalInvested)}</span>
            <span className="text-emerald-600 font-bold">+{formatMoney(totalEarnedInterest)} interest</span>
          </div>
        </div>
      </div>

      {/* Emergency Fund Rule */}
      <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#3D784E]" />
          <h3 className="text-xs font-black text-foreground">3-to-6 Month Safety Rule</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Pawi recommends keeping at least 3 to 6 months of mandatory living expenses in high-yield digital banks before aggressive investing.
        </p>
      </div>
    </div>
  )
}
