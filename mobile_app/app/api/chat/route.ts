import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createAdminClient } from "@/lib/supabase"
import { parseChatAction, ProposedAction, ChatAppContext } from "@/lib/chat-action-parser"

function getSmartLocalReply(
  userMessage: string,
  context: any,
  historyLength: number,
  action?: ProposedAction | null
): string {
  const text = userMessage.trim().toLowerCase()
  const defaultCurrency = context?.defaultCurrency || "PHP"
  const symbol =
    defaultCurrency === "USD"
      ? "$"
      : defaultCurrency === "EUR"
      ? "€"
      : defaultCurrency === "GBP"
      ? "£"
      : defaultCurrency === "JPY"
      ? "¥"
      : "₱"

  const fmt = (num: number) =>
    `${symbol}${num.toLocaleString(undefined, {
      minimumFractionDigits: defaultCurrency === "JPY" ? 0 : 2,
      maximumFractionDigits: defaultCurrency === "JPY" ? 0 : 2,
    })}`

  // Action-driven replies
  if (action) {
    if (action.status === "pending_clarification") {
      return action.clarificationPrompt || "Which account would you like to use for this? 🐢"
    }
    if (action.status === "ready_for_confirmation") {
      if (action.type === "log_expense") {
        return `Got it! I prepared the expense card for **${action.params.label || action.params.category}** (${fmt(
          action.params.amount || 0
        )} from **${action.params.account}**). Please confirm below! 🐢✨`
      }
      if (action.type === "log_income") {
        return `Cha-ching! 🌊 Ready to record **${fmt(action.params.amount || 0)}** into **${
          action.params.account
        }**. Tap confirm to log it!`
      }
      if (action.type === "pay_bill") {
        return `Shell yeah! Ready to mark **${action.params.billName}** paid (${fmt(
          action.params.amount || 0
        )} from **${action.params.account}**). Confirm below!`
      }
      if (action.type === "deposit_goal") {
        return `Awesome progress! Ready to deposit **${fmt(action.params.amount || 0)}** into **${
          action.params.goalName
        }** from **${action.params.account}**. Please confirm to save!`
      }
      if (action.type === "transfer_funds") {
        return `Ready to transfer **${fmt(action.params.amount || 0)}** from **${action.params.account}** to **${
          action.params.targetAccount
        }**. Confirm below!`
      }
      if (action.type === "create_planned_payment") {
        return `I've set up your planned payment schedule for **${action.params.label}** (${fmt(
          action.params.amount || 0
        )}). Confirm to add it to your Plan tab!`
      }
      if (action.type === "create_goal") {
        return `Exciting savings milestone! Ready to create your **${action.params.goalName}** goal with target **${fmt(
          action.params.goalTarget || 0
        )}**. Confirm below!`
      }
      if (action.type === "log_debt" || action.type === "log_receivable" || action.type === "settle_receivable") {
        return `Got the details! Please confirm this entry to update your ledger. 🐢📝`
      }
    }
  }

  // 1. Clear / remove conversation
  const hasClearVerb = /\b(remove|clear|delete|reset|erase|wipe)\b/.test(text)
  const hasChatTarget = /\b(message|messages|conversation|chat|history|everything)\b/.test(text)
  if (hasClearVerb && hasChatTarget && !/\b(transaction|wallet|budget|goal|expense|income)\b/.test(text)) {
    return "Cowabunga! 🌊 All messages and conversation history have been cleared! We have a fresh new slate. What would you like to ask Pawi today? 🐢✨"
  }

  // 2. Typos / Gibberish / Very short unknown input
  if (text.length <= 4 && !["hi", "hey", "hello", "help", "tips", "goal", "cash", "chat"].includes(text)) {
    const typoReplies = [
      "Haha, looks like your fingers did a quick splash on the keyboard! 🐢💦 Ask me anything about your budgets, wallets, or ways to grow your savings!",
      "Did a rogue wave slide across your screen? 🌊😄 No worries! Let me know if you want a budget checkup, savings tip, or wallet breakdown!",
      "I speak turtle, but that looked like secret code! 🐢✨ Try asking me for a financial tip, checking your goals, or reviewing your spending!",
    ]
    return typoReplies[historyLength % typoReplies.length]
  }

  // 3. Greetings
  if (
    ["hi", "hello", "hey", "yo", "sup", "pawi", "good morning", "good afternoon", "good evening"].some((g) =>
      text.includes(g)
    ) &&
    text.length < 25
  ) {
    const greetings = [
      "Cowabunga! 🐢🌊 Pawi here, ready to surf through your financial goals today! What would you like to work on — budgeting, saving, or tracking an expense?",
      "Hey there friend! ✨ Look who swam by! I'm ready to help you navigate smooth financial waters today. What's on your mind?",
      "High-flipper! 🐢🖐️ Great to see you! Whether you want to talk savings strategies or review recent expenses, I'm ready to dive in!",
    ]
    return greetings[historyLength % greetings.length]
  }

  // 4. Explicitly asking for Net Worth or Total Balance
  if (
    text.includes("net worth") ||
    text.includes("networth") ||
    text.includes("total balance") ||
    text.includes("how much money") ||
    text.includes("my balance")
  ) {
    const EXCHANGE_RATES: Record<string, number> = { USD: 1, PHP: 57, EUR: 0.92, GBP: 0.78, JPY: 155.5 }
    const totalCash = (context?.wallets || []).reduce((acc: number, w: any) => {
      const amountInUSD = (w.balance || 0) / (EXCHANGE_RATES[w.currency || "PHP"] || 1)
      return acc + amountInUSD * (EXCHANGE_RATES[defaultCurrency] || 1)
    }, 0)
    return `Right now, your total liquid balance across all ${
      context?.wallets?.length || 0
    } wallets sits at **${fmt(totalCash)}**! 🐢💎 Slow, steady compound growth is our superpower!`
  }

  // 5. Budgets / Spending
  if (text.includes("budget") || text.includes("spend") || text.includes("expense") || text.includes("cost")) {
    const budgets = context?.budgets || []
    if (budgets.length > 0) {
      const b = budgets[0]
      return `Tracking your spending keeps your shell strong! 🐢🛡️ Right now in **${b.category}**, you've spent **${fmt(
        b.spent
      )}** out of your **${fmt(b.limit)}** budget. Consistency is key!`
    }
    return "Budgeting is the secret to stress-free swimming! 🐢🌊 Try setting up monthly category limits so every peso has a clear destination."
  }

  // 6. Goals / Saving
  if (text.includes("goal") || text.includes("save") || text.includes("saving") || text.includes("target")) {
    const goals = context?.goals || []
    if (goals.length > 0) {
      const g = goals[0]
      const pct = Math.round((g.saved / (g.target || 1)) * 100)
      return `You're making awesome waves on your **${g.name}** goal! 🎯 You're at **${pct}%** (${fmt(
        g.saved
      )} / ${fmt(g.target)}). Keep swimming steady! 🐢✨`
    }
    return "Remember: small daily savings add up to massive oceans over time! 🐢🌊 Let's set a smart savings goal in your Plan tab!"
  }

  // 7. Advice / Tips / Fun
  if (
    text.includes("tip") ||
    text.includes("advice") ||
    text.includes("help") ||
    text.includes("joke") ||
    text.includes("fun fact")
  ) {
    const tips = [
      "Here's a Pawi golden tip: Always pay yourself first! Automate at least 10-20% of your income into savings before touching discretionary budgets. 🐢💡",
      "Did you know sea turtles can hold their breath for hours underwater? Just like patience with investments — the longer you hold calm, the farther you swim! 🐢🌊",
      "Pro tip: Before buying a non-essential item, wait 24 hours. If you still want it tomorrow, check your budget envelope first! ✨",
    ]
    return tips[historyLength % tips.length]
  }

  // 8. Dynamic conversational default
  const dynamicReplies = [
    "I'm all ears (well, flippers)! 🐢✨ How can I help you optimize your cash flow or plan your next financial move today?",
    "Every financial journey is step-by-step! Would you like to inspect your spending patterns, review your wallets, or set a new savings milestone? 🌊",
    "Let's make some smart money moves! Ask me for a personalized savings tip or a quick summary of your recent activity! 🐢🚀",
  ]
  return dynamicReplies[historyLength % dynamicReplies.length]
}

