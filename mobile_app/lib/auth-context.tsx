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
  if (message.includes("network") || message.includes("fetch")) {
    return "Network connection issue. Please check your internet connection."
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
        } else {
          // Check if local guest session was stored
          const guestFlag = localStorage.getItem("pawi_guest_session")
          if (guestFlag === "true") {
            const guestUser: any = {
              id: "guest-demo-user",
              uid: "guest-demo-user",
              email: "demo@pawi.app",
              user_metadata: { name: "Bryl (Guest)", full_name: "Bryl" },
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
        } else {
          const guestFlag = localStorage.getItem("pawi_guest_session")
          if (guestFlag !== "true") {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        return { error: mapAuthError(error) }
      }

      if (data.user) {
        setUser({ ...data.user, uid: data.user.id })
        setSession(data.session)
        setIsGuest(false)
        localStorage.removeItem("pawi_guest_session")
      }
      return { error: null }
    } catch (err: any) {
      return { error: mapAuthError(err) }
    }
  }

  // Email/Password sign up
  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name || "Pawi User",
            full_name: name || "Pawi User",
          },
        },
      })

      if (error) {
        return { error: mapAuthError(error) }
      }

      if (data.user) {
        setUser({ ...data.user, uid: data.user.id })
        setSession(data.session)
        setIsGuest(false)
        localStorage.removeItem("pawi_guest_session")
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
        user_metadata: { name: "Bryl", full_name: "Bryl" },
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
        user_metadata: { name: "Bryl", full_name: "Bryl" },
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
