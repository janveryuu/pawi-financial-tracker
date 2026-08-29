"use client"

/**
 * PawiOnboardingFlow — A premium, mobile-first onboarding experience.
 *
 * Steps:
 *  0 — Welcome splash (brand intro, Pawi mascot)
 *  1 — Name ("What should Pawi call you?")
 *  2 — Student or Working Professional
 *  3 — Monthly Income (approximate, optional)
 *  4 — Payday schedule (once/twice a month, day picker)
 *  5 — Primary financial goal (single-select)
 *  5b — Optional: Create first savings goal right now (if goal = 'save_specific')
 *  6 — Notification preference (conversational yes/no)
 *  7 — Currency confirmation (pre-filled PHP, confirm or change)
 *  Done → completeOnboarding() → onComplete()
 *
 * Resumption: on mount, the step is read from profile.onboarding_step so that
 * closing mid-flow and re-opening picks up where the user left off.
 *
 * Guest mode: never renders this component (guarded in page.tsx).
 */

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  GraduationCap,
  Briefcase,
  Target,
  PiggyBank,
  CreditCard,
  BarChart3,
  TrendingUp,
  Bell,
  BellOff,
  Globe,
  ArrowRight,
} from "lucide-react"
import { useProfile, PrimaryGoal } from "@/lib/use-profile"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

interface PawiOnboardingFlowProps {
  onComplete: () => void
}

const TOTAL_STEPS = 7 // steps 1–7 (step 0 = welcome, not counted in progress)

const PRIMARY_GOAL_OPTIONS: { value: PrimaryGoal; label: string; sub: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "emergency_fund",
    label: "Build an emergency fund",
    sub: "Save 3–6 months of expenses as a safety net",
    icon: <PiggyBank className="h-5 w-5" />,
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
  },
  {
    value: "save_specific",
    label: "Save for something specific",
    sub: "Trip, gadget, wedding, house, or anything else",
    icon: <Target className="h-5 w-5" />,
    color: "from-[#3D784E]/20 to-[#3D784E]/10 border-[#3D784E]/30 text-[#3D784E] dark:text-emerald-400",
  },
  {
    value: "pay_debt",
    label: "Pay off debt",
    sub: "Credit card, loan, or money borrowed",
    icon: <CreditCard className="h-5 w-5" />,
    color: "from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-600 dark:text-rose-400",
  },
  {
    value: "track_spending",
    label: "Just want to track my spending",
    sub: "Know where every peso goes, no pressure",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-600 dark:text-sky-400",
  },
  {
    value: "grow_savings",
    label: "Grow my savings",
    sub: "Consistently save more each month",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-600 dark:text-violet-400",
  },
]

const SUGGESTED_CATEGORIES: Record<"student" | "professional", string[]> = {
  student: ["🎓 Tuition", "🍱 Food & Snacks", "🚌 Transportation", "📚 School Supplies", "💸 Allowance"],
  professional: ["💼 Salary", "📊 Commission", "🤝 Client Payment", "🍱 Meals & Dining", "🚗 Transportation"],
}

// Slide transition variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "60%" : "-60%",
    opacity: 0,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "60%" : "-60%",
    opacity: 0,
    scale: 0.97,
  }),
}

