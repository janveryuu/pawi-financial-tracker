"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global app error:", error)
    // Auto-recover once from chunk loading or stale PWA cache errors
    if (
      error.message?.includes("Loading chunk") ||
      error.message?.includes("ChunkLoadError") ||
      error.message?.includes("failed to fetch") ||
      error.message?.includes("getBrandLogo")
    ) {
      const hasReloaded = sessionStorage.getItem("pawi_global_chunk_reloaded")
      if (!hasReloaded) {
        sessionStorage.setItem("pawi_global_chunk_reloaded", "1")
        if ("caches" in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name))
          })
        }
        window.location.reload()
      }
    }
  }, [error])

  const handleHardReset = () => {
    sessionStorage.removeItem("pawi_global_chunk_reloaded")
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
    <html lang="en">
      <body className="font-sans antialiased bg-[#0D1F13] text-white">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#3D784E]/25 text-[#4ADE80] shadow-lg shadow-[#3D784E]/20">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <h1 className="text-xl font-bold text-white">Something went wrong</h1>
          <p className="mt-2 text-xs leading-relaxed text-gray-300 max-w-xs">
            {error.message || "A temporary loading issue occurred while loading Pawi."}
          </p>

          <div className="mt-6 flex flex-col gap-2.5 w-full max-w-xs">
            <button
              type="button"
              onClick={() => reset()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#3D784E] text-xs font-bold text-white shadow-md shadow-[#3D784E]/20 hover:bg-[#356B46] active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>

            <button
              type="button"
              onClick={handleHardReset}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 text-xs font-bold text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
            >
              <Home className="h-4 w-4" />
              Reload & Clear Cache
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
