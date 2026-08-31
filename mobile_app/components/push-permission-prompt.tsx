"use client"

import { useState, useEffect } from "react"
import { Bell, X, Sparkles, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { isPushSupported, getPushPermissionStatus, requestPushPermission } from "@/lib/push-notifications"

interface PushPermissionPromptProps {
  reason?: "first_bill" | "first_goal" | "onboarding_complete" | "payday_setup"
  onDismiss?: () => void
  onSuccess?: () => void
}

export function PushPermissionPrompt({
  reason = "first_bill",
  onDismiss,
  onSuccess,
}: PushPermissionPromptProps) {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) return
    const status = getPushPermissionStatus()
    if (status === "default") {
      // Check if previously dismissed in session
      const dismissed = sessionStorage.getItem(`pawi_push_prompt_dismissed_${reason}`)
      if (!dismissed) {
        setVisible(true)
      }
    }
  }, [reason])

  const handleEnable = async () => {
    if (!user?.id) return
    setRequesting(true)
    try {
      const res = await requestPushPermission(user.id)
      if (res.success) {
        setVisible(false)
        onSuccess?.()
      } else {
        setVisible(false)
        onDismiss?.()
      }
    } catch {
      setVisible(false)
    } finally {
      setRequesting(false)
    }
  }

  const handleDismiss = () => {
    sessionStorage.setItem(`pawi_push_prompt_dismissed_${reason}`, "true")
    setVisible(false)
    onDismiss?.()
  }

  if (!visible) return null

  const copyMap = {
    first_bill: {
      title: "Never miss an upcoming due date 🐢",
      body: "Want Pawi to remind you 3 days before your bills are due so you can allocate funds in advance?",
      btn: "Enable Bill Reminders",
    },
    first_goal: {
      title: "Track your savings milestones 🎯",
      body: "Get celebratory alerts when you hit 25%, 50%, and 100% of your savings goals!",
      btn: "Enable Goal Alerts",
    },
    onboarding_complete: {
      title: "Stay on top of your money habits ✨",
      body: "Get timely payday reminders and budget warnings delivered directly to your device.",
      btn: "Turn on Smart Reminders",
    },
    payday_setup: {
      title: "Get notified on payday morning 🎉",
      body: "Pawi will remind you on your cutoff days to allocate your earnings and budget smoothly.",
      btn: "Enable Payday Alerts",
    },
  }

  const content = copyMap[reason] || copyMap.first_bill

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md animate-in slide-in-from-bottom duration-300">
      <div className="relative rounded-3xl border border-emerald-500/30 bg-card/95 p-4 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-secondary transition-colors"
          aria-label="Dismiss prompt"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
            <Bell className="h-5 w-5" />
          </div>

          <div className="flex-1 pr-4">
            <h4 className="text-xs font-extrabold text-foreground">{content.title}</h4>
            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground leading-snug">
              {content.body}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                disabled={requesting}
                onClick={handleEnable}
                className="flex items-center gap-1 rounded-xl bg-[#3D784E] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#356B46] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {requesting ? "Enabling..." : content.btn}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
