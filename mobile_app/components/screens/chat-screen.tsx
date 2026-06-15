"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User } from "lucide-react"
import { useStore } from "@/lib/store"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function ChatScreen() {
  const { wallets, goals, budgets, transactions, chatMessages, setChatMessages, defaultCurrency } = useStore()
  const messages = chatMessages || []
  
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage = input.trim()
    setInput("")
    
    const newMessages = [...messages, { role: "user" as const, content: userMessage }]
    setChatMessages(newMessages)
    setIsLoading(true)

    // Compute simple summaries for context so we don't blow up payload size too much
    const context = {
      defaultCurrency,
      wallets: wallets.map(w => ({ name: w.name, balance: w.balance, type: w.type, currency: w.currency })),
      goals: goals.map(g => ({ name: g.name, saved: g.saved, target: g.target })),
      budgets: budgets.map(b => ({ category: b.category, spent: b.spent, limit: b.limit })),
      // only send recent 10 transactions to save context
      recentTransactions: transactions.slice(0, 10).map(t => ({ label: t.label, amount: t.amount, kind: t.kind, category: t.category, date: t.date || t.time }))
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages,
          context 
        })
      })
      const data = await res.json()
      setChatMessages([...newMessages, { role: "assistant", content: data.reply || "I'm sorry, I couldn't process that right now." }])
    } catch (error) {
      setChatMessages([...newMessages, { role: "assistant", content: "Oops, something went wrong connecting to my brain. Please try again later! 🐢" }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col px-5 pt-4">
      <div className="flex-1 overflow-y-auto rounded-3xl border border-border/60 bg-card p-4 shadow-sm scrollbar-hide">
        <div className="flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"}`}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[75%] rounded-2xl bg-secondary px-4 py-2 text-sm text-foreground rounded-tl-sm">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask Pawi..."
          className="flex-1 rounded-full border border-border bg-card px-4 py-3 text-sm text-foreground outline-none ring-primary/30 transition placeholder:text-muted-foreground focus:ring-2"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
