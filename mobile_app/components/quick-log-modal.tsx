"use client"

import { useEffect, useState, useRef } from "react"
import { Lightbulb, ScanLine, Sparkles, X, Loader2, AlertCircle } from "lucide-react"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth-context"

interface QuickLogModalProps {
  open: boolean
  onClose: () => void
}

const examples = [
  "Spent 250 on lunch",
  "Salary 15000 to GCash",
  "Transfer 1000 to Paymaya",
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
      "dividend", "refund", "gift", "cash in", "cashin", "earned", "earn",
    ]
    const isIncome = incomeKeywords.some((kw) => lowerValue.includes(kw))

    // Determine Account
    let account = "Cash"
    if (lowerValue.includes("gcash")) account = "GCash"
    if (lowerValue.includes("paymaya") || lowerValue.includes("maya")) account = "Paymaya"
    if (lowerValue.includes("rcbc") || lowerValue.includes("visa") || lowerValue.includes("card")) account = "RCBC Visa"
    if (lowerValue.includes("bpi")) account = "BPI Savings"
    if (lowerValue.includes("bdo")) account = "BDO Mastercard"

    // Determine Category
    let category = isIncome ? "Income" : "General"
    if (isIncome) {
      if (lowerValue.includes("freelance")) category = "Freelance"
      else if (lowerValue.includes("salary")) category = "Salary"
      else if (lowerValue.includes("allowance")) category = "Allowance"
      else if (lowerValue.includes("bonus")) category = "Bonus"
    } else {
      if (lowerValue.includes("lunch") || lowerValue.includes("food") || lowerValue.includes("dinner") || lowerValue.includes("breakfast") || lowerValue.includes("coffee")) category = "Food & Dining"
      if (lowerValue.includes("groceries") || lowerValue.includes("supermarket")) category = "Groceries"
      if (lowerValue.includes("ride") || lowerValue.includes("grab") || lowerValue.includes("taxi") || lowerValue.includes("transport")) category = "Transport"
      if (lowerValue.includes("netflix") || lowerValue.includes("game") || lowerValue.includes("movie")) category = "Entertainment"
      if (lowerValue.includes("shopping") || lowerValue.includes("uniqlo") || lowerValue.includes("zara")) category = "Shopping"
    }

    addTransaction({
      label: value.trim(),
      category,
      account,
      amount,
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
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Quick Log
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

        <label htmlFor="quick-log-input" className="sr-only">
          Transaction
        </label>
        <textarea
          id="quick-log-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Type a transaction... e.g., 'Spent 250 on lunch'"
          className="w-full resize-none rounded-2xl border border-border bg-secondary/40 p-4 text-sm text-foreground outline-none ring-primary/30 transition placeholder:text-muted-foreground focus:ring-2"
        />

        {lowFields.length > 0 && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Please double check OCR fields: {lowFields.join(", ")}</span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setValue(ex)}
              className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-primary/10 p-3.5">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-pretty text-xs leading-relaxed text-foreground/80">
            <span className="font-semibold text-foreground">Tip. </span>
            Track every expense, no matter how small. Small leaks can sink a great ship.
          </p>
        </div>

        <div className="mt-4 flex gap-3">
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
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {isScanning ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin text-primary" />
            ) : (
              <ScanLine className="h-[18px] w-[18px]" />
            )}
            {isScanning ? "Gemini Scanning..." : "Scan Receipt (AI)"}
          </button>
          <button
            type="button"
            onClick={handleLog}
            disabled={!value.trim() || isScanning}
            className="flex-1 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            Log Transaction
          </button>
        </div>
      </div>
    </div>
  )
}