export async function POST(req: Request) {
  try {
    const { messages, context: initialContext, message, userId, pendingAction } = await req.json()
    const chatHistory = messages || [{ role: "user", content: message }]

    if (!chatHistory || chatHistory.length === 0) {
      return NextResponse.json({ error: "Missing messages in request body" }, { status: 400 })
    }

    const firstUserIndex = chatHistory.findIndex((m: any) => m.role === "user")
    const validChatHistory = firstUserIndex >= 0 ? chatHistory.slice(firstUserIndex) : chatHistory
    const latestUserMessage = validChatHistory[validChatHistory.length - 1]?.content || ""

    // Hydrate context from Supabase if userId is provided and initialContext is empty
    let context: ChatAppContext = initialContext || {}
    if (userId && (!context || !context.wallets || context.wallets.length === 0)) {
      try {
        const supabaseAdmin = createAdminClient()
        const [{ data: accs }, { data: cats }, { data: goals }, { data: bills }, { data: debts }, { data: recs }] =
          await Promise.all([
            supabaseAdmin.from("accounts").select("id, name, balance, currency, type, accent").eq("user_id", userId),
            supabaseAdmin.from("categories").select("id, name, monthly_limit, spent").eq("user_id", userId),
            supabaseAdmin.from("savings_goals").select("id, title, target_amount, current_amount, accent").eq("user_id", userId),
            supabaseAdmin.from("recurring_bills").select("id, name, amount, next_due_date, billing_cycle").eq("user_id", userId),
            supabaseAdmin.from("debts").select("id, name, amount, person").eq("user_id", userId),
            supabaseAdmin.from("receivables").select("id, name, amount, person").eq("user_id", userId),
          ])

        context = {
          wallets: (accs || []).map((a: any) => ({
            id: a.id,
            name: a.name,
            balance: Number(a.balance) || 0,
            currency: a.currency || "PHP",
            type: a.type,
            accent: a.accent,
          })),
          budgets: (cats || []).map((c: any) => ({
            id: c.id,
            category: c.name,
            limit: Number(c.monthly_limit) || 0,
            spent: Number(c.spent) || 0,
          })),
          goals: (goals || []).map((g: any) => ({
            id: g.id,
            name: g.title,
            target: Number(g.target_amount) || 0,
            saved: Number(g.current_amount) || 0,
            accent: g.accent,
          })),
          plannedPayments: (bills || []).map((b: any) => ({
            id: b.id,
            label: b.name,
            amount: Number(b.amount) || 0,
            dueDate: b.next_due_date,
            frequency: b.billing_cycle,
          })),
          debts: debts || [],
          receivables: recs || [],
          defaultCurrency: "PHP",
        }
      } catch (dbErr) {
        console.warn("Supabase context fetch warning:", dbErr)
      }
    }

    // Parse action intent
    const proposedAction = parseChatAction(latestUserMessage, context, pendingAction)

    const systemPrompt = `You are Pawi, an exciting, charismatic, and wise sea turtle personal finance companion! 🐢✨

CRITICAL RULES FOR PAWI'S PERSONALITY & BEHAVIOR:
1. NEVER repeatedly state or announce the user's Net Worth unless the user explicitly asks about their net worth, total balance, or overall wealth! Do not start messages with their net worth.
2. Be exciting, warm, fun, and conversational! Vary your greetings and reactions so every chat feels fresh and lively.
3. Tailor your answer directly to what the user said. If they say 'hi', greet them enthusiastically and ask what financial goal they want to tackle today.
4. Keep answers concise, clear, and engaging (2-4 sentences max).
${
  proposedAction
    ? `An action has been detected: ${JSON.stringify(
        proposedAction
      )}. Acknowledge it encouragingly and let the user know they can confirm with the card or select an option!`
    : ""
}

Live financial context:
${JSON.stringify(context || {}, null, 2)}`

    // 1. Tier 1: Gemini via @google/generative-ai
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: systemPrompt,
        })

        const chat = model.startChat({
          history: validChatHistory.slice(0, -1).map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        })

        const result = await chat.sendMessage(latestUserMessage)
        const reply = result.response.text()
        if (reply) {
          return NextResponse.json({ reply, proposedAction })
        }
      } catch (geminiErr) {
        console.warn("Gemini Chat API notice, falling to next tier:", geminiErr)
      }
    }

    // 2. Tier 2: Groq Llama 3 (if GROQ_API_KEY is configured)
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              ...validChatHistory.map((m: any) => ({
                role: m.role,
                content: m.content,
              })),
            ],
            temperature: 0.7,
            max_tokens: 400,
          }),
        })

        if (groqRes.ok) {
          const groqData = await groqRes.json()
          const reply = groqData.choices?.[0]?.message?.content
          if (reply) {
            return NextResponse.json({ reply, proposedAction })
          }
        }
      } catch (groqErr) {
        console.warn("Groq API notice:", groqErr)
      }
    }

    // 3. Tier 3: High-personality smart conversational local rule engine
    const reply = getSmartLocalReply(latestUserMessage, context, validChatHistory.length, proposedAction)
    return NextResponse.json({ reply, proposedAction })
  } catch (error) {
    console.error("Chat API Error:", error)
    return NextResponse.json({
      reply: "I'm swimming through some waves right now, but I'm right here with you! 🐢🌊 Ask me anything about your budgets or goals!",
      proposedAction: null,
    })
  }
}
