import { NextResponse } from 'next/server';

function getSmartLocalReply(userMessage: string, context: any, historyLength: number): string {
  const text = userMessage.trim().toLowerCase();
  const defaultCurrency = context?.defaultCurrency || 'PHP';
  const symbol = defaultCurrency === 'USD' ? '$' : defaultCurrency === 'EUR' ? '€' : defaultCurrency === 'GBP' ? '£' : defaultCurrency === 'JPY' ? '¥' : '₱';

  // Helper to format currency
  const fmt = (num: number) => `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: defaultCurrency === 'JPY' ? 0 : 2, maximumFractionDigits: defaultCurrency === 'JPY' ? 0 : 2 })}`;

  // 1. Typos / Gibberish / Very short unknown input (e.g., 'sda', 'efsa', 'asdf')
  if (text.length <= 4 && !['hi', 'hey', 'hello', 'help', 'tips', 'goal', 'cash', 'chat'].includes(text)) {
    const typoReplies = [
      "Haha, looks like your fingers did a quick splash on the keyboard! 🐢💦 Ask me anything about your budgets, wallets, or ways to grow your savings!",
      "Did a rogue wave slide across your screen? 🌊😄 No worries! Let me know if you want a budget checkup, savings tip, or wallet breakdown!",
      "I speak turtle, but that looked like secret code! 🐢✨ Try asking me for a financial tip, checking your goals, or reviewing your spending!"
    ];
    return typoReplies[historyLength % typoReplies.length];
  }

  // 2. Greetings
  if (['hi', 'hello', 'hey', 'yo', 'sup', 'pawi', 'good morning', 'good afternoon', 'good evening'].some(g => text.includes(g)) && text.length < 25) {
    const greetings = [
      "Cowabunga! 🐢🌊 Pawi here, ready to surf through your financial goals today! What would you like to work on — budgeting, saving, or tracking an expense?",
      "Hey there friend! ✨ Look who swam by! I'm ready to help you navigate smooth financial waters today. What's on your mind?",
      "High-flipper! 🐢🖐️ Great to see you! Whether you want to talk savings strategies or review recent expenses, I'm ready to dive in!"
    ];
    return greetings[historyLength % greetings.length];
  }

  // 3. Explicitly asking for Net Worth or Total Balance
  if (text.includes('net worth') || text.includes('networth') || text.includes('total balance') || text.includes('how much money') || text.includes('my balance')) {
    const EXCHANGE_RATES: Record<string, number> = { USD: 1, PHP: 57, EUR: 0.92, GBP: 0.78, JPY: 155.5 };
    const totalCash = (context?.wallets || []).reduce((acc: number, w: any) => {
      const amountInUSD = (w.balance || 0) / (EXCHANGE_RATES[w.currency || 'PHP'] || 1);
      return acc + (amountInUSD * (EXCHANGE_RATES[defaultCurrency] || 1));
    }, 0);
    return `Right now, your total liquid balance across all ${context?.wallets?.length || 0} wallets sits at **${fmt(totalCash)}**! 🐢💎 Slow, steady compound growth is our superpower!`;
  }

  // 4. Budgets / Spending
  if (text.includes('budget') || text.includes('spend') || text.includes('expense') || text.includes('cost')) {
    const budgets = context?.budgets || [];
    if (budgets.length > 0) {
      const b = budgets[0];
      return `Tracking your spending keeps your shell strong! 🐢🛡️ Right now in **${b.category}**, you've spent **${fmt(b.spent)}** out of your **${fmt(b.limit)}** budget. Consistency is key!`;
    }
    return "Budgeting is the secret to stress-free swimming! 🐢🌊 Try setting up monthly category limits so every peso has a clear destination.";
  }

  // 5. Goals / Saving
  if (text.includes('goal') || text.includes('save') || text.includes('saving') || text.includes('target')) {
    const goals = context?.goals || [];
    if (goals.length > 0) {
      const g = goals[0];
      const pct = Math.round((g.saved / (g.target || 1)) * 100);
      return `You're making awesome waves on your **${g.name}** goal! 🎯 You're at **${pct}%** (${fmt(g.saved)} / ${fmt(g.target)}). Keep swimming steady! 🐢✨`;
    }
    return "Remember: small daily savings add up to massive oceans over time! 🐢🌊 Let's set a smart savings goal in your Plan tab!";
  }

  // 6. Advice / Tips / Fun
  if (text.includes('tip') || text.includes('advice') || text.includes('help') || text.includes('joke') || text.includes('fun fact')) {
    const tips = [
      "Here's a Pawi golden tip: Always pay yourself first! Automate at least 10-20% of your income into savings before touching discretionary budgets. 🐢💡",
      "Did you know sea turtles can hold their breath for hours underwater? Just like patience with investments — the longer you hold calm, the farther you swim! 🐢🌊",
      "Pro tip: Before buying a non-essential item, wait 24 hours. If you still want it tomorrow, check your budget envelope first! ✨"
    ];
    return tips[historyLength % tips.length];
  }

  // 7. Dynamic conversational default (never repeating net worth!)
  const dynamicReplies = [
    "I'm all ears (well, flippers)! 🐢✨ How can I help you optimize your cash flow or plan your next financial move today?",
    "Every financial journey is step-by-step! Would you like to inspect your spending patterns, review your wallets, or set a new savings milestone? 🌊",
    "Let's make some smart money moves! Ask me for a personalized savings tip or a quick summary of your recent activity! 🐢🚀"
  ];
  return dynamicReplies[historyLength % dynamicReplies.length];
}

