"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react"
import {
  Wallet,
  Transaction,
  Goal,
  Budget,
  Debt,
  Receivable,
  PlannedPayment,
  Installment,
  Tag,
  CurrencyCode,
  getWalletBrandColor,
  starterWallets,
  demoWallets,
  demoTransactions,
  demoGoals,
  demoBudgets,
  demoDebts,
  demoReceivables,
  demoPlannedPayments,
  demoInstallments,
  demoTags,
} from "./pawi-data"
import { useAuth } from "./auth-context"
import { supabase } from "./supabase"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface UpcomingItem {
  id: string
  title: string
  dueDate: string
  amount: number
  kind: "income" | "expense"
  category: string
  icon?: string
}

interface State {
  wallets: Wallet[]
  transactions: Transaction[]
  goals: Goal[]
  budgets: Budget[]
  debts: Debt[]
  receivables: Receivable[]
  plannedPayments: PlannedPayment[]
  installments: Installment[]
  tags: Tag[]
  chatMessages: ChatMessage[]
  defaultCurrency: CurrencyCode
  streakDays: number
  daysUntilPayday: number
  paydayAmount: number
  paydayDate: string
}

interface StoreContextType extends State {
  addTransaction: (tx: Omit<Transaction, "id" | "time">) => Promise<void>
  editTransaction: (tx: Transaction) => Promise<void>
  deleteTransaction: (transactionId: string) => Promise<void>
  addWallet: (wallet: Omit<Wallet, "id">) => Promise<void>
  updateWallet: (wallet: Wallet) => Promise<void>
  deleteWallet: (walletId: string) => Promise<void>
  transferFunds: (params: { fromWalletName: string; toWalletName: string; amount: number; note?: string }) => Promise<void>
  addGoal: (goal: Omit<Goal, "id">) => Promise<void>
  editGoal: (goal: Goal) => Promise<void>
  deleteGoal: (goalId: string) => Promise<void>
  addBudget: (budget: Omit<Budget, "id">) => Promise<void>
  editBudget: (budget: Budget) => Promise<void>
  deleteBudget: (budgetId: string) => Promise<void>
  addDebt: (debt: Omit<Debt, "id">) => Promise<void>
  editDebt: (debt: Debt) => Promise<void>
  deleteDebt: (debtId: string) => Promise<void>
  addReceivable: (receivable: Omit<Receivable, "id">) => Promise<void>
  editReceivable: (receivable: Receivable) => Promise<void>
  deleteReceivable: (receivableId: string) => Promise<void>
  addPlannedPayment: (payment: Omit<PlannedPayment, "id">) => Promise<void>
  editPlannedPayment: (payment: PlannedPayment) => Promise<void>
  deletePlannedPayment: (paymentId: string) => Promise<void>
  addInstallment: (installment: Omit<Installment, "id">) => Promise<void>
  editInstallment: (installment: Installment) => Promise<void>
  deleteInstallment: (installmentId: string) => Promise<void>
  addTag: (tag: Omit<Tag, "id">) => Promise<void>
  deleteTag: (tagId: string) => Promise<void>
  addFundsToGoal: (goalId: string, amount: number, fromWalletName?: string) => Promise<void>
  updateWalletNotes: (walletId: string, notes: string) => Promise<void>
  adjustWalletBalance: (walletId: string, newBalance: number, reason?: string) => Promise<void>
  setChatMessages: (msgs: ChatMessage[]) => Promise<void>
  setDefaultCurrency: (currency: CurrencyCode) => Promise<void>
  resetAccountData: () => Promise<void>
  loadSampleData: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | null>(null)

// ---------------------------------------------------------
// Helper: Map between Supabase DB rows and App types
// ---------------------------------------------------------
function mapAccountToWallet(row: any): Wallet {
  const brandColor = getWalletBrandColor(row.name, row.type, row.accent)
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle || (row.type === "savings" ? "Savings · PHP" : row.type === "credit" ? `Credit · ${row.currency || "PHP"}` : "E-Wallet · PHP"),
    balance: Number(row.balance) || 0,
    currency: row.currency || "PHP",
    type: row.type || "cash",
    group: row.group || (row.type === "credit" ? "credit" : row.type === "loan" ? "loan" : row.type === "savings" ? "bank" : "ewallet"),
    accent: brandColor,
    isLiability: row.is_liability ?? (row.type === "credit" || row.type === "loan"),
    creditLimit: row.credit_limit ? Number(row.credit_limit) : undefined,
    usedCredit: row.used_credit ? Number(row.used_credit) : undefined,
    interestRate: row.interest_rate,
    dueDay: row.due_day,
    notes: row.notes,
  }
}

