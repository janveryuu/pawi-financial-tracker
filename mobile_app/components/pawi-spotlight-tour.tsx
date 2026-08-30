"use client"

/**
 * PawiSpotlightTour — Mandatory, interactive, spotlight-driven product tour.
 *
 * Key guarantees:
 *  - Full-screen SVG scrim with an even-odd cutout over the real, live UI element.
 *  - Transparent spotlight hole passes all taps directly through to the underlying element.
 *  - Direct forwarder triggers underlying action and advances tour seamlessly.
 *  - Callout card includes advance actions so user is never stuck.
 *  - Hidden accessibility escape hatch: triple-tap top-left corner OR 5× Tab+Enter.
 *  - Tutorial progress (currentStep) is persisted to Supabase profiles.tutorial_step.
 *  - On app restart mid-tour, the tour resumes at the exact last-persisted step.
 */

import { useEffect, useState, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, ArrowRight } from "lucide-react"
import Image from "next/image"
import { useSpotlightRect } from "@/hooks/use-spotlight-rect"

// ── Types ──────────────────────────────────────────────────────────────────────

type AdvanceMode = "got-it" | "real-interaction"

export interface SpotlightStep {
  id: number
  tutorialId: string | null  // data-tutorial-id to spotlight; null = full-screen narration
  title: string
  speech: string
  tip?: string
  advanceMode: AdvanceMode
  actionHint?: string
}

export const TOUR_STEPS: SpotlightStep[] = [
  {
    id: 0,
    tutorialId: "pawi-mascot-banner",
    title: "Meet Your Pawi Tips! 🐢",
    speech:
      "Kumusta! I'm Pawi, your sea turtle finance buddy. This green banner is where I share money tips, motivational nudges, and smart spending reminders. Tap me anytime for a fresh tip!",
    tip: "I rotate tips every 5 minutes, or tap me for an instant one!",
    advanceMode: "got-it",
  },
  {
    id: 1,
    tutorialId: "pawi-streak-pill",
    title: "Your Daily Streak 🔥",
    speech:
      "See this flame badge? That's your logging streak! Log at least one transaction every day to keep the fire going. Streaks build the habit of tracking your money consistently.",
    advanceMode: "got-it",
  },
  {
    id: 2,
    tutorialId: "pawi-fab-button",
    title: "The Quick-Add Button ➕",
    speech:
      "That glowing green button at the bottom-right is the FAB — your fastest path to logging money. Tap it now to see what you can do!",
    advanceMode: "real-interaction",
    actionHint: "Tap the + button to open menu",
  },
  {
    id: 3,
    tutorialId: "pawi-fab-expense",
    title: "Log an Expense 💸",
    speech:
      "Here's the speed dial! You can log Income, Expenses, Transfers, or even Scan a receipt with AI. Tap 'Expense' to try adding a practice expense entry.",
    advanceMode: "real-interaction",
    actionHint: "Tap Expense to open entry sheet",
  },
  {
    id: 4,
    tutorialId: "pawi-expense-category-grid",
    title: "Pick a Category 🏷️",
    speech:
      "Every expense gets a category — Food, Transport, Shopping, and more. Tap any category to select it. (Don't worry, this is just practice — nothing will be saved!)",
    advanceMode: "real-interaction",
    actionHint: "Select any category to continue",
  },
  {
    id: 5,
    tutorialId: "pawi-nav-wallet",
    title: "Your Wallet Tab 👛",
    speech:
      "Now let's explore the tabs! Tap the Wallet tab to see all your accounts — GCash, bank cards, cash — and your total balances across currencies.",
    advanceMode: "real-interaction",
    actionHint: "Tap Wallet tab to continue",
  },
  {
    id: 6,
    tutorialId: "pawi-add-wallet-button",
    title: "Add Any Wallet 💳",
    speech:
      "Tap '+ Add Wallet' anytime to connect your GCash, Maya, BDO, BPI, Cash, or Credit Cards so you can track all your money in one place!",
    tip: "You can create as many custom wallets or sub-wallets as you need!",
    advanceMode: "got-it",
  },
  {
    id: 7,
    tutorialId: "pawi-nav-plan",
    title: "Your Plan Tab 🎯",
    speech:
      "Tap Plan to access budgets, savings goals, debt tracking, and installment plans. This is where you control your money's future!",
    advanceMode: "real-interaction",
    actionHint: "Tap Plan tab to continue",
  },
  {
    id: 8,
    tutorialId: "pawi-nav-history",
    title: "Transaction History 📜",
    speech:
      "Tap History to see every peso you've ever logged — filterable by date, category, and account. Perfect for monthly reviews!",
    advanceMode: "real-interaction",
    actionHint: "Tap History tab to continue",
  },
  {
    id: 9,
    tutorialId: null,
    title: "You're All Set! 🌊",
    speech:
      "Ang galing mo! 🎉 You've completed the Pawi tour. Head to the FAB → Chat anytime to ask me anything — budget advice, savings tips, or just a friendly money check-in. Kaya mo yan!",
    tip: "Find me again in Settings → Interactive Tour if you ever want a replay.",
    advanceMode: "got-it",
  },
]

