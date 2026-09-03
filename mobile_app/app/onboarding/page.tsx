"use client"

import { useRouter } from "next/navigation"
import { PawiOnboardingFlow } from "@/components/pawi-onboarding-flow"

export default function OnboardingPage() {
  const router = useRouter()

  const handleComplete = () => {
    router.push("/?tutorial=true")
  }

  return <PawiOnboardingFlow onComplete={handleComplete} />
}
