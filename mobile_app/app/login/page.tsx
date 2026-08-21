"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const { signIn, signUp, signInWithGoogle, signInGuest } = useAuth()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match")
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

  const handleGuestAuth = async () => {
    setError("")
    setSubmitting(true)
    try {
      const { error: guestError } = await signInGuest()
      if (guestError) {
        setError(guestError)
      } else {
        router.push("/")
      }
    } catch {
      router.push("/")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-primary/20">
            <Image src="/pawikan-logo.png" alt="Pawi Logo" fill priority className="object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isSignUp ? "Create an account" : "Welcome back to Pawi"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Sign up to track your finances securely." : "Log in to access your financial tracker."}
          </p>
        </div>

        <div className="flex rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              !isSignUp ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              isSignUp ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-border/60 bg-card px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          )}
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-border/60 bg-card px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-border/60 bg-card px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <input
                type="password"
                placeholder="Confirm Password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-border/60 bg-card px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          )}

          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 w-full items-center justify-center whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? "Processing..." : isSignUp ? "Create Account" : "Log In"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5">
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
          Google
        </button>

        <button
          type="button"
          onClick={handleGuestAuth}
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-primary/20 focus-visible:outline-none"
        >
          🐢 Continue as Guest (Instant Access)
        </button>
      </div>
    </div>
  )
}
