/* ============================================================
   PAWI — Monthly Wrap
   Spotify-wrapped style financial summary with AI insights.
   ============================================================ */

import * as store from './store.js';
import { formatCurrency } from './formatters.js';
import { convertCurrencySync } from './currency.js';

let currentSlide = 0;
let slides = [];
let wrapData = null;

export function renderWrap(container) {
  // Reset state
  currentSlide = 0;
  slides = [];
  
  container.innerHTML = `
    <div class="wrap-container animate-in" id="wrap-container">
      <div class="wrap-loading" id="wrap-loading">
        <img src="pawikan-2.png" alt="Pawi" class="wrap-loading-img">
        <h2 class="wrap-loading-text">Pawi is crunching your numbers...</h2>
        <p style="color:var(--text-secondary);margin-top:var(--space-2)">Consulting the Gemini oracle for your financial verdict</p>
      </div>
      <div class="wrap-content" id="wrap-content" style="display:none">
        <button class="wrap-close-btn" id="wrap-close-btn">Close X</button>
        <div class="wrap-progress-bar" id="wrap-progress-bar"></div>
        <div class="wrap-slide-container" id="wrap-slide-container"></div>
        
        <div class="wrap-nav-zones">
          <div class="wrap-nav-left" id="wrap-prev"></div>
          <div class="wrap-nav-right" id="wrap-next"></div>
        </div>
      </div>
    </div>
  `;

  // Start the analysis process asynchronously
  analyzeData(container);
}

async function analyzeData(container) {
  const transactions = store.getTransactions();
  const accounts = store.getAccounts();
  const defaultCurrency = store.getSettingValue('defaultCurrency', 'PHP');
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const recentTxs = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
  
  let totalIncome = 0;
  let totalExpense = 0;
  const categories = {};
  let biggestExpense = null;

  recentTxs.forEach(t => {
    const account = accounts.find(a => a.id === t.accountId);
    const cur = account ? account.currency : 'PHP';
    const amount = convertCurrencySync(t.amount, cur, defaultCurrency);

    if (t.type === 'income') {
      totalIncome += amount;
    } else if (t.type === 'expense') {
      totalExpense += amount;
      
      // Category sum
      const cat = t.category || 'Other';
      categories[cat] = (categories[cat] || 0) + amount;

      // Biggest expense
      if (!biggestExpense || amount > biggestExpense.amount) {
        biggestExpense = { ...t, amount };
      }
    }
  });

  // Find top category
  let topCategory = { name: 'None', amount: 0 };
  Object.entries(categories).forEach(([name, amount]) => {
    if (amount > topCategory.amount) {
      topCategory = { name, amount };
    }
  });

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  wrapData = {
    totalIncome,
    totalExpense,
    topCategory,
    biggestExpense,
    savingsRate,
    defaultCurrency
  };

  if (totalExpense === 0 && totalIncome === 0) {
    // No data
    container.querySelector('#wrap-loading').innerHTML = `
      <h2 style="color:var(--text-primary)">No transactions found for the last 30 days!</h2>
      <p style="color:var(--text-secondary);margin-top:var(--space-4)">Log some transactions and come back later.</p>
    `;
    return;
  }

  // Request AI Roast/Praise
  const systemPrompt = `You are Pawi, a witty, slightly sassy, but ultimately caring sea turtle who acts as a financial advisor. 
The user is viewing their "Monthly Wrap" (a summary of their last 30 days).
Here are their stats:
- Total Income: ${formatCurrency(totalIncome, defaultCurrency)}
- Total Spend: ${formatCurrency(totalExpense, defaultCurrency)}
- Top Spending Category: ${topCategory.name} (${formatCurrency(topCategory.amount, defaultCurrency)})
- Biggest Single Purchase: ${biggestExpense ? formatCurrency(biggestExpense.amount, defaultCurrency) + ' on ' + (biggestExpense.note || biggestExpense.category) : 'None'}
- Savings Rate: ${savingsRate.toFixed(1)}%

Write a short, engaging 2-3 sentence verdict for the user. If they saved well (>20%), praise them. If they overspent, give them a witty roast. Be fun and use emojis. DO NOT use markdown like bolding.`;

  let aiMessage = "You're doing great! Keep tracking those expenses! 🐢";
  
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are Pawi the financial sea turtle." }] },
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.8 }
      })
    });

    if (response.ok) {
      const data = await response.json();
      aiMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || aiMessage;
    }
  } catch (err) {
    console.error("AI Wrap Error:", err);
    // Fallback to default message on error
  }

  if (!aiMessage || aiMessage.trim() === '') {
    aiMessage = "You're swimming through your finances like a pro! Just keep an eye on those sneaky subscriptions. 🐢🌊";
  }

  wrapData.aiMessage = aiMessage;
  
  // Build slides
  buildSlides();
  
  // Show UI
  container.querySelector('#wrap-loading').style.display = 'none';
  container.querySelector('#wrap-content').style.display = 'flex';
  
  showSlide(0);
  bindEvents(container);
}

