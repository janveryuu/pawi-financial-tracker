/* ============================================================
   SENTIMO — Currency Conversion Service
   Fetches and caches live exchange rates using open.er-api.com.
   ============================================================ */

const CACHE_KEY = 'sentimo_exchange_rates_usd';
const CACHE_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

let ratesRelativeToUSD = null;

export async function initCurrencyRates() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
      ratesRelativeToUSD = parsed.rates;
      return;
    }
  }

  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/USD`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    
    ratesRelativeToUSD = data.rates;
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      rates: data.rates
    }));
  } catch (err) {
    console.error('Failed to fetch exchange rates:', err);
    if (cached) {
      ratesRelativeToUSD = JSON.parse(cached).rates;
    } else {
      // Basic fallback
      ratesRelativeToUSD = { USD: 1, PHP: 58.5, EUR: 0.92, GBP: 0.79, JPY: 156.0, BTC: 0.000015 };
    }
  }
}

export function convertCurrencySync(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  if (!ratesRelativeToUSD || !ratesRelativeToUSD[fromCurrency] || !ratesRelativeToUSD[toCurrency]) {
    return amount;
  }
  
  const amountInUSD = amount / ratesRelativeToUSD[fromCurrency];
  return amountInUSD * ratesRelativeToUSD[toCurrency];
}
