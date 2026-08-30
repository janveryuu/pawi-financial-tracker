"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Wallet, X, Sparkles } from "lucide-react"
import { useStore } from "@/lib/store"
import { getBrandLogo } from "@/lib/pawi-data"

interface AddBudgetModalProps {
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

export function AddBudgetModal({ open, onClose }: AddBudgetModalProps) {
  const [category, setCategory] = useState("")
  const [limit, setLimit] = useState("")
  const { addBudget } = useStore()

  const detectedLogo = getBrandLogo(category)

  const handleAdd = () => {
    if (!category.trim() || !limit) return

    addBudget({
      category,
      limit: Number(limit),
      spent: 0,
      accent: accents[Math.floor(Math.random() * accents.length)],
      icon: detectedLogo || "🍽️",
    })

    setCategory("")
    setLimit("")
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
              <Wallet className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              New Budget
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Category Name</label>
              {detectedLogo && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#3D784E]">
                  <Sparkles className="h-3 w-3" /> Brand logo detected!
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Netflix, Starbucks, Foodpanda, Grab..."
                className="flex h-12 w-full rounded-xl border border-border/60 bg-card px-4 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
              {detectedLogo && (
                <div className="absolute right-2.5 flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-card border border-border/60 p-0.5 shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detectedLogo}
                    alt={category}
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Monthly Limit</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="e.g. 5000"
              className="flex h-12 w-full rounded-xl border border-border/60 bg-card px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!category.trim() || !limit}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            Create Budget
          </button>
        </div>
      </div>
    </div>
  )
}
