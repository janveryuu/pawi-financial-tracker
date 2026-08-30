"use client"

import { useState, useEffect } from "react"
import { ArrowRightLeft, X, ChevronDown, Check } from "lucide-react"
import Image from "next/image"
import { useStore } from "@/lib/store"
import { getWalletBrandLogo, formatMoney } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"

interface TransferModalProps {
  open: boolean
  initialFrom?: string
  initialTo?: string
  onClose: () => void
}

export function TransferModal({ open, initialFrom, initialTo, onClose }: TransferModalProps) {
  const { wallets, transferFunds } = useStore()

  const [fromWallet, setFromWallet] = useState("")
  const [toWallet, setToWallet] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [showFromDropdown, setShowFromDropdown] = useState(false)
  const [showToDropdown, setShowToDropdown] = useState(false)

  useEffect(() => {
    if (open) {
      if (initialFrom) {
        setFromWallet(initialFrom)
        const otherWallet = wallets.find((w) => w.name !== initialFrom)
        setToWallet(initialTo || otherWallet?.name || wallets[0]?.name || "")
      } else if (wallets.length >= 2) {
        setFromWallet(wallets[0].name)
        setToWallet(wallets[1].name)
      } else if (wallets.length === 1) {
        setFromWallet(wallets[0].name)
        setToWallet(wallets[0].name)
      }
      setAmount("")
      setNote("")
    }
  }, [open, wallets, initialFrom, initialTo])

  if (!open) return null

  const fromWalletObj = wallets.find((w) => w.name === fromWallet) || wallets[0]
  const toWalletObj = wallets.find((w) => w.name === toWallet) || wallets[1] || wallets[0]

  const fromLogo = fromWalletObj ? getWalletBrandLogo(fromWalletObj.name) : undefined
  const toLogo = toWalletObj ? getWalletBrandLogo(toWalletObj.name) : undefined

  const handleTransfer = () => {
    const numAmount = parseFloat(amount) || 0
    if (numAmount <= 0 || !fromWallet || !toWallet || fromWallet === toWallet) return

    transferFunds({
      fromWalletName: fromWallet,
      toWalletName: toWallet,
      amount: numAmount,
      note: note.trim() || `Transfer: ${fromWallet} → ${toWallet}`,
    })

    onClose()
  }

  const presets = [100, 500, 1000, 2500, 5000]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-t-[2.25rem] bg-card text-foreground shadow-2xl animate-in slide-in-from-bottom duration-200 overflow-hidden">
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
          <div className="rounded-3xl border border-border/70 bg-background/50 p-4 text-center">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              TRANSFER AMOUNT
            </label>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className="text-2xl font-light text-muted-foreground">₱</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-48 bg-transparent text-center text-3xl font-extrabold text-foreground outline-none"
                autoFocus
              />
            </div>
            {/* Presets */}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p.toString())}
                  className="rounded-xl border border-border/60 bg-card px-2.5 py-1 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
                >
                  +₱{p.toLocaleString()}
                </button>
              ))}
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
                    <p className="text-sm font-extrabold text-foreground">{fromWallet}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Balance: {fromWalletObj ? formatMoney(fromWalletObj.balance, fromWalletObj.currency) : "₱0.00"}
                    </p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {showFromDropdown && (
                <div className="absolute top-20 left-0 right-0 z-50 max-h-48 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                  {wallets.map((w) => {
                    const logo = getWalletBrandLogo(w.name)
                    return (
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
                    )
                  })}
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
                    <p className="text-sm font-extrabold text-foreground">{toWallet}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Balance: {toWalletObj ? formatMoney(toWalletObj.balance, toWalletObj.currency) : "₱0.00"}
                    </p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {showToDropdown && (
                <div className="absolute top-20 left-0 right-0 z-50 max-h-48 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                  {wallets.map((w) => (
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
                  ))}
                </div>
              )}
            </div>

            {/* Optional Note */}
            <div className="rounded-2xl border border-border/80 bg-background/50 p-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                NOTE (OPTIONAL)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. GCash Cash In, Bank Transfer"
                className="mt-1 w-full bg-transparent text-xs font-medium text-foreground outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bottom Action */}
        <div className="border-t border-border/40 bg-card p-4">
          <button
            type="button"
            onClick={handleTransfer}
            disabled={!amount || parseFloat(amount) <= 0 || fromWallet === toWallet}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50 active:scale-95"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Complete Transfer
          </button>
        </div>
      </div>
    </div>
  )
}
