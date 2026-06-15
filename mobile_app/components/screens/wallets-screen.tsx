"use client"

import { useState } from "react"
import {
  Banknote,
  Smartphone,
  CreditCard,
  PiggyBank,
  Plus,
  ChevronRight,
} from "lucide-react"
import Image from "next/image"
import { formatMoney, type WalletType, type Wallet } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { AddWalletModal } from "../add-wallet-modal"
import { WalletDetailsModal } from "../wallet-details-modal"
import { PawiTip } from "../pawi-tip"

const icons: Record<WalletType, typeof Banknote> = {
  cash: Banknote,
  ewallet: Smartphone,
  card: CreditCard,
  savings: PiggyBank,
}

const brandLogos: Record<string, string> = {
  cash: "/cash-logo.png",
  gcash: "/gcash.jpg",
  paymaya: "/Paymaya-logo.png",
  paypal: "/Paypal-logo.png",
}

export function WalletsScreen() {
  const { wallets } = useStore()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  
  // Rough PHP-equivalent total (USD wallets converted at ~57) just for the hero.
  const totalPhp = wallets.reduce(
    (sum, w) => sum + (w.currency === "USD" ? w.balance * 57 : w.balance),
    0,
  )

  return (
    <div className="flex flex-col gap-5 px-5 pt-4 pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10"
        />
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
          Total across {wallets.length} wallets
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
          {formatMoney(totalPhp)}
        </p>
        <p className="mt-1 text-xs text-primary-foreground/70">
          Approximate value in PHP
        </p>
      </div>

      <section className="flex flex-col gap-3">
        {wallets.map((wallet) => {
          const Icon = icons[wallet.type] || Banknote
          const brandLogo = brandLogos[wallet.name.toLowerCase()]

          return (
            <button
              key={wallet.id}
              type="button"
              onClick={() => setSelectedWallet(wallet)}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/40"
            >
              <div
                className="relative flex h-11 w-11 shrink-0 items-center overflow-hidden justify-center rounded-xl text-white"
                style={{ backgroundColor: brandLogo ? "white" : wallet.accent }}
              >
                {brandLogo ? (
                  <Image src={brandLogo} alt={wallet.name} fill className="object-cover" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {wallet.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {wallet.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatMoney(wallet.balance, wallet.currency)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          )
        })}
      </section>

      <div className="-mx-5 mt-2">
        <PawiTip
          image="/pawikan-2.png"
          tip="Keep your emergency fund in a separate Savings wallet so you're not tempted to spend it!"
        />
      </div>

      <button
        type="button"
        onClick={() => setIsAddOpen(true)}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-4 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
      >
        <Plus className="h-4 w-4" />
        Add a wallet
      </button>

      <AddWalletModal open={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <WalletDetailsModal wallet={selectedWallet} open={selectedWallet !== null} onClose={() => setSelectedWallet(null)} />
    </div>
  )
}