function buildSlides() {
  const { totalIncome, totalExpense, topCategory, biggestExpense, savingsRate, defaultCurrency, aiMessage } = wrapData;

  slides = [
    {
      theme: 'bg-teal',
      html: `
        <div class="wrap-floating-icon" style="top:10%;left:10%">🌊</div>
        <div class="wrap-floating-icon" style="bottom:20%;right:15%">🐚</div>
        <div class="wrap-slide-content">
          <h2 class="wrap-title">The Last 30 Days</h2>
          <p class="wrap-subtitle">Let's see where your money went...</p>
          <div class="wrap-stat-box">
            <div class="wrap-stat-label">Money In</div>
            <div class="wrap-stat-value" style="color: var(--accent-green)">${formatCurrency(totalIncome, defaultCurrency)}</div>
          </div>
          <div class="wrap-stat-box" style="margin-top:var(--space-4)">
            <div class="wrap-stat-label">Money Out</div>
            <div class="wrap-stat-value" style="color: var(--accent-red)">${formatCurrency(totalExpense, defaultCurrency)}</div>
          </div>
          <div style="margin-top:var(--space-6); opacity: 0.7; font-size: var(--text-sm); font-weight: bold;">
            Tap right to continue ➔
          </div>
          <div class="wrap-trivia">
            "Fun Fact: Sea turtles like me can hold our breath for hours. But you shouldn't hold your breath waiting for your savings to grow—invest it!"
          </div>
        </div>
      `
    },
    {
      theme: 'bg-purple',
      html: `
        <div class="wrap-floating-icon" style="top:20%;right:10%">💜</div>
        <div class="wrap-floating-icon" style="bottom:10%;left:5%">✨</div>
        <div class="wrap-slide-content">
          <h2 class="wrap-title">Your True Love</h2>
          <p class="wrap-subtitle">You spent the most on...</p>
          <div class="wrap-hero-stat">
            <span class="wrap-hero-category">${topCategory.name.toUpperCase()}</span>
            <span class="wrap-hero-amount">${formatCurrency(topCategory.amount, defaultCurrency)}</span>
          </div>
          <div class="wrap-trivia">
            "Turtles love jellyfish. You clearly love ${topCategory.name.toLowerCase()}. Whatever makes you happy! Just budget for it."
          </div>
        </div>
      `
    },
    {
      theme: 'bg-orange',
      html: `
        <div class="wrap-floating-icon" style="top:15%;left:5%">🔥</div>
        <div class="wrap-slide-content">
          <h2 class="wrap-title">The Statement Piece</h2>
          <p class="wrap-subtitle">Your single biggest purchase was...</p>
          <div class="wrap-hero-stat">
            <span class="wrap-hero-amount">${biggestExpense ? formatCurrency(biggestExpense.amount, defaultCurrency) : '₱0'}</span>
            <span class="wrap-hero-note">${biggestExpense ? (biggestExpense.note || biggestExpense.category) : 'Nothing!'}</span>
          </div>
          <div class="wrap-trivia">
            "Big purchases are like riding the East Australian Current. Exciting, fast, but you better know where you're going to land!"
          </div>
        </div>
      `
    },
    {
      theme: 'bg-dark',
      html: `
        <div class="wrap-floating-icon" style="top:5%;right:5%">🐢</div>
        <div class="wrap-slide-content">
          <h2 class="wrap-title">Pawi's Verdict</h2>
          <div class="wrap-savings-rate">
            Savings Rate: <span class="${savingsRate >= 20 ? 'positive' : 'negative'}">${savingsRate.toFixed(1)}%</span>
          </div>
          <div class="wrap-ai-message">
            "${aiMessage}"
          </div>
          <img src="pawikan-2.png" alt="Pawi" class="wrap-final-mascot">
          <div style="margin-top:var(--space-4); opacity: 0.7; font-size: var(--text-sm); font-weight: bold;">
            Tap 'Close' on the top right to return to Dashboard
          </div>
        </div>
      `
    }
  ];

  const progressContainer = document.getElementById('wrap-progress-bar');
  if (progressContainer) {
    progressContainer.innerHTML = slides.map((_, i) => `
      <div class="wrap-progress-segment ${i === 0 ? 'active' : ''}" data-index="${i}">
        <div class="wrap-progress-fill"></div>
      </div>
    `).join('');
  }
}

function showSlide(index) {
  if (index < 0 || index >= slides.length) return;
  currentSlide = index;
  
  const container = document.getElementById('wrap-slide-container');
  const progressSegments = document.querySelectorAll('.wrap-progress-segment');
  const wrapContent = document.getElementById('wrap-content');
  
  if (!container || !wrapContent) return;

  const slide = slides[currentSlide];
  
  // Update theme class
  wrapContent.className = 'wrap-content ' + slide.theme;
  
  // Render html
  container.innerHTML = slide.html;
  
  // Add animation class
  const contentEl = container.querySelector('.wrap-slide-content');
  if (contentEl) {
    contentEl.classList.remove('slide-in-bottom');
    void contentEl.offsetWidth; // trigger reflow
    contentEl.classList.add('slide-in-bottom');
  }

  // Update progress bar
  progressSegments.forEach((seg, i) => {
    if (i < currentSlide) {
      seg.classList.add('completed');
      seg.classList.remove('active');
    } else if (i === currentSlide) {
      seg.classList.remove('completed');
      seg.classList.add('active');
    } else {
      seg.classList.remove('completed', 'active');
    }
  });
}

function bindEvents(container) {
  const prevBtn = container.querySelector('#wrap-prev');
  const nextBtn = container.querySelector('#wrap-next');
  const closeBtn = container.querySelector('#wrap-close-btn');

  prevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentSlide > 0) showSlide(currentSlide - 1);
  });

  nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentSlide < slides.length - 1) {
      showSlide(currentSlide + 1);
    }
  });

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    // Navigate back to the dashboard to close the wrap
    import('./app.js').then(app => {
      // Simulate clicking the dashboard nav item
      const dashBtn = document.getElementById('nav-dashboard');
      if (dashBtn) dashBtn.click();
    });
  });
}
