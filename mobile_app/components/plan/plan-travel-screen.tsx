"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Plus, Plane, MapPin, Trash2, X, Wallet as WalletIcon, Sparkles, Check, AlertCircle, ArrowUpRight } from "lucide-react"
import { formatMoney, getWalletBrandLogo, getWalletBrandColor } from "@/lib/pawi-data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface PlanTravelScreenProps {
  onBack: () => void
}

export interface TravelTrip {
  id: string
  destination: string
  dates: string
  budget: number
  saved: number
  flag: string
  notes?: string
}

function getDestinationEmoji(destination: string): string {
  const lower = destination.toLowerCase()
  if (lower.includes("japan") || lower.includes("tokyo") || lower.includes("kyoto") || lower.includes("osaka")) return "🇯🇵"
  if (lower.includes("korea") || lower.includes("seoul") || lower.includes("busan") || lower.includes("jeju")) return "🇰🇷"
  if (lower.includes("philippines") || lower.includes("boracay") || lower.includes("palawan") || lower.includes("cebu") || lower.includes("siargao") || lower.includes("baguio") || lower.includes("bohol") || lower.includes("elnido") || lower.includes("coron")) return "🇵🇭"
  if (lower.includes("singapore")) return "🇸🇬"
  if (lower.includes("thailand") || lower.includes("bangkok") || lower.includes("phuket")) return "🇹🇭"
  if (lower.includes("taiwan") || lower.includes("taipei")) return "🇹🇼"
  if (lower.includes("hong kong") || lower.includes("macau")) return "🇭🇰"
  if (lower.includes("vietnam") || lower.includes("hanoi") || lower.includes("da nang") || lower.includes("saigon")) return "🇻🇳"
  if (lower.includes("indonesia") || lower.includes("bali")) return "🇮🇩"
  if (lower.includes("malaysia") || lower.includes("kuala lumpur")) return "🇲🇾"
  if (lower.includes("us") || lower.includes("usa") || lower.includes("america") || lower.includes("new york") || lower.includes("california") || lower.includes("los angeles") || lower.includes("hawaii")) return "🇺🇸"
  if (lower.includes("uk") || lower.includes("london") || lower.includes("england") || lower.includes("britain")) return "🇬🇧"
  if (lower.includes("france") || lower.includes("paris")) return "🇫🇷"
  if (lower.includes("italy") || lower.includes("rome") || lower.includes("venice")) return "🇮🇹"
  if (lower.includes("spain") || lower.includes("barcelona") || lower.includes("madrid")) return "🇪🇸"
  if (lower.includes("australia") || lower.includes("sydney") || lower.includes("melbourne")) return "🇦🇺"
  if (lower.includes("canada") || lower.includes("toronto") || lower.includes("vancouver")) return "🇨🇦"
  if (lower.includes("beach") || lower.includes("island") || lower.includes("resort")) return "🏖️"
  if (lower.includes("mountain") || lower.includes("hiking") || lower.includes("trek")) return "🏔️"
  return "✈️"
}

