"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Wallet, X, Plus, CreditCard, Banknote, Smartphone, Landmark, ShieldCheck, Check, AlertCircle } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/lib/store"
import { getWalletBrandLogo } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"
import {
  hasConsecutiveSpam,
  sanitizeSpam,
  sanitizeNumericInput,
  MAX_LENGTH,
} from "@/lib/anti-spam"

interface AddWalletModalProps {
  open: boolean
  onClose: () => void
}

const PRESET_BANKS = [
  { name: "Cash", type: "cash", group: "cash", icon: "cash", color: "#2E683E" },
  { name: "GCash", type: "ewallet", group: "ewallet", icon: "gcash", color: "#007DFE" },
  { name: "Maya", type: "ewallet", group: "ewallet", icon: "paymaya", color: "#059652" },
  { name: "BDO", type: "savings", group: "bank", icon: "bdo", color: "#003882" },
  { name: "BPI", type: "savings", group: "bank", icon: "bpi", color: "#C8102E" },
  { name: "RCBC", type: "savings", group: "bank", icon: "rcbc", color: "#0055B8" },
  { name: "UnionBank", type: "savings", group: "bank", icon: "unionbank", color: "#EA580C" },
  { name: "GoTyme", type: "savings", group: "bank", icon: "gotyme", color: "#5A31F4" },
  { name: "Wise", type: "savings", group: "bank", icon: "wise", color: "#143C3C" },
  { name: "SeaBank", type: "savings", group: "bank", icon: "seabank", color: "#E64A19" },
  { name: "Credit Card", type: "card", group: "credit", icon: "card", color: "#4338CA", isLiability: true },
  { name: "Loan", type: "loan", group: "loan", icon: "card", color: "#334155", isLiability: true },
]