const SPOTLIGHT_PADDING = 12
const CALLOUT_WIDTH = 316

// ── Sub-components ──────────────────────────────────────────────────────────────

interface CalloutCardProps {
  step: SpotlightStep
  stepIndex: number
  totalSteps: number
  spotlightRect: DOMRect | null
  notFound: boolean
  onAdvance: () => void
  onActionClick: () => void
}

function CalloutCard({
  step,
  stepIndex,
  totalSteps,
  spotlightRect,
  notFound,
  onAdvance,
  onActionClick,
}: CalloutCardProps) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 390
  const vh = typeof window !== "undefined" ? window.innerHeight : 844

  let top = vh / 2 - 120
  let left = (vw - CALLOUT_WIDTH) / 2
  let arrowSide: "top" | "bottom" | null = null

  if (spotlightRect && !notFound) {
    const spBottom = spotlightRect.top + spotlightRect.height
    const spTop = spotlightRect.top
    const cardHeight = 240

    if (spBottom < vh * 0.60) {
      top = spBottom + 14
      arrowSide = "top"
    } else {
      top = spTop - cardHeight - 14
      arrowSide = "bottom"
    }

    left = spotlightRect.left + spotlightRect.width / 2 - CALLOUT_WIDTH / 2
    left = Math.max(12, Math.min(vw - CALLOUT_WIDTH - 12, left))
    top = Math.max(50, Math.min(vh - cardHeight - 50, top))
  }

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed z-[9999] pointer-events-auto"
      style={{ top, left, width: CALLOUT_WIDTH }}
      role="dialog"
      aria-modal="false"
      aria-label={step.title}
    >
      {/* Arrow pointing to spotlight */}
      {arrowSide === "top" && (
        <div
          className="absolute -top-2 h-4 w-4 rotate-45 bg-card border-l border-t border-border/40"
          style={{ left: Math.min(Math.max(spotlightRect ? spotlightRect.left + spotlightRect.width / 2 - left - 8 : CALLOUT_WIDTH / 2 - 8, 16), CALLOUT_WIDTH - 32) }}
        />
      )}
      {arrowSide === "bottom" && (
        <div
          className="absolute -bottom-2 h-4 w-4 rotate-45 bg-card border-r border-b border-border/40"
          style={{ left: Math.min(Math.max(spotlightRect ? spotlightRect.left + spotlightRect.width / 2 - left - 8 : CALLOUT_WIDTH / 2 - 8, 16), CALLOUT_WIDTH - 32) }}
        />
      )}

      <div className="rounded-3xl border border-border/50 bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/30 bg-[#3D784E]/8 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="relative h-10 w-10 shrink-0">
              <Image
                src="/pawi-v2-hi.png"
                alt="Pawi"
                fill
                className="object-contain drop-shadow-sm"
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#3D784E]">
                Step {stepIndex + 1} of {totalSteps}
              </p>
              <h3 className="text-sm font-extrabold text-foreground leading-tight">
                {step.title}
              </h3>
            </div>
          </div>

          {/* Step progress dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIndex
                    ? "w-4 bg-[#3D784E]"
                    : i < stepIndex
                    ? "w-1.5 bg-[#3D784E]/40"
                    : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Speech */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3D784E]/15 text-xs">
              🐢
            </span>
            <p className="text-[13px] font-medium leading-relaxed text-foreground/90">
              {step.speech}
            </p>
          </div>

          {step.tip && (
            <div className="mt-2.5 rounded-2xl bg-secondary/50 px-3 py-2 text-[11px] text-muted-foreground border border-border/40">
              <span className="font-bold text-foreground">💡 </span>
              {step.tip}
            </div>
          )}
        </div>

        {/* Action row */}
        <div className="border-t border-border/30 bg-secondary/20 p-3">
          {step.advanceMode === "got-it" ? (
            <button
              type="button"
              onClick={onAdvance}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3D784E] py-3 text-sm font-extrabold text-white shadow-md shadow-[#3D784E]/25 transition-all hover:bg-[#356B46] active:scale-[0.97]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Got it!
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onActionClick}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3D784E] py-2.5 text-xs font-bold text-white shadow-md shadow-[#3D784E]/20 transition-all hover:bg-[#356B46] active:scale-[0.97]"
              >
                <span>{step.actionHint || "Tap to continue"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <p className="text-[10px] font-semibold text-muted-foreground text-center">
                👆 Or tap the highlighted element directly
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Spotlight SVG Scrim ────────────────────────────────────────────────────

interface SpotlightScrimProps {
  rect: DOMRect | null
  onBlockedTap: () => void
  onSpotlightTap: () => void
}

function SpotlightScrim({ rect, onBlockedTap, onSpotlightTap }: SpotlightScrimProps) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 390
  const vh = typeof window !== "undefined" ? window.innerHeight : 844

  const rx = rect ? Math.min(18, rect.height / 3) : 18

  // Cut out hole using SVG even-odd fill rule
  const pathD = rect
    ? `M 0 0 H ${vw} V ${vh} H 0 Z M ${rect.left} ${rect.top} V ${rect.top + rect.height} H ${rect.left + rect.width} V ${rect.top} Z`
    : `M 0 0 H ${vw} V ${vh} H 0 Z`

  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      <svg
        className="fixed inset-0 pointer-events-none"
        width={vw}
        height={vh}
        viewBox={`0 0 ${vw} ${vh}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Scrim path: only dark backdrop captures clicks */}
        <path
          d={pathD}
          fillRule="evenodd"
          fill="rgba(0, 0, 0, 0.78)"
          className="pointer-events-auto"
          onClick={onBlockedTap}
          onTouchStart={onBlockedTap}
        />

        {/* Glowing ring around spotlight */}
        {rect && (
          <rect
            x={rect.left}
            y={rect.top}
            width={rect.width}
            height={rect.height}
            rx={rx}
            ry={rx}
            fill="none"
            stroke="rgba(61, 120, 78, 0.95)"
            strokeWidth={3}
            style={{
              filter: "drop-shadow(0 0 12px rgba(61, 120, 78, 0.9))",
            }}
          >
            <animate
              attributeName="stroke-opacity"
              values="0.6;1;0.6"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </rect>
        )}
      </svg>

      {/* Transparent Clickable Forwarder over the spotlight hole */}
      {rect && (
        <div
          onClick={onSpotlightTap}
          onTouchEnd={onSpotlightTap}
          className="fixed pointer-events-auto cursor-pointer"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: rx,
            zIndex: 9991,
          }}
          title="Tap highlighted element"
        />
      )}
    </div>
  )
}

// ── Step Success Pulse ──────────────────────────────────────────────────────────

function StepSuccessPulse({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[9995]"
      style={{ width: "100vw", height: "100vh" }}
      aria-hidden="true"
    >
      <circle cx={cx} cy={cy} r={40} fill="rgba(61,120,78,0.25)">
        <animate attributeName="r" from="20" to="80" dur="0.5s" fill="freeze" />
        <animate attributeName="fill-opacity" from="0.5" to="0" dur="0.5s" fill="freeze" />
      </circle>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={22}>✓</text>
    </svg>
  )
}

// ── Main Export ─────────────────────────────────────────────────────────────────

export interface PawiSpotlightTourProps {
  open: boolean
  initialStep?: number
  onStepComplete: (step: number) => void
  onComplete: () => void
  onOpenExpenseModal?: () => void
  onCloseExpenseModal?: () => void
}

export function PawiSpotlightTour({
  open,
  initialStep = 0,
  onStepComplete,
  onComplete,
  onOpenExpenseModal,
  onCloseExpenseModal,
}: PawiSpotlightTourProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Accessibility escape hatch state
  const topLeftTapCount = useRef(0)
  const topLeftTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tabEnterCount = useRef(0)
  const tabEnterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce guard for advance
  const advanceLock = useRef(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Sync with initialStep when tour opens/restarts
  useEffect(() => {
    if (open) {
      setCurrentStep(initialStep)
    }
  }, [open, initialStep])

  const step = TOUR_STEPS[currentStep]
  const { rect, notFound } = useSpotlightRect(open ? step?.tutorialId ?? null : null, SPOTLIGHT_PADDING)

  // Prevent body scroll while tour is active
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  // Open expense modal automatically when tour reaches step 4 (category grid)
  useEffect(() => {
    if (!open) return
    if (currentStep === 4 && onOpenExpenseModal) {
      const t = setTimeout(() => onOpenExpenseModal(), 200)
      return () => clearTimeout(t)
    }
  }, [open, currentStep, onOpenExpenseModal])

  // Close expense modal when tour moves past step 4
  useEffect(() => {
    if (!open) return
    if (currentStep > 4 && onCloseExpenseModal) {
      onCloseExpenseModal()
    }
  }, [open, currentStep, onCloseExpenseModal])

  const doAdvance = useCallback(
    (fromInteraction = false) => {
      if (advanceLock.current || isTransitioning) return
      advanceLock.current = true
      setIsTransitioning(true)

      if (fromInteraction) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 500)
      }

      const nextStep = currentStep + 1
      onStepComplete(currentStep)

      setTimeout(() => {
        if (nextStep >= TOUR_STEPS.length) {
          onComplete()
        } else {
          setCurrentStep(nextStep)
        }
        setIsTransitioning(false)
        advanceLock.current = false
      }, fromInteraction ? 500 : 150)
    },
    [currentStep, isTransitioning, onComplete, onStepComplete]
  )

  // Handle tap on spotlighted target or forwarder
  const handleSpotlightTap = useCallback(() => {
    if (!step) return
    const tutorialId = step.tutorialId

    if (tutorialId) {
      const el = document.querySelector<HTMLElement>(`[data-tutorial-id="${tutorialId}"]`)
      if (el) {
        // Dispatch real click to underlying element if button/clickable
        try {
          el.click()
        } catch {}
      }
    }

    doAdvance(true)
  }, [step, doAdvance])

  // Also listen for clicks on the target element directly
  useEffect(() => {
    if (!open || !step || step.advanceMode !== "real-interaction") return

    const tutorialId = step.tutorialId
    if (!tutorialId) return

    let cleanup: (() => void) | null = null

    const interval = setInterval(() => {
      const el = document.querySelector<HTMLElement>(`[data-tutorial-id="${tutorialId}"]`)
      if (el) {
        clearInterval(interval)

        const onTargetClick = () => {
          doAdvance(true)
        }

        el.addEventListener("click", onTargetClick)
        cleanup = () => {
          el.removeEventListener("click", onTargetClick)
        }
      }
    }, 50)

    const timer = setTimeout(() => clearInterval(interval), 2500)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
      if (cleanup) cleanup()
    }
  }, [open, step, doAdvance])

  // Accessibility escape hatch — keyboard: 5× Tab+Enter
  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        tabEnterCount.current += 1
        if (tabEnterTimer.current) clearTimeout(tabEnterTimer.current)
        tabEnterTimer.current = setTimeout(() => {
          tabEnterCount.current = 0
        }, 4000)
        if (tabEnterCount.current >= 5) {
          tabEnterCount.current = 0
          completeTourViaAccessibility("keyboard")
        }
      }
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener("keydown", handleKey, { capture: true })
    return () => document.removeEventListener("keydown", handleKey, { capture: true })
  }, [open])

  const completeTourViaAccessibility = useCallback(
    (method: string) => {
      try {
        const log = JSON.parse(localStorage.getItem("pawi_tutorial_exit_log") || "[]")
        log.push({ method, step: currentStep, timestamp: new Date().toISOString() })
        localStorage.setItem("pawi_tutorial_exit_log", JSON.stringify(log))
      } catch {}
      onComplete()
    },
    [currentStep, onComplete]
  )

  // Hidden triple-tap zone (top-left 44×44px)
  const handleTopLeftTap = useCallback(() => {
    topLeftTapCount.current += 1
    if (topLeftTapTimer.current) clearTimeout(topLeftTapTimer.current)
    topLeftTapTimer.current = setTimeout(() => {
      topLeftTapCount.current = 0
    }, 2000)
    if (topLeftTapCount.current >= 3) {
      topLeftTapCount.current = 0
      completeTourViaAccessibility("triple-tap")
    }
  }, [completeTourViaAccessibility])

  const handleBlockedTap = useCallback(() => {
    // Backdrop click blocked
  }, [])

  if (!open || !mounted) return null

  return createPortal(
    <>
      {/* Accessibility live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {step?.title}: {step?.speech}
      </div>

      {/* SVG Scrim with spotlight cutout */}
      <SpotlightScrim
        rect={rect}
        onBlockedTap={handleBlockedTap}
        onSpotlightTap={handleSpotlightTap}
      />

      {/* Success pulse animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            key="success-pulse"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <StepSuccessPulse rect={rect} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Callout card */}
      <AnimatePresence mode="wait">
        {step && (
          <CalloutCard
            key={step.id}
            step={step}
            stepIndex={currentStep}
            totalSteps={TOUR_STEPS.length}
            spotlightRect={rect}
            notFound={notFound}
            onAdvance={() => doAdvance(false)}
            onActionClick={handleSpotlightTap}
          />
        )}
      </AnimatePresence>

      {/* Hidden accessibility escape hatch */}
      <button
        type="button"
        aria-label="Accessibility help — close tutorial"
        onClick={handleTopLeftTap}
        className="fixed left-0 top-0 z-[10000] h-11 w-11 cursor-default opacity-0 pointer-events-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D784E] focus-visible:opacity-100 focus-visible:ring-offset-2"
        tabIndex={0}
        title="Accessibility: triple-tap or press Tab 5 times to close tutorial"
      />
    </>,
    document.body
  )
}
