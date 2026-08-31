import type { Metadata } from "next"
import { LandingCatcherScreen } from "@/components/landing-catcher-screen"

export const metadata: Metadata = {
  title: "Pawi — Save Smarter. Slow and Steady.",
  description: "Offline-first, AI-assisted finance tracking designed for effortless daily budgeting.",
}

export default function WelcomePage() {
  return <LandingCatcherScreen />
}