function mapWalletToAccount(w: Wallet, userId: string): any {
  return {
    id: w.id.includes("_") ? w.id : `${w.id}_${userId}`,
    user_id: userId,
    name: w.name,
    type: w.type || "cash",
    balance: w.balance || 0,
    currency: w.currency || "PHP",
    color: 1,
    icon: w.type === "ewallet" ? "gcash" : w.type === "savings" ? "bdo" : "wallet",
    is_liability: !!w.isLiability,
    credit_limit: w.creditLimit || 0,
    used_credit: w.usedCredit || 0,
    interest_rate: w.interestRate || null,
    due_day: w.dueDay || null,
    notes: w.notes || null,
    updated_at: new Date().toISOString(),
  }
}

function mapTxRowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    label: row.title,
    category: row.category_id || "General",
    note: row.notes || undefined,
    tag: row.tags && row.tags.length > 0 ? row.tags[0] : undefined,
    account: row.account_id || "Cash",
    time: row.transaction_time || "12:00 PM",
    amount: Number(row.amount) || 0,
    currency: row.currency || "PHP",
    kind: row.type === "income" ? "income" : row.type === "transfer" ? "transfer" : "expense",
    date: row.transaction_date || new Date().toISOString().split("T")[0],
    icon: "💰",
  }
}

function mapTransactionToRow(t: Transaction, userId: string): any {
  return {
    id: t.id,
    user_id: userId,
    title: t.label,
    amount: t.amount,
    currency: t.currency || "PHP",
    type: t.kind === "income" ? "income" : t.kind === "transfer" ? "transfer" : "expense",
    notes: t.note || null,
    tags: t.tag ? [t.tag] : [],
    transaction_date: t.date || new Date().toISOString().split("T")[0],
    transaction_time: t.time || "12:00 PM",
    account_id: t.account,
    category_id: t.category,
  }
}

function mapGoalRowToGoal(g: any): Goal {
  return {
    id: g.id,
    label: g.title,
    target: Number(g.target_amount) || 0,
    saved: Number(g.current_amount) || 0,
    dueDate: g.target_date || "2026-12-31",
    color: "#3D784E",
    icon: g.icon || "🎯",
    linkedAccount: "BPI Savings",
    category: "General",
    createdDate: g.created_at,
  }
}

function mapGoalToRow(g: Goal, userId: string): any {
  return {
    id: g.id,
    user_id: userId,
    title: g.label,
    target_amount: g.target,
    current_amount: g.saved,
    target_date: g.dueDate,
    icon: g.icon || "🎯",
    color: 1,
    completed: g.saved >= g.target,
  }
}

function mapCatRowToBudget(c: any): Budget {
  return {
    id: c.id,
    category: c.name,
    limit: Number(c.monthly_limit) || 0,
    spent: Number(c.spent) || 0,
    period: "Monthly",
    icon: c.icon || "🍽️",
    color: "#3D784E",
  }
}