export function PawiOnboardingFlow({ onComplete }: PawiOnboardingFlowProps) {
  const { user } = useAuth()
  const { profile, loadingProfile, saveProfile, saveOnboardingStep, completeOnboarding } = useProfile()
  const { addGoal, updatePaydayConfig } = useStore()

  // ── Local form state ──────────────────────────────────────────────────────
  const [step, setStep] = useState(0) // 0 = welcome splash
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward

  // Step 1 — Name
  const [name, setName] = useState("")

  // Step 2 — Student / Professional
  const [isStudent, setIsStudent] = useState<boolean | null>(null)

  // Step 3 — Monthly income
  const [income, setIncome] = useState("")

  // Step 4 — Payday
  const [paydayType, setPaydayType] = useState<"once" | "twice">("once")
  const [paydayDay1, setPaydayDay1] = useState<string>("15")
  const [paydayDay2, setPaydayDay2] = useState<string>("30")

  // Step 5 — Primary goal
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null)

  // Step 5b — Immediate goal creation (only if 'save_specific')
  const [showGoalCreation, setShowGoalCreation] = useState(false)
  const [goalName, setGoalName] = useState("")
  const [goalTarget, setGoalTarget] = useState("")
  const [goalIcon, setGoalIcon] = useState("🎯")
  const [skipGoalCreation, setSkipGoalCreation] = useState(false)

  // Step 6 — Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null)

  // Step 7 — Currency
  const [currency, setCurrency] = useState("PHP")

  // Validation / error
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ── Resume from last saved step ─────────────────────────────────────────────
  useEffect(() => {
    if (!loadingProfile && profile) {
      // Pre-fill from saved profile
      if (profile.name && profile.name !== "Pawi User" && profile.name !== "Pawi User") {
        setName(profile.name)
      } else if (user?.displayName) {
        setName(user.displayName)
      }
      if (profile.is_student !== null) setIsStudent(profile.is_student)
      if (profile.monthly_income > 0) setIncome(profile.monthly_income.toString())
      if (profile.payday_type) setPaydayType(profile.payday_type)
      if (profile.payday_day_1) setPaydayDay1(String(profile.payday_day_1))
      if (profile.payday_day_2) setPaydayDay2(String(profile.payday_day_2))
      if (profile.primary_goal) setPrimaryGoal(profile.primary_goal)
      if (profile.currency) setCurrency(profile.currency)

      // Resume to last saved step (if mid-onboarding)
      const savedStep = profile.onboarding_step ?? 0
      if (savedStep > 0 && savedStep < 99) {
        setStep(savedStep)
      }
    }
  }, [loadingProfile, profile, user])

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const goForward = useCallback(
    async (toStep?: number) => {
      setError(null)
      const nextStep = toStep ?? step + 1
      setDirection(1)
      setStep(nextStep)
      if (nextStep > 0) await saveOnboardingStep(nextStep)
    },
    [step, saveOnboardingStep]
  )

  const goBack = useCallback(() => {
    setError(null)
    if (showGoalCreation) {
      setShowGoalCreation(false)
      return
    }
    setDirection(-1)
    setStep((prev) => Math.max(0, prev - 1))
  }, [showGoalCreation])

  // ── Per-step submission with validation ─────────────────────────────────────
  const handleNext = useCallback(async () => {
    setError(null)
    setSaving(true)
    try {
      if (step === 1) {
        // Name — required
        const cleaned = name.trim()
        if (!cleaned) {
          setError("Please enter your name so Pawi can greet you! 🐢")
          return
        }
        await saveProfile({ name: cleaned, initials: cleaned.slice(0, 2).toUpperCase() })
        await goForward()
      } else if (step === 2) {
        // Student vs Professional — required
        if (isStudent === null) {
          setError("Please tell Pawi a bit about yourself.")
          return
        }
        await saveProfile({ is_student: isStudent })
        await goForward()
      } else if (step === 3) {
        // Income — optional
        const num = parseFloat(income) || 0
        await saveProfile({ monthly_income: num })
        await goForward()
      } else if (step === 4) {
        // Payday — validate days
        const d1 = parseInt(paydayDay1, 10)
        if (!paydayDay1 || isNaN(d1) || d1 < 1 || d1 > 31) {
          setError("Please enter a valid day of the month (1–31).")
          return
        }
        if (paydayType === "twice") {
          const d2 = parseInt(paydayDay2, 10)
          if (!paydayDay2 || isNaN(d2) || d2 < 1 || d2 > 31) {
            setError("Please enter a valid second payday (1–31).")
            return
          }
          if (d1 === d2) {
            setError("Your two paydays must be on different days of the month.")
            return
          }
        }
        // Save to profile
        await saveProfile({
          payday_type: paydayType,
          payday_day_1: d1,
          payday_day_2: paydayType === "twice" ? parseInt(paydayDay2, 10) : null,
        })
        // Also update the store's paydayConfig so the home countdown widget works immediately
        const num = parseFloat(income) || 0
        await updatePaydayConfig({
          configured: true,
          frequency: paydayType === "twice" ? "semi-monthly" : "monthly",
          day1: d1,
          day2: paydayType === "twice" ? parseInt(paydayDay2, 10) : undefined,
          amount: num,
        })
        await goForward()
      } else if (step === 5) {
        // Primary goal — required
        if (!primaryGoal) {
          setError("Please pick the goal that matters most to you right now.")
          return
        }
        await saveProfile({ primary_goal: primaryGoal })
        // If they want to save for something specific, offer inline goal creation
        if (primaryGoal === "save_specific" && !skipGoalCreation) {
          setShowGoalCreation(true)
          setSaving(false)
          return
        }
        await goForward()
      } else if (showGoalCreation) {
        // Step 5b — optional savings goal creation
        const targetNum = parseFloat(goalTarget)
        if (!goalName.trim()) {
          setError("Give your goal a name, like 'Laptop Fund' or 'Dream Trip' 🎯")
          return
        }
        if (!goalTarget || isNaN(targetNum) || targetNum <= 0) {
          setError("Please enter a target amount greater than ₱0.")
          return
        }
        // Insert goal via store (persists to Supabase)
        await addGoal({
          name: goalName.trim(),
          target: targetNum,
          saved: 0,
          due: null,
          icon: goalIcon,
          accent: "#3D784E",
        })
        setShowGoalCreation(false)
        await goForward(6)
      } else if (step === 6) {
        // Notifications — required answer (yes/no)
        if (notificationsEnabled === null) {
          setError("Just tap Yes or No — you can always change this later in Settings!")
          return
        }
        await saveProfile({ notifications_enabled: notificationsEnabled })
        // If they said yes, request push permission
        if (notificationsEnabled && typeof window !== "undefined" && "Notification" in window) {
          try {
            await Notification.requestPermission()
          } catch {
            // Ignore if browser blocks
          }
        }
        await goForward()
      } else if (step === 7) {
        // Currency confirmation
        await saveProfile({ currency, country: currency === "PHP" ? "PH" : "" })
        // Mark onboarding as complete
        await completeOnboarding()
        // Clear tutorial key so tutorial runs after onboarding
        if (user) {
          const userId = user.id || (user as any).uid
          localStorage.removeItem(`pawi_has_seen_tutorial_${userId}`)
          localStorage.removeItem("pawi_has_seen_tutorial")
        }
        onComplete()
      }
    } finally {
      setSaving(false)
    }
  }, [
    step,
    showGoalCreation,
    name,
    isStudent,
    income,
    paydayType,
    paydayDay1,
    paydayDay2,
    primaryGoal,
    skipGoalCreation,
    goalName,
    goalTarget,
    goalIcon,
    notificationsEnabled,
    currency,
    saveProfile,
    completeOnboarding,
    goForward,
    addGoal,
    updatePaydayConfig,
    onComplete,
    user,
  ])

  if (loadingProfile) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#3D784E]/25" />
      </div>
    )
  }

  const progressPercent = step === 0 ? 0 : Math.min(100, Math.round((step / TOTAL_STEPS) * 100))

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background overflow-hidden">
      {/* Progress bar — only shown after welcome */}
      {step > 0 && (
        <div className="relative h-1 w-full bg-border/40">
          <motion.div
            className="absolute left-0 top-0 h-full bg-[#3D784E] rounded-r-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      )}

      {/* Back button + step counter */}
      {step > 0 && !showGoalCreation && (
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <button
            type="button"
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-bold text-muted-foreground">
            Step {step} of {TOTAL_STEPS}
          </span>
          <div className="w-9" />
        </div>
      )}
      {showGoalCreation && (
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <button
            type="button"
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-bold text-muted-foreground">Optional · Goal Setup</span>
          <div className="w-9" />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div
              key="step-welcome"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            >
              <WelcomeStep
                name={user?.displayName || user?.email?.split("@")[0] || ""}
                onStart={() => goForward()}
              />
            </motion.div>
          )}

          {step === 1 && !showGoalCreation && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              <NameStep name={name} onChange={setName} />
            </motion.div>
          )}

          {step === 2 && !showGoalCreation && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              <StudentOrProfStep isStudent={isStudent} onChange={setIsStudent} />
            </motion.div>
          )}

          {step === 3 && !showGoalCreation && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              <IncomeStep income={income} onChange={setIncome} />
            </motion.div>
          )}

          {step === 4 && !showGoalCreation && (
            <motion.div
              key="step-4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              <PaydayStep
                paydayType={paydayType}
                onTypeChange={setPaydayType}
                day1={paydayDay1}
                day2={paydayDay2}
                onDay1Change={setPaydayDay1}
                onDay2Change={setPaydayDay2}
              />
            </motion.div>
          )}

          {step === 5 && !showGoalCreation && (
            <motion.div
              key="step-5"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              <PrimaryGoalStep goal={primaryGoal} onChange={setPrimaryGoal} />
            </motion.div>
          )}

          {showGoalCreation && (
            <motion.div
              key="step-5b"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              <GoalCreationStep
                goalName={goalName}
                goalTarget={goalTarget}
                goalIcon={goalIcon}
                onNameChange={setGoalName}
                onTargetChange={setGoalTarget}
                onIconChange={setGoalIcon}
                onSkip={() => {
                  setSkipGoalCreation(true)
                  setShowGoalCreation(false)
                  goForward(6)
                }}
              />
            </motion.div>
          )}

          {step === 6 && !showGoalCreation && (
            <motion.div
              key="step-6"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              <NotificationsStep value={notificationsEnabled} onChange={setNotificationsEnabled} />
            </motion.div>
          )}

          {step === 7 && !showGoalCreation && (
            <motion.div
              key="step-7"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              <CurrencyStep currency={currency} onChange={setCurrency} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky bottom CTA + error */}
      {step > 0 && (
        <div className="pointer-events-none fixed bottom-0 inset-x-0 flex flex-col items-center pb-8 px-6 gap-2.5">
          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="pointer-events-auto w-full max-w-sm rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-center text-xs font-bold text-rose-600 dark:text-rose-400"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="pointer-events-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-[#3D784E] py-4 text-sm font-black text-white shadow-lg shadow-[#3D784E]/30 hover:bg-[#356B46] active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Saving...
              </span>
            ) : step === 7 ? (
              <>
                <Sparkles className="h-4 w-4" />
                Start using Pawi!
              </>
            ) : showGoalCreation ? (
              <>
                Create Goal
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Step 0 — Welcome Splash
function WelcomeStep({ name, onStart }: { name: string; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Mascot glow + pulsing ring */}
      <div className="relative">
        <div className="absolute -inset-6 rounded-full bg-[#3D784E]/10 animate-pulse" />
        <div className="absolute -inset-3 rounded-full bg-[#3D784E]/15" />
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#3D784E] to-[#2E683E] shadow-2xl shadow-[#3D784E]/40 text-7xl">
          🐢
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-black text-foreground leading-tight">
          {name ? `Hey, ${name.split(" ")[0]}! 👋` : "Welcome to Pawi! 👋"}
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Let's take 60 seconds to set up your financial home — so Pawi knows exactly how to help you.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3">
          <span className="text-xl">📊</span>
          <p className="text-xs font-semibold text-foreground">Personalized dashboard, just for you</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3">
          <span className="text-xl">📅</span>
          <p className="text-xs font-semibold text-foreground">Real payday countdown, not a placeholder</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3">
          <span className="text-xl">🎯</span>
          <p className="text-xs font-semibold text-foreground">Goals that match what you're actually working toward</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-[#3D784E] py-4 text-sm font-black text-white shadow-lg shadow-[#3D784E]/30 hover:bg-[#356B46] active:scale-[0.98] transition-all"
      >
        <Sparkles className="h-4 w-4" />
        Let's get started
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// Step 1 — Name
function NameStep({ name, onChange }: { name: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step 1 · Name</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          What should Pawi call you?
        </h2>
        <p className="text-sm text-muted-foreground">
          This shows up in your daily greeting — make it yours!
        </p>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Your name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Janver, Kaye, Alex"
          autoFocus
          autoComplete="given-name"
          className="mt-2 flex h-14 w-full rounded-2xl border border-border/70 bg-secondary/40 px-4 text-base font-bold text-foreground outline-none focus:ring-2 focus:ring-[#3D784E] transition-all placeholder:text-muted-foreground/50"
        />
      </div>

      {name.trim() && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#3D784E]/10 border border-[#3D784E]/20 px-4 py-3.5"
        >
          <p className="text-sm font-bold text-[#3D784E]">
            🐢 Preview: "Good morning, {name.split(" ")[0]}! Your finances are looking steady."
          </p>
        </motion.div>
      )}
    </div>
  )
}

// Step 2 — Student or Professional
function StudentOrProfStep({
  isStudent,
  onChange,
}: {
  isStudent: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step 2 · Profile</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          Are you a student or working professional?
        </h2>
        <p className="text-sm text-muted-foreground">
          Pawi uses this to suggest the right income categories for you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[
          {
            value: true,
            icon: <GraduationCap className="h-7 w-7" />,
            title: "Student",
            sub: "Allowance, tuition, school expenses",
            preview: SUGGESTED_CATEGORIES.student,
          },
          {
            value: false,
            icon: <Briefcase className="h-7 w-7" />,
            title: "Working Professional",
            sub: "Salary, commission, client payments",
            preview: SUGGESTED_CATEGORIES.professional,
          },
        ].map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-start gap-4 rounded-3xl border-2 p-5 text-left transition-all",
              isStudent === opt.value
                ? "border-[#3D784E] bg-[#3D784E]/8"
                : "border-border/60 bg-card hover:bg-secondary/50"
            )}
          >
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                isStudent === opt.value
                  ? "bg-[#3D784E] text-white"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {opt.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-base font-black text-foreground">{opt.title}</p>
                {isStudent === opt.value && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3D784E]">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">{opt.sub}</p>
              <div className="flex flex-wrap gap-1">
                {opt.preview.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// Step 3 — Monthly Income
function IncomeStep({ income, onChange }: { income: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step 3 · Income</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          What's your approximate monthly income?
        </h2>
        <p className="text-sm text-muted-foreground">
          This helps Pawi suggest a budget target and track your financial health zones.{" "}
          <span className="font-semibold text-foreground">Approximate is totally fine</span> — you can change this anytime.
        </p>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Monthly income (PHP)
        </label>
        <div className="relative mt-2">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-muted-foreground">₱</span>
          <input
            type="number"
            value={income}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. 25,000"
            autoFocus
            min={0}
            className="flex h-14 w-full rounded-2xl border border-border/70 bg-secondary/40 pl-8 pr-4 text-base font-bold text-foreground outline-none focus:ring-2 focus:ring-[#3D784E] transition-all placeholder:text-muted-foreground/50"
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Optional — tap Continue to skip and set this later in Settings.
        </p>
      </div>

      {income && Number(income) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pawi's quick take</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Monthly budget", value: `₱${Math.round(Number(income) * 0.7).toLocaleString()}` },
              { label: "Savings target", value: `₱${Math.round(Number(income) * 0.2).toLocaleString()}` },
              { label: "Emergency fund", value: `₱${Math.round(Number(income) * 3).toLocaleString()}` },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-card border border-border/60 p-3 text-center">
                <p className="text-xs font-black text-foreground">{item.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Based on the 70-20-10 rule: 70% needs, 20% savings, 10% wants</p>
        </motion.div>
      )}
    </div>
  )
}

// Step 4 — Payday Schedule
function PaydayStep({
  paydayType,
  onTypeChange,
  day1,
  day2,
  onDay1Change,
  onDay2Change,
}: {
  paydayType: "once" | "twice"
  onTypeChange: (v: "once" | "twice") => void
  day1: string
  day2: string
  onDay1Change: (v: string) => void
  onDay2Change: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step 4 · Payday</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          When do you usually get paid?
        </h2>
        <p className="text-sm text-muted-foreground">
          Pawi uses this to show you a real countdown — not a placeholder.
        </p>
      </div>

      {/* Frequency toggle */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          How often?
        </label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { value: "once" as const, label: "Once a month", sub: "e.g. every 30th" },
            { value: "twice" as const, label: "Twice a month", sub: "e.g. 15th & 30th" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTypeChange(opt.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border-2 py-4 px-3 text-center transition-all",
                paydayType === opt.value
                  ? "border-[#3D784E] bg-[#3D784E]/8 text-[#3D784E]"
                  : "border-border/60 bg-card text-muted-foreground hover:bg-secondary/50"
              )}
            >
              <p className="text-sm font-black">{opt.label}</p>
              <p className="text-[10px]">{opt.sub}</p>
              {paydayType === opt.value && <Check className="h-4 w-4 mt-1" />}
            </button>
          ))}
        </div>
      </div>

      {/* Quick presets */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Common schedules
        </label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {(paydayType === "twice"
            ? [
                { label: "15th & 30th", d1: "15", d2: "30" },
                { label: "10th & 25th", d1: "10", d2: "25" },
                { label: "5th & 20th", d1: "5", d2: "20" },
                { label: "1st & 16th", d1: "1", d2: "16" },
              ]
            : [
                { label: "Every 15th", d1: "15", d2: "" },
                { label: "Every 30th", d1: "30", d2: "" },
                { label: "Every 25th", d1: "25", d2: "" },
                { label: "Every 1st", d1: "1", d2: "" },
              ]
          ).map((preset) => {
            const isActive =
              day1 === preset.d1 && (paydayType === "once" || day2 === preset.d2)
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onDay1Change(preset.d1)
                  if (paydayType === "twice") onDay2Change(preset.d2)
                }}
                className={cn(
                  "rounded-2xl border px-3 py-2.5 text-xs font-bold transition-all",
                  isActive
                    ? "border-[#3D784E] bg-[#3D784E]/10 text-[#3D784E]"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-secondary/50"
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom day inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {paydayType === "twice" ? "1st payday" : "Day of month"}
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={day1}
            onChange={(e) => onDay1Change(e.target.value)}
            className="mt-1.5 flex h-12 w-full rounded-2xl border border-border/70 bg-secondary/40 px-3 text-center text-base font-black text-foreground outline-none focus:ring-2 focus:ring-[#3D784E]"
          />
        </div>
        {paydayType === "twice" && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              2nd payday
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={day2}
              onChange={(e) => onDay2Change(e.target.value)}
              className="mt-1.5 flex h-12 w-full rounded-2xl border border-border/70 bg-secondary/40 px-3 text-center text-base font-black text-foreground outline-none focus:ring-2 focus:ring-[#3D784E]"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Step 5 — Primary Goal
function PrimaryGoalStep({
  goal,
  onChange,
}: {
  goal: PrimaryGoal | null
  onChange: (v: PrimaryGoal) => void
}) {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step 5 · Your Goal</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          What's your main financial goal right now?
        </h2>
        <p className="text-sm text-muted-foreground">
          Pawi will tailor your home screen around this — you can always change it later.
        </p>
      </div>

      <div className="space-y-2.5">
        {PRIMARY_GOAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex w-full items-center gap-4 rounded-3xl border-2 bg-gradient-to-r p-4 text-left transition-all",
              goal === opt.value
                ? `${opt.color} border-current`
                : "border-border/60 from-transparent to-transparent bg-card hover:bg-secondary/50 text-muted-foreground"
            )}
          >
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                goal === opt.value ? "bg-current/10" : "bg-secondary"
              )}
            >
              {opt.icon}
            </div>
            <div className="flex-1">
              <p
                className={cn(
                  "text-sm font-black",
                  goal === opt.value ? "text-current" : "text-foreground"
                )}
              >
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
            </div>
            {goal === opt.value && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/20">
                <Check className="h-3.5 w-3.5 text-current" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// Step 5b — Inline Goal Creation (only for save_specific)
const GOAL_EMOJI_PRESETS = ["🎯", "✈️", "💻", "🏠", "💍", "🎓", "🚗", "📱", "💰", "🎉"]

function GoalCreationStep({
  goalName,
  goalTarget,
  goalIcon,
  onNameChange,
  onTargetChange,
  onIconChange,
  onSkip,
}: {
  goalName: string
  goalTarget: string
  goalIcon: string
  onNameChange: (v: string) => void
  onTargetChange: (v: string) => void
  onIconChange: (v: string) => void
  onSkip: () => void
}) {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#3D784E]/15 px-3 py-1 text-[10px] font-black text-[#3D784E] uppercase tracking-wider">
            Optional
          </span>
        </div>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          What are you saving for? 🎯
        </h2>
        <p className="text-sm text-muted-foreground">
          Create your first savings goal right now so it's waiting on your Plan screen the moment you start.
        </p>
      </div>

      {/* Emoji picker */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Pick an icon
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {GOAL_EMOJI_PRESETS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onIconChange(emoji)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-2xl border-2 text-lg transition-all",
                goalIcon === emoji
                  ? "border-[#3D784E] bg-[#3D784E]/10"
                  : "border-border/60 bg-secondary/40 hover:bg-secondary"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Goal name
          </label>
          <input
            type="text"
            value={goalName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder='e.g. "Trip to Japan", "New Laptop"'
            autoFocus
            className="mt-1.5 flex h-12 w-full rounded-2xl border border-border/70 bg-secondary/40 px-4 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-[#3D784E] placeholder:text-muted-foreground/50"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Target amount (PHP)
          </label>
          <div className="relative mt-1.5">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">₱</span>
            <input
              type="number"
              value={goalTarget}
              onChange={(e) => onTargetChange(e.target.value)}
              placeholder="e.g. 50,000"
              min={1}
              className="flex h-12 w-full rounded-2xl border border-border/70 bg-secondary/40 pl-8 pr-4 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-[#3D784E] placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="text-center text-xs font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
      >
        Skip for now — I'll create a goal later
      </button>
    </div>
  )
}

// Step 6 — Notifications
function NotificationsStep({
  value,
  onChange,
}: {
  value: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step 6 · Reminders</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          Want Pawi to nudge you if you forget to log something?
        </h2>
        <p className="text-sm text-muted-foreground">
          Just a gentle reminder — no spam, no notification floods. You can turn this off anytime in Settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[
          {
            val: true,
            icon: <Bell className="h-7 w-7" />,
            title: "Yes, remind me",
            sub: "Send me a nudge if I haven't logged anything in a while",
          },
          {
            val: false,
            icon: <BellOff className="h-7 w-7" />,
            title: "No thanks",
            sub: "I'll check in on my own — I've got this 💪",
          },
        ].map((opt) => (
          <button
            key={String(opt.val)}
            type="button"
            onClick={() => onChange(opt.val)}
            className={cn(
              "flex items-center gap-4 rounded-3xl border-2 p-5 text-left transition-all",
              value === opt.val
                ? "border-[#3D784E] bg-[#3D784E]/8"
                : "border-border/60 bg-card hover:bg-secondary/50"
            )}
          >
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                value === opt.val ? "bg-[#3D784E] text-white" : "bg-secondary text-muted-foreground"
              )}
            >
              {opt.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-base font-black text-foreground">{opt.title}</p>
                {value === opt.val && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3D784E]">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// Step 7 — Currency Confirmation
const CURRENCY_OPTIONS = [
  { code: "PHP", symbol: "₱", name: "Philippine Peso", flag: "🇵🇭" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
]

function CurrencyStep({ currency, onChange }: { currency: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step 7 · Currency</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          One last thing — your default currency.
        </h2>
        <p className="text-sm text-muted-foreground">
          Pawi uses this as the base for all balances, budgets, and goals. Most users here use Philippine Peso 🇵🇭.
        </p>
      </div>

      <div className="space-y-2">
        {CURRENCY_OPTIONS.map((opt) => (
          <button
            key={opt.code}
            type="button"
            onClick={() => onChange(opt.code)}
            className={cn(
              "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all",
              currency === opt.code
                ? "border-[#3D784E] bg-[#3D784E]/8"
                : "border-border/60 bg-card hover:bg-secondary/50"
            )}
          >
            <span className="text-2xl">{opt.flag}</span>
            <div className="flex-1">
              <p className="text-sm font-black text-foreground">
                {opt.symbol} {opt.name}
              </p>
              <p className="text-xs text-muted-foreground">{opt.code}</p>
            </div>
            {currency === opt.code && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3D784E]">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-[#3D784E]/8 border border-[#3D784E]/20 p-4">
        <Globe className="h-4 w-4 text-[#3D784E] mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          All your existing wallets and transactions will use this currency as the default. You can still add accounts in other currencies from the Wallets screen.
        </p>
      </div>
    </div>
  )
}
