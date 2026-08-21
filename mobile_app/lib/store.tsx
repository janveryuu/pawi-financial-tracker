"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import {
  Wallet,
  Transaction,
  Goal,
  Budget,
  CurrencyCode,
  wallets as defaultWallets,
  transactions as defaultTransactions,
  goals as defaultGoals,
  budgets as defaultBudgets,
} from "./pawi-data"
import { useAuth } from "./auth-context"
import { db } from "./firebase"
import { doc, setDoc, onSnapshot } from "firebase/firestore"

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
  addFundsToGoal: (goalId: string, amount: number, fromWalletName?: string) => Promise<void>
  updateWalletNotes: (walletId: string, notes: string) => Promise<void>
  adjustWalletBalance: (walletId: string, newBalance: number, reason?: string) => Promise<void>
  setChatMessages: (msgs: ChatMessage[]) => Promise<void>
  setDefaultCurrency: (currency: CurrencyCode) => Promise<void>
  resetAccountData: () => Promise<void>
  loadSampleData: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<State>({
    wallets: [],
    transactions: [],
    goals: [],
    budgets: [],
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
  })

  // Load and sync from Firestore
  useEffect(() => {
    if (!user) {
      setState({
        wallets: [],
        transactions: [],
        goals: [],
        budgets: [],
        chatMessages: [],
        defaultCurrency: "PHP",
        streakDays: 6,
        daysUntilPayday: 25,
        paydayAmount: 18500,
        paydayDate: "May 15",
      })
      return
    }

    const docRef = doc(db, "users", user.uid)
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<State>
        setState((prev) => ({
          ...prev,
          wallets: data.wallets || [],
          transactions: data.transactions || [],
          goals: data.goals || [],
          budgets: data.budgets || [],
          chatMessages: data.chatMessages && data.chatMessages.length > 0
            ? data.chatMessages
            : [
                {
                  role: "assistant",
                  content: "Hi! I'm Pawi 🐢. Ask me about your money, balances, or a specific account. You can also type or dictate transactions, and I can log them for you whenever you're ready.",
                },
              ],
          defaultCurrency: data.defaultCurrency || "PHP",
          streakDays: data.streakDays ?? 6,
          daysUntilPayday: data.daysUntilPayday ?? 25,
          paydayAmount: data.paydayAmount ?? 18500,
          paydayDate: data.paydayDate || "May 15",
        }))
      } else {
        // Initialize with clean starter state
        const cleanState: State = {
          wallets: defaultWallets,
          transactions: defaultTransactions,
          goals: defaultGoals,
          budgets: defaultBudgets,
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
        setDoc(docRef, cleanState)
        setState(cleanState)
      }
    })

    return () => unsubscribe()
  }, [user])

  const setChatMessages = async (msgs: ChatMessage[]) => {
    setState((prev) => ({ ...prev, chatMessages: msgs }))
    if (!user) return
    try {
      await setDoc(doc(db, "users", user.uid), { chatMessages: msgs }, { merge: true })
    } catch (error) {
      console.error("Failed to sync chat messages:", error)
    }
  }

  const setDefaultCurrency = async (currency: CurrencyCode) => {
    if (!user) return
    const newState = { ...state, defaultCurrency: currency }
    setState(newState)
    await setDoc(doc(db, "users", user.uid), { defaultCurrency: currency }, { merge: true })
  }

  const addTransaction = async (tx: Omit<Transaction, "id" | "time">) => {
    if (!user) return

    const newTx: Transaction = {
      ...tx,
      id: "tx_" + Date.now(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    const adjustment = tx.kind === "income" ? tx.amount : -tx.amount
    let matched = false
    let updatedWallets = state.wallets.map((w) => {
      const wName = w.name.toLowerCase()
      const txAcc = (tx.account || "Cash").toLowerCase()
      if (wName === txAcc || wName.includes(txAcc) || txAcc.includes(wName)) {
        matched = true
        return { ...w, balance: w.balance + adjustment }
      }
      return w
    })

    if (!matched) {
      if (state.wallets.length === 0) {
        const newWallet: Wallet = {
          id: "w_" + Date.now(),
          name: tx.account || "Cash",
          subtitle: "Debit · PHP",
          balance: adjustment,
          currency: tx.currency || "PHP",
          type: "cash",
          accent: "oklch(0.52 0.12 145)",
        }
        updatedWallets = [newWallet]
      } else {
        updatedWallets = state.wallets.map((w, index) => {
          if (index === 0) return { ...w, balance: w.balance + adjustment }
          return w
        })
      }
    }

    // Also update budget spent if it's an expense and category matches
    let updatedBudgets = state.budgets
    if (tx.kind === "expense" && tx.category) {
      updatedBudgets = state.budgets.map((b) => {
        if (b.category.toLowerCase() === tx.category.toLowerCase()) {
          return { ...b, spent: b.spent + tx.amount }
        }
        return b
      })
    }

    const newState = {
      ...state,
      transactions: [newTx, ...state.transactions],
      wallets: updatedWallets,
      budgets: updatedBudgets,
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const editTransaction = async (tx: Transaction) => {
    if (!user) return

    const oldTx = state.transactions.find((t) => t.id === tx.id)
    let updatedWallets = state.wallets

    if (oldTx) {
      // Revert old transaction
      const oldReversal = oldTx.kind === "income" ? -oldTx.amount : oldTx.amount
      updatedWallets = updatedWallets.map((w) => {
        if (w.name.toLowerCase() === oldTx.account.toLowerCase()) {
          return { ...w, balance: w.balance + oldReversal }
        }
        return w
      })

      // Apply new transaction
      const newAdjustment = tx.kind === "income" ? tx.amount : -tx.amount
      updatedWallets = updatedWallets.map((w) => {
        if (w.name.toLowerCase() === tx.account.toLowerCase()) {
          return { ...w, balance: w.balance + newAdjustment }
        }
        return w
      })
    }

    const newState = {
      ...state,
      transactions: state.transactions.map((t) => (t.id === tx.id ? tx : t)),
      wallets: updatedWallets,
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const deleteTransaction = async (transactionId: string) => {
    if (!user) return

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

    const newState = {
      ...state,
      transactions: state.transactions.filter((t) => t.id !== transactionId),
      wallets: updatedWallets,
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const addWallet = async (wallet: Omit<Wallet, "id">) => {
    if (!user) return

    const newWallet: Wallet = {
      ...wallet,
      id: "w_" + Date.now(),
    }

    const newState = {
      ...state,
      wallets: [...state.wallets, newWallet],
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const updateWallet = async (wallet: Wallet) => {
    if (!user) return

    const newState = {
      ...state,
      wallets: state.wallets.map((w) => (w.id === wallet.id ? wallet : w)),
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const deleteWallet = async (walletId: string) => {
    if (!user) return
    const newState = {
      ...state,
      wallets: state.wallets.filter((w) => w.id !== walletId),
    }
    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
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
    if (!user || amount <= 0) return

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
      label: note || `Transfer: ${fromWalletName} → ${toWalletName}`,
      category: "Transfer",
      account: fromWalletName,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      amount: amount,
      currency: "PHP",
      kind: "expense",
    }

    const newState = {
      ...state,
      wallets: updatedWallets,
      transactions: [transferTx, ...state.transactions],
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const addGoal = async (goal: Omit<Goal, "id">) => {
    if (!user) return

    const newGoal: Goal = {
      ...goal,
      id: "g_" + Date.now(),
    }

    const newState = {
      ...state,
      goals: [...state.goals, newGoal],
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const editGoal = async (goal: Goal) => {
    if (!user) return

    const newState = {
      ...state,
      goals: state.goals.map((g) => (g.id === goal.id ? goal : g)),
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const deleteGoal = async (goalId: string) => {
    if (!user) return

    const newState = {
      ...state,
      goals: state.goals.filter((g) => g.id !== goalId),
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const addBudget = async (budget: Omit<Budget, "id">) => {
    if (!user) return

    const newBudget: Budget = {
      ...budget,
      id: "b_" + Date.now(),
    }

    const newState = {
      ...state,
      budgets: [...state.budgets, newBudget],
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const editBudget = async (budget: Budget) => {
    if (!user) return

    const newState = {
      ...state,
      budgets: state.budgets.map((b) => (b.id === budget.id ? budget : b)),
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const deleteBudget = async (budgetId: string) => {
    if (!user) return

    const newState = {
      ...state,
      budgets: state.budgets.filter((b) => b.id !== budgetId),
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const addFundsToGoal = async (goalId: string, amount: number, fromWalletName?: string) => {
    if (!user || amount <= 0) return

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
    }

    const newState = {
      ...state,
      goals: updatedGoals,
      wallets: updatedWallets,
      transactions: [goalTx, ...state.transactions],
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const updateWalletNotes = async (walletId: string, notes: string) => {
    if (!user) return
    const updatedWallets = state.wallets.map((w) =>
      w.id === walletId ? { ...w, notes } : w
    )
    const newState = { ...state, wallets: updatedWallets }
    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const adjustWalletBalance = async (walletId: string, newBalance: number, reason?: string) => {
    if (!user) return
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
      date: "TODAY",
    }

    const updatedWallets = state.wallets.map((w) =>
      w.id === walletId ? { ...w, balance: newBalance } : w
    )

    const newState = {
      ...state,
      wallets: updatedWallets,
      transactions: [adjustTx, ...state.transactions],
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const resetAccountData = async () => {

    if (!user) return
    const cleanState: State = {
      wallets: [
        {
          id: "cash",
          name: "Cash",
          subtitle: "Default · PHP",
          balance: 0,
          currency: "PHP",
          type: "cash",
          accent: "oklch(0.52 0.12 145)",
        },
      ],
      transactions: [],
      goals: [],
      budgets: [],
      chatMessages: [
        {
          role: "assistant",
          content: "Hi! I'm Pawi 🐢. Ask me about your money, balances, or a specific account. You can also type or dictate transactions, and I can log them for you whenever you're ready.",
        },
      ],
      defaultCurrency: "PHP",
      streakDays: 1,
      daysUntilPayday: 25,
      paydayAmount: 18500,
      paydayDate: "May 15",
    }
    setState(cleanState)
    await setDoc(doc(db, "users", user.uid), cleanState)
  }

  const loadSampleData = async () => {
    if (!user) return
    const sampleState: State = {
      wallets: defaultWallets,
      transactions: defaultTransactions,
      goals: defaultGoals,
      budgets: defaultBudgets,
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
    await setDoc(doc(db, "users", user.uid), sampleState)
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

