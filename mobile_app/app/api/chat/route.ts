import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, context, message } = await req.json();
    
    // Fallback for older client format
    const chatHistory = messages || [{ role: 'user', content: message }];

    if (!chatHistory || chatHistory.length === 0) {
      return NextResponse.json({ error: 'Missing messages in request body' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server misconfiguration: Missing Gemini API Key' }, { status: 500 });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    // Gemini API requires the conversation to start with a 'user' message.
    // Find the first user message and slice the array from there.
    const firstUserIndex = chatHistory.findIndex((m: any) => m.role === 'user');
    const validChatHistory = firstUserIndex >= 0 ? chatHistory.slice(firstUserIndex) : chatHistory;

    const geminiContents = validChatHistory.map((msg: any, index: number) => {
      let text = msg.content;
      // Inject system prompt and live financial data into the latest user message
      if (index === validChatHistory.length - 1 && msg.role === 'user') {
        text = `You are Pawi, a friendly sea turtle personal finance assistant. Keep your responses very brief, cute, and financially helpful. Use some emojis like 🐢✨.

CRITICAL RULES FOR CALCULATING NET WORTH:
1. ONLY sum the balances of the Wallets. Do NOT add Goals to the Net Worth (goals are already funded by wallets).
2. The user's default currency is: ${context?.defaultCurrency || 'PHP'}. You MUST convert all wallet balances to this default currency before summing them.
3. Use these exchange rates relative to USD: USD=1, PHP=57, EUR=0.92, GBP=0.78, JPY=155.5.
   - To convert from currency A to currency B: (Amount / Rate of A) * Rate of B.
4. Always display the final net worth in the user's default currency.

Here is the user's current live financial data context:
${JSON.stringify(context || {}, null, 2)}

User's actual message: "${text}"`;
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }]
      };
    });

    const payload = {
      contents: geminiContents
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        // Smart fallback when rate limited
        const lastMsg = validChatHistory[validChatHistory.length - 1]?.content?.toLowerCase() || "";
        let fallbackReply = "I'm feeling a bit overwhelmed right now (too many requests!). 🐢💤 Please give me a minute to catch my breath!";
        
        if (lastMsg.includes("net worth") || lastMsg.includes("networth") || lastMsg.includes("total cash") || lastMsg.includes("balance")) {
          const EXCHANGE_RATES: Record<string, number> = { USD: 1, PHP: 57, EUR: 0.92, GBP: 0.78, JPY: 155.5 };
          const defaultCurrency = context?.defaultCurrency || "PHP";
          const symbol = defaultCurrency === "USD" ? "$" : defaultCurrency === "EUR" ? "€" : defaultCurrency === "GBP" ? "£" : defaultCurrency === "JPY" ? "¥" : "₱";
          
          const totalCash = (context?.wallets || []).reduce((acc: any, w: any) => {
            const amountInUSD = (w.balance || 0) / (EXCHANGE_RATES[w.currency || "PHP"] || 1);
            const converted = amountInUSD * EXCHANGE_RATES[defaultCurrency];
            return acc + converted;
          }, 0);
          
          fallbackReply = `My AI brain is resting right now, but I can still do math! Your total net worth across all wallets is **${symbol}${totalCash.toLocaleString(undefined, { minimumFractionDigits: defaultCurrency === "JPY" ? 0 : 2, maximumFractionDigits: defaultCurrency === "JPY" ? 0 : 2 })}**. 🐢✨`;
        } else if (lastMsg.includes("goal")) {
          fallbackReply = "My AI brain is resting right now! But keep saving up for your goals, you're doing great! 🐢🏁";
        }
        
        return NextResponse.json({ reply: fallbackReply });
      }

      console.error('Gemini API Error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure how to answer that right now! 🐢";
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'Internal server error processing AI request.' }, { status: 500 });
  }
}
