import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { formatMoney } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export function RecentTransactions({ onSeeAll }: { onSeeAll?: () => void }) {
  const { transactions } = useStore()
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Recent Transactions
        </h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="text-xs font-medium text-primary hover:underline"
        >
          See all
        </button>
      </div>
      <ul className="flex flex-col">
        {transactions.map((tx, i) => {
          const isIncome = tx.kind === "income"
          return (
            <li
              key={tx.id}
              className={cn(
                "flex items-center gap-3 py-3",
                i !== transactions.length - 1 && "border-b border-border/50",
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
  )
}
