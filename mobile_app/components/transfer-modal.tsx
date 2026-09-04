"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { ArrowRightLeft, X, ChevronDown, Check, AlertCircle } from "lucide-react"
import Image from "next/image"
import { useStore } from "@/lib/store"
import { getWalletBrandLogo, formatMoney } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"
import {
  hasConsecutiveSpam,
  sanitizeNumericInput,
  sanitizeSpam,
  isValidPositiveAmount,
  MAX_LENGTH,
} from "@/lib/anti-spam"

interface TransferModalProps {
  open: boolean
  initialFrom?: string
  initialTo?: string
  onClose: () => void
}

export function TransferModal({ open, initialFrom, initialTo, onClose }: TransferModalProps) {
  const { wallets, transferFunds } = useStore()

  const [mounted, setMounted] = useState(false)
  const [fromWallet, setFromWallet] = useState("")
  const [toWallet, setToWallet] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [showFromDropdown, setShowFromDropdown] = useState(false)
  const [showToDropdown, setShowToDropdown] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (open) {
      if (initialFrom) {
        setFromWallet(initialFrom)
        const otherWallet = wallets.find((w) => w.name !== initialFrom)
        setToWallet(initialTo && initialTo !== initialFrom ? initialTo : otherWallet?.name || "")
      } else if (wallets.length >= 2) {
        setFromWallet(wallets[0].name)
        setToWallet(wallets[1].name)
      } else if (wallets.length === 1) {
        setFromWallet(wallets[0].name)
        setToWallet("")
      }
      setAmount("")
      setNote("")
      setShowFromDropdown(false)
      setShowToDropdown(false)
    }
  }, [open, wallets, initialFrom, initialTo])

  if (!open || !mounted) return null

  const fromWalletObj = wallets.find((w) => w.name === fromWallet) || wallets[0]
  const toWalletObj = wallets.find((w) => w.name === toWallet) || wallets.find((w) => w.name !== fromWallet)

  const fromLogo = fromWalletObj ? getWalletBrandLogo(fromWalletObj.name) : undefined
  const toLogo = toWalletObj ? getWalletBrandLogo(toWalletObj.name) : undefined

  const numAmount = parseFloat(amount.replace(/,/g, "")) || 0
  const availableBalance = fromWalletObj ? fromWalletObj.balance : 0
  const isInsufficientBalance = numAmount > availableBalance
  const isAmountValid = isValidPositiveAmount(amount) && !isInsufficientBalance
  const isSameWallet = Boolean(fromWallet && toWallet && fromWallet === toWallet)
  const isNoteSpam = hasConsecutiveSpam(note)

  const handleTransfer = () => {
    if (!isAmountValid || !fromWallet || !toWallet || isSameWallet || isNoteSpam) return

    transferFunds({
      fromWalletName: fromWallet,
      toWalletName: toWallet,
      amount: numAmount,
      note: note.trim() || `Transfer: ${fromWallet} → ${toWallet}`,
    })

    onClose()
  }

  const presets = [100, 500, 1000, 2500, 5000]

  // Available options filtering out the opposing selection to prevent GCash -> GCash
  const availableFromWallets = wallets.filter((w) => !toWallet || w.name !== toWallet)
  const availableToWallets = wallets.filter((w) => !fromWallet || w.name !== fromWallet)

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-t-[2.25rem] bg-card text-foreground shadow-2xl animate-in slide-in-from-bottom duration-200 overflow-hidden border-t border-border/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-5 pt-4 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <h2 className="text-base font-extrabold tracking-tight text-foreground">
              Transfer Funds
            </h2>
          </div>
          <div className="w-12" />
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 space-y-4 scrollbar-hide">
          {/* Amount input */}
          <div className={cn(
            "rounded-3xl border p-4 text-center transition-colors",
            isInsufficientBalance ? "border-rose-500/50 bg-rose-500/5" : "border-border/70 bg-background/50"
          )}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              TRANSFER AMOUNT
            </label>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className="text-2xl font-light text-muted-foreground">₱</span>
              <input
                type="number"
                value={amount}
                min={1}
                maxLength={MAX_LENGTH.AMOUNT_DIGITS}
                onChange={(e) => setAmount(sanitizeNumericInput(e.target.value, MAX_LENGTH.AMOUNT_DIGITS))}
                placeholder="0.00"
                className="w-48 bg-transparent text-center text-3xl font-extrabold text-foreground outline-none"
                autoFocus
              />
            </div>

            {/* Insufficient balance notice */}
            {isInsufficientBalance && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Insufficient balance (Available: {formatMoney(availableBalance, fromWalletObj?.currency)})</span>
              </div>
            )}

            {/* Presets */}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {presets.map((p) => {
                const isPresetExceeding = fromWalletObj && p > fromWalletObj.balance
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p.toString())}
                    className={cn(
                      "rounded-xl border px-2.5 py-1 text-xs font-bold transition-colors",
                      isPresetExceeding
                        ? "border-border/40 bg-card/40 text-muted-foreground/60 opacity-60"
                        : "border-border/60 bg-card text-foreground hover:bg-secondary"
                    )}
                  >
                    +₱{p.toLocaleString()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* From -> To Wallets */}
          <div className="space-y-3">
            {/* From Wallet */}
            <div className="relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                FROM WALLET
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowFromDropdown(!showFromDropdown)
                  setShowToDropdown(false)
                }}
                className="mt-1 flex h-14 w-full items-center justify-between rounded-2xl border border-border/70 bg-card px-4 text-left transition-colors hover:bg-secondary/40"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
                    {fromLogo ? (
                      <Image src={fromLogo} alt={fromWallet} fill className="object-contain p-1" />
                    ) : (
                      <span>💳</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-foreground">{fromWallet || "Select Wallet"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Balance: {fromWalletObj ? formatMoney(fromWalletObj.balance, fromWalletObj.currency) : "₱0.00"}
                    </p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {showFromDropdown && (
                <div className="absolute top-20 left-0 right-0 z-50 max-h-48 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                  {availableFromWallets.length === 0 ? (
                    <p className="p-3 text-center text-xs text-muted-foreground">No other accounts available</p>
                  ) : (
                    availableFromWallets.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setFromWallet(w.name)
                          setShowFromDropdown(false)
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold hover:bg-secondary transition-colors"
                      >
                        <span>{w.name}</span>
                        <span className="text-muted-foreground">{formatMoney(w.balance, w.currency)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* To Wallet */}
            <div className="relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                TO WALLET
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowToDropdown(!showToDropdown)
                  setShowFromDropdown(false)
                }}
                className="mt-1 flex h-14 w-full items-center justify-between rounded-2xl border border-border/70 bg-card px-4 text-left transition-colors hover:bg-secondary/40"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
                    {toLogo ? (
                      <Image src={toLogo} alt={toWallet} fill className="object-contain p-1" />
                    ) : (
                      <span>💳</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-foreground">{toWallet || "Select Target Wallet"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Balance: {toWalletObj ? formatMoney(toWalletObj.balance, toWalletObj.currency) : "₱0.00"}
                    </p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {showToDropdown && (
                <div className="absolute top-20 left-0 right-0 z-50 max-h-48 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                  {availableToWallets.length === 0 ? (
                    <p className="p-3 text-center text-xs text-muted-foreground">No other accounts available</p>
                  ) : (
                    availableToWallets.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setToWallet(w.name)
                          setShowToDropdown(false)
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold hover:bg-secondary transition-colors"
                      >
                        <span>{w.name}</span>
                        <span className="text-muted-foreground">{formatMoney(w.balance, w.currency)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Same wallet error banner */}
            {isSameWallet && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Source and destination wallets must be different.</span>
              </div>
            )}

            {/* Optional Note */}
            <div className="rounded-2xl border border-border/80 bg-background/50 p-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                NOTE (OPTIONAL)
              </label>
              <input
                type="text"
                value={note}
                maxLength={MAX_LENGTH.NOTE}
                onChange={(e) => setNote(sanitizeSpam(e.target.value, MAX_LENGTH.NOTE))}
                placeholder="e.g. GCash Cash In, Bank Transfer"
                className="mt-1 w-full bg-transparent text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
        </div>

        {/* Bottom Action */}
        <div className="border-t border-border/40 bg-card p-4">
          <button
            type="button"
            onClick={handleTransfer}
            disabled={!isAmountValid || !fromWallet || !toWallet || isSameWallet || isNoteSpam}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Complete Transfer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
