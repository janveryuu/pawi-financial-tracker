"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  Camera,
  ScanLine,
  Sparkles,
  X,
  Loader2,
  AlertCircle,
  Check,
  Mic,
  Tag,
  Wallet as WalletIcon,
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth-context"
import { formatMoney } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"
import { hasConsecutiveSpam, sanitizeSpam, MAX_LENGTH } from "@/lib/anti-spam"

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

/**
 * Parses EMVCo standard Philippine QR Ph payloads if detected by camera.
 */
function parseEmvCoQr(qr: string) {
  if (!qr.startsWith("000201")) return null
  let merchant = ""
  let amount = 0
  let i = 0
  while (i < qr.length - 4) {
    const tag = qr.substring(i, i + 2)
    const len = parseInt(qr.substring(i + 2, i + 4), 10)
    if (isNaN(len) || i + 4 + len > qr.length) break
    const val = qr.substring(i + 4, i + 4 + len)
    if (tag === "59") merchant = val
    else if (tag === "54") amount = parseFloat(val) || 0
    i += 4 + len
  }
  return { merchant, amount }
}

export function QuickLogModal({ open, onClose }: QuickLogModalProps) {
  const [mounted, setMounted] = useState(false)
  const [value, setValue] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [lowFields, setLowFields] = useState<string[]>([])
  const [scannedReceiptUrl, setScannedReceiptUrl] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Live Camera Viewfinder state
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const { addTransaction, budgets = [], lastInsertError, clearInsertError } = useStore()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Anti-spam checks
  const isSpam = useMemo(() => hasConsecutiveSpam(value), [value])

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
      const matchingBudget = budgets.find((b) => {
        const bLower = b.category.toLowerCase()
        return lowerValue.includes(bLower) || bLower.includes(lowerValue)
      })

      if (matchingBudget) {
        category = matchingBudget.category
      } else if (
        lowerValue.includes("netflix") ||
        lowerValue.includes("spotify") ||
        lowerValue.includes("game") ||
        lowerValue.includes("movie") ||
        lowerValue.includes("steam")
      ) {
        category = "Entertainment"
      } else if (
        lowerValue.includes("starbucks") ||
        lowerValue.includes("coffee") ||
        lowerValue.includes("cafe") ||
        lowerValue.includes("milk tea") ||
        lowerValue.includes("boba")
      ) {
        category = "Coffee & Snacks"
      } else if (
        lowerValue.includes("foodpanda") ||
        lowerValue.includes("grabfood") ||
        lowerValue.includes("jollibee") ||
        lowerValue.includes("mcdo") ||
        lowerValue.includes("mcdonald") ||
        lowerValue.includes("lunch") ||
        lowerValue.includes("food") ||
        lowerValue.includes("dinner") ||
        lowerValue.includes("breakfast")
      ) {
        category = "Food & Dining"
      } else if (
        lowerValue.includes("groceries") ||
        lowerValue.includes("supermarket") ||
        lowerValue.includes("sm") ||
        lowerValue.includes("puregold")
      ) {
        category = "Groceries"
      } else if (
        lowerValue.includes("ride") ||
        lowerValue.includes("grab") ||
        lowerValue.includes("taxi") ||
        lowerValue.includes("transport") ||
        lowerValue.includes("gas") ||
        lowerValue.includes("angkas")
      ) {
        category = "Transport"
      } else if (
        lowerValue.includes("shopping") ||
        lowerValue.includes("uniqlo") ||
        lowerValue.includes("zara") ||
        lowerValue.includes("shopee") ||
        lowerValue.includes("lazada")
      ) {
        category = "Shopping"
      } else if (
        lowerValue.includes("meralco") ||
        lowerValue.includes("maynilad") ||
        lowerValue.includes("globe") ||
        lowerValue.includes("converge") ||
        lowerValue.includes("pldt") ||
        lowerValue.includes("wifi")
      ) {
        category = "Utilities & Bills"
      }
    }

    return {
      amount: amount || 0,
      isIncome,
      account,
      category,
    }
  }, [value, budgets])

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
    } catch (err: any) {
      console.warn("Camera access error:", err)
      setCameraError("Camera access denied or unavailable. Please grant permission or upload an image file.")
    }
  }, [])

  // Handle detected QR Code payload
  const handleQrDetected = useCallback((qrText: string) => {
    setScanError(null)
    const emv = parseEmvCoQr(qrText)
    if (emv && (emv.merchant || emv.amount > 0)) {
      if (emv.amount > 0 && emv.merchant) {
        setValue(`Spent ${emv.amount} at ${emv.merchant} (QR Ph)`)
      } else if (emv.merchant) {
        setValue(`Spent at ${emv.merchant} (QR Ph)`)
      } else {
        setValue(`Spent ${emv.amount} (QR Ph)`)
      }
    } else {
      setValue(`Paid via QR: ${qrText.slice(0, 40)}`)
    }
    setShowCamera(false)
    stopCamera()
  }, [stopCamera])

  // BarcodeDetector loop when camera is open
  useEffect(() => {
    if (!showCamera) {
      stopCamera()
      return
    }

    startCamera()
    let active = true
    let detector: any = null

    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] })
      } catch (err) {
        console.warn("BarcodeDetector not available:", err)
      }
    }

    const intervalId = setInterval(async () => {
      if (!active || !detector || !videoRef.current || videoRef.current.readyState < 2) return
      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          active = false
          handleQrDetected(barcodes[0].rawValue)
        }
      } catch (err) {
        // Frame analysis error, continue scanning
      }
    }, 300)

    return () => {
      active = false
      clearInterval(intervalId)
      stopCamera()
    }
  }, [showCamera, startCamera, stopCamera, handleQrDetected])

  // Process Receipt Image (from file picker or camera snapshot)
  const processReceiptImage = async (fileOrBlob: Blob, filename: string = "receipt.jpg") => {
    setIsScanning(true)
    setScanError(null)
    setLowFields([])

    try {
      const formData = new FormData()
      formData.append("image", fileOrBlob, filename)
      formData.append("userId", user?.id || (user as any)?.uid || "anonymous")

      const res = await fetch("/api/receipt-scan", {
        method: "POST",
        body: formData,
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Strict error rejection without corrupting transaction history with dummy data
        setScanError(
          data.error || "No valid QR code or receipt detected. Please scan a clear payment slip or QR code."
        )
        return
      }

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
      setScanError(null)
    } catch (err) {
      console.error("Gemini OCR scan error:", err)
      setScanError("No valid QR code or receipt detected. Please scan a clear payment slip or QR code.")
    } finally {
      setIsScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Camera Frame Snapshot & AI OCR
  const handleCaptureSnapshot = async () => {
    if (!videoRef.current) return
    setIsScanning(true)
    setScanError(null)

    try {
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth || 640
      canvas.height = videoRef.current.videoHeight || 480
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(async (blob) => {
          if (blob) {
            setShowCamera(false)
            stopCamera()
            await processReceiptImage(blob, "camera-snapshot.jpg")
          }
        }, "image/jpeg", 0.9)
      }
    } catch (err) {
      setScanError("Failed to capture snapshot from camera. Please try again.")
      setIsScanning(false)
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processReceiptImage(file, file.name)
  }

  const handleLog = async () => {
    if (!value.trim() || !parsedData || isSpam || parsedData.amount <= 0) return
    setIsSaving(true)
    clearInsertError()

    await addTransaction({
      label: value.trim().slice(0, MAX_LENGTH.DESCRIPTION),
      category: parsedData.category,
      account: parsedData.account,
      amount: parsedData.amount,
      currency: "PHP",
      kind: parsedData.isIncome ? "income" : "expense",
      receipt_url: scannedReceiptUrl || undefined,
    })

    setIsSaving(false)
    setValue("")
    setLowFields([])
    setScanError(null)
    setScannedReceiptUrl(null)
    setShowCamera(false)
    stopCamera()
    onClose()
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
      setScanError(null)
      setValue(sanitizeSpam(transcript, MAX_LENGTH.DESCRIPTION))
    }

    recognition.start()
  }

  // Keyboard shortcut ESC and body overflow
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCamera) {
          setShowCamera(false)
          stopCamera()
        } else {
          onClose()
        }
      }
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
      stopCamera()
    }
  }, [open, showCamera, onClose, stopCamera])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        type="button"
        aria-label="Close"
        onClick={() => {
          setShowCamera(false)
          stopCamera()
          onClose()
        }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-default"
      />

      {/* Modal Dialog Content */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md rounded-t-[2.5rem] bg-card p-6 text-foreground shadow-2xl sm:rounded-[2.5rem] border border-border/80 max-h-[90vh] overflow-y-auto"
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
                Natural language, Live Camera QR & AI OCR
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              setShowCamera(false)
              stopCamera()
              onClose()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Camera Viewfinder Overlay */}
        <AnimatePresence>
          {showCamera && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden rounded-3xl border border-[#3D784E]/40 bg-black shadow-inner"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="h-full w-full object-cover"
                />

                {/* Scanning reticle and laser line */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
                  <div className="relative h-44 w-44 rounded-2xl border-2 border-[#3D784E]/80 shadow-[0_0_15px_rgba(61,120,78,0.5)]">
                    <div className="absolute inset-x-2 top-0 h-0.5 bg-[#4ADE80] animate-bounce shadow-[0_0_8px_#4ADE80]" />
                  </div>
                  <span className="mt-2 rounded-full bg-black/75 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-xs">
                    Align QR Code or Receipt in Viewfinder
                  </span>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-4 text-center">
                    <p className="text-xs font-semibold text-rose-400">{cameraError}</p>
                  </div>
                )}
              </div>

              {/* Viewfinder Controls */}
              <div className="flex items-center justify-between bg-zinc-900 px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCamera(false)
                    stopCamera()
                  }}
                  className="rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 rounded-xl bg-[#3D784E] px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-[#356B46] disabled:opacity-50"
                >
                  {isScanning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <span>{isScanning ? "Analyzing..." : "Snap Receipt (AI OCR)"}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area with Live Parser Badge */}
        <div className="relative rounded-2xl border border-border/80 bg-secondary/30 focus-within:border-[#3D784E] focus-within:bg-card focus-within:ring-4 focus-within:ring-[#3D784E]/10 transition-all">
          <textarea
            id="quick-log-input"
            value={value}
            maxLength={MAX_LENGTH.DESCRIPTION}
            onChange={(e) => {
              setScanError(null)
              setValue(sanitizeSpam(e.target.value, MAX_LENGTH.DESCRIPTION))
            }}
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

        {/* Character repetition spam notice */}
        {isSpam && (
          <p className="mt-1 text-xs font-semibold text-rose-500">
            Please avoid excessively repeated characters.
          </p>
        )}

        {/* Strict Verification Error Banner */}
        {scanError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{scanError}</span>
          </div>
        )}

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
              onClick={() => {
                setScanError(null)
                setValue(item.text)
              }}
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

        {/* Insert Error Banner — shown when Supabase insert fails */}
        {lastInsertError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{lastInsertError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:gap-2.5">
          {/* File Upload Hidden Input */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileInputChange}
          />

          {/* Realtime Camera / QR Viewfinder Button */}
          <button
            type="button"
            onClick={() => {
              setScanError(null)
              setShowCamera((prev) => !prev)
            }}
            disabled={isScanning || isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#3D784E]/40 bg-[#3D784E]/10 py-3 text-xs font-black text-[#2E683E] dark:text-[#4ADE80] shadow-xs transition-all hover:bg-[#3D784E]/20 active:scale-[0.98] disabled:opacity-50"
          >
            <Camera className="h-4 w-4 text-[#3D784E]" />
            <span>{showCamera ? "Close Camera" : "Live Camera & QR"}</span>
          </button>

          {/* Upload Receipt (AI OCR) Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning || isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card py-3 text-xs font-black text-foreground shadow-xs transition-all hover:bg-secondary active:scale-[0.98] disabled:opacity-50"
          >
            {isScanning ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#3D784E]" />
            ) : (
              <Upload className="h-4 w-4 text-[#3D784E]" />
            )}
            <span>{isScanning ? "Scanning..." : "Upload Receipt"}</span>
          </button>

          {/* Log Transaction Button */}
          <button
            type="button"
            onClick={handleLog}
            disabled={!value.trim() || isScanning || isSaving || isSpam || !parsedData || parsedData.amount <= 0}
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
    </div>,
    document.body
  )
}
