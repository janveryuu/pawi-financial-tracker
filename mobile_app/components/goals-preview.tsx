import { Target, Plus } from "lucide-react"
import { formatMoney } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"

export function GoalsPreview({ onAddGoal }: { onAddGoal?: () => void }) {
  const { goals } = useStore()
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Goals &amp; Plan
          </h2>
        </div>
        <button
          type="button"
          onClick={onAddGoal}
          className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
        >
          <Plus className="h-3.5 w-3.5" />
          New Goal
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {goals.map((goal) => {
          const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
          const remaining = goal.target - goal.saved
          return (
            <div key={goal.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {goal.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {goal.due ? `Due ${goal.due}` : "No deadline"} ·{" "}
                    {formatMoney(remaining)} remaining
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: goal.accent }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
