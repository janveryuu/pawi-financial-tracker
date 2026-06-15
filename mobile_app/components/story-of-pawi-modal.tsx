"use client"

import { useEffect } from "react"
import { X, BookOpen } from "lucide-react"
import Image from "next/image"

interface StoryOfPawiModalProps {
  open: boolean
  onClose: () => void
}

export function StoryOfPawiModal({ open, onClose }: StoryOfPawiModalProps) {
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
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 p-5 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <BookOpen className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              The Story of Pawi
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

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="mb-6 flex justify-center">
            <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-4 ring-primary/20">
              <Image
                src="/pawikan-logo.png"
                alt="Pawi the Turtle"
                width={128}
                height={128}
                className="object-cover"
              />
            </div>
          </div>
          
          <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
            <p>
              Once upon a time in the vast, deep blue sea, there lived a small but incredibly wise sea turtle named <strong>Pawi</strong>. Unlike the other turtles who swam aimlessly through the currents, Pawi was fascinated by the ocean's treasures—shiny pearls, sunken coins, and hidden coral reefs.
            </p>
            <p>
              But Pawi noticed a problem. Many sea creatures would find treasures but spend them all in one day! The crabs would trade their pearls for a quick snack, and the fish would lose their shiny coins in the deep trenches. They had no savings, no emergency funds for when the cold currents arrived, and no plan for their future.
            </p>
            <p>
              Pawi, being the methodical turtle he was, decided to build a system. He gathered the sea creatures and taught them the art of <strong>tracking their treasures</strong>. He showed them how to set up small underwater caves (wallets) for different needs, how to plan for the long winter (budgets), and how to save up for the best coral homes (goals).
            </p>
            <p className="border-l-4 border-primary pl-4 italic text-muted-foreground">
              "Slow and steady wins the race," Pawi would say. "Consistency is key. A pearl saved today is a pearl earned tomorrow."
            </p>
            <p>
              Soon, the entire reef was prospering. The sea creatures were no longer stressed about the cold currents because Pawi had helped them build a solid financial foundation.
            </p>
            <p>
              Today, Pawi brings his ancient, steady wisdom to you. He is your personal financial guide, helping you track, plan, and grow your own treasures. With Pawi by your side, financial freedom isn't a race—it's a journey, and you're already on the right path.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border/40 shrink-0 bg-secondary/20">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start Your Journey with Pawi
          </button>
        </div>

      </div>
    </div>
  )
}
