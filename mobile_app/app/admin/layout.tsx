"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  ArrowLeft,
  Sun,
  Moon,
  Lock,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import { AUTHORIZED_ADMIN_EMAIL } from "@/lib/admin-auth"
import { cn } from "@/lib/utils"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading, session } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [isVerifying, setIsVerifying] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return

    if (!user) {
      setIsVerifying(false)
      setIsAuthorized(false)
      setAuthError("No active session. Please log in with the administrator account.")
      return
    }

    const email = (user.email || "").toLowerCase().trim()
    if (email !== AUTHORIZED_ADMIN_EMAIL) {
      setIsVerifying(false)
      setIsAuthorized(false)
      setAuthError(`Access Forbidden: Account ${email} is not authorized for Admin Console.`)
      return
    }

    setIsAuthorized(true)
    setIsVerifying(false)
    setAuthError(null)
  }, [user, loading])

  const navItems = [
    {
      label: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      label: "User Management",
      href: "/admin/users",
      icon: Users,
      active: pathname.startsWith("/admin/users"),
    },
    {
      label: "Activity Stream",
      href: "/admin/activity",
      icon: Activity,
      active: pathname.startsWith("/admin/activity"),
    },
    {
      label: "Platform Settings",
      href: "/admin/settings",
      icon: Settings,
      active: pathname.startsWith("/admin/settings"),
    },
  ]

  if (loading || isVerifying) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-[#3D784E]/15 text-[#3D784E] shadow-lg animate-pulse">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Verifying Administrative Privileges</h2>
            <p className="text-xs text-muted-foreground mt-1">Securing backend connection and credentials...</p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-[#3D784E] mt-2" />
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-6">
        <div className="w-full max-w-md rounded-[2.5rem] border border-rose-500/30 bg-card p-8 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <span className="rounded-full bg-rose-500/10 px-3 py-1 text-[11px] font-black text-rose-500 uppercase tracking-wider">
              403 Access Denied
            </span>
            <h1 className="text-xl font-black text-foreground mt-3">Restricted Area</h1>
            <p className="text-xs text-muted-foreground font-medium mt-2 leading-relaxed">
              {authError || "This admin console is restricted strictly to the platform administrator."}
            </p>
          </div>

          <div className="rounded-2xl bg-secondary/50 p-3.5 text-[11px] text-muted-foreground text-left flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>Authorized access is logged and verified with multi-layered database security checks.</span>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3D784E] px-4 py-3 text-xs font-black text-white hover:bg-[#356B46] active:scale-[0.98] transition-all shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Pawi App
            </button>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card px-4 py-3 text-xs font-black text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top Command Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/85 backdrop-blur-md px-4 sm:px-8 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Logo & Platform Badge */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-card border border-border/80 p-1 shadow-sm transition-transform group-hover:scale-105 overflow-hidden">
                <Image
                  src="/pawikan-logo.png"
                  alt="Pawi Main Logo"
                  width={34}
                  height={34}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-foreground">Pawi</span>
                  <span className="rounded-md bg-[#3D784E]/15 border border-[#3D784E]/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#3D784E]">
                    Admin
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold">Platform Management Console</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-secondary/60 p-1 rounded-2xl border border-border/60">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all",
                    item.active
                      ? "bg-[#3D784E] text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live DB
            </div>

            {/* Admin Profile Picture Badge */}
            <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-secondary/50 px-2.5 py-1.5 shadow-xs">
              <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white dark:bg-card border border-border/70 overflow-hidden shadow-xs">
                <Image
                  src="/pawikan-logo.png"
                  alt="Admin Profile"
                  width={22}
                  height={22}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[11px] font-black text-foreground leading-tight">
                  {user?.displayName || user?.user_metadata?.name || "Admin"}
                </span>
                <span className="text-[9px] font-semibold text-[#3D784E] leading-none">
                  Super Admin
                </span>
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground hover:bg-secondary transition-colors"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>

            {/* Back to App button */}
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-2xl border border-[#3D784E]/30 bg-[#3D784E]/10 px-3.5 py-2 text-xs font-black text-[#3D784E] hover:bg-[#3D784E]/20 transition-all shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exit to App</span>
            </Link>
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto pt-2 pb-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0",
                  item.active
                    ? "bg-[#3D784E] text-white shadow-xs"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                <Icon className="h-3 w-3" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-8 py-6">
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="border-t border-border/60 bg-card/40 px-4 sm:px-8 py-4 mt-auto text-center text-[11px] text-muted-foreground">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Pawi Administrative Command Console • Single-Account Access (`{AUTHORIZED_ADMIN_EMAIL}`)</span>
          <span className="font-semibold text-foreground/70">Pawi v2.5 Enterprise Engine</span>
        </div>
      </footer>
    </div>
  )
}
