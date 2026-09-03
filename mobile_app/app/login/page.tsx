"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Lock, User, Eye, EyeOff, Sparkles, ShieldCheck, ArrowRight, Loader2, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const { signIn, signUp, signInWithGoogle } = useAuth()

  useEffect(() => {
    // Catch URL hash error parameters returned by OAuth providers
    if (typeof window !== "undefined") {
      const hash = window.location.hash
      const params = new URLSearchParams(window.location.search)
      const errorDesc = params.get("error_description") || params.get("error")

      if (params.get("signup") === "true" || params.get("signup") === "1") {
        setIsSignUp(true)
      }

      if (errorDesc) {
        if (errorDesc.includes("not enabled") || errorDesc.includes("unsupported_provider")) {
          setError("Google Sign-In is not enabled yet in your Supabase project. Enable Google in Supabase Dashboard > Authentication > Providers, or log in with Email / Guest below!")
        } else {
          setError(decodeURIComponent(errorDesc))
        }
      } else if (hash.includes("error_description=")) {
        const match = hash.match(/error_description=([^&]+)/)
        if (match && match[1]) {
          const decoded = decodeURIComponent(match[1].replace(/\+/g, " "))
          if (decoded.includes("not enabled") || decoded.includes("unsupported_provider")) {
            setError("Google Sign-In is not enabled yet in your Supabase project. Enable Google in Supabase Dashboard > Authentication > Providers, or log in with Email / Guest below!")
          } else {
            setError(decoded)
          }
        }
      }
    }
  }, [])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setSubmitting(true)
    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email, password, name)
        if (signUpError) {
          setError(signUpError)
          return
        }
      } else {
        const { error: signInError } = await signIn(email, password)
        if (signInError) {
          setError(signInError)
          return
        }
      }
      router.push("/")
    } catch (err: any) {
      setError(err.message || "Authentication failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleAuth = async () => {
    setError("")
    setSubmitting(true)
    try {
      const { error: gError } = await signInWithGoogle()
      if (gError) {
        setError(gError)
      }
    } catch (err: any) {
      setError(err.message || "Google authentication failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    // Always enforced in Pure Light Theme
    <div className="light relative flex min-h-screen flex-col items-center justify-center bg-[#F6F8F6] px-4 py-8 text-neutral-900 selection:bg-[#3D784E]/20">
      {/* Background Soft Glow Accents */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#3D784E]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Header Branding Card */}
        <div className="mb-6 flex flex-col items-center text-center">
          {/* Main Pawi App Icon Emblem (Maximized Space, No White Circle) */}
          <div className="relative mb-4 flex items-center justify-center">
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-[22px] shadow-lg border border-black/5 bg-transparent transition-transform hover:scale-105">
              <Image
                src="/pawi-app-icon.png"
                alt="Pawi App Icon"
                fill
                priority
                className="object-contain"
              />
            </div>
            {/* Tiny Sparkle Badge */}
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#3D784E] text-white shadow-md border-2 border-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-neutral-900">
            {isSignUp ? "Create your account" : "Welcome back to Pawi"}
          </h1>
          <p className="text-xs font-semibold text-neutral-500 mt-1">
            {isSignUp
              ? "Start tracking, budgeting, and growing your savings."
              : "Log in to access your financial tracker & AI insights."}
          </p>
        </div>

        {/* Main Form Container Card (Pure White) */}
        <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-md text-neutral-900">
          {/* Tab Selector: Log In / Sign Up */}
          <div className="relative mb-5 flex rounded-2xl bg-neutral-100 p-1 border border-neutral-200/80">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setError("")
              }}
              className={cn(
                "relative z-10 flex-1 rounded-xl py-2 text-xs font-black transition-all",
                !isSignUp ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-800"
              )}
            >
              {!isSignUp && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 rounded-xl bg-white shadow-xs border border-neutral-200/80"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10">Log In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(true)
                setError("")
              }}
              className={cn(
                "relative z-10 flex-1 rounded-xl py-2 text-xs font-black transition-all",
                isSignUp ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-800"
              )}
            >
              {isSignUp && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 rounded-xl bg-white shadow-xs border border-neutral-200/80"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10">Sign Up</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            <AnimatePresence mode="wait">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-[11px] font-black uppercase tracking-wider text-neutral-600 px-1">
                    Your Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="e.g. Janver"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:border-[#3D784E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D784E]/15 transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-neutral-600 px-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-neutral-400" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:border-[#3D784E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D784E]/15 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-neutral-600 px-1">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-neutral-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-10 pr-11 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:border-[#3D784E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D784E]/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-neutral-400 hover:text-neutral-700 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Sign Up only) */}
            <AnimatePresence mode="wait">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-[11px] font-black uppercase tracking-wider text-neutral-600 px-1">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-neutral-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:border-[#3D784E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D784E]/15 transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700 leading-relaxed"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit Primary Button */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#3D784E] text-sm font-black text-white shadow-md shadow-[#3D784E]/25 hover:bg-[#356B46] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <>
                  <span>{isSignUp ? "Create Free Account" : "Log In to Pawi"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Clean Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <span className="relative bg-white px-3 text-[10px] font-black uppercase tracking-wider text-neutral-400">
              or continue with
            </span>
          </div>

          {/* Social Auth: Google */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-neutral-200 bg-white text-sm font-bold text-neutral-800 shadow-xs hover:bg-neutral-50 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Security Footer Note */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-neutral-500">
          <ShieldCheck className="h-3.5 w-3.5 text-[#3D784E]" />
          <span>Encrypted PostgreSQL · Private & Secure</span>
        </div>
      </motion.div>
    </div>
  )
}
