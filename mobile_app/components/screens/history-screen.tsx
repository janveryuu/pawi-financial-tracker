"use client"

import { useState } from "react"
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Sparkles, Filter, Receipt, Calendar } from "lucide-react"
import {
  formatMoney,
  type Transaction,
} from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { PawiTip } from "../pawi-tip"

export function HistoryScreen() {
  const { transactions } = useStore()
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")

  const monthlyIncome = transactions.filter(t => t.kind === "income").reduce((s, t) => s + (t.currency === "USD" ? t.amount * 57 : t.amount), 0)
  const monthlyExpense = transactions.filter(t => t.kind === "expense").reduce((s, t) => s + (t.currency === "USD" ? t.amount * 57 : t.amount), 0)
  const netFlow = monthlyIncome - monthlyExpense
  const isPositiveFlow = netFlow >= 0

  const filteredTransactions = transactions.filter(t => {
    if (filterType === "all") return true
    return t.kind === filterType
  })

  // Group transactions
  const grouped = filteredTransactions.reduce((acc, tx) => {
    const date = "Recent Activity"
    if (!acc[date]) acc[date] = []
    acc[date].push(tx)
    return acc
  }, {} as Record<string, Transaction[]>)

  const history = Object.entries(grouped).map(([date, items]) => ({ date, items }))

  return (
    <div className="flex flex-col gap-6 px-5 pt-4 pb-24">
      {/* Pawi Tip Banner */}
      <div className="-mx-5 -mt-2">
        <PawiTip
          image="/pawi-dashboard-clean.png"
          tip="Reviewing your history regularly helps you spot patterns and small leaks in your spending!"
          trivia="Sea turtles have a built-in GPS using the Earth's magnetic field to find their way home. You have Pawi to track your past expenses so your money never gets lost!"
        />
      </div>

      {/* Title & Net Monthly Cashflow Hero Card */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Transaction Ledger</h1>
            <p className="text-xs text-muted-foreground">Comprehensive record of income & expenses</p>
          </div>
          <span className="rounded-2xl bg-secondary px-3 py-1.5 text-xs font-bold text-foreground">
            {transactions.length} Total
          </span>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-card p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-[11px] font-bold text-primary">
                <Sparkles className="h-3 w-3" />
                Net Cashflow Summary
              </span>
              <div className="mt-2.5">
                <span className={cn("text-2xl font-black tracking-tight", isPositiveFlow ? "text-emerald-500" : "text-rose-500")}>
                  {isPositiveFlow ? "+" : ""}{formatMoney(netFlow)}
                </span>
                <span className="text-xs font-bold text-muted-foreground ml-2">
                  this month
                </span>
              </div>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/25 text-primary shadow-inner">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground">Monthly Savings Efficiency</span>
            <span className={isPositiveFlow ? "text-emerald-500" : "text-rose-500"}>
              {monthlyIncome > 0 ? `${Math.round((netFlow / monthlyIncome) * 100)}% saved` : "0%"}
            </span>
          </div>
        </div>
      </div>

      {/* 2 Glowing Rich Income & Expense Cards */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-card p-4 shadow-sm transition-all hover:border-emerald-500/50">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500">
              <ArrowUpRight className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
              Income
            </span>
          </div>
          <p className="text-xl font-black tabular-nums text-foreground">
            {formatMoney(monthlyIncome)}
          </p>
          <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">Total inflow</p>
        </div>

        <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-b from-rose-500/15 via-rose-500/5 to-card p-4 shadow-sm transition-all hover:border-rose-500/50">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-500">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">
              Expenses
            </span>
          </div>
          <p className="text-xl font-black tabular-nums text-foreground">
            {formatMoney(monthlyExpense)}
          </p>
          <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">Total outflow</p>
        </div>
      </section>

      {/* Interactive Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={cn(
            "rounded-2xl px-4 py-2 text-xs font-bold transition-all",
            filterType === "all"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "border border-border/70 bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          All ({transactions.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType("income")}
          className={cn(
            "flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold transition-all",
            filterType === "income"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
              : "border border-border/70 bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
          Income Only
        </button>
        <button
          type="button"
          onClick={() => setFilterType("expense")}
          className={cn(
            "flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold transition-all",
            filterType === "expense"
              ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
              : "border border-border/70 bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <ArrowDownLeft className="h-3.5 w-3.5 text-rose-500" />
          Expenses Only
        </button>
      </div>

      {/* Upgraded Luxury Transactions List */}
      {history.length > 0 ? (
        history.map((group) => (
          <section key={group.date}>
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                {group.date}
              </h2>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {group.items.length} items
              </span>
            </div>
            <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-md divide-y divide-border/40">
              {group.items.map((tx) => {
                const isIncome = tx.kind === "income"
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-secondary/40"
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-inner",
                        isIncome
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-rose-500/15 text-rose-500",
                      )}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowDownLeft className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-foreground">
                        {tx.label}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {tx.category}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          · {tx.account} · {tx.time}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-extrabold tabular-nums",
                        isIncome ? "text-emerald-500" : "text-rose-500",
                      )}
                    >
                      {isIncome ? "+" : "-"}
                      {formatMoney(tx.amount, tx.currency)}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      ) : (
        <div className="rounded-3xl border border-border/70 bg-card p-8 text-center">
          <Receipt className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-bold text-foreground">No transactions found</p>
          <p className="text-xs text-muted-foreground mt-1">Try selecting a different filter category.</p>
        </div>
      )}
    </div>
  )
}
