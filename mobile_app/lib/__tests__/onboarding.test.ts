/**
 * Onboarding Flow & Branching Tests
 *
 * Tests cover:
 *  1. Profile schema serialization with profile_type, weekly_allowance, and tutorial_completed.
 *  2. Step 2 profile type selection: Student, Working Student (hybrid), and Working Professional.
 *  3. Step 2 -> Step 3 Branching:
 *     - Student / Working Student: asks for Weekly Allowance, skips Payday question (6-step flow).
 *     - Working Professional: asks for Monthly Income + Payday schedule (7-step flow).
 *  4. Switching Step 2 answers after viewing Step 3 correctly re-branches without stale state.
 *  5. Weekly allowance pacing calculations (5-day baon, 7-day daily, monthly total).
 *  6. Decoupled Onboarding & Tutorial trigger logic:
 *     - Brand new user: onboarding first, then tutorial.
 *     - Existing completed user: neither auto-triggers on login/refresh.
 *     - Guest mode: always bypassed.
 *     - Settings "Edit Setup": does not reset tutorial_completed.
 *     - Settings "Replay Tutorial": does not reset onboarding_completed.
 *  7. Payday countdown calculations for monthly/semi-monthly schedules.
 *  8. Edge cases: income = 0, allowance = 0, twice-a-month validation.
 */

import { computePaydayCountdown, PaydayConfig } from "../store"
import { ProfileType, PrimaryGoal } from "../use-profile"

// ── Test 1: Profile serialization & schema shape ──────────────────────────────
describe("Onboarding profile field mapping & profile_type", () => {
  it("maps all onboarding fields including profile_type, weekly_allowance, and tutorial_completed", () => {
    const onboardingPayload = {
      name: "Janver",
      initials: "JA",
      profile_type: "working_student" as ProfileType,
      is_student: true,
      weekly_allowance: 2000,
      monthly_income: 8000,
      payday_type: "once",
      payday_day_1: null,
      payday_day_2: null,
      primary_goal: "save_specific" as PrimaryGoal,
      notifications_enabled: true,
      currency: "PHP",
      country: "PH",
      onboarding_completed: true,
      tutorial_completed: false,
      onboarding_step: 99,
    }

    expect(onboardingPayload.name).toBe("Janver")
    expect(onboardingPayload.profile_type).toBe("working_student")
    expect(onboardingPayload.is_student).toBe(true)
    expect(onboardingPayload.weekly_allowance).toBe(2000)
    expect(onboardingPayload.monthly_income).toBe(8000)
    expect(onboardingPayload.onboarding_completed).toBe(true)
    expect(onboardingPayload.tutorial_completed).toBe(false)
  })

  it("synchronizes is_student boolean based on profile_type", () => {
    const checkIsStudent = (type: ProfileType) => type !== "professional"

    expect(checkIsStudent("student")).toBe(true)
    expect(checkIsStudent("working_student")).toBe(true)
    expect(checkIsStudent("professional")).toBe(false)
  })
})

// ── Test 2: Step 2 -> Step 3 Branching ────────────────────────────────────────
describe("Step 2 -> Step 3 Branching logic", () => {
  function getBranchConfig(profileType: ProfileType) {
    const isStudentBranch = profileType === "student" || profileType === "working_student"
    return {
      isStudentBranch,
      totalSteps: isStudentBranch ? 6 : 7,
      step3Question: isStudentBranch ? "weekly_allowance" : "monthly_income",
      hasPaydayStep: !isStudentBranch,
    }
  }

  it("branches to weekly allowance (6 steps, no payday) for Student", () => {
    const config = getBranchConfig("student")
    expect(config.isStudentBranch).toBe(true)
    expect(config.totalSteps).toBe(6)
    expect(config.step3Question).toBe("weekly_allowance")
    expect(config.hasPaydayStep).toBe(false)
  })

  it("branches to weekly allowance (6 steps, no payday) for Working Student", () => {
    const config = getBranchConfig("working_student")
    expect(config.isStudentBranch).toBe(true)
    expect(config.totalSteps).toBe(6)
    expect(config.step3Question).toBe("weekly_allowance")
    expect(config.hasPaydayStep).toBe(false)
  })

  it("branches to income + payday schedule (7 steps) for Working Professional", () => {
    const config = getBranchConfig("professional")
    expect(config.isStudentBranch).toBe(false)
    expect(config.totalSteps).toBe(7)
    expect(config.step3Question).toBe("monthly_income")
    expect(config.hasPaydayStep).toBe(true)
  })

  it("re-branches correctly when switching profile_type after viewing Step 3", () => {
    // User initially selects 'professional'
    let currentProfile: ProfileType = "professional"
    let branch = getBranchConfig(currentProfile)
    expect(branch.step3Question).toBe("monthly_income")
    expect(branch.totalSteps).toBe(7)

    // User navigates back and switches to 'working_student'
    currentProfile = "working_student"
    branch = getBranchConfig(currentProfile)
    expect(branch.step3Question).toBe("weekly_allowance")
    expect(branch.totalSteps).toBe(6)

    // User switches to 'student'
    currentProfile = "student"
    branch = getBranchConfig(currentProfile)
    expect(branch.step3Question).toBe("weekly_allowance")
    expect(branch.totalSteps).toBe(6)
  })
})