export function PlanTravelScreen({ onBack }: PlanTravelScreenProps) {
  const { wallets, addTransaction, defaultCurrency } = useStore()

  // Load trips from localStorage (empty array by default, no hardcoded placeholders)
  const [trips, setTrips] = useState<TravelTrip[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pawi_travel_trips")
        if (stored) return JSON.parse(stored)
      } catch (e) {
        console.warn("Could not read pawi_travel_trips from localStorage", e)
      }
    }
    return []
  })

  // Save trips to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pawi_travel_trips", JSON.stringify(trips))
      } catch (e) {
        console.warn("Could not save pawi_travel_trips to localStorage", e)
      }
    }
  }, [trips])

  // Add Trip Modal state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [destination, setDestination] = useState("")
  const [dates, setDates] = useState("")
  const [budget, setBudget] = useState("")

  // Deposit Modal state
  const [depositingTrip, setDepositingTrip] = useState<TravelTrip | null>(null)
  const [depositAmount, setDepositAmount] = useState("")
  const [selectedWalletName, setSelectedWalletName] = useState("")
  const [depositError, setDepositError] = useState<string | null>(null)
  const [isDepositing, setIsDepositing] = useState(false)

  // Computed summary
  const totalBudget = trips.reduce((sum, t) => sum + (Number(t.budget) || 0), 0)
  const totalSaved = trips.reduce((sum, t) => sum + (Number(t.saved) || 0), 0)
  const overallPct = totalBudget > 0 ? Math.min(100, Math.round((totalSaved / totalBudget) * 100)) : 0

  const handleCreateTrip = () => {
    const b = parseFloat(budget)
    if (!destination.trim() || isNaN(b) || b <= 0) return

    const newTrip: TravelTrip = {
      id: "trip_" + Date.now(),
      destination: destination.trim(),
      dates: dates.trim() || "Upcoming",
      budget: b,
      saved: 0,
      flag: getDestinationEmoji(destination.trim()),
    }

    setTrips((prev) => [newTrip, ...prev])
    setDestination("")
    setDates("")
    setBudget("")
    setIsAddOpen(false)
  }

  const handleDeleteTrip = (tripId: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== tripId))
  }

  const handleOpenDepositModal = (trip: TravelTrip) => {
    setDepositingTrip(trip)
    setDepositAmount("")
    setDepositError(null)
    setSelectedWalletName(wallets[0]?.name || "Cash")
  }

  const handleConfirmDeposit = async () => {
    if (!depositingTrip) return
    const amt = parseFloat(depositAmount)
    if (isNaN(amt) || amt <= 0) {
      setDepositError("Please enter a valid amount greater than 0.")
      return
    }

    const sourceWallet = wallets.find(
      (w) => w.name.toLowerCase() === selectedWalletName.toLowerCase()
    )
    if (sourceWallet && sourceWallet.balance < amt) {
      setDepositError(
        `Insufficient balance in ${sourceWallet.name} (Available: ${formatMoney(sourceWallet.balance, sourceWallet.currency)}).`
      )
      return
    }

    setIsDepositing(true)
    setDepositError(null)

    try {
      // 1. Deduct funds from the selected wallet by logging a savings transaction
      await addTransaction({
        label: `Deposit for ${depositingTrip.destination} trip`,
        amount: amt,
        category: "Savings",
        kind: "expense",
        account: selectedWalletName || (wallets[0]?.name ?? "Cash"),
        currency: defaultCurrency || "PHP",
        dateHeader: "Today",
      })

      // 2. Increase the saved amount on the trip goal
      setTrips((prev) =>
        prev.map((t) => {
          if (t.id === depositingTrip.id) {
            return {
              ...t,
              saved: (t.saved || 0) + amt,
            }
          }
          return t
        })
      )

      setDepositingTrip(null)
      setDepositAmount("")
    } catch (err: any) {
      setDepositError(err?.message || "Failed to process deposit. Please try again.")
    } finally {
      setIsDepositing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-28 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-black text-foreground">Travel Budgets</h2>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#3D784E]/30 bg-[#3D784E]/10 text-[#3D784E] hover:bg-[#3D784E]/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Summary Card (only when trips exist) */}
      {trips.length > 0 && (
        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                TOTAL TRAVEL SAVINGS POOL
              </p>
              <p className="text-xl font-black text-foreground tabular-nums mt-0.5">
                {formatMoney(totalSaved, defaultCurrency)} / {formatMoney(totalBudget, defaultCurrency)}
              </p>
            </div>
            <span className="rounded-2xl bg-secondary px-3 py-1 text-xs font-black text-[#3D784E]">
              {overallPct}% funded
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-[#3D784E] transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Trips list or Empty State */}
      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/60 p-8 text-center my-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#3D784E]/15 text-2xl mb-3">
            ✈️
          </div>
          <h3 className="text-sm font-black text-foreground">No Travel Goals Yet</h3>
          <p className="text-xs text-muted-foreground font-medium max-w-xs mt-1 mb-5">
            Set up a destination and budget to start saving for your next adventure or vacation.
          </p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#3D784E] px-4 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#356B46] active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Travel Goal</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => {
            const saved = trip.saved || 0
            const pct = trip.budget > 0 ? Math.min(100, Math.round((saved / trip.budget) * 100)) : 0
            const remaining = Math.max(0, trip.budget - saved)
            const isCompleted = saved >= trip.budget

            return (
              <div
                key={trip.id}
                className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs space-y-3 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-xl">
                      {trip.flag || getDestinationEmoji(trip.destination)}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">{trip.destination}</h3>
                      <p className="text-[10px] text-muted-foreground font-medium">{trip.dates}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="text-right mr-1">
                      <p className="text-sm font-black text-foreground tabular-nums">
                        {formatMoney(trip.budget, defaultCurrency)}
                      </p>
                      <span className="text-[10px] font-bold text-muted-foreground">target</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTrip(trip.id)}
                      title="Delete Trip"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
                    <span className="text-foreground font-black">
                      Saved {formatMoney(saved, defaultCurrency)}
                    </span>
                    <span>
                      {isCompleted ? (
                        <span className="text-[#3D784E] font-black">Fully Funded! 🎉</span>
                      ) : (
                        `${formatMoney(remaining, defaultCurrency)} left (${pct}%)`
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isCompleted ? "bg-[#3D784E]" : "bg-[#3D784E]"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenDepositModal(trip)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3D784E]/10 py-2 text-xs font-black text-[#3D784E] hover:bg-[#3D784E]/20 active:scale-98 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Deposit to {trip.destination}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Deposit Modal */}
      {depositingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{depositingTrip.flag || "✈️"}</span>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Deposit Funds</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">{depositingTrip.destination}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDepositingTrip(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current progress badge */}
            <div className="my-3 rounded-2xl bg-secondary/60 p-3 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">CURRENTLY SAVED</span>
                <p className="text-sm font-black text-foreground">{formatMoney(depositingTrip.saved || 0, defaultCurrency)}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">TARGET BUDGET</span>
                <p className="text-sm font-black text-foreground">{formatMoney(depositingTrip.budget, defaultCurrency)}</p>
              </div>
            </div>

            {/* Amount input & Quick Chips */}
            <div className="space-y-2 mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Deposit Amount (₱)
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => {
                  setDepositAmount(e.target.value)
                  setDepositError(null)
                }}
                placeholder="0.00"
                autoFocus
                className="flex h-12 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-lg font-black outline-none focus:ring-2 focus:ring-[#3D784E]"
              />

              {/* Quick Amount Pills */}
              <div className="flex gap-1.5 pt-1 overflow-x-auto scrollbar-hide">
                {[500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setDepositAmount(amt.toString())
                      setDepositError(null)
                    }}
                    className="rounded-xl border border-border/70 bg-secondary/60 px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-[#3D784E]/15 hover:border-[#3D784E]/40 transition-colors"
                  >
                    +{formatMoney(amt, defaultCurrency)}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallet Picker */}
            <div className="space-y-2 mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Deduct from Wallet
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {wallets.map((w) => {
                  const isSelected = selectedWalletName.toLowerCase() === w.name.toLowerCase()
                  const brandLogo = getWalletBrandLogo(w.name)

                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        setSelectedWalletName(w.name)
                        setDepositError(null)
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition-all",
                        isSelected
                          ? "border-[#3D784E] bg-[#3D784E]/10"
                          : "border-border/70 bg-card hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {brandLogo ? (
                          <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={brandLogo} alt={w.name} className="h-full w-full object-contain" />
                          </div>
                        ) : (
                          <WalletIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs font-bold text-foreground">{w.name}</span>
                      </div>
                      <span className="text-xs font-extrabold text-muted-foreground tabular-nums">
                        {formatMoney(w.balance, w.currency)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Error Banner (if any) */}
            {depositError && (
              <div className="mb-4 flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{depositError}</span>
              </div>
            )}

            {/* Modal Buttons */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDepositingTrip(null)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground hover:bg-secondary/80"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDepositing || !depositAmount}
                onClick={handleConfirmDeposit}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46] disabled:opacity-50 transition-all shadow-xs"
              >
                {isDepositing ? "Depositing..." : "Confirm Deposit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Trip Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-foreground">Add Travel Goal</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Destination
                </label>
                <div className="relative mt-1 flex items-center">
                  <span className="absolute left-3 text-base">
                    {getDestinationEmoji(destination)}
                  </span>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Tokyo, Boracay, Taiwan, Paris"
                    className="flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 pl-9 pr-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#3D784E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Target Travel Dates
                </label>
                <input
                  type="text"
                  value={dates}
                  onChange={(e) => setDates(e.target.value)}
                  placeholder="e.g. Oct 10 - Oct 18, 2026"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#3D784E]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Target Budget (₱)
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-sm font-black outline-none focus:ring-2 focus:ring-[#3D784E]"
                />
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!destination.trim() || !budget}
                onClick={handleCreateTrip}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46] disabled:opacity-50"
              >
                Create Travel Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
