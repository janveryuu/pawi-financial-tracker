"use client"

import React, { useEffect, useState, useCallback } from "react"
import {
  Settings,
  Shield,
  Zap,
  Bell,
  AlertTriangle,
  Sparkles,
  Save,
  CheckCircle2,
  RefreshCw,
  Megaphone,
  Lock,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

export default function AdminSettingsPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Settings state
  const [settings, setSettings] = useState({
    budget_alert_threshold: 80,
    enable_ai_receipt_parser: true,
    weekly_digest_email: true,
    require_2fa: false,
    auto_sync_exchange: true,
    maintenance_mode: false,
    announcement_banner: "",
    announcement_active: false,
  })

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const token = session?.access_token
      const res = await fetch("/api/admin/settings", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const data = await res.json()
      if (data.success && data.data) {
        setSettings({
          budget_alert_threshold: data.data.budget_alert_threshold ?? 80,
          enable_ai_receipt_parser: data.data.enable_ai_receipt_parser ?? true,
          weekly_digest_email: data.data.weekly_digest_email ?? true,
          require_2fa: data.data.require_2fa ?? false,
          auto_sync_exchange: data.data.auto_sync_exchange ?? true,
          maintenance_mode: data.data.maintenance_mode ?? false,
          announcement_banner: data.data.announcement_banner || "",
          announcement_active: data.data.announcement_active ?? false,
        })
      }
    } catch (err: any) {
      console.error("Fetch settings error:", err)
      setFeedback({ type: "error", text: err.message })
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      const token = session?.access_token
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(settings),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to save settings")

      setFeedback({ type: "success", text: "Platform settings successfully updated and persisted to database." })
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground">
        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#3D784E] mb-2" />
        Loading platform configurations...
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Platform Settings & Controls
          </h1>
          <span className="rounded-full bg-[#3D784E]/10 border border-[#3D784E]/20 px-2.5 py-0.5 text-[10px] font-black text-[#3D784E]">
            Global Config
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-semibold mt-1">
          Control platform-wide feature flags, AI services, emergency maintenance, and announcement broadcasts.
        </p>
      </div>

      {feedback && (
        <div
          className={cn(
            "rounded-2xl p-4 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200",
            feedback.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-500"
          )}
        >
          <span className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {feedback.text}
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: AI & Feature Flags */}
        <div className="rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
            <Sparkles className="h-5 w-5 text-[#3D784E]" />
            <div>
              <h2 className="text-sm font-black text-foreground">AI Services & Receipt Parsing</h2>
              <p className="text-[11px] text-muted-foreground">Manage automated receipt OCR and smart insights</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-bold text-foreground">Enable AI Receipt OCR Parser</p>
              <p className="text-[11px] text-muted-foreground">Allow users to scan receipts with Google Gemini 2.5 Flash</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enable_ai_receipt_parser}
              onChange={(e) => setSettings({ ...settings, enable_ai_receipt_parser: e.target.checked })}
              className="h-5 w-5 accent-[#3D784E] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border/40">
            <div>
              <p className="text-xs font-bold text-foreground">Auto-Sync Exchange Rates</p>
              <p className="text-[11px] text-muted-foreground">Automatically convert multi-currency balances to PHP/USD daily</p>
            </div>
            <input
              type="checkbox"
              checked={settings.auto_sync_exchange}
              onChange={(e) => setSettings({ ...settings, auto_sync_exchange: e.target.checked })}
              className="h-5 w-5 accent-[#3D784E] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Section 2: Budgeting & Notifications */}
        <div className="rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
            <Bell className="h-5 w-5 text-blue-500" />
            <div>
              <h2 className="text-sm font-black text-foreground">Budgeting & Notifications</h2>
              <p className="text-[11px] text-muted-foreground">Thresholds and automated user digests</p>
            </div>
          </div>

          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Default Monthly Budget Warning Threshold</label>
              <span className="text-xs font-black text-[#3D784E]">{settings.budget_alert_threshold}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={settings.budget_alert_threshold}
              onChange={(e) => setSettings({ ...settings, budget_alert_threshold: parseInt(e.target.value, 10) })}
              className="w-full accent-[#3D784E] cursor-pointer"
            />
            <p className="text-[10px] text-muted-foreground">Users receive warnings when category spend exceeds this percentage.</p>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border/40">
            <div>
              <p className="text-xs font-bold text-foreground">Weekly Digest Email Dispatcher</p>
              <p className="text-[11px] text-muted-foreground">Send weekly financial recap emails to registered users</p>
            </div>
            <input
              type="checkbox"
              checked={settings.weekly_digest_email}
              onChange={(e) => setSettings({ ...settings, weekly_digest_email: e.target.checked })}
              className="h-5 w-5 accent-[#3D784E] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Section 3: Broadcast & Maintenance */}
        <div className="rounded-[2.5rem] border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
            <Megaphone className="h-5 w-5 text-amber-500" />
            <div>
              <h2 className="text-sm font-black text-foreground">Platform Announcements & Emergency Controls</h2>
              <p className="text-[11px] text-muted-foreground">Broadcast alerts or enable maintenance mode</p>
            </div>
          </div>

          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Global Announcement Banner</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="announcementActive"
                  checked={settings.announcement_active}
                  onChange={(e) => setSettings({ ...settings, announcement_active: e.target.checked })}
                  className="h-4 w-4 accent-[#3D784E] rounded cursor-pointer"
                />
                <label htmlFor="announcementActive" className="text-xs font-bold text-foreground cursor-pointer">
                  Display Active
                </label>
              </div>
            </div>
            <input
              type="text"
              value={settings.announcement_banner}
              onChange={(e) => setSettings({ ...settings, announcement_banner: e.target.value })}
              placeholder="e.g. Scheduled system upgrade tonight at 11:00 PM PHT. Pawi will remain accessible."
              className="h-10 w-full rounded-xl border border-border/60 bg-secondary/50 px-3.5 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#3D784E]"
            />
          </div>

          {/* Maintenance Switch */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-rose-500">Emergency Maintenance Mode</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                When active, non-admin users will see a maintenance notice screen while administrative console remains open.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
              className="h-5 w-5 accent-rose-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-[#3D784E] px-6 py-3 text-xs font-black text-white hover:bg-[#356B46] active:scale-95 transition-all shadow-md shadow-[#3D784E]/20"
          >
            <Save className={cn("h-4 w-4", saving && "animate-spin")} />
            <span>{saving ? "Saving Changes..." : "Save Platform Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