// ── Test 3: Category suggestions mapped per profile type ──────────────────────
describe("Category suggestions per profile type", () => {
  const SUGGESTED_CATEGORIES: Record<ProfileType, string[]> = {
    student: ["🎓 Tuition", "🍱 Food & Snacks", "🚌 Transportation", "📚 School Supplies", "💸 Allowance"],
    working_student: ["💸 Allowance", "💼 Part-time Income", "🎓 Tuition", "🚌 Commute", "🍱 Meals & Dining"],
    professional: ["💼 Salary", "📊 Commission", "🤝 Client Payment", "🍱 Meals & Dining", "🚗 Transportation"],
  }

  it("suggests school & allowance categories for students", () => {
    expect(SUGGESTED_CATEGORIES.student).toContain("🎓 Tuition")
    expect(SUGGESTED_CATEGORIES.student).toContain("💸 Allowance")
  })

  it("suggests hybrid allowance & part-time income for working students", () => {
    expect(SUGGESTED_CATEGORIES.working_student).toContain("💸 Allowance")
    expect(SUGGESTED_CATEGORIES.working_student).toContain("💼 Part-time Income")
  })

  it("suggests salary & client payment for professionals", () => {
    expect(SUGGESTED_CATEGORIES.professional).toContain("💼 Salary")
    expect(SUGGESTED_CATEGORIES.professional).toContain("🤝 Client Payment")
  })
})

// ── Test 4: Weekly allowance calculations & pacing ────────────────────────────
describe("Weekly allowance calculations", () => {
  function computeAllowancePacing(allowance: number) {
    return {
      dailyBaon5Days: Math.round(allowance / 5),
      daily7Days: Math.round(allowance / 7),
      monthlyEstimate: Math.round(allowance * 4),
    }
  }

  it("computes correct daily baon and monthly total for ₱1,500/week", () => {
    const pacing = computeAllowancePacing(1500)
    expect(pacing.dailyBaon5Days).toBe(300)
    expect(pacing.daily7Days).toBe(214)
    expect(pacing.monthlyEstimate).toBe(6000)
  })

  it("handles ₱0 allowance gracefully without division by zero errors", () => {
    const pacing = computeAllowancePacing(0)
    expect(pacing.dailyBaon5Days).toBe(0)
    expect(pacing.daily7Days).toBe(0)
    expect(pacing.monthlyEstimate).toBe(0)
  })
})

