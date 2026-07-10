"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Send, Bot, User, Trash2 } from "lucide-react"
import { useStore } from "@/lib/store"

interface Message {
  role: "user" | "assistant"
  content: string
}

function isClearChatCommand(text: string): boolean {
  const lower = text.trim().toLowerCase()

  const directCommands = [
    "clear chat",
    "clear conversation",
    "clear messages",
    "clear all messages",
    "clear history",
    "clear everything",
    "remove chat",
    "remove conversation",
    "remove messages",
    "remove all messages",
    "remove all the message",
    "remove all the messages",
    "remove history",
    "remove everything",
    "delete chat",
    "delete conversation",
    "delete messages",
    "delete all messages",
    "delete history",
    "delete everything",
    "reset chat",
    "reset conversation",
    "reset messages",
    "erase chat",
    "erase conversation",
    "erase messages",
  ]

  if (directCommands.some((cmd) => lower === cmd || lower.startsWith(cmd))) {
    return true
  }

  const hasClearVerb = /\b(remove|clear|delete|reset|erase|wipe)\b/.test(lower)
  const hasChatTarget = /\b(message|messages|conversation|chat|history|everything)\b/.test(lower)

  if (hasClearVerb && hasChatTarget) {
    if (!/\b(transaction|wallet|budget|goal|expense|income)\b/.test(lower)) {
      return true
    }
  }

  return false
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

  const handleClearChat = () => {
    setChatMessages([
      {
        role: "assistant",
        content: "Cowabunga! 🌊 All messages and conversation history have been cleared! We have a fresh new slate. What would you like to ask Pawi today? 🐢✨",
      },
    ])
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage = input.trim()
    setInput("")

    if (isClearChatCommand(userMessage)) {
      handleClearChat()
      return
    }
    
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
      <style jsx global>{`
        #pawi-mascot-btn {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      `}</style>
      {/* Top Bar with Clear Chat button */}
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-border/60 bg-card/90 px-4 py-2.5 shadow-xs backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 overflow-hidden">
            <Image src="/pawi-robot.png" alt="Pawi AI" width={28} height={28} className="h-7 w-7 object-contain scale-110" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">Ask Pawi</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Ask Pawi anything or say &quot;clear chat&quot;</p>
          </div>
        </div>
        
        {messages.length > 1 && (
          <button
            onClick={handleClearChat}
            title="Clear conversation"
            className="flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-3xl border border-border/60 bg-card p-4 shadow-sm scrollbar-hide">
        <div className="flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/15"}`}>
                {msg.role === "user" ? (
                  <User className="h-5 w-5" />
                ) : (
                  <Image src="/pawi-robot.png" alt="Pawi AI" width={36} height={36} className="h-9 w-9 object-contain scale-110" />
                )}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden bg-primary/15">
                <Image src="/pawi-robot.png" alt="Pawi AI" width={36} height={36} className="h-9 w-9 object-contain scale-110" />
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
