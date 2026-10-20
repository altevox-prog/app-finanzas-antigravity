/**
 * marketQuotesService.js
 * Cotizaciones en tiempo real para criptomonedas, ETFs y acciones
 * con caché de 20 minutos (TTL), deduplicación in-flight y respaldo ante 429 / CORS / caídas de red.
 */

const MARKET_CACHE_KEY = 'presu_market_quotes_cache';
const CACHE_TTL_MS = 20 * 60 * 1000;

const FALLBACK_PRICES = {
  BTC: 64500, ETH: 3450, SOL: 148, USDT: 1.0, USDC: 1.0, BNB: 580, ADA: 0.42, XRP: 0.58,
  DOGE: 0.12, VOO: 512.4, SPY: 558.2, QQQ: 485.6, AAPL: 228.5, MSFT: 445.2, NVDA: 122.8,
  TSLA: 242.0, AMZN: 186.4, GOOGL: 168.3, META: 560.0
};

const memoryCache = new Map();
const inFlightRequests = new Map();

function getCachedPrice(symbol, anyAge = false) {
  const now = Date.now();
  if (memoryCache.has(symbol)) {
    const item = memoryCache.get(symbol);
    if ((anyAge || now - item.timestamp < CACHE_TTL_MS) && item.price > 0) return item.price;
  }
  try {
    const stored = JSON.parse(localStorage.getItem(MARKET_CACHE_KEY) || '{}');
    const item = stored[symbol];
    if (item && (anyAge || now - item.timestamp < CACHE_TTL_MS) && item.price > 0) {
      memoryCache.set(symbol, item);
      return item.price;
    }
  } catch {}
  return null;
}

function setCachedPrice(symbol, price) {
  const p = Number(price);
  if (!symbol || isNaN(p) || p <= 0) return;
  const entry = { price: p, timestamp: Date.now() };
  memoryCache.set(symbol, entry);
  try {
    const stored = JSON.parse(localStorage.getItem(MARKET_CACHE_KEY) || '{}');
    stored[symbol] = entry;
    localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(stored));
  } catch {}
}

async function fetchWithTimeout(url, ms = 2500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function executeFetchPrice(symbol, assetType) {
  const isCrypto = assetType === 'crypto' || ['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'BNB', 'ADA', 'XRP', 'DOGE', 'AVAX'].includes(symbol);

  if (isCrypto) {
    try {
      const pair = ['USDT', 'USDC'].includes(symbol) ? 'USDCUSDT' : `${symbol}USDT`;
      const res = await fetchWithTimeout(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
      if (res.ok) {
        const data = await res.json();
        const price = parseFloat(data?.price);
        if (price > 0) {
          setCachedPrice(symbol, price);
          return price;
        }
      } else if (res.status === 429) {
        return getCachedPrice(symbol, true) || FALLBACK_PRICES[symbol] || null;
      }
    } catch {}

    try {
      const cryptoMap = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binance-coin', USDT: 'tether' };
      if (cryptoMap[symbol]) {
        const res = await fetchWithTimeout(`https://api.coincap.io/v2/assets/${cryptoMap[symbol]}`);
        if (res.ok) {
          const data = await res.json();
          const p = parseFloat(data?.data?.priceUsd);
          if (p > 0) {
            setCachedPrice(symbol, p);
            return p;
          }
        }
      }
    } catch {}
  }

  // Stocks / ETFs
  try {
    const baseUrl = import.meta.env?.DEV ? '/api/yahoo' : 'https://query1.finance.yahoo.com';
    const res = await fetchWithTimeout(`${baseUrl}/v8/finance/chart/${symbol}?interval=1d&range=1d`, 3000);

    if (res.status === 429) {
      return getCachedPrice(symbol, true) || FALLBACK_PRICES[symbol] || null;
    }

    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data?.chart?.result?.[0]?.meta?.regularMarketPrice);
      if (price > 0) {
        setCachedPrice(symbol, price);
        return price;
      }
    }
  } catch (error) {
    const stale = getCachedPrice(symbol, true);
    if (stale) return stale;
    if (FALLBACK_PRICES[symbol]) {
      setCachedPrice(symbol, FALLBACK_PRICES[symbol]);
      return FALLBACK_PRICES[symbol];
    }
    return { ticker: symbol, price: null, change: 0, error: 'CORS/Offline' };
  }

  const stale = getCachedPrice(symbol, true);
  if (stale) return stale;
  if (FALLBACK_PRICES[symbol]) {
    setCachedPrice(symbol, FALLBACK_PRICES[symbol]);
    return FALLBACK_PRICES[symbol];
  }
  return { ticker: symbol, price: null, change: 0, error: 'CORS/Offline' };
}

/**
 * Consulta la cotización en tiempo real de un activo (crypto, stock, etf)
 */
export async function fetchMarketPrice(ticker, assetType = 'crypto') {
  if (!ticker || typeof ticker !== 'string') return null;
  const symbol = ticker.toUpperCase().trim();
  if (!symbol || ['CDT', 'BONO', 'BOND', 'PRESTAMO', 'LOAN'].includes(symbol) || ['cdt', 'fixed', 'loan', 'private_loan'].includes(assetType)) {
    return null;
  }

  const cached = getCachedPrice(symbol);
  if (cached !== null) return cached;

  if (inFlightRequests.has(symbol)) return inFlightRequests.get(symbol);

  const fetchPromise = (async () => {
    try { return await executeFetchPrice(symbol, assetType); }
    finally { inFlightRequests.delete(symbol); }
  })();

  inFlightRequests.set(symbol, fetchPromise);
  return fetchPromise;
}

/**
 * Consulta en lote las cotizaciones para un conjunto de activos
 */
export async function fetchBatchMarketPrices(investments = []) {
  if (!Array.isArray(investments) || investments.length === 0) return {};

  const uniqueTickers = new Map();
  investments.forEach(inv => {
    const type = inv?.assetType || inv?.category;
    if (['cdt', 'fixed', 'loan'].includes(type) || ['private_loan', 'bond'].includes(inv?.subType)) return;
    const raw = inv?.ticker || inv?.symbol || (inv?.name && inv.name.length <= 5 && !inv.name.includes(' ') ? inv.name : null);
    if (raw) uniqueTickers.set(raw.toUpperCase().trim(), type);
  });

  const results = {};
  await Promise.allSettled(Array.from(uniqueTickers.entries()).map(async ([symbol, assetType]) => {
    try {
      const res = await fetchMarketPrice(symbol, assetType);
      const price = res?.price ?? res;
      if (price != null && !isNaN(price) && Number(price) > 0) results[symbol] = Number(price);
    } catch {}
  }));

  return results;
}
