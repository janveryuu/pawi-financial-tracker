"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Calendar, DollarSign, Check, TrendingUp } from "lucide-react"
import { useStore, PaydayConfig } from "@/lib/store"
import { formatMoney } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"
import { sanitizeNumericInput, MAX_LENGTH } from "@/lib/anti-spam"

interface PaydaySetupModalProps {
  open: boolean
  onClose: () => void
}

const PRESET_SCHEDULES = [
  { label: "15th & 30th (Semi-monthly)", frequency: "semi-monthly" as const, day1: 15, day2: 30 },
  { label: "10th & 25th (Semi-monthly)", frequency: "semi-monthly" as const, day1: 10, day2: 25 },
  { label: "Every 15th (Monthly)", frequency: "monthly" as const, day1: 15, day2: undefined },
  { label: "End of Month (Monthly)", frequency: "monthly" as const, day1: 30, day2: undefined },
]

export function PaydaySetupModal({ open, onClose }: PaydaySetupModalProps) {
  const { paydayConfig, updatePaydayConfig } = useStore()
  const [mounted, setMounted] = useState(false)

  const [frequency, setFrequency] = useState<"monthly" | "semi-monthly">(
    paydayConfig?.frequency || "semi-monthly"
  )
  const [day1, setDay1] = useState<number>(paydayConfig?.day1 || 15)
  const [day2, setDay2] = useState<number>(paydayConfig?.day2 || 30)
  const [amount, setAmount] = useState<string>(
    paydayConfig?.amount && paydayConfig.amount > 0 ? paydayConfig.amount.toString() : ""
  )
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!open || !mounted) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const numAmount = parseFloat(amount) || 0
      const newConfig: PaydayConfig = {
        configured: true,
        frequency,
        day1: Number(day1) || 15,
        day2: frequency === "semi-monthly" ? Number(day2) || 30 : undefined,
        amount: numAmount,
      }
      await updatePaydayConfig(newConfig)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleApplyPreset = (preset: typeof PRESET_SCHEDULES[number]) => {
    setFrequency(preset.frequency)
    setDay1(preset.day1)
    if (preset.day2) setDay2(preset.day2)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-2xl text-foreground animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">Payday Schedule</h2>
              <p className="text-xs text-muted-foreground font-medium">
                Track countdown & smart budget pacing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 mt-4">
          {/* Preset Buttons */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Quick Schedule Presets
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {PRESET_SCHEDULES.map((p, idx) => {
                const isSelected =
                  frequency === p.frequency &&
                  day1 === p.day1 &&
                  (p.frequency === "monthly" || day2 === p.day2)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={cn(
                      "rounded-2xl border p-2.5 text-left text-xs font-bold transition-all",
                      isSelected
                        ? "border-[#3D784E] bg-[#3D784E]/10 text-[#2E683E] dark:text-[#6ee7b7]"
                        : "border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Schedule Frequency Toggle */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Payout Frequency
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setFrequency("semi-monthly")}
                className={cn(
                  "py-2.5 rounded-2xl text-xs font-black transition-all border",
                  frequency === "semi-monthly"
                    ? "bg-[#3D784E] text-white border-[#3D784E] shadow-xs"
                    : "bg-secondary/40 border-border/70 text-muted-foreground hover:text-foreground"
                )}
              >
                Semi-Monthly (Twice)
              </button>
              <button
                type="button"
                onClick={() => setFrequency("monthly")}
                className={cn(
                  "py-2.5 rounded-2xl text-xs font-black transition-all border",
                  frequency === "monthly"
                    ? "bg-[#3D784E] text-white border-[#3D784E] shadow-xs"
                    : "bg-secondary/40 border-border/70 text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly (Once)
              </button>
            </div>
          </div>

          {/* Days of Month Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                {frequency === "semi-monthly" ? "1st Payday (Day)" : "Payday (Day of month)"}
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={day1}
                onChange={(e) => setDay1(parseInt(e.target.value) || 1)}
                className="mt-1 flex h-11 w-full rounded-2xl border border-border/80 bg-secondary/40 px-3 text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-[#3D784E]"
                required
              />
            </div>
            {frequency === "semi-monthly" && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  2nd Payday (Day)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={day2}
                  onChange={(e) => setDay2(parseInt(e.target.value) || 1)}
                  className="mt-1 flex h-11 w-full rounded-2xl border border-border/80 bg-secondary/40 px-3 text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-[#3D784E]"
                  required
                />
              </div>
            )}
          </div>

          {/* Expected Salary / Payout Amount */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Expected Payout Amount (PHP)
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">
                ₱
              </span>
              <input
                type="number"
                placeholder="e.g. 25,000.00"
                value={amount}
                maxLength={MAX_LENGTH.AMOUNT_DIGITS}
                onChange={(e) => setAmount(sanitizeNumericInput(e.target.value, MAX_LENGTH.AMOUNT_DIGITS))}
                className="flex h-11 w-full rounded-2xl border border-border/80 bg-secondary/40 pl-8 pr-3.5 text-sm font-black text-foreground outline-none focus:ring-2 focus:ring-[#3D784E]"
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Optional: Shown on your home countdown card to help pace daily spending.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-border/80 py-3 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-2xl bg-[#3D784E] py-3 text-xs font-black text-white shadow-xs hover:bg-[#356B46] active:scale-95 transition-all"
            >
              {isSaving ? "Saving..." : "Save Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
