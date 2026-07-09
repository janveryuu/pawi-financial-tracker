import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import {
  formatMoney,
  type Transaction,
} from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { PawiTip } from "../pawi-tip"

export function HistoryScreen() {
  const { transactions } = useStore()
  
  const monthlyIncome = transactions.filter(t => t.kind === "income").reduce((s, t) => s + (t.currency === "USD" ? t.amount * 57 : t.amount), 0)
  const monthlyExpense = transactions.filter(t => t.kind === "expense").reduce((s, t) => s + (t.currency === "USD" ? t.amount * 57 : t.amount), 0)

  // Group transactions by date
  const grouped = transactions.reduce((acc, tx) => {
    // For simplicity, using "Today" for everything in this demo, but typically you'd format tx.time or tx.date
    const date = "Recent" 
    if (!acc[date]) acc[date] = []
    acc[date].push(tx)
    return acc
  }, {} as Record<string, Transaction[]>)

  const history = Object.entries(grouped).map(([date, items]) => ({ date, items }))

  return (
    <div className="flex flex-col gap-5 px-5 pt-4 pb-24">
      <div className="-mx-5 -mt-2">
        <PawiTip
          image="/pawi-dashboard-clean.png"
          tip="Reviewing your history regularly helps you spot patterns and small leaks in your spending!"
          trivia="Sea turtles have a built-in GPS using the Earth's magnetic field to find their way home. You have Pawi to track your past expenses so your money never gets lost!"
        />
      </div>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5 text-primary">
            <ArrowUpRight className="h-4 w-4" />
            <p className="text-[11px] font-medium uppercase tracking-wider">
              Income
            </p>
          </div>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {formatMoney(monthlyIncome)}
          </p>
          <p className="text-[11px] text-muted-foreground">This month</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5 text-destructive">
            <ArrowDownLeft className="h-4 w-4" />
            <p className="text-[11px] font-medium uppercase tracking-wider">
              Expenses
            </p>
          </div>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {formatMoney(monthlyExpense)}
          </p>
          <p className="text-[11px] text-muted-foreground">This month</p>
        </div>
      </section>

      {history.map((group) => (
        <section key={group.date}>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.date}
          </h2>
          <ul className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
            {group.items.map((tx, i) => {
              const isIncome = tx.kind === "income"
              return (
                <li
                  key={tx.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    i !== group.items.length - 1 &&
                      "border-b border-border/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      isIncome
                        ? "bg-primary/15 text-primary"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownLeft className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {tx.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {tx.category} · {tx.account} · {tx.time}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      isIncome ? "text-primary" : "text-destructive",
                    )}
                  >
                    {isIncome ? "+" : "-"}
                    {formatMoney(tx.amount, tx.currency)}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
