"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("App error:", error)
    // If it's a chunk loading error caused by a new deployment, auto-reload once
    if (
      error.message?.includes("Loading chunk") ||
      error.message?.includes("ChunkLoadError") ||
      error.message?.includes("failed to fetch")
    ) {
      const hasReloaded = sessionStorage.getItem("pawi_chunk_reloaded")
      if (!hasReloaded) {
        sessionStorage.setItem("pawi_chunk_reloaded", "1")
        window.location.reload()
      }
    }
  }, [error])

  const handleHardReset = () => {
    sessionStorage.removeItem("pawi_chunk_reloaded")
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name))
      })
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister())
      })
    }
    window.location.href = "/"
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#3D784E]/15 text-[#3D784E] shadow-lg shadow-[#3D784E]/20">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <h1 className="text-xl font-black text-foreground">Something went wrong</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground max-w-xs">
        {error.message || "A temporary loading issue occurred while loading Pawi."}
      </p>

      <div className="mt-6 flex flex-col gap-2.5 w-full max-w-xs">
        <button
          type="button"
          onClick={() => reset()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#3D784E] text-xs font-bold text-white shadow-md shadow-[#3D784E]/20 hover:bg-[#356B46] active:scale-95 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>

        <button
          type="button"
          onClick={handleHardReset}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border/80 bg-secondary/50 text-xs font-bold text-foreground hover:bg-secondary active:scale-95 transition-all"
        >
          <Home className="h-4 w-4" />
          Reload & Clear Cache
        </button>
      </div>
    </div>
  )
}
