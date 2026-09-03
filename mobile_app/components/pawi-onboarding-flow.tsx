"use client"

/**
 * PawiOnboardingFlow — A premium, mobile-first onboarding experience.
 *
 * Steps for Working Professional (7 steps):
 *  0 — Welcome splash
 *  1 — Name ("What should Pawi call you?")
 *  2 — Profile Type ("Working Professional")
 *  3 — Monthly Income (approximate)
 *  4 — Payday schedule (once/twice a month + day picker)
 *  5 — Primary financial goal (single-select)
 *  5b — Optional: Create first savings goal right now (if goal = 'save_specific')
 *  6 — Notification preference (conversational yes/no)
 *  7 — Currency confirmation (pre-filled PHP, confirm or change)
 *
 * Steps for Student & Working Student (6 steps):
 *  0 — Welcome splash
 *  1 — Name ("What should Pawi call you?")
 *  2 — Profile Type ("Student" or "Working Student")
 *  3 — Weekly Allowance ("What's your typical weekly allowance?")
 *  4 — Primary financial goal (single-select)
 *  4b — Optional: Create first savings goal right now (if goal = 'save_specific')
 *  5 — Notification preference (conversational yes/no)
 *  6 — Currency confirmation (pre-filled PHP, confirm or change)
 *
 * Resumption: on mount, step is read from profile.onboarding_step.
 * Guest mode: never renders this component (guarded in page.tsx).
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
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
  Wallet,
} from "lucide-react"
import { useProfile, PrimaryGoal, ProfileType } from "@/lib/use-profile"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth-context"
import { requestPushPermission } from "@/lib/push-notifications"
import { cn } from "@/lib/utils"

interface PawiOnboardingFlowProps {
  onComplete: () => void
}

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

const SUGGESTED_CATEGORIES: Record<ProfileType, string[]> = {
  student: ["🎓 Tuition", "🍱 Food & Snacks", "🚌 Transportation", "📚 School Supplies", "💸 Allowance"],
  working_student: ["💸 Allowance", "💼 Part-time Income", "🎓 Tuition", "🚌 Commute", "🍱 Meals & Dining"],
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

  // Step 2 — Profile Type
  const [profileType, setProfileType] = useState<ProfileType | null>(null)

  // Step 3 (Student Branch) — Weekly Allowance
  const [weeklyAllowance, setWeeklyAllowance] = useState("")

  // Step 3 (Professional Branch) — Monthly income
  const [income, setIncome] = useState("")

  // Step 4 (Professional Branch) — Payday
  const [paydayType, setPaydayType] = useState<"once" | "twice">("once")
  const [paydayDay1, setPaydayDay1] = useState<string>("15")
  const [paydayDay2, setPaydayDay2] = useState<string>("30")

  // Goal step (Step 4 for Student, Step 5 for Pro)
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null)

  // Optional inline goal creation (if goal = 'save_specific')
  const [showGoalCreation, setShowGoalCreation] = useState(false)
  const [goalName, setGoalName] = useState("")
  const [goalTarget, setGoalTarget] = useState("")
  const [goalIcon, setGoalIcon] = useState("🎯")
  const [skipGoalCreation, setSkipGoalCreation] = useState(false)

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null)

  // Currency
  const [currency, setCurrency] = useState("PHP")

  // Validation / error
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isStudentBranch = profileType === "student" || profileType === "working_student"
  const totalSteps = isStudentBranch ? 6 : 7

  // ── Resume from last saved step ─────────────────────────────────────────────
  useEffect(() => {
    if (!loadingProfile && profile) {
      if (profile.name && profile.name !== "Pawi User") {
        setName(profile.name)
      } else if (user?.displayName) {
        setName(user.displayName)
      }
      if (profile.profile_type) {
        setProfileType(profile.profile_type)
      } else if (profile.is_student !== null) {
        setProfileType(profile.is_student ? "student" : "professional")
      }
      if (profile.weekly_allowance > 0) setWeeklyAllowance(profile.weekly_allowance.toString())
      if (profile.monthly_income > 0) setIncome(profile.monthly_income.toString())
      if (profile.payday_type) setPaydayType(profile.payday_type)
      if (profile.payday_day_1) setPaydayDay1(String(profile.payday_day_1))
      if (profile.payday_day_2) setPaydayDay2(String(profile.payday_day_2))
      if (profile.primary_goal) setPrimaryGoal(profile.primary_goal)
      if (profile.currency) setCurrency(profile.currency)

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
        // Step 1: Name — required
        const cleaned = name.trim()
        if (!cleaned) {
          setError("Please enter your name so Pawi can greet you! 🐢")
          return
        }
        await saveProfile({ name: cleaned, initials: cleaned.slice(0, 2).toUpperCase() })
        await goForward()
      } else if (step === 2) {
        // Step 2: Profile Type — required
        if (!profileType) {
          setError("Please tell Pawi a bit about your current situation.")
          return
        }
        await saveProfile({
          profile_type: profileType,
          is_student: profileType !== "professional",
        })
        await goForward()
      } else if (isStudentBranch) {
        // ── STUDENT & WORKING STUDENT BRANCH (6 Steps Total) ──────────────────
        if (step === 3) {
          // Step 3: Weekly Allowance — optional/numeric
          const num = parseFloat(weeklyAllowance) || 0
          const approxMonthly = num * 4
          await saveProfile({
            weekly_allowance: num,
            monthly_income: approxMonthly,
            payday_type: "once",
            payday_day_1: null,
            payday_day_2: null,
          })
          await goForward()
        } else if (step === 4) {
          // Step 4: Primary goal — required
          if (!primaryGoal) {
            setError("Please pick the goal that matters most to you right now.")
            return
          }
          await saveProfile({ primary_goal: primaryGoal })
          if (primaryGoal === "save_specific" && !skipGoalCreation) {
            setShowGoalCreation(true)
            setSaving(false)
            return
          }
          await goForward()
        } else if (showGoalCreation) {
          // Step 4b: Optional savings goal creation
          const targetNum = parseFloat(goalTarget)
          if (!goalName.trim()) {
            setError("Give your goal a name, like 'Laptop Fund' or 'School Trip' 🎯")
            return
          }
          if (!goalTarget || isNaN(targetNum) || targetNum <= 0) {
            setError("Please enter a target amount greater than ₱0.")
            return
          }
          await addGoal({
            name: goalName.trim(),
            target: targetNum,
            saved: 0,
            due: null,
            icon: goalIcon,
            accent: "#3D784E",
          })
          setShowGoalCreation(false)
          await goForward(5)
        } else if (step === 5) {
          // Step 5: Notifications — required answer
          if (notificationsEnabled === null) {
            setError("Just tap Yes or No — you can always change this later in Settings!")
            return
          }
          await saveProfile({ notifications_enabled: notificationsEnabled })
          await goForward()
        } else if (step === 6) {
          // Step 6: Currency confirmation & finish
          await saveProfile({ currency, country: currency === "PHP" ? "PH" : "" })
          await completeOnboarding()
          if (notificationsEnabled && user?.id) {
            requestPushPermission(user.id).catch(() => {})
          }
          onComplete()
        }
      } else {
        // ── WORKING PROFESSIONAL BRANCH (7 Steps Total) ───────────────────────
        if (step === 3) {
          // Step 3: Monthly Income — optional
          const num = parseFloat(income) || 0
          await saveProfile({ monthly_income: num, weekly_allowance: 0 })
          await goForward()
        } else if (step === 4) {
          // Step 4: Payday schedule — validate days
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
          await saveProfile({
            payday_type: paydayType,
            payday_day_1: d1,
            payday_day_2: paydayType === "twice" ? parseInt(paydayDay2, 10) : null,
          })
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
          // Step 5: Primary goal — required
          if (!primaryGoal) {
            setError("Please pick the goal that matters most to you right now.")
            return
          }
          await saveProfile({ primary_goal: primaryGoal })
          if (primaryGoal === "save_specific" && !skipGoalCreation) {
            setShowGoalCreation(true)
            setSaving(false)
            return
          }
          await goForward()
        } else if (showGoalCreation) {
          // Step 5b: Optional savings goal creation
          const targetNum = parseFloat(goalTarget)
          if (!goalName.trim()) {
            setError("Give your goal a name, like 'Laptop Fund' or 'Dream Trip' 🎯")
            return
          }
          if (!goalTarget || isNaN(targetNum) || targetNum <= 0) {
            setError("Please enter a target amount greater than ₱0.")
            return
          }
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
          // Step 6: Notifications — required answer
          if (notificationsEnabled === null) {
            setError("Just tap Yes or No — you can always change this later in Settings!")
            return
          }
          await saveProfile({ notifications_enabled: notificationsEnabled })
          await goForward()
        } else if (step === 7) {
          // Step 7: Currency confirmation & finish
          await saveProfile({ currency, country: currency === "PHP" ? "PH" : "" })
          await completeOnboarding()
          if (notificationsEnabled && user?.id) {
            requestPushPermission(user.id).catch(() => {})
          }
          onComplete()
        }
      }
    } finally {
      setSaving(false)
    }
  }, [
    step,
    isStudentBranch,
    showGoalCreation,
    name,
    profileType,
    weeklyAllowance,
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
  ])

  if (loadingProfile) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#3D784E]/25" />
      </div>
    )
  }

  const progressPercent = step === 0 ? 0 : Math.min(100, Math.round((step / totalSteps) * 100))

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background overflow-hidden min-h-[100dvh] h-[100dvh] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      {/* Top progress bar */}
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
            Step {step} of {totalSteps}
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
              className="absolute inset-0 flex flex-col items-center justify-center px-6 py-6 text-center overflow-y-auto"
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
              <ProfileTypeStep selected={profileType} onChange={setProfileType} />
            </motion.div>
          )}

          {/* ── STEP 3: DYNAMIC BRANCHING ── */}
          {step === 3 && !showGoalCreation && (
            <motion.div
              key={isStudentBranch ? "step-3-allowance" : "step-3-income"}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              {isStudentBranch ? (
                <WeeklyAllowanceStep
                  allowance={weeklyAllowance}
                  onChange={setWeeklyAllowance}
                  isWorkingStudent={profileType === "working_student"}
                />
              ) : (
                <IncomeStep income={income} onChange={setIncome} />
              )}
            </motion.div>
          )}

          {/* ── STEP 4: PAYDAY (PRO ONLY) vs PRIMARY GOAL (STUDENT BRANCH) ── */}
          {step === 4 && !showGoalCreation && (
            <motion.div
              key={isStudentBranch ? "step-4-goal" : "step-4-payday"}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              {isStudentBranch ? (
                <PrimaryGoalStep goal={primaryGoal} onChange={setPrimaryGoal} stepNum={4} />
              ) : (
                <PaydayStep
                  paydayType={paydayType}
                  onTypeChange={setPaydayType}
                  day1={paydayDay1}
                  day2={paydayDay2}
                  onDay1Change={setPaydayDay1}
                  onDay2Change={setPaydayDay2}
                />
              )}
            </motion.div>
          )}

          {/* ── OPTIONAL INLINE GOAL CREATION ── */}
          {showGoalCreation && (
            <motion.div
              key="step-goal-creation"
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
                  goForward(isStudentBranch ? 5 : 6)
                }}
              />
            </motion.div>
          )}

          {/* ── STEP 5: NOTIFICATIONS (STUDENT) vs PRIMARY GOAL (PRO) ── */}
          {step === 5 && !showGoalCreation && (
            <motion.div
              key={isStudentBranch ? "step-5-notif" : "step-5-goal"}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              {isStudentBranch ? (
                <NotificationsStep value={notificationsEnabled} onChange={setNotificationsEnabled} stepNum={5} />
              ) : (
                <PrimaryGoalStep goal={primaryGoal} onChange={setPrimaryGoal} stepNum={5} />
              )}
            </motion.div>
          )}

          {/* ── STEP 6: CURRENCY (STUDENT FINAL) vs NOTIFICATIONS (PRO) ── */}
          {step === 6 && !showGoalCreation && (
            <motion.div
              key={isStudentBranch ? "step-6-currency" : "step-6-notif"}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              {isStudentBranch ? (
                <CurrencyStep currency={currency} onChange={setCurrency} stepNum={6} />
              ) : (
                <NotificationsStep value={notificationsEnabled} onChange={setNotificationsEnabled} stepNum={6} />
              )}
            </motion.div>
          )}

          {/* ── STEP 7: CURRENCY (PRO FINAL) ── */}
          {step === 7 && !isStudentBranch && !showGoalCreation && (
            <motion.div
              key="step-7-currency"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 overflow-y-auto flex flex-col px-6 pt-2 pb-32"
            >
              <CurrencyStep currency={currency} onChange={setCurrency} stepNum={7} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky bottom CTA + error bar */}
      {step > 0 && (
        <div className="pointer-events-none fixed bottom-0 inset-x-0 flex flex-col items-center pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] px-6 gap-2.5">
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
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>{step === totalSteps ? "Finish & Go to Dashboard" : "Continue"}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ── SUBCOMPONENTS / SCREENS ──────────────────────────────────────────────────

// Step 0 — Welcome Splash
function WelcomeStep({ name, onStart }: { name: string; onStart: () => void }) {
  const firstName = name.split(" ")[0] || ""
  return (
    <div className="flex flex-col items-center gap-6 max-w-xs my-auto w-full">
      <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-[#3D784E]/10 ring-8 ring-[#3D784E]/20 shadow-xl p-3">
        <Image
          src="/pawi-new-home.png"
          alt="Pawi Mascot"
          width={130}
          height={130}
          className="object-contain w-full h-full drop-shadow-md select-none"
          priority
        />
        <div className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#3D784E] text-white shadow-md border-2 border-background">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          {firstName ? `Mabuhay, ${firstName}!` : "Welcome to Pawi!"}
        </h1>
        <p className="text-sm font-medium text-muted-foreground leading-relaxed">
          Let&apos;s take 60 seconds to personalize your tracker — so Pawi knows how to guide your money best.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 w-full">
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3">
          <span className="text-xl">📊</span>
          <p className="text-xs font-semibold text-foreground">Personalized dashboard tailored to your life</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3">
          <span className="text-xl">📅</span>
          <p className="text-xs font-semibold text-foreground">Allowance or payday countdowns that make sense</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3">
          <span className="text-xl">🎯</span>
          <p className="text-xs font-semibold text-foreground">Goals aligned with what you actually care about</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3D784E] py-4 text-sm font-black text-white shadow-lg shadow-[#3D784E]/30 hover:bg-[#356B46] active:scale-[0.98] transition-all"
      >
        <Sparkles className="h-4 w-4" />
        Let&apos;s get started
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
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step 1 · Identity</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          What should Pawi call you?
        </h2>
        <p className="text-sm text-muted-foreground">
          This powers your personal greeting header and mascot voice.
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
            🐢 Preview: &quot;Good morning, {name.split(" ")[0]}! Ready to swim ahead today?&quot;
          </p>
        </motion.div>
      )}
    </div>
  )
}

// Step 2 — Profile Type (Student, Working Student, Professional)
function ProfileTypeStep({
  selected,
  onChange,
}: {
  selected: ProfileType | null
  onChange: (v: ProfileType) => void
}) {
  const options = [
    {
      value: "student" as ProfileType,
      icon: <GraduationCap className="h-6 w-6" />,
      title: "Student",
      sub: "Allowance, tuition, school supplies, baon",
      preview: SUGGESTED_CATEGORIES.student,
    },
    {
      value: "working_student" as ProfileType,
      icon: (
        <div className="relative">
          <GraduationCap className="h-6 w-6" />
          <div className="absolute -bottom-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] text-white font-bold shadow-xs">
            💼
          </div>
        </div>
      ),
      title: "Working Student",
      sub: "Allowance, part-time income, tuition, commuting",
      preview: SUGGESTED_CATEGORIES.working_student,
    },
    {
      value: "professional" as ProfileType,
      icon: <Briefcase className="h-6 w-6" />,
      title: "Working Professional",
      sub: "Salary, freelance, commissions, client billing",
      preview: SUGGESTED_CATEGORIES.professional,
    },
  ]

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step 2 · Lifestyle</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          Which best describes your current situation?
        </h2>
        <p className="text-sm text-muted-foreground">
          Pawi adapts your cashflow questions and suggested categories accordingly.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {options.map((opt) => {
          const isSelected = selected === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex items-start gap-3.5 rounded-3xl border-2 p-4 text-left transition-all",
                isSelected
                  ? "border-[#3D784E] bg-[#3D784E]/8 shadow-xs"
                  : "border-border/60 bg-card hover:bg-secondary/50"
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  isSelected
                    ? "bg-[#3D784E] text-white"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-foreground">{opt.title}</p>
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3D784E]">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2 leading-tight">{opt.sub}</p>
                <div className="flex flex-wrap gap-1">
                  {opt.preview.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-secondary/80 px-2 py-0.5 text-[9px] font-bold text-muted-foreground"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Step 3 (Student Branch) — Weekly Allowance
function WeeklyAllowanceStep({
  allowance,
  onChange,
  isWorkingStudent,
}: {
  allowance: string
  onChange: (v: string) => void
  isWorkingStudent?: boolean
}) {
  const quickAmounts = ["500", "1000", "1500", "2500", "5000"]
  const numAllowance = parseFloat(allowance) || 0

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step 3 · Weekly Allowance</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          {isWorkingStudent ? "What's your typical weekly allowance & side cash?" : "What's your typical weekly allowance?"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Pawi uses this to calculate your daily baon pacing and weekly budget tracker.
        </p>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Weekly allowance amount (PHP)
        </label>
        <div className="relative mt-2">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-muted-foreground">₱</span>
          <input
            type="number"
            value={allowance}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. 1,500"
            autoFocus
            min={0}
            className="flex h-14 w-full rounded-2xl border border-border/70 bg-secondary/40 pl-8 pr-4 text-base font-bold text-foreground outline-none focus:ring-2 focus:ring-[#3D784E] transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Quick Amount Chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => onChange(amt)}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                allowance === amt
                  ? "border-[#3D784E] bg-[#3D784E]/10 text-[#3D784E]"
                  : "border-border/60 bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              ₱{Number(amt).toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {numAllowance > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2.5"
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pawi&apos;s weekly pacing</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Daily baon (5 days)", value: `₱${Math.round(numAllowance / 5).toLocaleString()}` },
              { label: "Daily (7 days)", value: `₱${Math.round(numAllowance / 7).toLocaleString()}` },
              { label: "Monthly total", value: `₱${Math.round(numAllowance * 4).toLocaleString()}` },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-card border border-border/60 p-3 text-center">
                <p className="text-xs font-black text-foreground">{item.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            💡 Pawi will track your weekly allowance pacing on your dashboard so you never run out of baon early!
          </p>
        </motion.div>
      )}
    </div>
  )
}

// Step 3 (Professional Branch) — Monthly Income
function IncomeStep({ income, onChange }: { income: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step 3 · Monthly Income</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          What&apos;s your approximate monthly income?
        </h2>
        <p className="text-sm text-muted-foreground">
          This powers your budget pool suggestion and mascot zone indicators.{" "}
          <span className="font-semibold text-foreground">Approximate is fine</span>.
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
            placeholder="e.g. 35,000"
            autoFocus
            min={0}
            className="flex h-14 w-full rounded-2xl border border-border/70 bg-secondary/40 pl-8 pr-4 text-base font-bold text-foreground outline-none focus:ring-2 focus:ring-[#3D784E] transition-all placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {income && Number(income) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">70-20-10 allocation</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Living expenses (70%)", value: `₱${Math.round(Number(income) * 0.7).toLocaleString()}` },
              { label: "Savings target (20%)", value: `₱${Math.round(Number(income) * 0.2).toLocaleString()}` },
              { label: "Emergency fund (3 mo)", value: `₱${Math.round(Number(income) * 3).toLocaleString()}` },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-card border border-border/60 p-3 text-center">
                <p className="text-xs font-black text-foreground">{item.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Step 4 (Professional Branch) — Payday Schedule
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
    <div className="flex flex-col gap-6 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step 4 · Payday</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          When do you usually get paid?
        </h2>
        <p className="text-sm text-muted-foreground">
          Powers the &quot;Days until payday&quot; countdown widget directly on your home screen.
        </p>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Payday Frequency
        </label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { value: "once" as const, label: "Once a month", sub: "e.g. 30th" },
            { value: "twice" as const, label: "Twice a month", sub: "e.g. 15th & 30th" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTypeChange(opt.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border-2 py-3 px-3 text-center transition-all",
                paydayType === opt.value
                  ? "border-[#3D784E] bg-[#3D784E]/8 text-[#3D784E]"
                  : "border-border/60 bg-card text-muted-foreground hover:bg-secondary/50"
              )}
            >
              <p className="text-sm font-black">{opt.label}</p>
              <p className="text-[10px]">{opt.sub}</p>
              {paydayType === opt.value && <Check className="h-4 w-4 mt-0.5" />}
            </button>
          ))}
        </div>
      </div>

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
                  "rounded-2xl border px-3 py-2 text-xs font-bold transition-all",
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

// Step: Primary Goal (Step 4 for Student, Step 5 for Pro)
function PrimaryGoalStep({
  goal,
  onChange,
  stepNum,
}: {
  goal: PrimaryGoal | null
  onChange: (v: PrimaryGoal) => void
  stepNum: number
}) {
  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step {stepNum} · Financial Goal</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          What&apos;s your main goal right now?
        </h2>
        <p className="text-sm text-muted-foreground">
          Pawi will personalize your dashboard layout and AI tips based on this choice.
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

// Inline Goal Creation
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
          Create your first savings goal now so it&apos;s waiting on your Plan screen the moment you finish.
        </p>
      </div>

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
              placeholder="e.g. 25,000"
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
        Skip for now — I&apos;ll create a goal later
      </button>
    </div>
  )
}

// Step: Notifications
function NotificationsStep({
  value,
  onChange,
  stepNum,
}: {
  value: boolean | null
  onChange: (v: boolean) => void
  stepNum: number
}) {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step {stepNum} · Reminders</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          Want Pawi to nudge you if you forget to log something?
        </h2>
        <p className="text-sm text-muted-foreground">
          Just gentle, friendly nudges — zero spam. You can change this anytime in Settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[
          {
            val: true,
            icon: <Bell className="h-7 w-7" />,
            title: "Yes, remind me",
            sub: "Send a friendly nudge if I haven't logged expenses in a while",
          },
          {
            val: false,
            icon: <BellOff className="h-7 w-7" />,
            title: "No thanks",
            sub: "I'll check in on my own schedule 💪",
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

// Step: Currency Confirmation
const CURRENCY_OPTIONS = [
  { code: "PHP", symbol: "₱", name: "Philippine Peso", flag: "🇵🇭" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
]

function CurrencyStep({
  currency,
  onChange,
  stepNum,
}: {
  currency: string
  onChange: (v: string) => void
  stepNum: number
}) {
  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#3D784E]">Step {stepNum} · Currency</p>
        <h2 className="text-2xl font-black text-foreground leading-tight">
          Confirm your primary currency
        </h2>
        <p className="text-sm text-muted-foreground">
          Pawi uses this as the base for all wallets, budgets, and goals.
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
          You can also add secondary multi-currency accounts (USD, JPY, EUR) anytime in the Wallets tab!
        </p>
      </div>
    </div>
  )
}