export function AddWalletModal({ open, onClose }: AddWalletModalProps) {
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<"cash" | "ewallet" | "card" | "savings">("cash")
  const [group, setGroup] = useState<"cash" | "ewallet" | "bank" | "credit" | "loan">("cash")
  const [currency, setCurrency] = useState<"PHP" | "USD">("PHP")
  const [balance, setBalance] = useState("")
  const [isLiability, setIsLiability] = useState(false)
  const [color, setColor] = useState("#3D784E")
  const [creditLimit, setCreditLimit] = useState("")
  const [dueDay, setDueDay] = useState("15")

  const { addWallet } = useStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setName("")
      setType("cash")
      setGroup("cash")
      setCurrency("PHP")
      setBalance("")
      setIsLiability(false)
      setColor("#3D784E")
      setCreditLimit("")
      setDueDay("15")
    }
  }, [open])

  const handleSelectPreset = (preset: (typeof PRESET_BANKS)[0]) => {
    setName(preset.name)
    setType(preset.type as any)
    setGroup(preset.group as any)
    setColor(preset.color)
    if (preset.isLiability) {
      setIsLiability(true)
    } else {
      setIsLiability(false)
    }
  }

  const isNameSpam = hasConsecutiveSpam(name)
  const isNameValid = name.trim().length > 0 && !isNameSpam

  const handleAdd = () => {
    if (!isNameValid) return

    const parsedBalance = parseFloat(balance) || 0
    const parsedCreditLimit = parseFloat(creditLimit) || 0

    addWallet({
      name: name.trim().slice(0, MAX_LENGTH.NAME),
      subtitle: `${type.charAt(0).toUpperCase() + type.slice(1)} · ${currency}`,
      balance: parsedBalance,
      currency,
      type,
      group,
      accent: color,
      isLiability,
      creditLimit: isLiability ? parsedCreditLimit : undefined,
      usedCredit: isLiability ? parsedBalance : undefined,
      dueDay: isLiability ? parseInt(dueDay) || 15 : undefined,
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

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md rounded-t-[2.5rem] bg-card p-6 text-foreground shadow-2xl sm:rounded-[2.5rem] border border-border/80 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground">
                Add New Account
              </h2>
              <p className="text-xs font-semibold text-muted-foreground">
                Set up a bank, e-wallet, cash, or credit card
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Presets Carousel */}
        <div className="mb-4">
          <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
            Quick Select Brand / Institution
          </label>
          <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {PRESET_BANKS.map((preset) => {
              const brandLogo = getWalletBrandLogo(preset.name)
              const isSelected = name.toLowerCase() === preset.name.toLowerCase()
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold transition-all",
                    isSelected
                      ? "border-[#3D784E] bg-[#3D784E]/10 text-[#3D784E] shadow-xs"
                      : "border-border/80 bg-secondary/40 text-foreground hover:bg-secondary"
                  )}
                >
                  <div
                    className="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-md text-[9px] font-black text-white"
                    style={{ backgroundColor: preset.color }}
                  >
                    {brandLogo ? (
                      <Image src={brandLogo} alt={preset.name} fill className="object-contain" />
                    ) : (
                      <span>{preset.name.slice(0, 2)}</span>
                    )}
                  </div>
                  <span>{preset.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Account Classification Toggle: Asset vs Liability */}
        <div className="mb-4">
          <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
            Account Classification
          </label>
          <div className="mt-1.5 flex rounded-2xl bg-secondary/70 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => {
                setIsLiability(false)
                if (group === "credit" || group === "loan") setGroup("cash")
              }}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-black transition-all",
                !isLiability
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              💰 Asset (Cash, Bank, Savings)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLiability(true)
                setType("card")
                setGroup("credit")
              }}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-black transition-all",
                isLiability
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 shadow-xs border border-rose-500/30 font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              💳 Liability (Credit Card, Loan)
            </button>
          </div>
        </div>

        <div className="space-y-3.5">
          {/* Account Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
              Account Name
            </label>
            <input
              type="text"
              value={name}
              maxLength={MAX_LENGTH.NAME}
              onChange={(e) => setName(sanitizeSpam(e.target.value, MAX_LENGTH.NAME))}
              placeholder="e.g. BDO Savings, Maya Wallet, GCash"
              required
              className="h-12 w-full rounded-2xl border border-border/80 bg-secondary/30 px-4 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-[#3D784E] focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#3D784E]/15 transition-all"
            />
            {isNameSpam && (
              <p className="text-xs font-semibold text-rose-500">
                Please avoid excessively repeated characters.
              </p>
            )}
          </div>

          {/* Type & Currency Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const newType = e.target.value as any
                  setType(newType)
                  if (newType === "card") {
                    setGroup("credit")
                  } else if (newType === "savings") {
                    setGroup("bank")
                  } else if (newType === "ewallet") {
                    setGroup("ewallet")
                  } else {
                    setGroup("cash")
                  }
                }}
                className="h-12 w-full rounded-2xl border border-border/80 bg-secondary/30 px-3 text-sm font-semibold text-foreground focus:border-[#3D784E] focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#3D784E]/15 transition-all"
              >
                <option value="cash">Cash</option>
                <option value="ewallet">E-Wallet</option>
                <option value="savings">Bank Account</option>
                <option value="card">Credit Card</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="h-12 w-full rounded-2xl border border-border/80 bg-secondary/30 px-3 text-sm font-semibold text-foreground focus:border-[#3D784E] focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#3D784E]/15 transition-all"
              >
                <option value="PHP">₱ PHP (Philippine Peso)</option>
                <option value="USD">$ USD (US Dollar)</option>
              </select>
            </div>
          </div>

          {/* Initial Balance */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
              {isLiability ? "Current Amount Owed / Used Credit" : "Current Balance"}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-sm font-black text-muted-foreground">
                {currency === "USD" ? "$" : "₱"}
              </span>
              <input
                type="number"
                step="any"
                value={balance}
                maxLength={MAX_LENGTH.AMOUNT_DIGITS}
                onChange={(e) => setBalance(sanitizeNumericInput(e.target.value, MAX_LENGTH.AMOUNT_DIGITS))}
                placeholder="0.00"
                className="h-12 w-full rounded-2xl border border-border/80 bg-secondary/30 pl-9 pr-4 text-base font-black text-foreground placeholder:text-muted-foreground/60 focus:border-[#3D784E] focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#3D784E]/15 transition-all"
              />
            </div>
          </div>

          {/* Liability Specific Fields (Credit Limit & Due Day) */}
          {isLiability && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
                  Credit Limit
                </label>
                <input
                  type="number"
                  value={creditLimit}
                  maxLength={MAX_LENGTH.AMOUNT_DIGITS}
                  onChange={(e) => setCreditLimit(sanitizeNumericInput(e.target.value, MAX_LENGTH.AMOUNT_DIGITS))}
                  placeholder="50000"
                  className="h-12 w-full rounded-2xl border border-border/80 bg-secondary/30 px-3 text-sm font-semibold text-foreground focus:border-[#3D784E] focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#3D784E]/15 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
                  Monthly Due Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="15"
                  className="h-12 w-full rounded-2xl border border-border/80 bg-secondary/30 px-3 text-sm font-semibold text-foreground focus:border-[#3D784E] focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#3D784E]/15 transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-border/80 bg-card py-3 text-xs font-black text-foreground transition-colors hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!isNameValid}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-[#3D784E] py-3 text-xs font-black text-white shadow-md shadow-[#3D784E]/20 transition-all hover:bg-[#356B46] active:scale-[0.98] disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>Save Account</span>
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
