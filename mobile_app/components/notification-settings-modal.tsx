"use client"

import { useState, useEffect } from "react"
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  ShieldCheck,
  Calendar,
  DollarSign,
  Target,
  Sparkles,
  Smartphone,
  Moon,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  isPushSupported,
  getPushPermissionStatus,
  requestPushPermission,
  unsubscribePush,
} from "@/lib/push-notifications"
import {
  UserNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/lib/push-types"
import { cn } from "@/lib/utils"

interface NotificationSettingsModalProps {
  open: boolean
  onClose: () => void
}

export function NotificationSettingsModal({ open, onClose }: NotificationSettingsModalProps) {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<UserNotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingPush, setTestingPush] = useState(false)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [hasChanged, setHasChanged] = useState(false)

  useEffect(() => {
    if (!open) return
    setPermissionStatus(getPushPermissionStatus())

    if (user?.id) {
      setLoading(true)
      fetch(`/api/push/preferences?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.preferences) {
            setPreferences(data.preferences)
          }
        })
        .catch((err) => console.warn("Failed to load notification preferences:", err))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [open, user?.id])

  const handleToggle = (key: keyof UserNotificationPreferences) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      setHasChanged(true)
      return next
    })
  }

  const handleMasterToggle = async () => {
    const nextMaster = !preferences.master_enabled

    if (nextMaster && permissionStatus !== "granted" && user?.id) {
      const res = await requestPushPermission(user.id)
      setPermissionStatus(res.permission)
      if (!res.success) {
        return
      }
    } else if (!nextMaster && user?.id) {
      await unsubscribePush(user.id)
    }

    setPreferences((prev) => ({ ...prev, master_enabled: nextMaster }))
    setHasChanged(true)
  }

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          preferences,
        }),
      })
      setHasChanged(false)
      onClose()
    } catch (err) {
      console.error("Failed to save preferences:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleSendTestPush = async () => {
    if (!user?.id) return
    setTestingPush(true)
    setTestMessage(null)

    try {
      // First ensure push is subscribed
      if (permissionStatus !== "granted") {
        const res = await requestPushPermission(user.id)
        setPermissionStatus(res.permission)
        if (!res.success) {
          setTestMessage("Please grant push permission in your browser.")
          setTestingPush(false)
          return
        }
      }

      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()

      if (data.success) {
        setTestMessage(`✓ Test notification sent to ${data.devicesSent} active device(s)!`)
      } else {
        setTestMessage(data.error || "Failed to deliver test notification.")
      }
    } catch (err: any) {
      setTestMessage(err?.message || "Error sending test notification.")
    } finally {
      setTestingPush(false)
    }
  }

  if (!open) return null

  const supported = isPushSupported()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-[2.5rem] border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">Notification Settings</h2>
              <p className="text-[11px] font-semibold text-muted-foreground">Web & Android Push Reminders</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide">
          {/* Permission Status Banner */}
          {!supported ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-600 font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Push notifications are not supported in this browser environment.</span>
            </div>
          ) : permissionStatus === "denied" ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-600 font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <p>Notifications are blocked in your browser settings.</p>
                <p className="text-[10px] font-medium text-rose-500/90 mt-0.5">
                  To receive reminders, click the lock icon in your address bar and allow Notifications.
                </p>
              </div>
            </div>
          ) : null}

          {/* Master Toggle Card */}
          <div className="flex items-center justify-between rounded-3xl border border-border/80 bg-secondary/30 p-4">
            <div className="space-y-0.5">
              <span className="text-sm font-extrabold text-foreground">Push Notifications</span>
              <p className="text-xs text-muted-foreground font-medium">
                {preferences.master_enabled
                  ? permissionStatus === "granted"
                    ? "Active on this device & connected APKs"
                    : "Enabled (Tap to grant browser permission)"
                  : "All push notifications are turned off"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleMasterToggle}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                preferences.master_enabled ? "bg-emerald-600" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                  preferences.master_enabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Test Push Button */}
          {preferences.master_enabled && (
            <div className="space-y-2">
              <button
                type="button"
                disabled={testingPush}
                onClick={handleSendTestPush}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-extrabold text-emerald-600 hover:bg-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {testingPush ? "Sending test push..." : "Send Test Notification to This Device"}
              </button>
              {testMessage && (
                <p className="text-center text-[11px] font-bold text-emerald-600 animate-in fade-in">
                  {testMessage}
                </p>
              )}
            </div>
          )}

          {/* Section 1: Bills & Obligations */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> Bills & Obligations
            </h3>
            <div className="rounded-3xl border border-border/70 bg-card divide-y divide-border/40 overflow-hidden">
              <ToggleRow
                label="Bill Due Reminders"
                description="Remind 3 days before scheduled due dates"
                checked={preferences.bill_due_reminders}
                onChange={() => handleToggle("bill_due_reminders")}
                disabled={!preferences.master_enabled}
              />
              <ToggleRow
                label="Bill Overdue Alerts"
                description="One-time alert the day after an unpaid bill passes"
                checked={preferences.bill_overdue_alerts}
                onChange={() => handleToggle("bill_overdue_alerts")}
                disabled={!preferences.master_enabled}
              />
              <ToggleRow
                label="Daily Overdue Reminders"
                description="Repeat daily until marked paid (default off to prevent nag loops)"
                checked={preferences.daily_overdue_nag}
                onChange={() => handleToggle("daily_overdue_nag")}
                disabled={!preferences.master_enabled}
              />
              <ToggleRow
                label="Debt Due Reminders"
                description="Notify when personal or loan payments are due"
                checked={preferences.debt_due_reminders}
                onChange={() => handleToggle("debt_due_reminders")}
                disabled={!preferences.master_enabled}
              />
              <ToggleRow
                label="Money Owed to You"
                description="Remind on expected date for receivables"
                checked={preferences.receivable_expected_reminders}
                onChange={() => handleToggle("receivable_expected_reminders")}
                disabled={!preferences.master_enabled}
              />
            </div>
          </div>

          {/* Section 2: Budgets & Spending Limits */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" /> Budgets & Limits
            </h3>
            <div className="rounded-3xl border border-border/70 bg-card divide-y divide-border/40 overflow-hidden">
              <ToggleRow
                label="Budget Warning (80%)"
                description="Alert once per month when nearing category limit"
                checked={preferences.budget_threshold_alerts}
                onChange={() => handleToggle("budget_threshold_alerts")}
                disabled={!preferences.master_enabled}
              />
              <ToggleRow
                label="Budget Exceeded (100%+)"
                description="Instant alert when a category exceeds 100%"
                checked={preferences.budget_exceeded_alerts}
                onChange={() => handleToggle("budget_exceeded_alerts")}
                disabled={!preferences.master_enabled}
              />
            </div>
          </div>

          {/* Section 3: Savings Goals */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Goals & Milestones
            </h3>
            <div className="rounded-3xl border border-border/70 bg-card overflow-hidden">
              <ToggleRow
                label="Milestone Celebrations"
                description="Celebrate 25%, 50%, 75%, and 100% savings goal progress"
                checked={preferences.goal_milestone_alerts}
                onChange={() => handleToggle("goal_milestone_alerts")}
                disabled={!preferences.master_enabled}
              />
            </div>
          </div>

          {/* Section 4: Habits & Payday */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Habits & Planning
            </h3>
            <div className="rounded-3xl border border-border/70 bg-card divide-y divide-border/40 overflow-hidden">
              <ToggleRow
                label="Payday / Allowance Arrival"
                description="Positive reminder on your cutoff day to budget your funds"
                checked={preferences.payday_alerts}
                onChange={() => handleToggle("payday_alerts")}
                disabled={!preferences.master_enabled}
              />
              <ToggleRow
                label="Evening Check-in Nudge"
                description="Gentle reminder only if no transactions were logged today"
                checked={preferences.checkin_nudges}
                onChange={() => handleToggle("checkin_nudges")}
                disabled={!preferences.master_enabled}
              />
              <ToggleRow
                label="Weekly Financial Digest"
                description="Sunday evening summary of savings and spending"
                checked={preferences.weekly_digest_push}
                onChange={() => handleToggle("weekly_digest_push")}
                disabled={!preferences.master_enabled}
              />
            </div>
          </div>

          {/* Section 5: Quiet Hours */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <Moon className="h-3.5 w-3.5" /> Quiet Hours (No Disturb)
            </h3>
            <div className="rounded-3xl border border-border/70 bg-card p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-foreground">Do Not Disturb Window</p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Non-critical notifications are suppressed during these hours
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-extrabold text-foreground bg-secondary px-3 py-1.5 rounded-xl">
                <span>10:00 PM – 7:00 AM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 bg-card px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-border bg-secondary px-5 py-2.5 text-xs font-bold text-foreground hover:bg-secondary/80"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-2xl bg-[#3D784E] px-6 py-2.5 text-xs font-extrabold text-white shadow-sm shadow-[#3D784E]/30 hover:bg-[#356B46] disabled:opacity-50 transition-all"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <div
      onClick={() => !disabled && onChange()}
      className={cn(
        "flex items-center justify-between p-4 cursor-pointer transition-colors select-none",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-secondary/30 active:bg-secondary/60"
      )}
    >
      <div className="space-y-0.5 pr-4">
        <p className="text-xs font-extrabold text-foreground">{label}</p>
        <p className="text-[10px] font-medium text-muted-foreground leading-tight">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) onChange()
        }}
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
          checked && !disabled ? "bg-[#3D784E]" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
            checked && !disabled ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  )
}
