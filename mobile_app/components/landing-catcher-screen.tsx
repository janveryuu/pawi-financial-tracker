"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, ShieldCheck, Play, TrendingUp, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

/**
 * LandingCatcherScreen — V2 Light / Premium Fintech Palette
 *
 * Color system:
 * - Base: warm off-white #FAFAF7 (premium, not clinical)
 * - Headlines: near-black charcoal #1A1A1A
 * - Accent highlight (headline 2nd line, CTAs, icons): deep muted sage #1E4D3A–#2B5940
 * - Card: subtle drop shadow + 1px #E4E4DC border — no glow, no neon
 * - Status chip: muted celadon tint bg + dark green text — never bright
 * - Bank logos: real brand colors, ONLY saturated accents on the page
 * - Primary CTA: solid #24503C white text
 * - Secondary CTA: light tinted bg with dark green text
 */
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

  // PH bank / e-wallet services — real brand colors are the ONLY saturated accents on this page
  const phServices = [
    { name: "GCash", logo: "/gcash.png" },
    { name: "Maya", logo: "/Paymaya-logo.png" },
    { name: "BPI", logo: "/bpi.svg" },
    { name: "BDO", logo: "/bdo.svg" },
    { name: "GoTyme", logo: "/gotyme.svg" },
    { name: "SeaBank", logo: "/seabank.svg" },
  ]

  return (
    <main
      className="light relative flex min-h-screen w-full flex-col justify-between overflow-x-hidden px-5 pt-8 pb-10 select-none"
      style={{ background: "#FAFAF7", color: "#1A1A1A" }}
    >
      {/* Very soft, barely-there ambient warmth — no blob, no glow */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full opacity-40"
        style={{ background: "radial-gradient(ellipse at center, #DEEEE6 0%, transparent 72%)" }}
      />

      {/* ── Top Header Bar ───────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-2">
          <div
            className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full p-0.5"
            style={{ background: "#EEF5F0", border: "1px solid #C8DDD1" }}
          >
            <Image
              src="/pawikan-logo.png"
              alt="Pawi Logo"
              width={32}
              height={32}
              priority
              className="object-cover rounded-full"
            />
          </div>
          <span className="text-sm font-black tracking-tight" style={{ color: "#1A1A1A" }}>
            PAWI
          </span>
        </div>

        {/* Edition Badge */}
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
          style={{ background: "#EEF5F0", color: "#24503C", border: "1px solid #C8DDD1" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#4A9068" }} />
          <span>PH EDITION</span>
        </div>
      </header>

      {/* ── Hero Section — Above the Fold ────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center mt-6 sm:mt-8 max-w-md mx-auto w-full">

        {/* Mascot — Calm, Slow Floating Animation */}
        <motion.div
          aria-label="Pawi turtle mascot"
          animate={
            shouldReduceMotion
              ? {}
              : { y: [0, -5, 0] }
          }
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative mb-4 flex h-[88px] w-[88px] sm:h-[96px] sm:w-[96px] items-center justify-center"
        >
          {/* Circular backing — soft celadon, not glowing */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: "#EEF5F0", border: "1px solid #C8DDD1" }}
          />
          <div className="relative h-[70px] w-[70px] sm:h-[76px] sm:w-[76px] overflow-hidden rounded-full">
            <Image
              src="/pawi-v2-hi.png"
              alt="Pawi — your financial wellness companion"
              width={76}
              height={76}
              priority
              className="h-full w-full object-contain"
            />
          </div>
          {/* Calm tag beneath */}
          <div
            className="absolute -bottom-2 rounded-full px-2.5 py-[3px] text-[9px] font-black tracking-wider uppercase shadow-sm"
            style={{ background: "#FAFAF7", border: "1px solid #C8DDD1", color: "#3D6B52" }}
          >
            SLOW &amp; STEADY 🐢
          </div>
        </motion.div>

        {/* Primary Headline */}
        <h1
          className="text-[2.05rem] sm:text-[2.25rem] font-black tracking-tight leading-[1.1] mt-3"
          style={{ color: "#1A1A1A" }}
        >
          Save smarter.{" "}
          <br />
          <span style={{ color: "#24503C" }}>Slow and steady.</span>
        </h1>

        {/* Subheadline — warm gray */}
        <p
          className="mt-3 text-[13px] sm:text-sm font-medium leading-relaxed max-w-[320px]"
          style={{ color: "#6B7B72" }}
        >
          Offline-first, AI-assisted finance tracking designed for effortless daily budgeting.
        </p>

        {/* ── Proof Card ────────────────────────────────────── */}
        <div
          className="mt-5 w-full rounded-2xl p-4 text-left"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E4DC",
            boxShadow: "0 2px 12px rgba(36, 80, 60, 0.06), 0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {/* Net Worth Row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: "#EEF5F0" }}
              >
                <TrendingUp className="h-3.5 w-3.5" style={{ color: "#24503C" }} />
              </div>
              <span
                className="text-[10px] font-black uppercase tracking-wider"
                style={{ color: "#6B7B72" }}
              >
                Total Net Worth
              </span>
            </div>

            {/* Muted sage % chip — NOT bright green */}
            <div
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold"
              style={{ background: "#EEF5F0", color: "#24503C" }}
            >
              <CheckCircle2 className="h-3 w-3" />
              +12.4%
            </div>
          </div>

          <p
            className="text-[1.65rem] font-black tracking-tight tabular-nums mt-1.5"
            style={{ color: "#1A1A1A" }}
          >
            ₱148,520<span className="text-lg" style={{ color: "#9BAAA2" }}>.00</span>
          </p>

          {/* Trust Strip — bank logos ARE the saturated color moment */}
          <div
            className="mt-3 pt-3 flex items-center justify-between"
            style={{ borderTop: "1px solid #EDEDE7" }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "#9BAAA2" }}
            >
              Works with:
            </span>
            <div className="flex items-center gap-1.5">
              {phServices.map((s) => (
                <div
                  key={s.name}
                  className="relative flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full overflow-hidden"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E4E4DC",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                  }}
                  title={s.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.logo}
                    alt={s.name}
                    className="h-full w-full object-contain rounded-full"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Cluster — Thumb-Zone ─────────────────────────── */}
      <section className="relative z-10 mt-6 flex flex-col items-center gap-3 w-full max-w-md mx-auto">

        {/* Primary CTA: Get Started Free */}
        <motion.button
          type="button"
          onClick={handleGetStarted}
          whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
          className="group relative flex items-center justify-center gap-2.5 w-full rounded-2xl text-sm font-black text-white transition-all"
          style={{
            background: "#24503C",
            height: "52px",
            boxShadow: "0 2px 8px rgba(36, 80, 60, 0.22), 0 1px 3px rgba(36,80,60,0.14)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1E4433")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#24503C")}
        >
          <span>Get Started Free</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </motion.button>

        {/* Secondary CTA: Try Demo */}
        <motion.button
          type="button"
          disabled={isDemoLoading}
          onClick={handleTryDemo}
          whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
          className="flex items-center justify-center gap-2 w-full rounded-2xl text-[13px] font-extrabold transition-all disabled:opacity-50"
          style={{
            height: "48px",
            background: "#EEF5F0",
            border: "1px solid #C8DDD1",
            color: "#24503C",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#E4EFE8")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#EEF5F0")}
        >
          <Play className="h-3.5 w-3.5" style={{ fill: "#4A9068", color: "#4A9068" }} />
          <span>{isDemoLoading ? "Loading Sandbox…" : "Try Live Demo (Instant Sandbox)"}</span>
        </motion.button>

        {/* Existing User Login Link */}
        <div className="mt-1 flex items-center justify-center gap-1.5 text-[12px]" style={{ color: "#9BAAA2" }}>
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={handleLogIn}
            className="font-extrabold underline underline-offset-4 transition-colors hover:opacity-80"
            style={{ color: "#24503C" }}
          >
            Log in
          </button>
        </div>

        {/* Micro-footer — quiet, not crowded */}
        <footer className="mt-4 flex items-center justify-center gap-3 text-[10px] font-semibold" style={{ color: "#B0BDB7" }}>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" style={{ color: "#6B9B82" }} /> Offline-First
          </span>
          <span>·</span>
          <span>Zero Ads</span>
          <span>·</span>
          <span>Private by Design</span>
        </footer>
      </section>
    </main>
  )
}
