import type { Metadata } from "next"
import { LandingCatcherScreen } from "@/components/landing-catcher-screen"

export const metadata: Metadata = {
  title: "Pawi — Save Smarter. Slow and Steady.",
  description: "Offline-first, AI-assisted personal finance tracker built for GCash, Maya, and Philippine banks.",
}

export default function WelcomePage() {
  return <LandingCatcherScreen />
}
