"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { Play, ShieldCheck, Smartphone, Maximize2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

/**
 * LandingCatcherScreen — Pixel-perfect recreation of the nature intro/landing flow (Image 2)
 *
 * Visual hierarchy:
 * - Background: Mangrove / lush river anime forest art (Image 4)
 * - Mascot: PAWI jumping with open arms, green cap and shirt (Image 1)
 * - Brand Logo: "PaWi" with bold rounded display font (Fredoka)
 * - Tagline: "Your personal companion that helps you track your finances and save slow & steady." (Plus Jakarta Sans)
 * - Primary CTA: "Let's get started!" in natural moss green (#587E56)
 * - Desktop presentation: Photorealistic floating device frame mimicking Image 2, with toggle for full-bleed mode
 * - Mobile presentation: Edge-to-edge native mobile app view
 */
export function LandingCatcherScreen() {
  const router = useRouter()
  const { signInGuest } = useAuth()
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const [isFullBleedOnDesktop, setIsFullBleedOnDesktop] = useState(false)
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

  // Inner Phone / Mobile Screen Content
  const renderScreenContent = () => (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden select-none">
      {/* ── 1. Mangrove Art Background ─────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/landing-bg-mangrove.jpg"
          alt="Mangrove Forest River"
          fill
          priority
          sizes="(max-width: 640px) 100vw, 420px"
          className="object-cover object-center pointer-events-none"
        />
        {/* Deep Nature Ambient Gradient at the bottom half for crystal-clear typography contrast */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(9, 21, 14, 0.98) 0%, rgba(10, 24, 16, 0.92) 28%, rgba(10, 24, 16, 0.60) 48%, rgba(10, 24, 16, 0.18) 68%, transparent 100%)",
          }}
        />
      </div>

      {/* ── 2. Center Mascot: PAWI Jumping in Mid-Air ─────────────────── */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 pt-10 sm:pt-12 pb-2">
        <motion.div
          aria-label="Pawi turtle mascot jumping joyfully"
          animate={
            shouldReduceMotion
              ? {}
              : {
                  y: [0, -14, 0],
                  rotate: [-1.5, 1.5, -1.5],
                }
          }
          transition={{
            duration: 4.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative flex items-center justify-center"
        >
          {/* Gentle ambient halo behind mascot */}
          <div
            className="absolute -inset-4 rounded-full opacity-35 blur-xl pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(162, 230, 185, 0.4) 0%, transparent 70%)" }}
          />

          <Image
            src="/pawi-mascot-jumping.png"
            alt="Pawi Mascot"
            width={260}
            height={260}
            priority
            className="h-[210px] w-[210px] sm:h-[240px] sm:w-[240px] object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.45)]"
          />
        </motion.div>
      </div>

      {/* ── 4. Lower Typography & CTA Cluster ───────────────────────── */}
      <section className="relative z-20 flex flex-col items-center text-center px-6 pb-8 pt-2">
        {/* Brand Name: PaWi (Matching Image 2 'TaRsi' bubbly display typography) */}
        <motion.h1
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="text-[44px] sm:text-[52px] font-black text-white tracking-tight leading-none"
          style={{
            fontFamily: "var(--font-fredoka), 'Fredoka', cursive, sans-serif",
            textShadow: "0 4px 20px rgba(0, 0, 0, 0.55), 0 1px 3px rgba(0,0,0,0.8)",
          }}
        >
          PaWi
        </motion.h1>

        {/* Subtitle / Companion Tagline */}
        <motion.p
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-[14px] sm:text-[14.5px] font-medium leading-relaxed text-white/95 max-w-[285px] sm:max-w-[310px]"
          style={{
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            textShadow: "0 2px 8px rgba(0, 0, 0, 0.6)",
          }}
        >
          Your personal companion that helps you track your finances and save slow &amp; steady.
        </motion.p>

        {/* Primary CTA: Let's get started! */}
        <motion.button
          type="button"
          onClick={handleGetStarted}
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
          className="group mt-6 flex h-[52px] w-full max-w-[290px] sm:max-w-[320px] items-center justify-center rounded-2xl text-[15px] font-bold text-white transition-all duration-200 cursor-pointer shadow-lg"
          style={{
            background: "#587E56",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0,0,0,0.2)",
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#638C61")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#587E56")}
        >
          <span>Let&apos;s get started!</span>
        </motion.button>

        {/* Secondary Log In Link for Returning Users */}
        <div
          className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-white/80"
          style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={handleLogIn}
            className="font-bold text-white underline underline-offset-4 transition-colors hover:text-emerald-200 cursor-pointer"
          >
            Log in
          </button>
        </div>

        {/* Live Sandbox Demo option */}
        <button
          type="button"
          disabled={isDemoLoading}
          onClick={handleTryDemo}
          className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-200/85 transition-colors hover:text-white disabled:opacity-50 cursor-pointer"
          style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif" }}
        >
          <Play className="h-3 w-3 fill-current" />
          <span>{isDemoLoading ? "Loading Sandbox…" : "Try Live Demo (Instant Sandbox)"}</span>
        </button>

        {/* Micro-footer Trust Line */}
        <footer className="mt-4 flex items-center justify-center gap-2.5 text-[10px] font-medium text-white/50">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-300/70" /> Offline-First
          </span>
          <span>·</span>
          <span>Zero Ads</span>
          <span>·</span>
          <span>Private by Design</span>
        </footer>
      </section>
    </div>
  )

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#0A160F]">
      {/* ── DESKTOP AMBIENT BACKDROP (Image 2 Forest Environment) ── */}
      <div className="absolute inset-0 hidden sm:block pointer-events-none">
        <Image
          src="/landing-bg-mangrove.jpg"
          alt="Mangrove Backdrop"
          fill
          priority
          className="object-cover object-center blur-md scale-105 opacity-60 brightness-75"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(10, 24, 15, 0.4) 0%, rgba(5, 14, 9, 0.88) 100%)",
          }}
        />
      </div>

      {/* ── DESKTOP VIEWPORT CONTROLS ── */}
      <div className="absolute top-4 right-5 z-40 hidden sm:flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md px-3 py-1.5 border border-white/10 text-white/80 text-xs">
        <button
          type="button"
          onClick={() => setIsFullBleedOnDesktop(!isFullBleedOnDesktop)}
          className="flex items-center gap-1.5 font-medium transition-colors hover:text-white"
          title="Toggle between floating mobile device frame (Image 2 style) and full-screen view"
        >
          {isFullBleedOnDesktop ? (
            <>
              <Smartphone className="h-3.5 w-3.5" />
              <span>Phone Frame</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Full Screen</span>
            </>
          )}
        </button>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      {isFullBleedOnDesktop ? (
        /* Full-Bleed Desktop Mode */
        <div className="relative z-10 flex min-h-dvh w-full max-w-lg flex-col justify-between mx-auto shadow-2xl">
          {renderScreenContent()}
        </div>
      ) : (
        /* Image 2 Replicated: Floating Smartphone Mockup with 3D feel */
        <div className="relative z-10 sm:py-8 flex items-center justify-center w-full h-full min-h-dvh sm:min-h-0">
          <motion.div
            initial={false}
            animate={shouldReduceMotion ? {} : { y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-full sm:w-[380px] h-dvh sm:h-[812px] sm:max-h-[92vh] sm:rounded-[48px] overflow-hidden sm:border-[8px] sm:border-[#223026] sm:shadow-[0_25px_70px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.12)] sm:ring-1 sm:ring-black/50"
          >
            {renderScreenContent()}
          </motion.div>
        </div>
      )}
    </main>
  )
}

