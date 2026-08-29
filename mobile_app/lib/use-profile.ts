"use client"

/**
 * useProfile — Lightweight hook for reading and writing the user's Supabase `profiles` row.
 *
 * Responsibilities:
 *  - Fetch the authenticated user's profile from `profiles` on mount.
 *  - Expose `saveProfile` to persist partial profile updates.
 *  - Expose `onboarding_completed` and `onboarding_step` for flow gating.
 *  - Expose `completeOnboarding` as a one-shot flag setter.
 */

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "./auth-context"
import { supabase } from "./supabase"

export type PrimaryGoal =
  | "emergency_fund"
  | "save_specific"
  | "pay_debt"
  | "track_spending"
  | "grow_savings"

export type PaydayType = "once" | "twice"

export interface UserProfile {
  id: string
  name: string
  initials: string
  avatar_url?: string | null
  currency: string
  country: string
  monthly_income: number
  monthly_budget_target: number
  is_student: boolean
  onboarding_completed: boolean
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
  monthly_budget_target: 0,
  is_student: true,
  onboarding_completed: false,
  onboarding_step: 0,
  notifications_enabled: false,
  payday_type: "once",
  payday_day_1: null,
  payday_day_2: null,
  primary_goal: null,
}

export function useProfile() {
  const { user, isGuest } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || isGuest) {
      setLoadingProfile(false)
      return
    }

    const userId = user.id || (user as any).uid

    const fetchProfile = async () => {
      setLoadingProfile(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (!error && data) {
        setProfile({
          id: data.id,
          name: data.name || user.displayName || "Pawi User",
          initials: data.initials || "PU",
          avatar_url: data.avatar_url || null,
          currency: data.currency || "PHP",
          country: data.country || "PH",
          monthly_income: Number(data.monthly_income) || 0,
          monthly_budget_target: Number(data.monthly_budget_target) || 0,
          is_student: data.is_student ?? true,
          onboarding_completed: data.onboarding_completed ?? false,
          onboarding_step: data.onboarding_step ?? 0,
          notifications_enabled: data.notifications_enabled ?? false,
          payday_type: (data.payday_type as PaydayType) || "once",
          payday_day_1: data.payday_day_1 ?? null,
          payday_day_2: data.payday_day_2 ?? null,
          primary_goal: (data.primary_goal as PrimaryGoal) || null,
        })
      } else if (error?.code === "PGRST116") {
        // Row not found — new user, insert a default profile row
        const defaultRow = {
          id: userId,
          ...DEFAULT_PROFILE,
          // Override name/initials with values from user auth object
          name: user.displayName || user.email?.split("@")[0] || "Pawi User",
          initials: (user.displayName || "PU").slice(0, 2).toUpperCase(),
        }
        await supabase.from("profiles").upsert(defaultRow)
        setProfile({ ...defaultRow, id: userId })
      }

      setLoadingProfile(false)
    }

    fetchProfile()
  }, [user, isGuest])

  // ── Save partial profile update ─────────────────────────────────────────────
  const saveProfile = useCallback(
    async (updates: Partial<Omit<UserProfile, "id">>) => {
      if (!user || isGuest) return
      const userId = user.id || (user as any).uid

      // Optimistic local update
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev))

      await supabase.from("profiles").upsert({
        id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
    },
    [user, isGuest]
  )

  // ── Save onboarding step progress (partial resume support) ──────────────────
  const saveOnboardingStep = useCallback(
    async (step: number) => {
      if (!user || isGuest) return
      setProfile((prev) => (prev ? { ...prev, onboarding_step: step } : prev))
      const userId = user.id || (user as any).uid
      await supabase
        .from("profiles")
        .upsert({ id: userId, onboarding_step: step, updated_at: new Date().toISOString() })
    },
    [user, isGuest]
  )

  // ── Mark onboarding done — sets onboarding_completed = true ─────────────────
  const completeOnboarding = useCallback(async () => {
    await saveProfile({ onboarding_completed: true, onboarding_step: 99 })
  }, [saveProfile])

  return {
    profile,
    loadingProfile,
    saveProfile,
    saveOnboardingStep,
    completeOnboarding,
  }
}
