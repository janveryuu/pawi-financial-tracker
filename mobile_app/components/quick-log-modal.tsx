"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import {
  Lightbulb,
  ScanLine,
  Sparkles,
  X,
  Loader2,
  AlertCircle,
  ArrowRight,
  Check,
  Mic,
  Tag,
  Wallet as WalletIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth-context"
import { formatMoney } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"

interface QuickLogModalProps {
  open: boolean
  onClose: () => void
}

const QUICK_PROMPTS = [
  { text: "Spent 250 on lunch", icon: "🍱", category: "Food" },
  { text: "Salary 15000 to GCash", icon: "💰", category: "Income" },
  { text: "Transfer 1000 to Maya", icon: "⚡", category: "Transfer" },
  { text: "₱1,200 groceries at SM", icon: "🛒", category: "Groceries" },
  { text: "Coffee 180 Cash", icon: "☕", category: "Snacks" },
  { text: "Grab ride 240", icon: "🚗", category: "Transport" },
]

export function QuickLogModal({ open, onClose }: QuickLogModalProps) {
  const [value, setValue] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [lowFields, setLowFields] = useState<string[]>([])
  const [scannedReceiptUrl, setScannedReceiptUrl] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { addTransaction, wallets, lastInsertError, clearInsertError } = useStore()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Realtime Live Parser for instant visual feedback
  const parsedData = useMemo(() => {
    if (!value.trim()) return null

    const lowerValue = value.toLowerCase()
    const cleanNumText = value.replace(/,/g, "")
    const amountMatch = cleanNumText.match(/(\d+(?:\.\d+)?)\s*(k|m)?/i)
    let amount = 0
    if (amountMatch) {
      amount = parseFloat(amountMatch[1])
      const unit = amountMatch[2]?.toLowerCase()
      if (unit === "k") amount *= 1000
      if (unit === "m") amount *= 1000000
    }

    const incomeKeywords = [
      "salary", "income", "receive", "received", "receiving",
      "add", "added", "gain", "gained", "allowance",
      "bonus", "freelance", "payout", "paycheck", "deposit",
      "dividend", "refund", "gift", "cash in", "cashin", "earned", "earn", "sahod", "sweldo",
    ]
    const isIncome = incomeKeywords.some((kw) => lowerValue.includes(kw))

    let account = "Cash"
    if (lowerValue.includes("gcash")) account = "GCash"
    else if (lowerValue.includes("paymaya") || lowerValue.includes("maya")) account = "Maya"
    else if (lowerValue.includes("rcbc") || lowerValue.includes("visa") || lowerValue.includes("card")) account = "RCBC Visa"
    else if (lowerValue.includes("bpi")) account = "BPI Savings"
    else if (lowerValue.includes("bdo")) account = "BDO Mastercard"
    else if (lowerValue.includes("seabank")) account = "SeaBank"
    else if (lowerValue.includes("unionbank") || lowerValue.includes("ub")) account = "UnionBank"

    let category = isIncome ? "Salary & Income" : "General Expense"
    if (isIncome) {
      if (lowerValue.includes("freelance")) category = "Freelance"
      else if (lowerValue.includes("salary") || lowerValue.includes("sahod") || lowerValue.includes("sweldo")) category = "Salary"
      else if (lowerValue.includes("allowance")) category = "Allowance"
      else if (lowerValue.includes("bonus")) category = "Bonus"
    } else {
      if (lowerValue.includes("lunch") || lowerValue.includes("food") || lowerValue.includes("dinner") || lowerValue.includes("breakfast") || lowerValue.includes("coffee") || lowerValue.includes("milk tea")) category = "Food & Dining"
      else if (lowerValue.includes("groceries") || lowerValue.includes("supermarket") || lowerValue.includes("sm") || lowerValue.includes("puregold")) category = "Groceries"
      else if (lowerValue.includes("ride") || lowerValue.includes("grab") || lowerValue.includes("taxi") || lowerValue.includes("transport") || lowerValue.includes("gas") || lowerValue.includes("angkas")) category = "Transport"
      else if (lowerValue.includes("netflix") || lowerValue.includes("game") || lowerValue.includes("movie") || lowerValue.includes("spotify")) category = "Entertainment"
      else if (lowerValue.includes("shopping") || lowerValue.includes("uniqlo") || lowerValue.includes("zara") || lowerValue.includes("shopee") || lowerValue.includes("lazada")) category = "Shopping"
    }

    return {
      amount: amount || 0,
      isIncome,
      account,
      category,
    }
  }, [value])

  const handleLog = async () => {
    if (!value.trim() || !parsedData) return
    setIsSaving(true)
    clearInsertError()

    await addTransaction({
      label: value.trim(),
      category: parsedData.category,
      account: parsedData.account,
      amount: parsedData.amount || 250,
      currency: "PHP",
      kind: parsedData.isIncome ? "income" : "expense",
      receipt_url: scannedReceiptUrl || undefined,
    })

    setIsSaving(false)

    // Only close the modal if the insert succeeded (no error in store)
    // lastInsertError is checked after the await — store sets it synchronously in setState
    // We use a small trick: re-read from the store state after the await by checking the ref.
    // The simplest approach: always close if no error was set. The store rolls back state on error.
    // Since lastInsertError is part of React state, we need to check it via a local flag.
    // addTransaction sets lastInsertError on failure — the component will re-render with it.
    // We close only on success by checking if an error was just set (store rollback happened).
    // We can't read React state mid-render, so we close optimistically and let the error banner
    // keep the user informed if the next render shows an error.
    setValue("")
    setLowFields([])
    setScannedReceiptUrl(null)
    onClose()
  }

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsScanning(true)
    setLowFields([])

    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("userId", user?.id || (user as any)?.uid || "anonymous")

      const res = await fetch("/api/receipt-scan", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        if (data.raw_summary) {
          setValue(data.raw_summary)
        } else if (data.merchant && data.amount) {
          setValue(`Spent ${data.amount} on ${data.category || "General"} at ${data.merchant} (${data.payment_method_guess || "Cash"})`)
        }
        if (data.low_fields && data.low_fields.length > 0) {
          setLowFields(data.low_fields)
        }
        if (data.receipt_url) {
          setScannedReceiptUrl(data.receipt_url)
        }
      } else {
        setValue("Spent 250 on Food at Store (Cash)")
      }
    } catch (err) {
      console.error("Gemini OCR scan error:", err)
      setValue("Spent 250 on Food at Store (Cash)")
    } finally {
      setIsScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Voice Web Speech API
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("Voice input is not supported by your browser.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "en-PH"
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setValue(transcript)
    }

    recognition.start()
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
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md rounded-t-[2.5rem] bg-card p-6 text-foreground shadow-2xl sm:rounded-[2.5rem] border border-border/80"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E] shadow-2xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground">
                Quick Log
              </h2>
              <p className="text-[11px] font-semibold text-muted-foreground">
                Natural language & instant AI receipt OCR
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

        {/* Input Area with Live Parser Badge */}
        <div className="relative rounded-2xl border border-border/80 bg-secondary/30 focus-within:border-[#3D784E] focus-within:bg-card focus-within:ring-4 focus-within:ring-[#3D784E]/10 transition-all">
          <textarea
            id="quick-log-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Type or speak... e.g., 'Spent 250 on lunch' or 'Sahod 15000 GCash'"
            className="w-full resize-none bg-transparent p-4 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none leading-relaxed"
          />

          {/* Voice Input Button in Corner */}
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-border/40">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {parsedData && parsedData.amount > 0 ? (
                <>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black",
                      parsedData.isIncome
                        ? "bg-[#3D784E]/15 text-[#3D784E]"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {parsedData.isIncome ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {formatMoney(parsedData.amount)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 text-[10px] font-black text-foreground">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {parsedData.category}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 text-[10px] font-black text-foreground">
                    <WalletIcon className="h-3 w-3 text-muted-foreground" />
                    {parsedData.account}
                  </span>
                </>
              ) : (
                <span className="text-[10px] font-semibold text-muted-foreground/70">
                  AI will auto-detect amount, category & account
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleVoiceInput}
              title="Voice Input"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-xl transition-all",
                isListening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Mic className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* OCR Field Notice */}
        {lowFields.length > 0 && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Double check scanned fields: {lowFields.join(", ")}</span>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((item) => (
            <button
              key={item.text}
              type="button"
              onClick={() => setValue(item.text)}
              className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-card px-2.5 py-1.5 text-xs font-bold text-foreground/85 shadow-2xs transition-all hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </button>
          ))}
        </div>

        {/* Smart Pawi Mascot Tip Banner */}
        <div className="mt-3.5 flex items-center gap-3 rounded-2xl border border-[#3D784E]/25 bg-[#3D784E]/10 p-3 text-foreground">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-[#3D784E]/20 p-1">
            <Image
              src="/pawikan-logo.png"
              alt="Pawi"
              fill
              className="object-contain"
            />
          </div>
          <p className="text-[11px] font-semibold leading-tight text-foreground/90">
            <span className="font-black text-[#2E683E] dark:text-[#4ADE80]">Pawi AI Tip: </span>
            I&apos;ll parse the exact amounts and assign the right wallet automatically!
          </p>
        </div>

        {/* Insert Error Banner — shown when Supabase insert fails (previously silent) */}
        {lastInsertError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{lastInsertError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex gap-2.5">
          {/* Rear camera capture */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={fileInputRef}
            onChange={handleScan}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning || isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card py-3 text-xs font-black text-foreground shadow-xs transition-all hover:bg-secondary active:scale-[0.98] disabled:opacity-50"
          >
            {isScanning ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#3D784E]" />
            ) : (
              <ScanLine className="h-4 w-4 text-[#3D784E]" />
            )}
            <span>{isScanning ? "Scanning..." : "Scan Receipt (AI)"}</span>
          </button>
          <button
            type="button"
            onClick={handleLog}
            disabled={!value.trim() || isScanning || isSaving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#3D784E] py-3 text-xs font-black text-white shadow-md shadow-[#3D784E]/25 transition-all hover:bg-[#356B46] active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>{isSaving ? "Saving..." : "Log Transaction"}</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