export async function POST(req: Request) {
  try {
    const { messages, context, message } = await req.json();
    const chatHistory = messages || [{ role: 'user', content: message }];

    if (!chatHistory || chatHistory.length === 0) {
      return NextResponse.json({ error: 'Missing messages in request body' }, { status: 400 });
    }

    const firstUserIndex = chatHistory.findIndex((m: any) => m.role === 'user');
    const validChatHistory = firstUserIndex >= 0 ? chatHistory.slice(firstUserIndex) : chatHistory;
    const latestUserMessage = validChatHistory[validChatHistory.length - 1]?.content || "";

    const apiKey = process.env.GEMINI_API_KEY;

    // If Gemini API Key is missing, respond gracefully with our smart conversational Pawi engine
    if (!apiKey) {
      const reply = getSmartLocalReply(latestUserMessage, context, validChatHistory.length);
      return NextResponse.json({ reply });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const geminiContents = validChatHistory.map((msg: any, index: number) => {
      let text = msg.content;
      if (index === validChatHistory.length - 1 && msg.role === 'user') {
        text = `You are Pawi, an exciting, charismatic, and wise sea turtle personal finance companion! 🐢✨

CRITICAL RULES FOR PAWI'S PERSONALITY & BEHAVIOR:
1. NEVER repeatedly state or announce the user's Net Worth unless the user explicitly asks about their net worth, total balance, or overall wealth! Do not start messages with their net worth.
2. Be exciting, warm, fun, and conversational! Vary your greetings and reactions so every chat feels fresh and lively.
3. Tailor your answer directly to what the user said. If they say 'hi', greet them enthusiastically and ask what financial goal they want to tackle today. If they type gibberish or typos, playfully joke about keyboard splashes.
4. Keep answers concise, clear, and engaging (2-4 sentences max).

CRITICAL MATH RULES (ONLY IF USER ASKS ABOUT NET WORTH):
1. Sum only Wallet balances converted to default currency (${context?.defaultCurrency || 'PHP'}). Do not add Goals.
2. Rates relative to USD: USD=1, PHP=57, EUR=0.92, GBP=0.78, JPY=155.5.

Live context:
${JSON.stringify(context || {}, null, 2)}

User's actual message: "${text}"`;
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }]
      };
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: geminiContents })
    });

    if (!response.ok) {
      // Graceful fallback when rate limited or network error
      const reply = getSmartLocalReply(latestUserMessage, context, validChatHistory.length);
      return NextResponse.json({ reply });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || getSmartLocalReply(latestUserMessage, context, validChatHistory.length);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ reply: "I'm swimming through some waves right now, but I'm right here with you! 🐢🌊 Ask me anything about your budgets or goals!" });
  }
}
