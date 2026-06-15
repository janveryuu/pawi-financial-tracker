import { TrendingUp } from "lucide-react"
import { formatMoney, convertCurrency } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"

export function NetWorthCard() {
  const { wallets, defaultCurrency } = useStore()
  const netWorth = wallets.reduce((sum, w) => sum + convertCurrency(w.balance, w.currency, defaultCurrency), 0)
  const netWorthChange = 5.8 // Mock change for now
  return (
    <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/20">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-primary-foreground/10"
      />
      <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
        Net Worth
      </p>
      <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">
        {formatMoney(netWorth, defaultCurrency)}
      </p>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>+{netWorthChange}%</span>
        <span className="text-primary-foreground/70">
          Debit balances and investments
        </span>
      </div>
    </div>
  )
}