function mapBudgetToRow(b: Budget, userId: string): any {
  return {
    id: b.id,
    user_id: userId,
    name: b.category,
    type: "expense",
    monthly_limit: b.limit,
    spent: b.spent,
    icon: b.icon || "🍽️",
    updated_at: new Date().toISOString(),
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, isGuest } = useAuth()

  const [state, setState] = useState<State>({
    wallets: starterWallets,
    transactions: [],
    goals: [],
    budgets: [],
    debts: [],
    receivables: [],
    plannedPayments: [],
    installments: [],
    tags: [],
    chatMessages: [
      {
        role: "assistant",
        content: "Hi! I'm Pawi 🐢. Ask me about your money, balances, or a specific account. You can also type or dictate transactions, and I can log them for you whenever you're ready.",
      },
    ],
    defaultCurrency: "PHP",
    streakDays: 1,
    daysUntilPayday: 25,
    paydayAmount: 0,
    paydayDate: "May 15",
  })

  // Load and sync from Supabase PostgreSQL tables
  useEffect(() => {
    if (!user) {
      if (isGuest || (typeof window !== "undefined" && localStorage.getItem("pawi_guest_session") === "true")) {
        setState((prev) => ({
          ...prev,
          wallets: demoWallets,
          transactions: demoTransactions,
          goals: demoGoals,
          budgets: demoBudgets,
          debts: demoDebts,
          receivables: demoReceivables,
          plannedPayments: demoPlannedPayments,
          installments: demoInstallments,
          tags: demoTags,
        }))
        return
      }

      // Offline / default starter fallback state (clean minimal starter set)
      setState((prev) => ({
        ...prev,
        wallets: starterWallets,
        transactions: [],
        goals: [],
        budgets: [],
        debts: [],
        receivables: [],
        plannedPayments: [],
        installments: [],
        tags: [],
      }))
      return
    }

    if (isGuest || user.email === "demo@pawi.app") {
      setState((prev) => ({
        ...prev,
        wallets: demoWallets,
        transactions: demoTransactions,
        goals: demoGoals,
        budgets: demoBudgets,
        debts: demoDebts,
        receivables: demoReceivables,
        plannedPayments: demoPlannedPayments,
        installments: demoInstallments,
        tags: demoTags,
      }))
      return
    }

    const userId = user.id || (user as any).uid

    const fetchSupabaseData = async () => {
      try {
        const [
          { data: accountsData },
          { data: txData },
          { data: goalsData },
          { data: catData },
          { data: billsData },
        ] = await Promise.all([
          supabase.from("accounts").select("*").eq("user_id", userId),
          supabase.from("transactions").select("*").eq("user_id", userId).order("transaction_date", { ascending: false }),
          supabase.from("savings_goals").select("*").eq("user_id", userId),
          supabase.from("categories").select("*").eq("user_id", userId),
          supabase.from("recurring_bills").select("*").eq("user_id", userId),
        ])

        // If user already has accounts in database, hydrate state from Supabase
        if (accountsData && accountsData.length > 0) {
          setState((prev) => ({
            ...prev,
            wallets: accountsData.map(mapAccountToWallet),
            transactions: txData ? txData.map(mapTxRowToTransaction) : [],
            goals: goalsData ? goalsData.map(mapGoalRowToGoal) : [],
            budgets: catData ? catData.map(mapCatRowToBudget) : [],
            plannedPayments: billsData && billsData.length > 0
              ? billsData.map((b) => ({
                  id: b.id,
                  label: b.name,
                  amount: Number(b.amount) || 0,
                  dueDate: b.next_due_date || "Monthly",
                  frequency: (b.billing_cycle as any) || "recurring",
                  category: "Bills",
                  account: b.account_name || "Cash",
                  icon: "📅",
                }))
              : [],
          }))
        } else {
          // If no accounts found in Supabase (brand-new user), insert minimal starter set (GCash + BDO at 0.00)
          const starterAccountsToInsert = [
            {
              id: `gcash_${userId}`,
              user_id: userId,
              name: "GCash",
              type: "ewallet",
              balance: 0.0,
              currency: "PHP",
              color: 1,
              icon: "gcash",
              is_liability: false,
            },
            {
              id: `bdo_${userId}`,
              user_id: userId,
              name: "BDO",
              type: "savings",
              balance: 0.0,
              currency: "PHP",
              color: 2,
              icon: "bdo",
              is_liability: false,
            },
          ]

          await supabase.from("accounts").upsert(starterAccountsToInsert)

          const userStarterWallets: Wallet[] = [
            {
              id: `gcash_${userId}`,
              name: "GCash",
              subtitle: "E-Wallet · PHP",
              balance: 0,
              currency: "PHP",
              type: "ewallet",
              group: "ewallet",
              accent: "#007DFE",
              spendable: 0,
              notes: "Primary digital wallet for bills, food, and online transfers.",
            },
            {
              id: `bdo_${userId}`,
              name: "BDO",
              subtitle: "Savings · PHP",
              balance: 0,
              currency: "PHP",
              type: "savings",
              group: "bank",
              accent: "#003882",
              spendable: 0,
              notes: "Primary bank account.",
            },
          ]

          setState((prev) => ({
            ...prev,
            wallets: userStarterWallets,
            transactions: [],
            goals: [],
            budgets: [],
            debts: [],
            receivables: [],
            plannedPayments: [],
            installments: [],
            tags: [],
          }))
        }
      } catch (err) {
        console.warn("Supabase initial fetch info:", err)
      }
    }

    fetchSupabaseData()

    // Setup Supabase Realtime channel subscription for instant multi-device / multi-tab synchronization
    const channel = supabase
      .channel(`pawi-realtime-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        () => fetchSupabaseData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts", filter: `user_id=eq.${userId}` },
        () => fetchSupabaseData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories", filter: `user_id=eq.${userId}` },
        () => fetchSupabaseData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "savings_goals", filter: `user_id=eq.${userId}` },
        () => fetchSupabaseData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // -------------------------------------------------------------
  // CRUD Actions with Optimistic UI & Supabase Persistence
  // -------------------------------------------------------------

  const addTransaction = async (tx: Omit<Transaction, "id" | "time">) => {
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const newTx: Transaction = {
      ...tx,
      id: "tx_" + Date.now(),
      time: timeStr,
      dateHeader: "Today",
      date: now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase(),
    }

    const adjustment = tx.kind === "income" ? tx.amount : -tx.amount
    const updatedWallets = state.wallets.map((w) => {
      if (w.name.toLowerCase() === tx.account.toLowerCase() || tx.account.toLowerCase().includes(w.name.toLowerCase())) {
        return {
          ...w,
          balance: w.balance + adjustment,
          usedCredit: w.isLiability ? Math.max(0, (w.usedCredit || 0) + (tx.kind === "expense" ? tx.amount : -tx.amount)) : undefined,
        }
      }
      return w
    })

    // Optimistic UI Update
    setState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
      wallets: updatedWallets,
    }))

    if (user) {
      const userId = user.id || (user as any).uid
      const row = mapTransactionToRow(newTx, userId)
      await supabase.from("transactions").insert(row)

      const targetWallet = updatedWallets.find(
        (w) => w.name.toLowerCase() === tx.account.toLowerCase() || tx.account.toLowerCase().includes(w.name.toLowerCase())
      )
      if (targetWallet) {
        await supabase.from("accounts").upsert(mapWalletToAccount(targetWallet, userId))
      }
    }
  }

  const editTransaction = async (tx: Transaction) => {
    const oldTx = state.transactions.find((t) => t.id === tx.id)
    let updatedWallets = state.wallets

    if (oldTx) {
      const oldReversal = oldTx.kind === "income" ? -oldTx.amount : oldTx.amount
      updatedWallets = updatedWallets.map((w) => {
        if (w.name.toLowerCase() === oldTx.account.toLowerCase()) {
          return { ...w, balance: w.balance + oldReversal }
        }
        return w
      })

      const newAdjustment = tx.kind === "income" ? tx.amount : -tx.amount
      updatedWallets = updatedWallets.map((w) => {
        if (w.name.toLowerCase() === tx.account.toLowerCase()) {
          return { ...w, balance: w.balance + newAdjustment }
        }
        return w
      })
    }

    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => (t.id === tx.id ? tx : t)),
      wallets: updatedWallets,
    }))

    if (user) {
      const userId = user.id || (user as any).uid
      await supabase.from("transactions").upsert(mapTransactionToRow(tx, userId))
    }
  }

  const deleteTransaction = async (transactionId: string) => {
    const txToDelete = state.transactions.find((t) => t.id === transactionId)
    let updatedWallets = state.wallets

    if (txToDelete) {
      const reversal = txToDelete.kind === "income" ? -txToDelete.amount : txToDelete.amount
      updatedWallets = updatedWallets.map((w) => {
        if (w.name.toLowerCase() === txToDelete.account.toLowerCase() || txToDelete.account.toLowerCase().includes(w.name.toLowerCase())) {
          return { ...w, balance: w.balance + reversal }
        }
        return w
      })
    }

    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== transactionId),
      wallets: updatedWallets,
    }))

    if (user) {
      await supabase.from("transactions").delete().eq("id", transactionId)
    }
  }

  const addWallet = async (wallet: Omit<Wallet, "id">) => {
    const newWallet: Wallet = {
      ...wallet,
      id: "w_" + Date.now(),
    }

    setState((prev) => ({ ...prev, wallets: [...prev.wallets, newWallet] }))

    if (user) {
      const userId = user.id || (user as any).uid
      await supabase.from("accounts").insert(mapWalletToAccount(newWallet, userId))
    }
  }

  const updateWallet = async (wallet: Wallet) => {
    setState((prev) => ({
      ...prev,
      wallets: prev.wallets.map((w) => (w.id === wallet.id ? wallet : w)),
    }))

    if (user) {
      const userId = user.id || (user as any).uid
      await supabase.from("accounts").upsert(mapWalletToAccount(wallet, userId))
    }
  }

  const deleteWallet = async (walletId: string) => {
    setState((prev) => ({
      ...prev,
      wallets: prev.wallets.filter((w) => w.id !== walletId),
    }))

    if (user) {
      await supabase.from("accounts").delete().eq("id", walletId)
    }
  }

  const transferFunds = async ({
    fromWalletName,
    toWalletName,
    amount,
    note,
  }: {
    fromWalletName: string
    toWalletName: string
    amount: number
    note?: string
  }) => {
    if (amount <= 0) return

    const updatedWallets = state.wallets.map((w) => {
      if (w.name.toLowerCase() === fromWalletName.toLowerCase()) {
        return { ...w, balance: w.balance - amount }
      }
      if (w.name.toLowerCase() === toWalletName.toLowerCase()) {
        return { ...w, balance: w.balance + amount }
      }
      return w
    })

    const transferTx: Transaction = {
      id: "tx_" + Date.now(),
      label: "Transfer sent",
      note: note || `To ${toWalletName} • Inter-wallet top-up`,
      category: "Transfer",
      account: fromWalletName,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      amount: amount,
      currency: "PHP",
      kind: "expense",
      dateHeader: "Today",
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase(),
    }

    setState((prev) => ({
      ...prev,
      wallets: updatedWallets,
      transactions: [transferTx, ...prev.transactions],
    }))

    if (user) {
      const userId = user.id || (user as any).uid
      await Promise.allSettled([
        supabase.from("transactions").insert(mapTransactionToRow(transferTx, userId)),
        ...updatedWallets.map((w) => supabase.from("accounts").upsert(mapWalletToAccount(w, userId))),
      ])
    }
  }

  const addGoal = async (goal: Omit<Goal, "id">) => {
    const newGoal: Goal = { ...goal, id: "g_" + Date.now() }
    setState((prev) => ({ ...prev, goals: [...prev.goals, newGoal] }))

    if (user) {
      const userId = user.id || (user as any).uid
      await supabase.from("savings_goals").insert(mapGoalToRow(newGoal, userId))
    }
  }

  const editGoal = async (goal: Goal) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === goal.id ? goal : g)),
    }))

    if (user) {
      const userId = user.id || (user as any).uid
      await supabase.from("savings_goals").upsert(mapGoalToRow(goal, userId))
    }
  }

  const deleteGoal = async (goalId: string) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== goalId),
    }))

    if (user) {
      await supabase.from("savings_goals").delete().eq("id", goalId)
    }
  }

  const addBudget = async (budget: Omit<Budget, "id">) => {
    const newBudget: Budget = { ...budget, id: "b_" + Date.now() }
    setState((prev) => ({ ...prev, budgets: [...prev.budgets, newBudget] }))

    if (user) {
      const userId = user.id || (user as any).uid
      await supabase.from("categories").insert(mapBudgetToRow(newBudget, userId))
    }
  }

  const editBudget = async (budget: Budget) => {
    setState((prev) => ({
      ...prev,
      budgets: prev.budgets.map((b) => (b.id === budget.id ? budget : b)),
    }))

    if (user) {
      const userId = user.id || (user as any).uid
      await supabase.from("categories").upsert(mapBudgetToRow(budget, userId))
    }
  }

  const deleteBudget = async (budgetId: string) => {
    setState((prev) => ({
      ...prev,
      budgets: prev.budgets.filter((b) => b.id !== budgetId),
    }))

    if (user) {
      await supabase.from("categories").delete().eq("id", budgetId)
    }
  }

  // Debt CRUD
  const addDebt = async (debt: Omit<Debt, "id">) => {
    const newDebt: Debt = { ...debt, id: "d_" + Date.now() }
    setState((prev) => ({ ...prev, debts: [...prev.debts, newDebt] }))
  }

  const editDebt = async (debt: Debt) => {
    setState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => (d.id === debt.id ? debt : d)),
    }))
  }

  const deleteDebt = async (debtId: string) => {
    setState((prev) => ({
      ...prev,
      debts: prev.debts.filter((d) => d.id !== debtId),
    }))
  }

  // Receivable CRUD
  const addReceivable = async (receivable: Omit<Receivable, "id">) => {
    const newRec: Receivable = { ...receivable, id: "rec_" + Date.now() }
    setState((prev) => ({ ...prev, receivables: [...prev.receivables, newRec] }))
  }

  const editReceivable = async (receivable: Receivable) => {
    setState((prev) => ({
      ...prev,
      receivables: prev.receivables.map((r) => (r.id === receivable.id ? receivable : r)),
    }))
  }

  const deleteReceivable = async (receivableId: string) => {
    setState((prev) => ({
      ...prev,
      receivables: prev.receivables.filter((r) => r.id !== receivableId),
    }))
  }

  // Planned Payment CRUD
  const addPlannedPayment = async (payment: Omit<PlannedPayment, "id">) => {
    const newPay: PlannedPayment = { ...payment, id: "pp_" + Date.now() }
    setState((prev) => ({ ...prev, plannedPayments: [...prev.plannedPayments, newPay] }))

    if (user) {
      const userId = user.id || (user as any).uid
      await supabase.from("recurring_bills").insert({
        id: newPay.id,
        user_id: userId,
        name: newPay.label,
        amount: newPay.amount,
        billing_cycle: newPay.frequency,
        due_day: 15,
        next_due_date: newPay.dueDate || "Monthly",
        account_name: newPay.account,
      })
    }
  }

  const editPlannedPayment = async (payment: PlannedPayment) => {
    setState((prev) => ({
      ...prev,
      plannedPayments: prev.plannedPayments.map((p) => (p.id === payment.id ? payment : p)),
    }))
  }

  const deletePlannedPayment = async (paymentId: string) => {
    setState((prev) => ({
      ...prev,
      plannedPayments: prev.plannedPayments.filter((p) => p.id !== paymentId),
    }))

    if (user) {
      await supabase.from("recurring_bills").delete().eq("id", paymentId)
    }
  }

  // Installment CRUD
  const addInstallment = async (installment: Omit<Installment, "id">) => {
    const newInst: Installment = { ...installment, id: "inst_" + Date.now() }
    setState((prev) => ({ ...prev, installments: [...prev.installments, newInst] }))
  }

  const editInstallment = async (installment: Installment) => {
    setState((prev) => ({
      ...prev,
      installments: prev.installments.map((i) => (i.id === installment.id ? installment : i)),
    }))
  }

  const deleteInstallment = async (installmentId: string) => {
    setState((prev) => ({
      ...prev,
      installments: prev.installments.filter((i) => i.id !== installmentId),
    }))
  }

  // Tag CRUD
  const addTag = async (tag: Omit<Tag, "id">) => {
    const newTag: Tag = { ...tag, id: "tag_" + Date.now() }
    setState((prev) => ({ ...prev, tags: [...prev.tags, newTag] }))
  }

  const deleteTag = async (tagId: string) => {
    setState((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t.id !== tagId),
    }))
  }

  const addFundsToGoal = async (goalId: string, amount: number, fromWalletName?: string) => {
    if (amount <= 0) return

    const updatedGoals = state.goals.map((g) =>
      g.id === goalId ? { ...g, saved: g.saved + amount } : g
    )

    let updatedWallets = state.wallets
    if (fromWalletName) {
      updatedWallets = updatedWallets.map((w) => {
        if (w.name.toLowerCase() === fromWalletName.toLowerCase()) {
          return { ...w, balance: Math.max(0, w.balance - amount) }
        }
        return w
      })
    }

    const targetGoal = state.goals.find((g) => g.id === goalId)
    const goalTx: Transaction = {
      id: "tx_" + Date.now(),
      label: `Goal deposit: ${targetGoal?.name || "Savings"}`,
      category: "Savings Goal",
      account: fromWalletName || (state.wallets[0]?.name ?? "Cash"),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      amount: amount,
      currency: "PHP",
      kind: "expense",
      dateHeader: "Today",
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase(),
    }

    setState((prev) => ({
      ...prev,
      goals: updatedGoals,
      wallets: updatedWallets,
      transactions: [goalTx, ...prev.transactions],
    }))

    if (user) {
      const userId = user.id || (user as any).uid
      const modGoal = updatedGoals.find((g) => g.id === goalId)
      if (modGoal) {
        await supabase.from("savings_goals").upsert(mapGoalToRow(modGoal, userId))
      }
      await supabase.from("transactions").insert(mapTransactionToRow(goalTx, userId))
    }
  }

  const updateWalletNotes = async (walletId: string, notes: string) => {
    const updatedWallets = state.wallets.map((w) =>
      w.id === walletId ? { ...w, notes } : w
    )
    setState((prev) => ({ ...prev, wallets: updatedWallets }))

    if (user) {
      const target = updatedWallets.find((w) => w.id === walletId)
      if (target) {
        const userId = user.id || (user as any).uid
        await supabase.from("accounts").upsert(mapWalletToAccount(target, userId))
      }
    }
  }

  const adjustWalletBalance = async (walletId: string, newBalance: number, reason?: string) => {
    const targetWallet = state.wallets.find((w) => w.id === walletId)
    if (!targetWallet) return

    const diff = newBalance - targetWallet.balance
    if (diff === 0) return

    const isIncome = diff > 0
    const absDiff = Math.abs(diff)

    const adjustTx: Transaction = {
      id: "tx_" + Date.now(),
      label: reason || `Balance adjustment for ${targetWallet.name}`,
      category: "Adjustment",
      account: targetWallet.name,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      amount: absDiff,
      currency: targetWallet.currency,
      kind: isIncome ? "income" : "expense",
      dateHeader: "Today",
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase(),
    }

    const updatedWallets = state.wallets.map((w) =>
      w.id === walletId ? { ...w, balance: newBalance } : w
    )

    setState((prev) => ({
      ...prev,
      wallets: updatedWallets,
      transactions: [adjustTx, ...prev.transactions],
    }))

    if (user) {
      const userId = user.id || (user as any).uid
      const target = updatedWallets.find((w) => w.id === walletId)
      if (target) {
        await supabase.from("accounts").upsert(mapWalletToAccount(target, userId))
      }
      await supabase.from("transactions").insert(mapTransactionToRow(adjustTx, userId))
    }
  }

  const resetAccountData = async () => {
    const userId = user ? (user.id || (user as any).uid) : "local"
    const userStarterWallets: Wallet[] = [
      {
        id: user ? `gcash_${userId}` : "gcash",
        name: "GCash",
        subtitle: "E-Wallet · PHP",
        balance: 0,
        currency: "PHP",
        type: "ewallet",
        group: "ewallet",
        accent: "#007DFE",
        spendable: 0,
        notes: "Primary digital wallet for bills, food, and online transfers.",
      },
      {
        id: user ? `bdo_${userId}` : "bdo",
        name: "BDO",
        subtitle: "Savings · PHP",
        balance: 0,
        currency: "PHP",
        type: "savings",
        group: "bank",
        accent: "#003882",
        spendable: 0,
        notes: "Primary bank account.",
      },
    ]

    const cleanState: State = {
      wallets: userStarterWallets,
      transactions: [],
      goals: [],
      budgets: [],
      debts: [],
      receivables: [],
      plannedPayments: [],
      installments: [],
      tags: [],
      chatMessages: [
        {
          role: "assistant",
          content: "Hi! I'm Pawi 🐢. Ask me about your money, balances, or a specific account. You can also type or dictate transactions, and I can log them for you whenever you're ready.",
        },
      ],
      defaultCurrency: "PHP",
      streakDays: 1,
      daysUntilPayday: 25,
      paydayAmount: 0,
      paydayDate: "May 15",
    }
    setState(cleanState)

    // Clear all client-side storage layers
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("pawi_guest_session")
        localStorage.removeItem("pawi_state")
        localStorage.removeItem("pawi_wallets")
        localStorage.removeItem("pawi_transactions")
        localStorage.removeItem("pawi_goals")
        localStorage.removeItem("pawi_budgets")
        localStorage.removeItem("pawi_debts")
        localStorage.removeItem("pawi_receivables")
        localStorage.removeItem("pawi_planned_payments")
        localStorage.removeItem("sentimo_insight_history")
        localStorage.removeItem("pawi_user_data_wiped")
      } catch (e) {
        console.warn("Error clearing localStorage:", e)
      }
    }

    if (user && !isGuest) {
      // 1. Delete all previous transactions, goals, categories, bills, and accounts
      await Promise.allSettled([
        supabase.from("transactions").delete().eq("user_id", userId),
        supabase.from("savings_goals").delete().eq("user_id", userId),
        supabase.from("categories").delete().eq("user_id", userId),
        supabase.from("recurring_bills").delete().eq("user_id", userId),
        supabase.from("accounts").delete().eq("user_id", userId),
      ])

      // 2. Re-insert the 2 clean starter accounts (GCash 0, BDO 0)
      const starterAccounts = [
        {
          id: `gcash_${userId}`,
          user_id: userId,
          name: "GCash",
          type: "ewallet",
          balance: 0.0,
          currency: "PHP",
          color: 1,
          icon: "gcash",
          is_liability: false,
        },
        {
          id: `bdo_${userId}`,
          user_id: userId,
          name: "BDO",
          type: "savings",
          balance: 0.0,
          currency: "PHP",
          color: 2,
          icon: "bdo",
          is_liability: false,
        },
      ]
      await supabase.from("accounts").upsert(starterAccounts)
    }
  }

  const loadSampleData = async () => {
    const sampleState: State = {
      wallets: demoWallets,
      transactions: demoTransactions,
      goals: demoGoals,
      budgets: demoBudgets,
      debts: demoDebts,
      receivables: demoReceivables,
      plannedPayments: demoPlannedPayments,
      installments: demoInstallments,
      tags: demoTags,
      chatMessages: [
        {
          role: "assistant",
          content: "Hi! I'm Pawi 🐢. Ask me about your money, balances, or a specific account. You can also type or dictate transactions, and I can log them for you whenever you're ready.",
        },
      ],
      defaultCurrency: "PHP",
      streakDays: 6,
      daysUntilPayday: 25,
      paydayAmount: 18500,
      paydayDate: "May 15",
    }
    setState(sampleState)

    if (user && !isGuest) {
      const userId = user.id || (user as any).uid
      await Promise.allSettled([
        supabase.from("accounts").upsert(demoWallets.map((w) => mapWalletToAccount(w, userId))),
        supabase.from("categories").upsert(demoBudgets.map((b) => mapBudgetToRow(b, userId))),
        supabase.from("savings_goals").upsert(demoGoals.map((g) => mapGoalToRow(g, userId))),
        supabase.from("transactions").upsert(demoTransactions.map((t) => mapTransactionToRow(t, userId))),
      ])
    }
  }

  const setChatMessages = async (msgs: ChatMessage[]) => {
    setState((prev) => ({ ...prev, chatMessages: msgs }))
  }

  const setDefaultCurrency = async (currency: CurrencyCode) => {
    setState((prev) => ({ ...prev, defaultCurrency: currency }))
    if (user) {
      const userId = user.id || (user as any).uid
      await supabase.from("profiles").upsert({ id: userId, currency })
    }
  }

  return (
    <StoreContext.Provider
      value={{
        ...state,
        addTransaction,
        editTransaction,
        deleteTransaction,
        addWallet,
        updateWallet,
        deleteWallet,
        transferFunds,
        addGoal,
        editGoal,
        deleteGoal,
        addBudget,
        editBudget,
        deleteBudget,
        addDebt,
        editDebt,
        deleteDebt,
        addReceivable,
        editReceivable,
        deleteReceivable,
        addPlannedPayment,
        editPlannedPayment,
        deletePlannedPayment,
        addInstallment,
        editInstallment,
        deleteInstallment,
        addTag,
        deleteTag,
        addFundsToGoal,
        updateWalletNotes,
        adjustWalletBalance,
        setChatMessages,
        setDefaultCurrency,
        resetAccountData,
        loadSampleData,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider")
  }
  return context
}