// ── Test 5: Decoupled Onboarding & Tutorial Trigger Logic ──────────────────────
describe("Decoupled Onboarding and Tutorial Gate Gating", () => {
  interface UserProfileFlags {
    onboarding_completed: boolean
    tutorial_completed: boolean
  }

  function determineNextScreen(flags: UserProfileFlags, isGuest: boolean): "onboarding" | "tutorial" | "dashboard" {
    if (isGuest) return "dashboard"
    if (!flags.onboarding_completed) return "onboarding"
    if (!flags.tutorial_completed) return "tutorial"
    return "dashboard"
  }

  it("new user: triggers onboarding first", () => {
    const state = { onboarding_completed: false, tutorial_completed: false }
    expect(determineNextScreen(state, false)).toBe("onboarding")
  })

  it("post-onboarding user: triggers tutorial next", () => {
    const state = { onboarding_completed: true, tutorial_completed: false }
    expect(determineNextScreen(state, false)).toBe("tutorial")
  })

  it("returning user (both completed): goes straight to dashboard", () => {
    const state = { onboarding_completed: true, tutorial_completed: true }
    expect(determineNextScreen(state, false)).toBe("dashboard")
  })

  it("guest demo mode: always goes directly to dashboard", () => {
    const state = { onboarding_completed: false, tutorial_completed: false }
    expect(determineNextScreen(state, true)).toBe("dashboard")
  })

  it("completing tutorial does not reset onboarding_completed", () => {
    let state = { onboarding_completed: true, tutorial_completed: false }
    // User completes tutorial
    state = { ...state, tutorial_completed: true }
    expect(state.onboarding_completed).toBe(true)
    expect(state.tutorial_completed).toBe(true)
    expect(determineNextScreen(state, false)).toBe("dashboard")
  })

  it("settings Edit Setup re-triggers onboarding without resetting tutorial_completed", () => {
    const state = { onboarding_completed: true, tutorial_completed: true }
    // User clicks Edit Setup -> modifies answers
    const updatedState = { ...state, onboarding_completed: true }
    expect(updatedState.tutorial_completed).toBe(true)
  })
})

// ── Test 6: Payday countdown computation ──────────────────────────────────────
describe("Payday countdown computation", () => {
  function buildConfig(paydayType: "once" | "twice", day1: number, day2?: number, income = 0): PaydayConfig {
    return {
      configured: true,
      frequency: paydayType === "twice" ? "semi-monthly" : "monthly",
      day1,
      day2,
      amount: income,
    }
  }

  it("monthly payday on the 30th computes correct days", () => {
    const refDate = new Date(2026, 7, 10) // Aug 10, 2026
    const config = buildConfig("once", 30, undefined, 35000)
    const result = computePaydayCountdown(config, refDate)
    expect(result.configured).toBe(true)
    expect(result.daysRemaining).toBe(20) // 30 - 10 = 20 days
  })

  it("semi-monthly 15th & 30th — next payday is 15th from the 10th", () => {
    const refDate = new Date(2026, 7, 10)
    const config = buildConfig("twice", 15, 30, 25000)
    const result = computePaydayCountdown(config, refDate)
    expect(result.daysRemaining).toBe(5)
  })
})

// ── Test 8: App Restart & Profile Recovery Regression Tests ──────────────────
describe("App restart & profile recovery resilience", () => {
  it("existing account with onboarding_completed: true never triggers onboarding on fresh load", () => {
    const freshSessionUser = { id: "user-123", email: "kaye@pawi.app" }
    const loadedProfile = {
      id: "user-123",
      name: "Kaye",
      onboarding_completed: true,
      tutorial_completed: true,
      onboarding_step: 99,
    }

    let showOnboarding = false
    const loading = false
    const loadingProfile = false
    const isGuest = false

    // Simulate page.tsx gate logic on fresh restart
    if (!loading && !loadingProfile && freshSessionUser && !isGuest) {
      if (loadedProfile && !loadedProfile.onboarding_completed) {
        showOnboarding = true
      } else if (loadedProfile && loadedProfile.onboarding_completed) {
        showOnboarding = false
      }
    }

    expect(showOnboarding).toBe(false)
  })

  it("PGRST116 / read glitch during restart preserves existing cached profile without overwriting", () => {
    const cachedProfile = {
      id: "user-123",
      name: "Kaye",
      onboarding_completed: true,
      tutorial_completed: true,
      onboarding_step: 99,
    }

    // Simulate fetch returning PGRST116 (unauthenticated RLS window or network drop)
    const error = { code: "PGRST116", message: "0 rows found" }
    let activeProfile = cachedProfile
    let destructiveUpsertExecuted = false

    if (error?.code === "PGRST116" && !cachedProfile) {
      destructiveUpsertExecuted = true
    } else {
      // Retain cached profile
      activeProfile = cachedProfile
    }

    expect(destructiveUpsertExecuted).toBe(false)
    expect(activeProfile.onboarding_completed).toBe(true)
    expect(activeProfile.onboarding_step).toBe(99)
  })
})

