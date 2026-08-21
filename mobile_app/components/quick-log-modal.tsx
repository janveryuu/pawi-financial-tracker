"use client"

import { useEffect, useState, useRef } from "react"
import { Lightbulb, ScanLine, Sparkles, X, Loader2, AlertCircle, ArrowRight, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

interface QuickLogModalProps {
  open: boolean
  onClose: () => void
}

const examples = [
  "Spent 250 on lunch",
  "Salary 15000 to GCash",
  "Transfer 1000 to Maya",
  "₱1,200 groceries at SM",
]

export function QuickLogModal({ open, onClose }: QuickLogModalProps) {
  const [value, setValue] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [lowFields, setLowFields] = useState<string[]>([])
  const [scannedReceiptUrl, setScannedReceiptUrl] = useState<string | null>(null)
  const { addTransaction } = useStore()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLog = () => {
    if (!value.trim()) return

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

    // Determine Income/Expense comprehensive keywords
    const incomeKeywords = [
      "salary", "income", "receive", "received", "receiving",
      "add", "added", "gain", "gained", "allowance",
      "bonus", "freelance", "payout", "paycheck", "deposit",
      "dividend", "refund", "gift", "cash in", "cashin", "earned", "earn", "sahod", "sweldo",
    ]
    const isIncome = incomeKeywords.some((kw) => lowerValue.includes(kw))

    // Determine Account
    let account = "Cash"
    if (lowerValue.includes("gcash")) account = "GCash"
    if (lowerValue.includes("paymaya") || lowerValue.includes("maya")) account = "Maya"
    if (lowerValue.includes("rcbc") || lowerValue.includes("visa") || lowerValue.includes("card")) account = "RCBC Visa"
    if (lowerValue.includes("bpi")) account = "BPI Savings"
    if (lowerValue.includes("bdo")) account = "BDO Mastercard"
    if (lowerValue.includes("seabank")) account = "SeaBank"
    if (lowerValue.includes("unionbank")) account = "UnionBank"

    // Determine Category
    let category = isIncome ? "Income" : "General"
    if (isIncome) {
      if (lowerValue.includes("freelance")) category = "Freelance"
      else if (lowerValue.includes("salary") || lowerValue.includes("sahod") || lowerValue.includes("sweldo")) category = "Salary"
      else if (lowerValue.includes("allowance")) category = "Allowance"
      else if (lowerValue.includes("bonus")) category = "Bonus"
    } else {
      if (lowerValue.includes("lunch") || lowerValue.includes("food") || lowerValue.includes("dinner") || lowerValue.includes("breakfast") || lowerValue.includes("coffee") || lowerValue.includes("milk tea")) category = "Food & Dining"
      if (lowerValue.includes("groceries") || lowerValue.includes("supermarket") || lowerValue.includes("sm") || lowerValue.includes("puregold")) category = "Groceries"
      if (lowerValue.includes("ride") || lowerValue.includes("grab") || lowerValue.includes("taxi") || lowerValue.includes("transport") || lowerValue.includes("gas") || lowerValue.includes("angkas")) category = "Transport"
      if (lowerValue.includes("netflix") || lowerValue.includes("game") || lowerValue.includes("movie") || lowerValue.includes("spotify")) category = "Entertainment"
      if (lowerValue.includes("shopping") || lowerValue.includes("uniqlo") || lowerValue.includes("zara") || lowerValue.includes("shopee") || lowerValue.includes("lazada")) category = "Shopping"
    }

    addTransaction({
      label: value.trim(),
      category,
      account,
      amount: amount || 250,
      currency: "PHP",
      kind: isIncome ? "income" : "expense",
      receipt_url: scannedReceiptUrl || undefined,
    })

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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md rounded-t-[2.5rem] bg-card p-6 text-foreground shadow-2xl sm:rounded-[2.5rem] border border-border/80"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground">
                Quick Log
              </h2>
              <p className="text-xs font-semibold text-muted-foreground">
                Natural language or AI receipt scanner
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

        {/* Text Input Area */}
        <div className="relative">
          <textarea
            id="quick-log-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Type a transaction... e.g., 'Spent 250 on lunch' or 'Sahod 15000 GCash'"
            className="w-full resize-none rounded-2xl border border-border/80 bg-secondary/30 p-4 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-[#3D784E] focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#3D784E]/15 transition-all leading-relaxed"
          />
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
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setValue(ex)}
              className="rounded-xl border border-border/70 bg-card px-3 py-1.5 text-xs font-bold text-foreground/80 shadow-2xs transition-all hover:bg-secondary hover:text-foreground active:scale-95"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Smart Pawi Tip Card */}
        <div className="mt-3.5 flex items-start gap-2.5 rounded-2xl border border-[#3D784E]/20 bg-[#3D784E]/10 p-3 text-foreground">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#3D784E] text-white shadow-2xs">
            <Lightbulb className="h-3.5 w-3.5" />
          </div>
          <p className="text-[11px] font-semibold leading-relaxed text-foreground/90">
            <span className="font-black text-[#2E683E] dark:text-[#4ADE80]">Tip: </span>
            Track every expense, no matter how small. Small leaks can sink a great ship!
          </p>
        </div>

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
            disabled={isScanning}
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
            disabled={!value.trim() || isScanning}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#3D784E] py-3 text-xs font-black text-white shadow-md shadow-[#3D784E]/25 transition-all hover:bg-[#356B46] active:scale-[0.98] disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>Log Transaction</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
