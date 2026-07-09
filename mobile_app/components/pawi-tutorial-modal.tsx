"use client"

import { useEffect, useState } from "react"
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  LayoutDashboard,
  Wallet,
  Target,
  Bot,
  CheckCircle2,
} from "lucide-react"
import Image from "next/image"

export interface PawiTutorialModalProps {
  open: boolean
  onClose: () => void
}

interface TutorialStep {
  title: string
  subtitle: string
  icon: React.ReactNode
  image: string
  speech: string
  tip?: string
}

const steps: TutorialStep[] = [
  {
    title: "Welcome to Pawi! 🐢",
    subtitle: "Your personal, private financial guide",
    icon: <Sparkles className="h-5 w-5 text-primary" />,
    image: "/pawi-happy.png",
    speech:
      "Hello there! I'm Pawi, your sea turtle financial companion. Slow and steady wins the race! I'm here to help you track every treasure, grow your net worth, and build stress-free money habits.",
    tip: "Everything is private, offline-first, and completely under your control.",
  },
  {
    title: "Dashboard Snapshot 📊",
    subtitle: "At-a-glance financial health",
    icon: <LayoutDashboard className="h-5 w-5 text-primary" />,
    image: "/pawi-dashboard-clean.png",
    speech:
      "Your Dashboard shows your Total Net Worth, Monthly Spending progress, and recent transactions all in one place. Use the glowing Quick Log button at the bottom anytime to record expenses in seconds!",
  },
  {
    title: "Multi-Currency Wallets 💳",
    subtitle: "Cash, GCash, Bank Cards & Savings",
    icon: <Wallet className="h-5 w-5 text-primary" />,
    image: "/pawi-holding-wallet.png",
    speech:
      "Keep your pockets organized! Whether you have USD Cash, PHP GCash, or bank cards, Pawi tracks your balances across currencies with automatic conversions.",
    tip: "Keep your Emergency Fund in a dedicated Savings wallet so you aren't tempted to spend it!",
  },
  {
    title: "Smart Goals & Budgets 🎯",
    subtitle: "Plan ahead for rainy days",
    icon: <Target className="h-5 w-5 text-primary" />,
    image: "/pawi-darting.png",
    speech:
      "Head over to the 'Plan' tab to set monthly budgets for Food, Transport, or Bills. You can also create savings targets for your dream vacation or a new gadget!",
  },
  {
    title: "Ask Pawi AI Assistant 🤖",
    subtitle: "Personal financial wisdom on demand",
    icon: <Bot className="h-5 w-5 text-primary" />,
    image: "/pawi-playing-with-robot.png",
    speech:
      "Got a question about your spending trends or need advice on saving up? Tap the 'Chat' tab in the bottom bar to chat with me anytime. I'm always awake to help!",
  },
  {
    title: "You're Ready to Swim! 🌊",
    subtitle: "Begin your financial journey today",
    icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
    image: "/pawi-excited.png",
    speech:
      "You're all set! Remember: a peso saved today is a treasure grown tomorrow. Let's start by logging your first expense or exploring your wallets!",
  },
]

export function PawiTutorialModal({ open, onClose }: PawiTutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (open) {
      setCurrentStep(0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleFinish()
      if (e.key === "ArrowRight") handleNext()
      if (e.key === "ArrowLeft") handlePrev()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, currentStep])

  const handleFinish = () => {
    try {
      localStorage.setItem("pawi_has_seen_tutorial", "true")
    } catch {
      // ignore storage errors
    }
    onClose()
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleFinish()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  if (!open) return null

  const step = steps[currentStep]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={handleFinish}
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Container */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl transition-all duration-200 animate-in slide-in-from-bottom sm:rounded-3xl">
        {/* Top Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/40 bg-card/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/15">
              {step.icon}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Step {currentStep + 1} of {steps.length}
              </p>
              <h2 className="text-base font-bold text-foreground leading-tight">
                Interactive Tour
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            aria-label="Close tutorial"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Mascot Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="relative mb-3 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-4 ring-primary/25 shadow-md">
              <Image
                src={step.image}
                alt="Pawi Mascot"
                width={100}
                height={100}
                className="h-24 w-24 object-contain transition-transform duration-300 hover:scale-105"
              />
            </div>
            <h3 className="text-xl font-extrabold text-foreground tracking-tight">
              {step.title}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              {step.subtitle}
            </p>
          </div>

          {/* Pawi Speech Bubble */}
          <div className="relative rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-extrabold text-primary">
                🐢
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Pawi says:
              </span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-foreground/90">
              {step.speech}
            </p>

            {step.tip && (
              <div className="mt-3.5 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground border border-border/40">
                <span className="font-bold text-foreground">💡 Quick Tip: </span>
                {step.tip}
              </div>
            )}
          </div>

          {/* Progress Indicator Dots */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? "w-7 bg-primary"
                    : idx < currentStep
                      ? "w-2 bg-primary/40"
                      : "w-2 bg-secondary"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/40 bg-secondary/15 p-5">
          <div className="flex items-center gap-2">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1 rounded-2xl border border-border/60 bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2"
              >
                Skip Tour
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-2xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary/90 active:scale-95"
          >
            {currentStep === steps.length - 1 ? (
              <>
                Let&apos;s Start!
                <Sparkles className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
