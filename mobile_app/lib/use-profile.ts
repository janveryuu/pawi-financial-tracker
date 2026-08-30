"use client"

/**
 * useProfile — Reliable hook for reading and writing the user's Supabase `profiles` row.
 *
 * Resilience Guarantees:
 *  - Reads from local cache (`pawi_profile_${userId}`) on mount for instant state recovery.
 *  - Safely syncs with Supabase `profiles` table without destructively overwriting existing data.
 *  - Prevents race conditions where cold starts or unauthenticated read glitches could wipe `onboarding_completed`.
 *  - Exposes `saveProfile`, `completeOnboarding`, `completeTutorial`, and `saveTutorialStep`.
 */

import { useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "./auth-context"
import { supabase } from "./supabase"

export type PrimaryGoal =
  | "emergency_fund"
  | "save_specific"
  | "pay_debt"
  | "track_spending"
  | "grow_savings"

export type PaydayType = "once" | "twice"

export type ProfileType = "student" | "working_student" | "professional"

export interface UserProfile {
  id: string
  name: string
  initials: string
  avatar_url?: string | null
  currency: string
  country: string
  monthly_income: number
  weekly_allowance: number
  monthly_budget_target: number
  profile_type: ProfileType
  is_student: boolean
  is_suspended?: boolean
  suspended_reason?: string | null
  is_admin?: boolean
  onboarding_completed: boolean
  tutorial_completed: boolean
  tutorial_step: number
  onboarding_step: number
  notifications_enabled: boolean
  payday_type: PaydayType
  payday_day_1: number | null
  payday_day_2: number | null
  primary_goal: PrimaryGoal | null
}

const DEFAULT_PROFILE: Omit<UserProfile, "id"> = {
  name: "Pawi User",
  initials: "PU",
  avatar_url: null,
  currency: "PHP",
  country: "PH",
  monthly_income: 0,
  weekly_allowance: 0,
  monthly_budget_target: 0,
  profile_type: "student",
  is_student: true,
  is_suspended: false,
  suspended_reason: null,
  is_admin: false,
  onboarding_completed: false,
  tutorial_completed: false,
  tutorial_step: 0,
  onboarding_step: 0,
  notifications_enabled: false,
  payday_type: "once",
  payday_day_1: null,
  payday_day_2: null,
  primary_goal: null,
}

function getCacheKey(userId: string) {
  return `pawi_profile_${userId}`
}

export function useProfile() {
  const { user, isGuest } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // ── Fetch on mount & auth state change ──────────────────────────────────────
  useEffect(() => {
    if (!user || isGuest) {
      setLoadingProfile(false)
      return
    }

    const userId = user.id || (user as any).uid
    const cacheKey = getCacheKey(userId)

    // 1. Check local cache first for instant load
    let cachedProfile: UserProfile | null = null
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(cacheKey)
        if (raw) {
          cachedProfile = JSON.parse(raw)
          if (cachedProfile && isMounted.current) {
            setProfile(cachedProfile)
            // If cache exists and is valid, we can release blocking load
            setLoadingProfile(false)
          }
        }
      } catch (e) {
        console.warn("Could not read profile cache:", e)
      }
    }

    // 2. Fetch fresh profile row from Supabase
    const fetchProfile = async () => {
      if (!cachedProfile) {
        setLoadingProfile(true)
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single()

        if (!error && data) {
          const rawProfileType = data.profile_type as ProfileType | undefined
          const derivedProfileType: ProfileType =
            rawProfileType || (data.is_student === false ? "professional" : "student")

          const freshProfile: UserProfile = {
            id: data.id,
            name: data.name || user.displayName || "Pawi User",
            initials: data.initials || "PU",
            avatar_url: data.avatar_url || null,
            currency: data.currency || "PHP",
            country: data.country || "PH",
            monthly_income: Number(data.monthly_income) || 0,
            weekly_allowance: Number(data.weekly_allowance) || 0,
            monthly_budget_target: Number(data.monthly_budget_target) || 0,
            profile_type: derivedProfileType,
            is_student: derivedProfileType !== "professional",
            is_suspended: Boolean(data.is_suspended),
            suspended_reason: data.suspended_reason || null,
            is_admin: Boolean(data.is_admin),
            onboarding_completed: Boolean(data.onboarding_completed),
            tutorial_completed: Boolean(data.tutorial_completed),
            tutorial_step: data.tutorial_step ?? 0,
            onboarding_step: data.onboarding_step ?? 0,
            notifications_enabled: Boolean(data.notifications_enabled),
            payday_type: (data.payday_type as PaydayType) || "once",
            payday_day_1: data.payday_day_1 ?? null,
            payday_day_2: data.payday_day_2 ?? null,
            primary_goal: (data.primary_goal as PrimaryGoal) || null,
          }

          if (isMounted.current) {
            setProfile(freshProfile)
            setLoadingProfile(false)
          }

          // Update cache
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(freshProfile))
            } catch {}
          }
        } else if (error?.code === "PGRST116" && !cachedProfile) {
          // Genuinely new user with no database row and no cache — insert initial row
          const defaultRow = {
            id: userId,
            ...DEFAULT_PROFILE,
            name: user.displayName || user.email?.split("@")[0] || "Pawi User",
            initials: (user.displayName || "PU").slice(0, 2).toUpperCase(),
          }

          const { error: insertErr } = await supabase.from("profiles").upsert(defaultRow)
          if (!insertErr && isMounted.current) {
            setProfile({ ...defaultRow, id: userId })
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(cacheKey, JSON.stringify({ ...defaultRow, id: userId }))
              } catch {}
            }
          }
          if (isMounted.current) setLoadingProfile(false)
        } else {
          // If error is a network failure or permission lag, preserve cached state
          if (isMounted.current) setLoadingProfile(false)
        }
      } catch (err) {
        console.warn("Profile fetch error:", err)
        if (isMounted.current) setLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [user, isGuest])

  // ── Save partial profile update ─────────────────────────────────────────────
  const saveProfile = useCallback(
    async (updates: Partial<Omit<UserProfile, "id">>) => {
      if (!user || isGuest) return
      const userId = user.id || (user as any).uid
      const cacheKey = getCacheKey(userId)

      const payload: Record<string, any> = { ...updates }
      if (updates.profile_type !== undefined) {
        payload.is_student = updates.profile_type !== "professional"
      }

      // Optimistic local and cache update
      setProfile((prev) => {
        const next = prev ? { ...prev, ...updates, ...payload } : ({ id: userId, ...DEFAULT_PROFILE, ...updates, ...payload } as UserProfile)
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(next))
          } catch {}
        }
        return next
      })

      try {
        await supabase.from("profiles").upsert({
          id: userId,
          ...payload,
          updated_at: new Date().toISOString(),
        })
      } catch (e) {
        console.warn("Profile save warning:", e)
      }
    },
    [user, isGuest]
  )

  // ── Save onboarding step progress (partial resume support) ──────────────────
  const saveOnboardingStep = useCallback(
    async (step: number) => {
      if (!user || isGuest) return
      await saveProfile({ onboarding_step: step })
    },
    [saveProfile, user, isGuest]
  )

  // ── Mark onboarding done — sets onboarding_completed = true ─────────────────
  const completeOnboarding = useCallback(async () => {
    await saveProfile({ onboarding_completed: true, onboarding_step: 99 })
  }, [saveProfile])

  // ── Mark tutorial done — sets tutorial_completed = true ─────────────────────
  const completeTutorial = useCallback(async () => {
    await saveProfile({ tutorial_completed: true, tutorial_step: 99 })
  }, [saveProfile])

  // ── Save tutorial step progress for mid-tour resume ──────────────────────────
  const saveTutorialStep = useCallback(
    async (step: number) => {
      if (!user || isGuest) return
      await saveProfile({ tutorial_step: step })
    },
    [saveProfile, user, isGuest]
  )

  return {
    profile,
    loadingProfile,
    saveProfile,
    saveOnboardingStep,
    completeOnboarding,
    completeTutorial,
    saveTutorialStep,
  }
}
