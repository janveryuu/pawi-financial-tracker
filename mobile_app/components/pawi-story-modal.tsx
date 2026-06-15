"use client"

import { useEffect } from "react"
import Image from "next/image"
import { X, Heart, Shield, Sparkles } from "lucide-react"

interface PawiStoryModalProps {
  open: boolean
  onClose: () => void
}

export function PawiStoryModal({ open, onClose }: PawiStoryModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
      />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-2xl">
        <div className="relative h-32 bg-primary/20">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md transition-colors hover:bg-black/40"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-card bg-primary/20 p-2 shadow-lg">
              <Image 
                src="/pawikan-logo.png" 
                alt="Pawi" 
                width={60} 
                height={60} 
                className="object-contain"
              />
            </div>
          </div>
        </div>

        <div className="px-6 pb-8 pt-14 text-center">
          <h2 className="text-xl font-bold text-foreground">Hi, I'm Pawi! 🐢</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            I'm a little sea turtle, and I'm here to help you navigate the vast ocean of personal finance. 
            Slow and steady wins the race when it comes to saving!
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Offline & Private</h3>
                <p className="text-[11px] text-muted-foreground">Your data never leaves your device.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/15 text-pink-500">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Stress-Free Tracking</h3>
                <p className="text-[11px] text-muted-foreground">Record expenses as naturally as sending a text.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/15 text-yellow-500">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Gamified Savings</h3>
                <p className="text-[11px] text-muted-foreground">Level up as you reach your financial goals!</p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
          >
            Let's get saving!
          </button>
        </div>
      </div>
    </div>
  )
}
