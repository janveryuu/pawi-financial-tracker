"use client"

import { useEffect, useState } from "react"
import { Wallet, X } from "lucide-react"
import Image from "next/image"
import { useStore } from "@/lib/store"
import { getWalletBrandLogo } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"

function getWalletMonogram(name: string): string | null {
  const generic = ["cash", "savings", "ewallet", "card", "wallet", "my wallet"]
  if (generic.includes(name.trim().toLowerCase())) return null
  const words = name.trim().split(/\s+/)
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

interface AddWalletModalProps {
  open: boolean
  onClose: () => void
}

const accents = [
  "oklch(0.7 0.13 145)",
  "oklch(0.62 0.18 250)",
  "oklch(0.68 0.16 162)",
  "oklch(0.6 0.2 25)",
  "oklch(0.7 0.15 25)",
]

export function AddWalletModal({ open, onClose }: AddWalletModalProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState<"cash" | "ewallet" | "card" | "savings">("cash")
  const [currency, setCurrency] = useState<"PHP" | "USD">("PHP")
  const [balance, setBalance] = useState("")
  
  const { addWallet } = useStore()

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setName("")
      setType("cash")
      setCurrency("PHP")
      setBalance("")
    }
  }, [open])

  const handleAdd = () => {
    if (!name.trim()) return

    addWallet({
      name,
      subtitle: `${type.charAt(0).toUpperCase() + type.slice(1)} · ${currency}`,
      balance: Number(balance) || 0,
      currency,
      type,
      accent: accents[Math.floor(Math.random() * accents.length)],
    })

    onClose()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Wallet className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              New Wallet
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Wallet Name</label>
              {name.trim() && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Icon preview:</span>
                  <div
                    className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-md text-[10px] font-black text-white"
                    style={{ backgroundColor: getWalletBrandLogo(name) ? "transparent" : accent }}
                  >
                    {getWalletBrandLogo(name) ? (
                      <Image src={getWalletBrandLogo(name)!} alt={name} fill className="object-contain" />
                    ) : getWalletMonogram(name) ? (
                      <span>{getWalletMonogram(name)}</span>
                    ) : (
                      <Wallet className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
              )}
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., BDO Savings, Maya"
              className="flex h-12 w-full rounded-xl border border-border/60 bg-secondary/40 px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="flex h-12 w-full rounded-xl border border-border/60 bg-secondary/40 px-4 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <option value="cash">Cash</option>
                <option value="ewallet">E-Wallet</option>
                <option value="card">Card</option>
                <option value="savings">Savings</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="flex h-12 w-full rounded-xl border border-border/60 bg-secondary/40 px-4 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <option value="PHP">PHP (₱)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Initial Balance</label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              className="flex h-12 w-full rounded-xl border border-border/60 bg-secondary/40 px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim()}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            Save Wallet
          </button>
        </div>
      </div>
    </div>
  )
}
