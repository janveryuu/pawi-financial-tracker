"use client"

import { useState, useEffect, useMemo } from "react"
import { Tag, Check, ChevronDown, Sparkles } from "lucide-react"
import Image from "next/image"
import { useStore } from "@/lib/store"
import { getWalletBrandLogo, formatMoney } from "@/lib/pawi-data"
import { cn } from "@/lib/utils"

interface TransactionEntryModalProps {
  open: boolean
  kind: "income" | "expense"
  initialAccount?: string
  onClose: () => void
}

const INCOME_CATEGORIES = [
  { id: "online-selling", label: "Online Selling", icon: "🏪" },
  { id: "allowance", label: "Allowance From Family", icon: "👛" },
  { id: "salary", label: "Salary", icon: "💼" },
  { id: "bonus", label: "Bonus", icon: "🎁" },
  { id: "freelance", label: "Freelance", icon: "📋" },
  { id: "commission", label: "Commission", icon: "📈" },
  { id: "business", label: "Business", icon: "🏬" },
  { id: "side-hustle", label: "Side Hustle", icon: "⚡" },
]

const EXPENSE_CATEGORIES = [
  { id: "food", label: "Food & Dining", icon: "🍔" },
  { id: "groceries", label: "Groceries", icon: "🛒" },
  { id: "transport", label: "Transport", icon: "🚗" },
  { id: "shopping", label: "Shopping", icon: "🛍️" },
  { id: "utilities", label: "Utilities & Bills", icon: "💡" },
  { id: "entertainment", label: "Entertainment", icon: "🎬" },
  { id: "health", label: "Health & Wellness", icon: "💊" },
  { id: "housing", label: "Rent & Housing", icon: "🏠" },
  { id: "coffee", label: "Coffee & Snacks", icon: "☕" },
  { id: "education", label: "Education", icon: "📚" },
]