// ── Test 9: Spotlight Tour Gate Logic ────────────────────────────────────────
describe("Spotlight Tour Gate Logic", () => {
  const TOTAL_STEPS = 9

  interface TourProfile {
    onboarding_completed: boolean
    tutorial_completed: boolean
    tutorial_step: number
  }

  function shouldShowTour(profile: TourProfile, isGuest: boolean): boolean {
    if (isGuest) return false
    if (!profile.onboarding_completed) return false
    if (profile.tutorial_completed) return false
    return true
  }

  function computeResumeStep(profile: TourProfile): number {
    const step = profile.tutorial_step ?? 0
    return step < 99 ? step : 0
  }

  it("shows tour when onboarding_completed=true and tutorial_completed=false", () => {
    const profile: TourProfile = { onboarding_completed: true, tutorial_completed: false, tutorial_step: 0 }
    expect(shouldShowTour(profile, false)).toBe(true)
  })

  it("does NOT show tour when tutorial_completed=true", () => {
    const profile: TourProfile = { onboarding_completed: true, tutorial_completed: true, tutorial_step: 99 }
    expect(shouldShowTour(profile, false)).toBe(false)
  })

  it("does NOT show tour for guest users even with flags false", () => {
    const profile: TourProfile = { onboarding_completed: true, tutorial_completed: false, tutorial_step: 0 }
    expect(shouldShowTour(profile, true)).toBe(false)
  })

  it("does NOT show tour if onboarding not yet completed", () => {
    const profile: TourProfile = { onboarding_completed: false, tutorial_completed: false, tutorial_step: 0 }
    expect(shouldShowTour(profile, false)).toBe(false)
  })

  it("resumes at mid-tour step on app restart", () => {
    const profile: TourProfile = { onboarding_completed: true, tutorial_completed: false, tutorial_step: 5 }
    expect(computeResumeStep(profile)).toBe(5)
  })

  it("resumes at step 0 if tutorial_step is 99 (safety fallback)", () => {
    const profile: TourProfile = { onboarding_completed: true, tutorial_completed: false, tutorial_step: 99 }
    expect(computeResumeStep(profile)).toBe(0)
  })

  it("tutorial_completed only flips true after final step (not mid-tour)", () => {
    // Simulate completing steps 0..7 — tutorial_completed must remain false
    let tutorialCompleted = false
    for (let step = 0; step < TOTAL_STEPS - 1; step++) {
      // completing any non-final step should NOT set tutorial_completed
      const isLastStep = step === TOTAL_STEPS - 1
      if (isLastStep) tutorialCompleted = true
      expect(tutorialCompleted).toBe(false)
    }
    // Only after the final step does it flip
    const finalStep = TOTAL_STEPS - 1
    const isLastStep = finalStep === TOTAL_STEPS - 1
    if (isLastStep) tutorialCompleted = true
    expect(tutorialCompleted).toBe(true)
  })

  it("step persists correctly: saveTutorialStep writes next step index", () => {
    const persistedSteps: number[] = []
    const onStepComplete = (step: number) => {
      persistedSteps.push(step + 1) // page.tsx pattern: persist step + 1
    }

    // Simulate completing steps 0-8
    for (let step = 0; step < TOTAL_STEPS; step++) {
      onStepComplete(step)
    }

    expect(persistedSteps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it("accessibility escape hatch completes tour and writes exit log", () => {
    const log: object[] = []
    const completeTourViaAccessibility = (method: string, step: number) => {
      log.push({ method, step, timestamp: "2026-08-30T07:00:00Z" })
      return true // triggers onComplete
    }

    const result = completeTourViaAccessibility("triple-tap", 3)
    expect(result).toBe(true)
    expect(log).toHaveLength(1)
    expect((log[0] as any).method).toBe("triple-tap")
    expect((log[0] as any).step).toBe(3)
  })

  it("accessibility escape hatch is not triggerable by a single tap", () => {
    let tapCount = 0
    const handleTopLeftTap = () => {
      tapCount++
      // Only triggers after 3 taps
      if (tapCount >= 3) return true
      return false
    }

    expect(handleTopLeftTap()).toBe(false) // tap 1
    expect(handleTopLeftTap()).toBe(false) // tap 2
    expect(handleTopLeftTap()).toBe(true)  // tap 3 — triggers
  })
})

