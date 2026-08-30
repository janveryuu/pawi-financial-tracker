"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import {
  ChevronLeft,
  HelpCircle,
  Mic,
  ArrowUp,
  User,
  Sparkles,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Wallet,
  Calendar,
  Target,
  FileText,
  AlertCircle,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth-context"
import { useProfile } from "@/lib/use-profile"
import { formatMoney, getBrandLogo, getWalletBrandColor } from "@/lib/pawi-data"
import { ProposedAction } from "@/lib/chat-action-parser"

interface ExtendedChatMessage {
  role: "user" | "assistant"
  content: string
  action?: ProposedAction | null
}

interface ChatScreenProps {
  onBack?: () => void
}

export function ChatScreen({ onBack }: ChatScreenProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const {
    wallets,
    goals,
    budgets,
    transactions,
    plannedPayments,
    debts,
    receivables,
    chatMessages,
    setChatMessages,
    defaultCurrency,
    addTransaction,
    addFundsToGoal,
    transferFunds,
    addPlannedPayment,
    addGoal,
    addDebt,
    addReceivable,
  } = useStore()

  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [activeAction, setActiveAction] = useState<ProposedAction | null>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const rawName =
    (profile?.name && profile.name !== "Pawi User" && profile.name.trim()) ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    user?.displayName ||
    (profile?.name && profile.name.trim()) ||
    user?.email?.split("@")[0] ||
    "there"
  const cleanName = rawName.includes("@") ? rawName.split("@")[0] : rawName
  const displayName = cleanName
    .split(" ")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, activeAction])

  const handleClearChat = () => {
    setActiveAction(null)
    setExecutionError(null)
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
    setExecutionError(null)

    // Check for clear chat command
    if (/^(clear|delete|reset)\s*(chat|messages|history)?$/i.test(text)) {
      handleClearChat()
      return
    }

    const newMessages: ExtendedChatMessage[] = [
      ...(chatMessages || []),
      { role: "user" as const, content: text },
    ]
    setChatMessages(newMessages)
    setIsLoading(true)

    // Build context
    const context = {
      defaultCurrency,
      wallets: wallets.map((w) => ({ id: w.id, name: w.name, balance: w.balance, type: w.type, currency: w.currency, accent: w.accent })),
      goals: goals.map((g) => ({ id: g.id, name: g.name, saved: g.saved, target: g.target, accent: g.accent })),
      budgets: budgets.map((b) => ({ id: b.id, category: b.category, spent: b.spent, limit: b.limit })),
      plannedPayments: plannedPayments.map((p) => ({ id: p.id, label: p.label, amount: p.amount, dueDate: p.dueDate, frequency: p.frequency })),
      debts: debts.map((d) => ({ id: d.id, name: (d as any).name || d.lender, amount: d.amount, person: (d as any).person || d.lender })),
      receivables: receivables.map((r) => ({ id: r.id, name: (r as any).name || r.borrower, amount: r.amount, person: (r as any).person || r.borrower })),
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
          userId: user?.id,
          pendingAction: activeAction,
        }),
      })
      const data = await res.json()

      const proposed = data.proposedAction as ProposedAction | null
      setActiveAction(proposed && proposed.status !== "executed" && proposed.status !== "cancelled" ? proposed : null)

      setChatMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.reply || "I'm always here to help you navigate your finances! 🐢",
          action: proposed,
        },
      ])
    } catch {
      setChatMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "I'm right here with you! What would you like to track or review? 🐢",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle clicking on clarification chips
  const handleSelectClarificationOption = (value: string) => {
    handleSend(value)
  }

  // Handle action confirmation & execution
  const handleConfirmAction = async (action: ProposedAction, msgIdx: number) => {
    setExecutionError(null)
    const amt = action.params.amount || 0
    const sourceAccName = action.params.account || wallets[0]?.name || "Cash"
    const sourceWallet = wallets.find((w) => w.name.toLowerCase() === sourceAccName.toLowerCase())

    // 1. Balance Sufficiency Validation
    const moneyOutActions = ["log_expense", "pay_bill", "deposit_goal", "transfer_funds"]
    if (moneyOutActions.includes(action.type)) {
      if (sourceWallet && sourceWallet.balance < amt) {
        setExecutionError(
          `Insufficient balance in ${sourceWallet.name}. Available: ${formatMoney(
            sourceWallet.balance,
            sourceWallet.currency
          )}, Required: ${formatMoney(amt, sourceWallet.currency)}`
        )
        return
      }
    }

    try {
      // 2. Execute corresponding shared atomic store function
      switch (action.type) {
        case "log_expense":
          await addTransaction({
            label: action.params.label || action.params.category || "Expense",
            category: action.params.category || "General",
            account: sourceAccName,
            amount: amt,
            currency: defaultCurrency || "PHP",
            kind: "expense",
            dateHeader: "Today",
          })
          break

        case "log_income":
          await addTransaction({
            label: action.params.label || "Income",
            category: "Income",
            account: sourceAccName,
            amount: amt,
            currency: defaultCurrency || "PHP",
            kind: "income",
            dateHeader: "Today",
          })
          break

        case "pay_bill":
          await addTransaction({
            label: action.params.billName || action.params.label || "Bill Payment",
            category: "Bills & Utilities",
            account: sourceAccName,
            amount: amt,
            currency: defaultCurrency || "PHP",
            kind: "expense",
            dateHeader: "Today",
          })
          break

        case "deposit_goal": {
          const targetGoal =
            goals.find((g) => g.name.toLowerCase() === action.params.goalName?.toLowerCase()) ||
            goals[0]
          if (targetGoal) {
            await addFundsToGoal(targetGoal.id, amt, sourceAccName)
          } else {
            await addGoal({
              name: action.params.goalName || "Savings Goal",
              target: amt * 5,
              saved: amt,
              accent: "#3D784E",
              due: null,
              icon: getBrandLogo(action.params.goalName) || "🎯",
            })
          }
          break
        }

        case "transfer_funds":
          await transferFunds({
            fromWalletName: action.params.account || wallets[0]?.name || "Cash",
            toWalletName: action.params.targetAccount || wallets[1]?.name || "GCash",
            amount: amt,
            note: "Transferred via Pawi Chat",
          })
          break

        case "create_planned_payment":
          await addPlannedPayment({
            label: action.params.label || "Planned Payment",
            amount: amt,
            dueDate: action.params.billDueDate || "Every month",
            frequency: action.params.billFrequency || "recurring",
            category: action.params.category || "Bills",
            account: sourceAccName,
            icon: getBrandLogo(action.params.label) || "📅",
          })
          break

        case "create_goal":
          await addGoal({
            name: action.params.goalName || "New Goal",
            target: action.params.goalTarget || 10000,
            saved: 0,
            accent: "#3D784E",
            due: null,
            icon: getBrandLogo(action.params.goalName) || "🎯",
          })
          break

        case "log_debt":
          await addDebt({
            lender: action.params.counterparty || "Person",
            amount: amt,
            monthlyPayment: 0,
            dueDate: "Monthly",
            accent: "#E53E3E",
          })
          break

        case "settle_receivable":
          await addTransaction({
            label: `Settled by ${action.params.counterparty || "Friend"}`,
            category: "Income",
            account: sourceAccName,
            amount: amt,
            currency: defaultCurrency || "PHP",
            kind: "income",
            dateHeader: "Today",
          })
          break

        default:
          break
      }

      // Update message card status to executed
      const updatedMessages = [...chatMessages]
      if (updatedMessages[msgIdx]) {
        updatedMessages[msgIdx] = {
          ...updatedMessages[msgIdx],
          action: { ...action, status: "executed" },
        }
      }
      setChatMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: `✅ Successfully recorded and synced! Your balances and records are updated. 🐢💎`,
        },
      ])
      setActiveAction(null)
    } catch (err: any) {
      setExecutionError(err?.message || "Failed to execute action. Please try again.")
    }
  }

  // Handle action cancellation
  const handleCancelAction = (action: ProposedAction, msgIdx: number) => {
    const updatedMessages = [...chatMessages]
    if (updatedMessages[msgIdx]) {
      updatedMessages[msgIdx] = {
        ...updatedMessages[msgIdx],
        action: { ...action, status: "cancelled" },
      }
    }
    setChatMessages([
      ...updatedMessages,
      {
        role: "assistant",
        content: `Got it, I cancelled that action. What would you like to do next? 🐢`,
      },
    ])
    setActiveAction(null)
    setExecutionError(null)
  }

  // Voice dictation Web Speech API
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
      setInput("Spent 250 on food")
    }
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col bg-background px-4 pt-2 pb-24">
      {/* Header */}
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
            <h1 className="text-xl font-black tracking-tight text-foreground">Pawi Action Chat</h1>
            <p className="text-xs text-muted-foreground font-medium">
              Voice & text control for transactions, bills, goals, & wallets.
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
        <div className="my-2 rounded-2xl border border-[#3D784E]/25 bg-[#3D784E]/10 p-3 text-xs text-foreground space-y-1 animate-in fade-in">
          <p className="font-bold text-[#3D784E] flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> What Pawi Chat Can Do:
          </p>
          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
            <li>&quot;Spent 200 on food&quot; (Pawi asks for account via chips)</li>
            <li>&quot;Salary 5000 in my GCash&quot; (Direct instant log)</li>
            <li>&quot;Paid Netflix 500 pesos&quot; (Advances bill cycle)</li>
            <li>&quot;Add 500 to my emergency fund&quot; (Atomic goal deposit)</li>
            <li>&quot;Move 1000 from GCash to BPI&quot; (Account transfer)</li>
            <li>&quot;Remind me to pay rent 8000 on the 5th&quot; (Creates bill)</li>
            <li>&quot;I want to save 20000 for laptop&quot; (Creates goal)</li>
          </ul>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto pt-4 pb-4 space-y-4 scrollbar-hide">
        {/* Initial Greeting Bubble */}
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
            <div className="flex-1 rounded-[1.75rem] rounded-tl-sm border border-border/70 bg-card p-4 shadow-xs text-sm text-foreground space-y-2">
              <p className="font-extrabold text-foreground">Hi {displayName}! 🐢🌊</p>
              <p className="text-muted-foreground leading-relaxed">
                I can execute money actions for you in natural language — log expenses, pay bills, deposit to savings goals, transfer funds, or schedule recurring payments.
              </p>
              <p className="text-xs text-[#3D784E] font-bold">
                Try saying: &quot;Spent 250 on food&quot; or &quot;Add 500 to my emergency fund&quot;
              </p>
            </div>
          </div>
        )}

        {chatMessages.map((msg, idx) => {
          const isUser = msg.role === "user"
          const action = (msg as ExtendedChatMessage).action

          return (
            <div key={idx} className="space-y-2.5">
              <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
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
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3D784E] text-white font-bold text-xs">
                    <User className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-[1.75rem] p-4 text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
                    isUser
                      ? "bg-[#3D784E] text-white rounded-tr-sm font-medium"
                      : "border border-border/70 bg-card text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>

              {/* Clarification Chips (e.g. Account Picker) */}
              {!isUser && action && action.status === "pending_clarification" && action.clarificationOptions && (
                <div className="ml-13 flex flex-wrap gap-2 animate-in fade-in zoom-in-95 duration-200">
                  {action.clarificationOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectClarificationOption(opt.value)}
                      className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-card px-3.5 py-2 text-xs font-black shadow-xs hover:border-[#3D784E] hover:bg-secondary active:scale-95 transition-all"
                      style={{ borderLeftColor: opt.color, borderLeftWidth: "4px" }}
                    >
                      {opt.icon ? (
                        <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full">
                          <Image src={opt.icon} alt={opt.label} fill className="object-contain" />
                        </div>
                      ) : (
                        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Inline Action Confirmation / Result Card */}
              {!isUser && action && (action.status === "ready_for_confirmation" || action.status === "executed" || action.status === "cancelled") && (
                <div className="ml-13 max-w-[90%] rounded-3xl border border-border/80 bg-card p-4 shadow-md space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#3D784E]/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#3D784E]">
                        {action.type.replace("_", " ")}
                      </span>
                    </div>

                    {action.status === "executed" && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#3D784E]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Executed
                      </span>
                    )}
                    {action.status === "cancelled" && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                        <XCircle className="h-3.5 w-3.5" /> Cancelled
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="flex items-center gap-3">
                    {getBrandLogo(action.params.label || action.params.category || action.params.billName || action.params.goalName || action.params.account) ? (
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card border border-border/60 p-1.5 shadow-2xs">
                        <Image
                          src={getBrandLogo(action.params.label || action.params.category || action.params.billName || action.params.goalName || action.params.account)!}
                          alt="Logo"
                          fill
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#3D784E]/15 text-[#3D784E]">
                        {action.type.includes("goal") ? (
                          <Target className="h-5 w-5" />
                        ) : action.type.includes("bill") ? (
                          <Calendar className="h-5 w-5" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-foreground truncate">
                        {action.params.label || action.params.billName || action.params.goalName || action.params.category || action.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        {action.params.account ? `Account: ${action.params.account}` : ""}
                        {action.params.targetAccount ? ` ➔ ${action.params.targetAccount}` : ""}
                        {action.params.billDueDate ? ` • Due: ${action.params.billDueDate}` : ""}
                        {action.params.counterparty ? ` • ${action.params.counterparty}` : ""}
                      </p>
                    </div>

                    {(action.params.amount || action.params.goalTarget) && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-foreground tabular-nums">
                          {formatMoney(action.params.amount || action.params.goalTarget || 0, defaultCurrency)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Execution Error Banner (if any) */}
                  {executionError && (
                    <div className="flex items-center gap-1.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-[11px] font-bold text-rose-600">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{executionError}</span>
                    </div>
                  )}

                  {/* Confirmation Buttons */}
                  {action.status === "ready_for_confirmation" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCancelAction(action, idx)}
                        className="flex-1 rounded-2xl bg-secondary py-2.5 text-xs font-bold text-muted-foreground hover:bg-secondary/80 active:scale-98 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmAction(action, idx)}
                        className="flex-2 rounded-2xl bg-[#3D784E] py-2.5 text-xs font-black text-white hover:bg-[#356B46] shadow-sm active:scale-98 transition-all"
                      >
                        Confirm & Log 🚀
                      </button>
                    </div>
                  )}
                </div>
              )}
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
                Pawi is processing...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Card */}
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
            placeholder='e.g. "Spent 200 on food", "Salary 5000 in GCash", "Paid Netflix 500"...'
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
          Pawi verifies all money actions with you before updating your balances.
        </p>
      </div>
    </div>
  )
}
