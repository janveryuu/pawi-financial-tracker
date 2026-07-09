import { Banknote, Smartphone, CreditCard, PiggyBank } from "lucide-react"
import Image from "next/image"
import { formatMoney, type WalletType } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"

const icons: Record<WalletType, typeof Banknote> = {
  cash: Banknote,
  ewallet: Smartphone,
  card: CreditCard,
  savings: PiggyBank,
}

const brandLogos: Record<string, string> = {
  cash: "/cash-logo.png",
  gcash: "/gcash.png",
  paymaya: "/Paymaya-logo.png",
  paypal: "/Paypal-logo.png",
}

interface WalletCarouselProps {
  onViewAll?: () => void
}

export function WalletCarousel({ onViewAll }: WalletCarouselProps = {}) {
  const { wallets } = useStore()
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Wallets</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-medium text-primary hover:underline"
        >
          View all
        </button>
      </div>
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {wallets.map((wallet) => {
          const Icon = icons[wallet.type]
          const brandLogo = brandLogos[wallet.name.toLowerCase()]

          return (
            <div
              key={wallet.id}
              className="flex w-40 shrink-0 snap-start flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div
                  className="relative flex h-9 w-9 overflow-hidden items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: brandLogo ? "transparent" : wallet.accent }}
                >
                  {brandLogo ? (
                    <Image src={brandLogo} alt={wallet.name} fill className="object-contain" />
                  ) : (
                    <Icon className="h-[18px] w-[18px]" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {wallet.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {wallet.subtitle}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Balance
                </p>
                <p className="text-base font-bold tabular-nums text-foreground">
                  {formatMoney(wallet.balance, wallet.currency)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
