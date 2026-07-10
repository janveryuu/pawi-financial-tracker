"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { Wallet, Transaction, Goal, Budget, CurrencyCode, wallets as defaultWallets, transactions as defaultTransactions, goals as defaultGoals, budgets as defaultBudgets } from "./pawi-data"
import { useAuth } from "./auth-context"
import { db } from "./firebase"
import { doc, setDoc, onSnapshot } from "firebase/firestore"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface State {
  wallets: Wallet[]
  transactions: Transaction[]
  goals: Goal[]
  budgets: Budget[]
  chatMessages: ChatMessage[]
  defaultCurrency: CurrencyCode
}

interface StoreContextType extends State {
  addTransaction: (tx: Omit<Transaction, "id" | "time">) => void
  addWallet: (wallet: Omit<Wallet, "id">) => void
  addGoal: (goal: Omit<Goal, "id">) => void
  addBudget: (budget: Omit<Budget, "id">) => void
  addFundsToGoal: (goalId: string, amount: number) => void
  setChatMessages: (msgs: ChatMessage[]) => void
  setDefaultCurrency: (currency: CurrencyCode) => void
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
    chatMessages: [{ role: "assistant", content: "Hi! I'm Pawi 🐢. I can help you analyze your spending, answer financial questions, or just chat about your goals. What's on your mind?" }],
    defaultCurrency: "PHP"
  })

  // Load and sync from Firestore
  useEffect(() => {
    if (!user) {
      // Clear state when logged out
      setState({ wallets: [], transactions: [], goals: [], budgets: [], chatMessages: [], defaultCurrency: "PHP" })
      return
    }

    const docRef = doc(db, "users", user.uid)
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as State
        if (!data.chatMessages) {
          data.chatMessages = [{ role: "assistant", content: "Hi! I'm Pawi 🐢. I can help you analyze your spending, answer financial questions, or just chat about your goals. What's on your mind?" }]
        }
        if (!data.defaultCurrency) {
          data.defaultCurrency = "PHP"
        }
        setState(data)
      } else {
        // Initialize with clean, empty state for new users
        const cleanState: State = {
          wallets: [
            {
              id: "cash",
              name: "Cash",
              subtitle: "Default · PHP",
              balance: 0,
              currency: "PHP",
              type: "cash",
              accent: "oklch(0.7 0.13 145)",
            }
          ],
          transactions: [],
          goals: [],
          budgets: [],
          chatMessages: [{ role: "assistant", content: "Hi! I'm Pawi 🐢. I can help you analyze your spending, answer financial questions, or just chat about your goals. What's on your mind?" }],
          defaultCurrency: "PHP"
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
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    // Update wallet balance
    const updatedWallets = state.wallets.map(w => {
      if (w.name === tx.account) {
        const adjustment = tx.kind === "income" ? tx.amount : -tx.amount
        return { ...w, balance: w.balance + adjustment }
      }
      return w
    })

    const newState = {
      ...state,
      transactions: [newTx, ...state.transactions],
      wallets: updatedWallets
    }

    // Optimistic local update
    setState(newState)

    // Save to Firestore
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const addWallet = async (wallet: Omit<Wallet, "id">) => {
    if (!user) return

    const newWallet: Wallet = {
      ...wallet,
      id: "w_" + Date.now()
    }

    const newState = {
      ...state,
      wallets: [...state.wallets, newWallet]
    }

    // Optimistic local update
    setState(newState)

    // Save to Firestore
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const addGoal = async (goal: Omit<Goal, "id">) => {
    if (!user) return

    const newGoal: Goal = {
      ...goal,
      id: "g_" + Date.now()
    }

    const newState = {
      ...state,
      goals: [...state.goals, newGoal]
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const addBudget = async (budget: Omit<Budget, "id">) => {
    if (!user) return

    const newBudget: Budget = {
      ...budget,
      id: "b_" + Date.now()
    }

    const newState = {
      ...state,
      budgets: [...state.budgets, newBudget]
    }

    setState(newState)
    await setDoc(doc(db, "users", user.uid), newState, { merge: true })
  }

  const addFundsToGoal = async (goalId: string, amount: number) => {
    if (!user) return

    const updatedGoals = state.goals.map((g) =>
      g.id === goalId ? { ...g, saved: g.saved + amount } : g
    )

    const newState = {
      ...state,
      goals: updatedGoals,
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
          accent: "oklch(0.7 0.13 145)",
        }
      ],
      transactions: [],
      goals: [],
      budgets: [],
      chatMessages: [{ role: "assistant", content: "Hi! I'm Pawi 🐢. I can help you analyze your spending, answer financial questions, or just chat about your goals. What's on your mind?" }],
      defaultCurrency: "PHP"
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
      chatMessages: [{ role: "assistant", content: "Hi! I'm Pawi 🐢. I can help you analyze your spending, answer financial questions, or just chat about your goals. What's on your mind?" }],
      defaultCurrency: "PHP"
    }
    setState(sampleState)
    await setDoc(doc(db, "users", user.uid), sampleState)
  }

  return (
    <StoreContext.Provider value={{ ...state, addTransaction, addWallet, addGoal, addBudget, addFundsToGoal, setChatMessages, setDefaultCurrency, resetAccountData, loadSampleData }}>
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
