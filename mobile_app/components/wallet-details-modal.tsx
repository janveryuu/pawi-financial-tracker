"use client"

import { useEffect } from "react"
import { X, ArrowDownRight, ArrowUpRight, Banknote, Smartphone, CreditCard, PiggyBank, Trash2 } from "lucide-react"
import Image from "next/image"
import { useStore } from "@/lib/store"
import { Wallet, formatMoney, WalletType, getWalletBrandLogo } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"

interface WalletDetailsModalProps {
  wallet: Wallet | null
  open: boolean
  onClose: () => void
}

const icons: Record<WalletType, typeof Banknote> = {
  cash: Banknote,
  ewallet: Smartphone,
  card: CreditCard,
  savings: PiggyBank,
}

export function WalletDetailsModal({ wallet, open, onClose }: WalletDetailsModalProps) {
  const { transactions, deleteWallet } = useStore()

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

  if (!open || !wallet) return null

  const Icon = icons[wallet.type] || Banknote
  const brandLogo = getWalletBrandLogo(wallet.name)
  const walletTransactions = transactions.filter(t => t.account === wallet.name)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white"
              style={{ backgroundColor: brandLogo ? "transparent" : wallet.accent }}
            >
              {brandLogo ? (
                <Image src={brandLogo} alt={wallet.name} fill className="object-contain" />
              ) : (
                <Icon className="h-6 w-6" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{wallet.name}</h2>
              <p className="text-xs text-muted-foreground">{wallet.subtitle}</p>
            </div>
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

        {/* Balance Display */}
        <div className="mb-8 rounded-3xl border border-border/60 bg-secondary/30 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Balance</p>
          <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums text-foreground">
            {formatMoney(wallet.balance, wallet.currency)}
          </p>
        </div>

        {/* Recent Transactions */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Recent Transactions</h3>
          
          <div className="flex max-h-[40vh] flex-col gap-3 overflow-y-auto pr-2">
            {walletTransactions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No transactions found for this wallet.</p>
              </div>
            ) : (
              walletTransactions.map((tx) => {
                const isIncome = tx.kind === "income"
                return (
                  <div key={tx.id} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card p-3 shadow-sm">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isIncome ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {isIncome ? (
                        <ArrowDownRight className="h-5 w-5" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {tx.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {tx.category} · {tx.time}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "whitespace-nowrap text-sm font-bold tabular-nums",
                        isIncome ? "text-primary" : "text-foreground",
                      )}
                    >
                      {isIncome ? "+" : "-"}
                      {formatMoney(tx.amount, tx.currency)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-border/40 pt-4">
          <button
            type="button"
            onClick={() => {
              deleteWallet(wallet.id)
              onClose()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete Wallet
          </button>
        </div>

      </div>
    </div>
  )
}
