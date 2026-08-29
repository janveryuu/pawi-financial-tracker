"use client"

import { useRouter } from "next/navigation"
import { PawiOnboardingFlow } from "@/components/pawi-onboarding-flow"

export default function OnboardingPage() {
  const router = useRouter()

  const handleComplete = () => {
    router.push("/")
  }

  return <PawiOnboardingFlow onComplete={handleComplete} />
}
