"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Sparkles, ShieldCheck, Play, Wallet, TrendingUp, CheckCircle2, ChevronRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

export function LandingCatcherScreen() {
  const router = useRouter()
  const { signInGuest } = useAuth()
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const handleGetStarted = () => {
    router.push("/login?signup=true")
  }

  const handleLogIn = () => {
    router.push("/login")
  }

  const handleTryDemo = async () => {
    setIsDemoLoading(true)
    try {
      await signInGuest()
      router.push("/")
    } catch {
      router.push("/")
    } finally {
      setIsDemoLoading(false)
    }
  }

  // Supported Philippine banks and e-wallets list
  const phServices = [
    { name: "GCash", logo: "/gcash.png" },
    { name: "Maya", logo: "/Paymaya-logo.png" },
    { name: "BPI", logo: "/bpi.svg" },
    { name: "BDO", logo: "/bdo.svg" },
    { name: "GoTyme", logo: "/gotyme.svg" },
    { name: "SeaBank", logo: "/seabank.svg" },
  ]

  return (
    <main className="relative flex min-h-screen w-full flex-col justify-between overflow-x-hidden bg-[#0A120D] px-5 pt-8 pb-10 text-white select-none selection:bg-[#3D784E]/30">
      {/* Ambient Radial Lighting & Gradient Backdrop */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(61,120,78,0.22)_0%,_rgba(10,18,13,0)_70%)] blur-2xl" />
      <div className="pointer-events-none absolute bottom-10 left-1/2 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.12)_0%,_rgba(10,18,13,0)_70%)] blur-2xl" />

      {/* Top Header / Brand Badge */}
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-emerald-500/40 bg-emerald-950/60 p-0.5 shadow-xs">
            <Image
              src="/pawikan-logo.png"
              alt="Pawi Logo"
              width={32}
              height={32}
              priority
              className="object-cover"
            />
          </div>
          <span className="text-sm font-black tracking-tight text-white">PAWI</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-950/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>PH EDITION</span>
        </div>
      </header>

      {/* Hero & Core Messaging Section (Above the fold) */}
      <section className="relative z-10 flex flex-col items-center text-center mt-6 sm:mt-10 max-w-md mx-auto">
        {/* Subtle, Calm Mascot Animation (Slow & Steady) */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  y: [0, -6, 0],
                }
          }
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative mb-5 flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center"
        >
          {/* Glowing Aura Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#3D784E]/40 to-transparent p-1">
            <div className="h-full w-full rounded-full bg-[#0E1A12] border border-emerald-500/30 backdrop-blur-sm" />
          </div>

          <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full p-1">
            <Image
              src="/pawi-v2-hi.png"
              alt="Pawi Mascot"
              width={96}
              height={96}
              priority
              className="h-full w-full object-contain drop-shadow-md"
            />
          </div>

          {/* Calm Status Pill */}
          <div className="absolute -bottom-1 rounded-full border border-emerald-500/40 bg-[#0B150E] px-2.5 py-0.5 text-[9px] font-black text-emerald-400 shadow-md">
            SLOW & STEADY 🐢
          </div>
        </motion.div>

        {/* Sharp Headline */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-[1.12]">
          Save smarter. <br />
          <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-200 bg-clip-text text-transparent">
            Slow and steady.
          </span>
        </h1>

        {/* Precise, Differentiated Subheadline */}
        <p className="mt-3 text-xs sm:text-sm font-medium text-emerald-100/70 leading-relaxed max-w-[340px]">
          Offline-first, AI-assisted finance tracking built for GCash, Maya, and Philippine banks.
        </p>

        {/* Proof / Live UI Preview Card */}
        <div className="mt-6 w-full rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/40 to-[#0C1610]/80 p-4 text-left shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/90">
                TOTAL NET WORTH
              </span>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> +12.4%
            </span>
          </div>

          <p className="text-2xl font-black text-white tabular-nums tracking-tight mt-1.5">
            ₱148,520.00
          </p>

          {/* Philippine Financial Ecosystem Trust Strip */}
          <div className="mt-3 pt-3 border-t border-emerald-500/15 flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-200/60 uppercase tracking-wider">
              Works with:
            </span>
            <div className="flex items-center gap-2">
              {phServices.map((s) => (
                <div
                  key={s.name}
                  className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 p-0.5 border border-white/15"
                  title={s.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.logo} alt={s.name} className="h-full w-full object-contain rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Primary Action Cluster — Mobile Thumb Reachable */}
      <section className="relative z-10 mt-8 flex flex-col items-center gap-3 w-full max-w-md mx-auto">
        {/* Primary CTA: Get Started */}
        <motion.button
          type="button"
          onClick={handleGetStarted}
          whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
          className="group relative flex h-13 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#3D784E] text-sm font-black text-white shadow-lg shadow-[#3D784E]/30 hover:bg-[#356B46] active:scale-[0.98] transition-all"
        >
          <span>Get Started Free</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </motion.button>

        {/* Secondary CTA: Try Live Demo */}
        <motion.button
          type="button"
          disabled={isDemoLoading}
          onClick={handleTryDemo}
          whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 text-xs font-extrabold text-emerald-300 backdrop-blur-sm hover:bg-emerald-900/40 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
          <span>{isDemoLoading ? "Loading Sandbox..." : "Try Live Demo (Instant Sandbox)"}</span>
        </motion.button>

        {/* Existing User Login Link */}
        <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-emerald-200/70">
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={handleLogIn}
            className="font-extrabold text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
          >
            Log in
          </button>
        </div>

        {/* Micro-Footer Reassurance */}
        <footer className="mt-4 flex items-center justify-center gap-3 text-[10px] font-semibold text-emerald-400/60">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> Offline-First
          </span>
          <span>•</span>
          <span>Zero Ads</span>
          <span>•</span>
          <span>Private by Design</span>
        </footer>
      </section>
    </main>
  )
}
