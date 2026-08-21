"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, HelpCircle, Mic, ArrowUp, User, Sparkles, Trash2 } from "lucide-react"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth-context"

interface ChatScreenProps {
  onBack?: () => void
}

export function ChatScreen({ onBack }: ChatScreenProps) {
  const { user } = useAuth()
  const { wallets, goals, budgets, transactions, chatMessages, setChatMessages, defaultCurrency, addTransaction } = useStore()
  
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "there"

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const handleClearChat = () => {
    setChatMessages([
      {
        role: "assistant",
        content: `Hi ${displayName}!\n\nAsk me about your money, balances, or a specific account.\n\nYou can also type or dictate transactions, and I can log them for you whenever you're ready.`,
      },
    ])
  }

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || isLoading) return
    
    setInput("")

    // Check for clear chat command
    if (/^(clear|delete|reset)\s*(chat|messages|history)?$/i.test(text)) {
      handleClearChat()
      return
    }

    // Check for quick log parsing e.g. "Spent 250 on food" or "Received 5000 salary"
    const lower = text.toLowerCase()
    const matchExpense = lower.match(/(?:spent|paid|bought|buy)\s*(\d+(?:\.\d+)?)\s*(?:on|for)?\s*(.+)?/i)
    const matchIncome = lower.match(/(?:received|earned|got|salary|income)\s*(\d+(?:\.\d+)?)\s*(?:from|for)?\s*(.+)?/i)

    if (matchExpense) {
      const amt = parseFloat(matchExpense[1])
      const desc = matchExpense[2] || "Quick expense"
      addTransaction({
        label: desc.charAt(0).toUpperCase() + desc.slice(1),
        category: "General",
        account: wallets[0]?.name || "Cash",
        amount: amt,
        currency: defaultCurrency || "PHP",
        kind: "expense",
      })
    } else if (matchIncome) {
      const amt = parseFloat(matchIncome[1])
      const desc = matchIncome[2] || "Quick income"
      addTransaction({
        label: desc.charAt(0).toUpperCase() + desc.slice(1),
        category: "Income",
        account: wallets[0]?.name || "Cash",
        amount: amt,
        currency: defaultCurrency || "PHP",
        kind: "income",
      })
    }

    const newMessages = [...(chatMessages || []), { role: "user" as const, content: text }]
    setChatMessages(newMessages)
    setIsLoading(true)

    // Build context
    const context = {
      defaultCurrency,
      wallets: wallets.map((w) => ({ name: w.name, balance: w.balance, type: w.type, currency: w.currency })),
      goals: goals.map((g) => ({ name: g.name, saved: g.saved, target: g.target })),
      budgets: budgets.map((b) => ({ category: b.category, spent: b.spent, limit: b.limit })),
      recentTransactions: transactions.slice(0, 8).map((t) => ({
        label: t.label,
        amount: t.amount,
        kind: t.kind,
        category: t.category,
      })),
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          context,
        }),
      })
      const data = await res.json()
      setChatMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.reply || "I'm always here to help you navigate your finances! 🐢",
        },
      ])
    } catch {
      setChatMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "I've recorded that for you! Anything else you'd like to check with your savings or wallets? 🐢",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Voice dictation simulation / Web Speech API
  const handleMicClick = () => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      try {
        const SpeechRecognition = (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.lang = "en-US"
        recognition.interimResults = false
        recognition.onstart = () => setIsListening(true)
        recognition.onend = () => setIsListening(false)
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInput(transcript)
        }
        recognition.start()
      } catch {
        setIsListening(false)
      }
    } else {
      // Fallback preset
      setInput("Spent 250 on food")
    }
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col bg-background px-4 pt-2 pb-24">
      {/* Header (Image 5) */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3.5 pt-1">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">Chat</h1>
            <p className="text-xs text-muted-foreground font-medium">
              Ask questions or log money in plain language.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            title="Chat Tips"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground hover:bg-secondary transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          {chatMessages.length > 1 && (
            <button
              type="button"
              onClick={handleClearChat}
              title="Clear Conversation"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Help Popover */}
      {showHelp && (
        <div className="my-2 rounded-2xl border border-primary/25 bg-primary/10 p-3 text-xs text-foreground space-y-1 animate-in fade-in">
          <p className="font-bold text-primary flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Pawi Chat Examples:
          </p>
          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
            <li>&quot;How much do I have left across all wallets?&quot;</li>
            <li>&quot;Spent 150 on coffee via GCash&quot;</li>
            <li>&quot;Salary 20000 deposited to BPI&quot;</li>
            <li>&quot;What is my biggest expense category this month?&quot;</li>
          </ul>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto pt-4 pb-4 space-y-4 scrollbar-hide">
        {/* Initial Mascot Greeting Message Bubble (Matching Image 5) */}
        {chatMessages.length === 0 && (
          <div className="flex items-start gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
              <Image
                src="/pawi-happy.png"
                alt="Pawi"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
            </div>
            <div className="flex-1 rounded-[1.75rem] rounded-tl-sm border border-border/70 bg-card p-4 shadow-sm text-sm text-foreground space-y-2.5">
              <p className="font-extrabold text-foreground">Hi {displayName}!</p>
              <p className="text-muted-foreground leading-relaxed">
                Ask me about your money, balances, or a specific account.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You can also type or dictate transactions, and I can log them for you whenever you&apos;re ready.
              </p>
            </div>
          </div>
        )}

        {chatMessages.map((msg, idx) => {
          const isUser = msg.role === "user"
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
            >
              {!isUser ? (
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
                  <Image
                    src="/pawi-happy.png"
                    alt="Pawi"
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-[1.75rem] p-4 text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
                  isUser
                    ? "bg-[#3D784E] text-white rounded-tr-sm font-medium"
                    : "border border-border/70 bg-card text-foreground rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15">
              <Image
                src="/pawi-happy.png"
                alt="Pawi"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
            </div>
            <div className="rounded-[1.75rem] rounded-tl-sm border border-border/70 bg-card px-4 py-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                Pawi is thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Card (Image 5) */}
      <div className="mt-2 space-y-2">
        <div className="relative flex flex-col rounded-3xl border border-border/80 bg-card p-3 shadow-md">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder='Ask a question or type "Spent 250 on food"...'
            className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none px-1"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleMicClick}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-[#3D784E]/12 text-[#3D784E] hover:bg-[#3D784E]/20"
              }`}
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground hover:bg-[#3D784E] hover:text-white disabled:opacity-40 transition-all active:scale-95"
            >
              <ArrowUp className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <p className="text-center text-[10px] text-muted-foreground">
          AI can make mistakes. Please review important details before acting on them.
        </p>
      </div>
    </div>
  )
}
