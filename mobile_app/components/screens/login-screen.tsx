"use client"

import Image from "next/image"
import { useStore } from "@/lib/store"
import { Shield } from "lucide-react"

export function LoginScreen() {
  const { login } = useStore()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-8 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-primary/20 -z-10" />
        
        <div className="mb-6 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-card bg-primary shadow-lg">
            <Image 
              src="/pawikan-logo.png" 
              alt="Pawi Logo" 
              width={64} 
              height={64} 
              className="object-contain drop-shadow-md"
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to Pawi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your private, offline-first personal finance tracker. 🐢
        </p>

        <div className="mt-8 space-y-4">
          <button
            onClick={login}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition-transform active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
          
          <button
            onClick={login}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/40 active:scale-95"
          >
            Continue Offline
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Your data stays on your device.</span>
        </div>
      </div>
    </div>
  )
}
