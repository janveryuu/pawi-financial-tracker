"use client"

import { useEffect, useState } from "react"
import { Target, X } from "lucide-react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface AddGoalModalProps {
  open: boolean
  onClose: () => void
}

const accents = [
  "oklch(0.7 0.13 145)",
  "oklch(0.62 0.18 250)",
  "oklch(0.68 0.16 162)",
  "oklch(0.6 0.2 25)",
  "oklch(0.7 0.15 25)",
]

const EMOJI_OPTIONS = ["🏖️", "🛡️", "🏠", "🚗", "💻", "🎓", "💍", "✈️", "📱", "🎉"]

export function AddGoalModal({ open, onClose }: AddGoalModalProps) {
  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [saved, setSaved] = useState("")
  const [due, setDue] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("")
  const { addGoal } = useStore()

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setName("")
      setTarget("")
      setSaved("")
      setDue("")
      setSelectedIcon("")
    }
  }, [open])

  const handleAdd = () => {
    if (!name.trim() || !target) return

    addGoal({
      name,
      target: Number(target),
      due: due || null,
      saved: Number(saved) || 0,
      accent: accents[Math.floor(Math.random() * accents.length)],
      icon: selectedIcon || "🎯",
    })

    onClose()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Target className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              New Goal
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Goal Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Bohol Trip, Emergency Fund"
              className="flex h-12 w-full rounded-xl border border-border/60 bg-secondary/40 px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Amount</label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0.00"
              className="flex h-12 w-full rounded-xl border border-border/60 bg-secondary/40 px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Already Saved</label>
            <input
              type="number"
              value={saved}
              onChange={(e) => setSaved(e.target.value)}
              placeholder="0.00"
              className="flex h-12 w-full rounded-xl border border-border/60 bg-secondary/40 px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Deadline (Optional)</label>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-border/60 bg-secondary/40 px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedIcon(emoji)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border bg-secondary/40 text-lg transition-colors hover:bg-secondary",
                    selectedIcon === emoji ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border/60"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim() || !target}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            Save Goal
          </button>
        </div>
      </div>
    </div>
  )
}
