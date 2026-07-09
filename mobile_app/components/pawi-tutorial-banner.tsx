"use client"

import { useState, useEffect } from "react"
import { Sparkles, X } from "lucide-react"
import Image from "next/image"

interface PawiTutorialBannerProps {
  onStartTour: () => void
}

export function PawiTutorialBanner({ onStartTour }: PawiTutorialBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem("pawi_tutorial_banner_dismissed") === "true") {
        setDismissed(true)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem("pawi_tutorial_banner_dismissed", "true")
    } catch {
      // ignore
    }
  }

  if (dismissed) return null

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/10 to-card p-4 shadow-sm transition-all animate-in fade-in duration-300">
      <div className="flex items-start gap-3.5">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card ring-2 ring-primary/30 shadow-sm">
          <Image
            src="/pawikan-2.png"
            alt="Pawi Mascot"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" />
              New Guide
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss banner"
              className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <h3 className="mt-1 text-sm font-bold text-foreground">
            Take the Interactive Tour with Pawi!
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            First time using Pawi? Let our turtle guide explain how to master your wallets, budgets, and AI assistant.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onStartTour}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
            >
              Start Interactive Tour
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