export function TransactionEntryModal({ open, kind, initialAccount, onClose }: TransactionEntryModalProps) {
  const { wallets, transactions = [], budgets = [], addTransaction, defaultCurrency } = useStore()

  const [displayValue, setDisplayValue] = useState("0")
  const [expression, setExpression] = useState("")
  const [note, setNote] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedWalletName, setSelectedWalletName] = useState("")
  const [showWalletDropdown, setShowWalletDropdown] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [tag, setTag] = useState("")

  const isIncome = kind === "income"
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleNoteChange = (text: string) => {
    setNote(text)
    if (!text.trim() || isIncome) return

    const lower = text.toLowerCase()

    // 1. Check if an existing budget matches this note
    const matchingBudget = budgets.find((b) => {
      const bLower = b.category.toLowerCase()
      return lower.includes(bLower) || bLower.includes(lower)
    })

    if (matchingBudget) {
      const matchingCat = categories.find(
        (c) => c.label.toLowerCase() === matchingBudget.category.toLowerCase()
      )
      if (matchingCat) {
        setSelectedCategory(matchingCat.label)
        return
      }
    }

    // 2. Smart keyword detection
    if (
      lower.includes("netflix") ||
      lower.includes("spotify") ||
      lower.includes("game") ||
      lower.includes("movie") ||
      lower.includes("steam") ||
      lower.includes("youtube") ||
      lower.includes("disney") ||
      lower.includes("hbo")
    ) {
      setSelectedCategory("Entertainment")
    } else if (
      lower.includes("starbucks") ||
      lower.includes("coffee") ||
      lower.includes("cafe") ||
      lower.includes("milk tea") ||
      lower.includes("boba") ||
      lower.includes("snack")
    ) {
      setSelectedCategory("Coffee & Snacks")
    } else if (
      lower.includes("foodpanda") ||
      lower.includes("grabfood") ||
      lower.includes("jollibee") ||
      lower.includes("mcdo") ||
      lower.includes("mcdonald") ||
      lower.includes("lunch") ||
      lower.includes("dinner") ||
      lower.includes("breakfast") ||
      lower.includes("food") ||
      lower.includes("restaurant") ||
      lower.includes("carinderia")
    ) {
      setSelectedCategory("Food & Dining")
    } else if (
      lower.includes("grocery") ||
      lower.includes("groceries") ||
      lower.includes("supermarket") ||
      lower.includes("puregold") ||
      lower.includes("sm market") ||
      lower.includes("robinsons") ||
      lower.includes("waltermart")
    ) {
      setSelectedCategory("Groceries")
    } else if (
      lower.includes("grab") ||
      lower.includes("angkas") ||
      lower.includes("joyride") ||
      lower.includes("taxi") ||
      lower.includes("gas") ||
      lower.includes("petron") ||
      lower.includes("shell") ||
      lower.includes("caltex") ||
      lower.includes("transport") ||
      lower.includes("fare") ||
      lower.includes("jeep") ||
      lower.includes("mrt") ||
      lower.includes("lrt")
    ) {
      setSelectedCategory("Transport")
    } else if (
      lower.includes("shopee") ||
      lower.includes("lazada") ||
      lower.includes("uniqlo") ||
      lower.includes("zara") ||
      lower.includes("shopping") ||
      lower.includes("shein") ||
      lower.includes("tiktok shop")
    ) {
      setSelectedCategory("Shopping")
    } else if (
      lower.includes("meralco") ||
      lower.includes("maynilad") ||
      lower.includes("manila water") ||
      lower.includes("globe") ||
      lower.includes("converge") ||
      lower.includes("pldt") ||
      lower.includes("smart") ||
      lower.includes("dito") ||
      lower.includes("wifi") ||
      lower.includes("internet") ||
      lower.includes("bill") ||
      lower.includes("utility")
    ) {
      setSelectedCategory("Utilities & Bills")
    } else if (
      lower.includes("gym") ||
      lower.includes("fitness") ||
      lower.includes("doctor") ||
      lower.includes("hospital") ||
      lower.includes("medicine") ||
      lower.includes("pharmacy") ||
      lower.includes("mercury drug") ||
      lower.includes("watsons")
    ) {
      setSelectedCategory("Health & Wellness")
    } else if (
      lower.includes("rent") ||
      lower.includes("condo") ||
      lower.includes("apartment") ||
      lower.includes("housing")
    ) {
      setSelectedCategory("Rent & Housing")
    } else if (
      lower.includes("tuition") ||
      lower.includes("school") ||
      lower.includes("book") ||
      lower.includes("course") ||
      lower.includes("udemy")
    ) {
      setSelectedCategory("Education")
    }
  }

  const recentTemplates = useMemo(() => {
    const matching = transactions.filter((t) => t.kind === kind)
    const primaryWallet = wallets[0]?.name || "GCash"

    if (matching.length === 0) {
      if (isIncome) {
        return [
          { wallet: primaryWallet, amount: 5000, note: "Salary payout", category: "Salary" },
          { wallet: primaryWallet, amount: 1500, note: "Freelance", category: "Freelance" },
          { wallet: primaryWallet, amount: 500, note: "Allowance", category: "Allowance From Family" },
        ]
      } else {
        return [
          { wallet: primaryWallet, amount: 150, note: "Lunch", category: "Food & Dining" },
          { wallet: primaryWallet, amount: 500, note: "Groceries", category: "Groceries" },
          { wallet: primaryWallet, amount: 60, note: "Transportation", category: "Transport" },
        ]
      }
    }

    const seen = new Set<string>()
    const templates: { wallet: string; amount: number; note: string; category: string }[] = []

    for (const t of matching) {
      const key = `${t.label}-${t.amount}`
      if (!seen.has(key)) {
        seen.add(key)
        templates.push({
          wallet: t.account || primaryWallet,
          amount: Number(t.amount) || 0,
          note: t.label || t.category,
          category: t.category || (isIncome ? "Salary" : "Food & Dining"),
        })
        if (templates.length >= 4) break
      }
    }

    return templates
  }, [transactions, kind, isIncome, wallets])

  useEffect(() => {
    if (open) {
      setDisplayValue("0")
      setExpression("")
      setNote("")
      setTag("")
      setShowTagInput(false)
      setSelectedCategory(categories[0]?.label || "")
      if (initialAccount) {
        setSelectedWalletName(initialAccount)
      } else if (wallets.length > 0) {
        setSelectedWalletName(wallets[0].name)
      } else {
        setSelectedWalletName("Cash")
      }
    }
  }, [open, kind, initialAccount, wallets, categories])

  if (!open) return null

  // Numpad Calculator logic
  const handleDigit = (digit: string) => {
    if (displayValue === "0" && digit !== ".") {
      setDisplayValue(digit)
    } else {
      if (digit === "." && displayValue.includes(".")) return
      setDisplayValue((prev) => prev + digit)
    }
  }

  const handleOperator = (op: "+" | "-") => {
    const currentNum = parseFloat(displayValue) || 0
    if (expression === "") {
      setExpression(`${currentNum} ${op}`)
      setDisplayValue("0")
    } else {
      handleEquals()
      setExpression(`${parseFloat(displayValue) || currentNum} ${op}`)
      setDisplayValue("0")
    }
  }

  const handleEquals = () => {
    if (!expression) return
    const parts = expression.trim().split(" ")
    if (parts.length >= 2) {
      const prevNum = parseFloat(parts[0]) || 0
      const op = parts[1]
      const currentNum = parseFloat(displayValue) || 0
      let result = currentNum
      if (op === "+") result = prevNum + currentNum
      if (op === "-") result = Math.max(0, prevNum - currentNum)
      setDisplayValue(result.toString())
      setExpression("")
    }
  }

  const handleBackspace = () => {
    if (displayValue.length <= 1) {
      setDisplayValue("0")
    } else {
      setDisplayValue((prev) => prev.slice(0, -1))
    }
  }

  const handleClear = () => {
    setDisplayValue("0")
    setExpression("")
  }

  const handleSelectTemplate = (tmpl: typeof recentTemplates[0]) => {
    setDisplayValue(tmpl.amount.toString())
    setNote(tmpl.note)
    setSelectedCategory(tmpl.category)
    setSelectedWalletName(tmpl.wallet)
  }

  const handleSave = () => {
    let finalAmount = parseFloat(displayValue) || 0
    if (expression) {
      const parts = expression.trim().split(" ")
      if (parts.length >= 2) {
        const prevNum = parseFloat(parts[0]) || 0
        const op = parts[1]
        const currentNum = parseFloat(displayValue) || 0
        if (op === "+") finalAmount = prevNum + currentNum
        if (op === "-") finalAmount = Math.max(0, prevNum - currentNum)
      }
    }

    if (finalAmount <= 0) return

    const finalLabel = note.trim()
      ? (tag ? `[${tag}] ${note.trim()}` : note.trim())
      : `${selectedCategory || (isIncome ? "Income" : "Expense")}`

    addTransaction({
      label: finalLabel,
      category: selectedCategory || (isIncome ? "Income" : "General"),
      account: selectedWalletName || (wallets[0]?.name ?? "Cash"),
      amount: finalAmount,
      currency: defaultCurrency || "PHP",
      kind,
    })

    onClose()
  }

  const activeWallet = wallets.find((w) => w.name === selectedWalletName) || wallets[0]
  const brandLogo = activeWallet ? getWalletBrandLogo(activeWallet.name) : "/cash-logo.png"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-t-[2.25rem] bg-card text-foreground shadow-2xl animate-in slide-in-from-bottom duration-200 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-5 pt-4 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <h2 className="text-base font-extrabold tracking-tight text-foreground">
            {isIncome ? "New Income" : "New Expense"}
          </h2>
          <div className="w-12" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 space-y-4 scrollbar-hide">
          {/* Main Amount Display */}
          <div className="flex flex-col items-center justify-center py-2 text-center">
            {expression && (
              <span className="text-xs font-semibold text-muted-foreground mb-0.5">
                {expression}
              </span>
            )}
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-3xl font-light text-muted-foreground/70">
                ₱
              </span>
              <span className="text-4xl font-extrabold tracking-tight text-foreground tabular-nums">
                {displayValue}
              </span>
            </div>
          </div>

          {/* Note Input with Tag action */}
          <div className="rounded-2xl border border-border/80 bg-background/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                NOTE
              </span>
              <button
                type="button"
                onClick={() => setShowTagInput(!showTagInput)}
                className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Tag className="h-3 w-3" />
                <span>{tag ? `#${tag}` : "Tag"}</span>
              </button>
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder={isIncome ? "e.g. March salary, freelance project" : "e.g. Dinner with friends, grocery run"}
              className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none"
            />
            {showTagInput && (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Custom tag (e.g. Work, Vacation)"
                  className="rounded-lg border border-border/60 bg-card px-2.5 py-1 text-xs outline-none"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Recent Templates Row */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              {isIncome ? "RECENT INCOME" : "RECENT EXPENSES"}
            </p>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
              {recentTemplates.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl)}
                  className="flex shrink-0 flex-col items-start rounded-2xl border border-border/60 bg-background/60 p-3 text-left transition-all hover:bg-secondary/60 hover:border-primary/40 active:scale-95"
                >
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {tmpl.wallet}
                  </span>
                  <span className="text-xs font-black text-foreground mt-0.5">
                    ₱{tmpl.amount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[110px]">
                    {tmpl.note}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Categories Grid */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              {isIncome ? "INCOME CATEGORIES" : "EXPENSE CATEGORIES"}
            </p>
            <div data-tutorial-id="pawi-expense-category-grid" className="grid grid-cols-2 gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.label
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.label)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-xs font-bold transition-all active:scale-95",
                      isSelected
                        ? "border-primary/60 bg-primary/10 text-primary shadow-xs"
                        : "border-border/60 bg-card text-foreground hover:bg-secondary/40"
                    )}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Calculator Numpad Keypad (Image 4 Design) */}
          <div className="rounded-3xl border border-border/60 bg-secondary/30 p-2.5">
            <div className="grid grid-cols-4 gap-2">
              {/* Row 1 */}
              <button
                type="button"
                onClick={() => handleOperator("+")}
                className="flex h-12 items-center justify-center rounded-2xl bg-primary/15 text-lg font-bold text-primary active:scale-90 transition-transform"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => handleDigit("1")}
                className="flex h-12 items-center justify-center rounded-2xl bg-card text-base font-bold text-foreground shadow-xs active:scale-90 transition-transform"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleDigit("2")}
                className="flex h-12 items-center justify-center rounded-2xl bg-card text-base font-bold text-foreground shadow-xs active:scale-90 transition-transform"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => handleDigit("3")}
                className="flex h-12 items-center justify-center rounded-2xl bg-card text-base font-bold text-foreground shadow-xs active:scale-90 transition-transform"
              >
                3
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => handleOperator("-")}
                className="flex h-12 items-center justify-center rounded-2xl bg-primary/15 text-lg font-bold text-primary active:scale-90 transition-transform"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => handleDigit("4")}
                className="flex h-12 items-center justify-center rounded-2xl bg-card text-base font-bold text-foreground shadow-xs active:scale-90 transition-transform"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleDigit("5")}
                className="flex h-12 items-center justify-center rounded-2xl bg-card text-base font-bold text-foreground shadow-xs active:scale-90 transition-transform"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleDigit("6")}
                className="flex h-12 items-center justify-center rounded-2xl bg-card text-base font-bold text-foreground shadow-xs active:scale-90 transition-transform"
              >
                6
              </button>

              {/* Row 3 */}
              <button
                type="button"
                onClick={handleClear}
                className="flex h-12 items-center justify-center rounded-2xl bg-rose-500/15 text-sm font-bold text-rose-600 active:scale-90 transition-transform"
              >
                ⊗
              </button>
              <button
                type="button"
                onClick={() => handleDigit("7")}
                className="flex h-12 items-center justify-center rounded-2xl bg-card text-base font-bold text-foreground shadow-xs active:scale-90 transition-transform"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleDigit("8")}
                className="flex h-12 items-center justify-center rounded-2xl bg-card text-base font-bold text-foreground shadow-xs active:scale-90 transition-transform"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleDigit("9")}
                className="flex h-12 items-center justify-center rounded-2xl bg-card text-base font-bold text-foreground shadow-xs active:scale-90 transition-transform"
              >
                9
              </button>

              {/* Row 4 */}
              <button
                type="button"
                onClick={handleEquals}
                className="flex h-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-sm active:scale-90 transition-transform"
              >
                =
              </button>
              <button
                type="button"
                onClick={() => handleDigit(".")}
                className="flex h-12 items-center justify-center rounded-2xl bg-card text-lg font-bold text-foreground shadow-xs active:scale-90 transition-transform"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => handleDigit("0")}
                className="flex h-12 items-center justify-center rounded-2xl bg-card text-base font-bold text-foreground shadow-xs active:scale-90 transition-transform"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="flex h-12 items-center justify-center rounded-2xl bg-card text-sm font-bold text-muted-foreground shadow-xs active:scale-90 transition-transform"
              >
                ⌫
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar (Account Picker + Save Button) */}
        <div className="border-t border-border/40 bg-card p-4">
          <div className="flex items-center gap-3">
            {/* Account Selector Button */}
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                className="flex h-12 w-full items-center justify-between rounded-2xl border border-border/70 bg-secondary/40 px-3.5 text-left transition-colors hover:bg-secondary/70"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                    {brandLogo ? (
                      <Image src={brandLogo} alt={selectedWalletName} fill className="object-contain p-0.5" />
                    ) : (
                      <span className="text-xs font-bold">💳</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      ACCOUNT
                    </span>
                    <span className="block truncate text-xs font-extrabold text-foreground">
                      {selectedWalletName || "Select Wallet"}
                    </span>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>

              {/* Wallet Dropdown Popover */}
              {showWalletDropdown && (
                <div className="absolute bottom-14 left-0 right-0 z-50 max-h-48 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                  {wallets.map((w) => {
                    const logo = getWalletBrandLogo(w.name)
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setSelectedWalletName(w.name)
                          setShowWalletDropdown(false)
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10">
                            {logo ? (
                              <Image src={logo} alt={w.name} fill className="object-contain" />
                            ) : (
                              <span>💳</span>
                            )}
                          </div>
                          <span>{w.name}</span>
                        </div>
                        <span className="text-muted-foreground">{formatMoney(w.balance, w.currency)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                "flex h-12 flex-1 items-center justify-center rounded-2xl font-extrabold text-sm shadow-md transition-all active:scale-95",
                isIncome
                  ? "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90"
                  : "bg-[#3D784E] text-white shadow-emerald-700/20 hover:bg-[#356B46]"
              )}
            >
              {isIncome ? "Save Income" : "Save Expense"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
