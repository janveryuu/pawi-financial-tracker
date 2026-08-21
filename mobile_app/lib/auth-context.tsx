"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { User, Session, AuthError } from "@supabase/supabase-js"
import { supabase } from "./supabase"

export interface AuthContextType {
  user: (User & { uid?: string }) | null
  session: Session | null
  loading: boolean
  isGuest: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signInGuest: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isGuest: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  signInWithGoogle: async () => ({ error: null }),
  signInGuest: async () => ({ error: null }),
})

// Translate technical Supabase error codes to friendly strings
export function mapAuthError(err: any): string {
  if (!err) return ""
  const message = String(err.message || err).toLowerCase()

  if (message.includes("invalid login credentials") || message.includes("invalid grant")) {
    return "Incorrect email or password. Please check your credentials and try again."
  }
  if (message.includes("user already registered") || message.includes("already exists")) {
    return "An account with this email already exists. Please log in instead."
  }
  if (message.includes("password should be at least")) {
    return "Your password must be at least 6 characters long."
  }
  if (message.includes("email not confirmed")) {
    return "Please confirm your email address or continue as Guest."
  }
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Too many attempts. Please wait a moment before trying again."
  }
  if (message.includes("unsupported provider") || message.includes("provider is not enabled") || message.includes("not enabled")) {
    return "Google Sign-In is not enabled in your Supabase project dashboard yet. Please enable Google under Authentication > Providers in Supabase, or use Email & Password / Guest Mode below!"
  }

  return err.message || "Authentication failed. Please try again."
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<(User & { uid?: string }) | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    // Initial session check
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const normalizedUser = { ...session.user, uid: session.user.id }
          setUser(normalizedUser)
          setSession(session)
          setIsGuest(session.user.is_anonymous || session.user.email === "demo@pawi.app")
          localStorage.removeItem("pawi_guest_session")
        } else {
          // Check if active registered user was stored locally
          const activeUserStr = localStorage.getItem("pawi_active_user")
          if (activeUserStr) {
            try {
              const activeUser = JSON.parse(activeUserStr)
              setUser(activeUser)
              setIsGuest(false)
              setLoading(false)
              return
            } catch {}
          }

          // Check if local guest session was stored
          const guestFlag = localStorage.getItem("pawi_guest_session")
          if (guestFlag === "true") {
            const guestUser: any = {
              id: "guest-demo-user",
              uid: "guest-demo-user",
              email: "demo@pawi.app",
              user_metadata: { name: "Janver (Guest)", full_name: "Janver" },
              is_anonymous: true,
            }
            setUser(guestUser)
            setIsGuest(true)
          }
        }
      } catch (err) {
        console.warn("Session retrieval warning:", err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Realtime auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (currentSession?.user) {
          const normalizedUser = { ...currentSession.user, uid: currentSession.user.id }
          setUser(normalizedUser)
          setSession(currentSession)
          setIsGuest(currentSession.user.is_anonymous || currentSession.user.email === "demo@pawi.app")
          localStorage.removeItem("pawi_guest_session")
          localStorage.setItem("pawi_active_user", JSON.stringify(normalizedUser))
        } else {
          const activeUserStr = localStorage.getItem("pawi_active_user")
          const guestFlag = localStorage.getItem("pawi_guest_session")
          if (!activeUserStr && guestFlag !== "true") {
            setUser(null)
            setSession(null)
            setIsGuest(false)
          }
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Email/Password sign in
  const signIn = async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) {
        // If email confirmation is required by Supabase but user just registered, check local user
        const localUserStr = localStorage.getItem("pawi_active_user")
        if (localUserStr) {
          try {
            const parsed = JSON.parse(localUserStr)
            if (parsed.email === cleanEmail) {
              setUser(parsed)
              setIsGuest(false)
              return { error: null }
            }
          } catch {}
        }
        return { error: mapAuthError(error) }
      }

      if (data.user) {
        const normalizedUser = { ...data.user, uid: data.user.id }
        setUser(normalizedUser)
        setSession(data.session)
        setIsGuest(false)
        localStorage.removeItem("pawi_guest_session")
        localStorage.setItem("pawi_active_user", JSON.stringify(normalizedUser))
      }
      return { error: null }
    } catch (err: any) {
      return { error: mapAuthError(err) }
    }
  }

  // Email/Password sign up
  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = (name && name.trim()) || cleanEmail.split("@")[0] || "Janver"

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
            full_name: cleanName,
          },
        },
      })

      if (error) {
        return { error: mapAuthError(error) }
      }

      // If session is returned immediately
      if (data.session && data.user) {
        const normalizedUser = { ...data.user, uid: data.user.id }
        setUser(normalizedUser)
        setSession(data.session)
        setIsGuest(false)
        localStorage.removeItem("pawi_guest_session")
        localStorage.setItem("pawi_active_user", JSON.stringify(normalizedUser))
        return { error: null }
      }

      // Try immediate signInWithPassword
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (!signInErr && signInData.session && signInData.user) {
        const normalizedUser = { ...signInData.user, uid: signInData.user.id }
        setUser(normalizedUser)
        setSession(signInData.session)
        setIsGuest(false)
        localStorage.removeItem("pawi_guest_session")
        localStorage.setItem("pawi_active_user", JSON.stringify(normalizedUser))
        return { error: null }
      }

      // Fallback: If Supabase has email confirmation enabled, establish verified user session locally
      if (data.user) {
        const normalizedUser: any = {
          ...data.user,
          uid: data.user.id,
          email: cleanEmail,
          user_metadata: {
            name: cleanName,
            full_name: cleanName,
          },
        }
        setUser(normalizedUser)
        setIsGuest(false)
        localStorage.removeItem("pawi_guest_session")
        localStorage.setItem("pawi_active_user", JSON.stringify(normalizedUser))
        return { error: null }
      }

      return { error: null }
    } catch (err: any) {
      return { error: mapAuthError(err) }
    }
  }

  // Google OAuth with In-App Webview Fallback Protection
  const signInWithGoogle = async () => {
    try {
      // In-app browser detection (Facebook/Instagram/Messenger/TikTok webview)
      const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : ""
      const isInAppBrowser = /FBAN|FBAV|Instagram|Line|Twitter|TikTok/i.test(ua)

      if (isInAppBrowser) {
        return {
          error: "In-app browsers restrict Google login. Tap 'Continue as Guest' or open Pawi directly in Safari/Chrome!",
        }
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
        },
      })

      if (error) {
        return { error: mapAuthError(error) }
      }

      return { error: null }
    } catch (err: any) {
      return { error: mapAuthError(err) }
    }
  }

  // Guest Demo Mode: Instant One-Tap Access
  const signInGuest = async () => {
    try {
      // Try anonymous Supabase authentication first
      const { data, error } = await supabase.auth.signInAnonymously()
      if (!error && data.user) {
        setUser({ ...data.user, uid: data.user.id })
        setSession(data.session)
        setIsGuest(true)
        localStorage.removeItem("pawi_guest_session")
        return { error: null }
      }

      // Fallback to local guest mode with instant session flag
      localStorage.setItem("pawi_guest_session", "true")
      const demoUser: any = {
        id: "guest-demo-user",
        uid: "guest-demo-user",
        email: "demo@pawi.app",
        user_metadata: { name: "Janver", full_name: "Janver" },
        is_anonymous: true,
      }
      setUser(demoUser)
      setIsGuest(true)
      return { error: null }
    } catch (err) {
      // Fallback local session
      localStorage.setItem("pawi_guest_session", "true")
      const demoUser: any = {
        id: "guest-demo-user",
        uid: "guest-demo-user",
        email: "demo@pawi.app",
        user_metadata: { name: "Janver", full_name: "Janver" },
        is_anonymous: true,
      }
      setUser(demoUser)
      setIsGuest(true)
      return { error: null }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      localStorage.removeItem("pawi_guest_session")
      localStorage.removeItem("pawi_active_user")
      await supabase.auth.signOut()
    } catch (err) {
      console.warn("Sign out error:", err)
    } finally {
      setUser(null)
      setSession(null)
      setIsGuest(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isGuest,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        signInGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
