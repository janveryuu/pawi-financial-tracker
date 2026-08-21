"use client"

import { useState } from "react"
import { ChevronLeft, Plus, Plane, MapPin, Trash2, X } from "lucide-react"
import { formatMoney } from "@/lib/pawi-data"

interface PlanTravelScreenProps {
  onBack: () => void
}

interface Trip {
  id: string
  destination: string
  dates: string
  budget: number
  spent: number
  flag: string
}

export function PlanTravelScreen({ onBack }: PlanTravelScreenProps) {
  const [trips, setTrips] = useState<Trip[]>([
    {
      id: "trip_1",
      destination: "Tokyo & Kyoto, Japan",
      dates: "Nov 15 - Nov 24, 2026",
      budget: 85000,
      spent: 32000,
      flag: "🇯🇵",
    },
    {
      id: "trip_2",
      destination: "Boracay Long Weekend",
      dates: "Aug 28 - Aug 31, 2026",
      budget: 25000,
      spent: 12500,
      flag: "🏖️",
    },
  ])

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [destination, setDestination] = useState("")
  const [dates, setDates] = useState("")
  const [budget, setBudget] = useState("")

  const handleAdd = () => {
    const b = parseFloat(budget)
    if (!destination || isNaN(b)) return
    setTrips([
      ...trips,
      {
        id: "t_" + Date.now(),
        destination,
        dates: dates || "Upcoming",
        budget: b,
        spent: 0,
        flag: "✈️",
      },
    ])
    setDestination("")
    setDates("")
    setBudget("")
    setIsAddOpen(false)
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

      {/* Trips list */}
      <div className="space-y-3">
        {trips.map((trip) => {
          const pct = Math.min(100, Math.round((trip.spent / trip.budget) * 100))
          return (
            <div
              key={trip.id}
              className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-lg">
                    {trip.flag}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">{trip.destination}</h3>
                    <p className="text-[10px] text-muted-foreground font-medium">{trip.dates}</p>
                  </div>
                </div>
                <span className="text-sm font-black text-foreground tabular-nums">
                  {formatMoney(trip.budget)}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1">
                  <span>Spent {formatMoney(trip.spent)}</span>
                  <span>{formatMoney(trip.budget - trip.spent)} left ({pct}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-[#3D784E] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-foreground">Add Trip Budget</h3>
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
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Taiwan, Cebu, London"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#3D784E]"
                />
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
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Trip Budget (₱)
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 flex h-11 w-full rounded-xl border border-border/70 bg-secondary/40 px-3.5 text-base font-black outline-none"
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
                onClick={handleAdd}
                className="flex-1 rounded-xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46]"
              >
                Create Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
