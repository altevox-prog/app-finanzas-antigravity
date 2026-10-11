/**
 * marketQuotesService.js
 * Servicio de cotizaciones en tiempo real para criptomonedas, ETFs y acciones
 * con caché de 20 minutos (TTL), deduplicación in-flight y respaldo seguro ante 429 / CORS / caídas de red.
 */

const MARKET_CACHE_KEY = 'presu_market_quotes_cache';
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutos de vigencia de caché

// Precios de referencia de mercado en caso de fallo de red, rate-limit 429 o restricciones de CORS
const FALLBACK_PRICES = {
  BTC: 64500,
  ETH: 3450,
  SOL: 148,
  USDT: 1.0,
  USDC: 1.0,
  BNB: 580,
  ADA: 0.42,
  XRP: 0.58,
  DOGE: 0.12,
  VOO: 512.4,
  SPY: 558.2,
  QQQ: 485.6,
  AAPL: 228.5,
  MSFT: 445.2,
  NVDA: 122.8,
  TSLA: 242.0,
  AMZN: 186.4,
  GOOGL: 168.3,
  META: 560.0
};

// Memoria caché en ejecución para acceso ultra-rápido
const memoryCache = new Map();

// Mapa para deduplicación de peticiones en vuelo (In-flight request deduplication)
const inFlightRequests = new Map();

/**
 * Lee la cotización de caché si aún no ha expirado (< 20 minutos)
 */
function getCachedPrice(symbol) {
  const now = Date.now();
  
  // 1. Memoria rápida
  if (memoryCache.has(symbol)) {
    const item = memoryCache.get(symbol);
    if (now - item.timestamp < CACHE_TTL_MS && item.price > 0) {
      return item.price;
    }
  }

  // 2. LocalStorage
  try {
    const stored = JSON.parse(localStorage.getItem(MARKET_CACHE_KEY) || '{}');
    const item = stored[symbol];
    if (item && now - item.timestamp < CACHE_TTL_MS && item.price > 0) {
      memoryCache.set(symbol, item);
      return item.price;
    }
  } catch (e) {
    console.warn('Error leyendo caché local de cotizaciones:', e);
  }

  return null;
}

/**
 * Obtiene la última cotización almacenada en caché, incluso si está expirada (stale cache)
 */
function getAnyCachedPrice(symbol) {
  if (memoryCache.has(symbol)) {
    const item = memoryCache.get(symbol);
    if (item && item.price > 0) return item.price;
  }

  try {
    const stored = JSON.parse(localStorage.getItem(MARKET_CACHE_KEY) || '{}');
    const item = stored[symbol];
    if (item && item.price > 0) {
      memoryCache.set(symbol, item);
      return item.price;
    }
  } catch {
    // ignorar error de lectura
  }

  return null;
}

/**
 * Guarda la cotización en caché con marca de tiempo
 */
function setCachedPrice(symbol, price) {
  if (!symbol || !price || isNaN(price) || price <= 0) return;
  const now = Date.now();
  const entry = { price: Number(price), timestamp: now };
  memoryCache.set(symbol, entry);

  try {
    const stored = JSON.parse(localStorage.getItem(MARKET_CACHE_KEY) || '{}');
    stored[symbol] = entry;
    localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(stored));
  } catch (e) {
    console.warn('Error guardando en caché local de cotizaciones:', e);
  }
}

/**
 * Realiza la ejecución de red real para consultar el precio del activo
 */
async function executeFetchPrice(symbol, assetType) {
  // 1. CRIPTOMONEDAS: Binance Public API (CORS habilitado públicamente)
  const isCrypto = assetType === 'crypto' || ['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'BNB', 'ADA', 'XRP', 'DOGE', 'AVAX'].includes(symbol);
  if (isCrypto) {
    try {
      const pair = (symbol === 'USDT' || symbol === 'USDC') ? 'USDCUSDT' : `${symbol}USDT`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.price) {
          const price = parseFloat(data.price);
          if (!isNaN(price) && price > 0) {
            setCachedPrice(symbol, price);
            return price;
          }
        }
      } else if (res.status === 429) {
        console.warn(`[marketQuotesService] Binance rate limit reached (429) for ${symbol}, using cached quote`);
        return getAnyCachedPrice(symbol) || FALLBACK_PRICES[symbol] || null;
      }
    } catch (e) {
      console.warn(`Error consultando cripto ${symbol} en Binance:`, e);
    }

    // Respaldo alternativo para cripto (CoinCap API pública)
    try {
      const cryptoMap = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binance-coin', USDT: 'tether' };
      const coinId = cryptoMap[symbol];
      if (coinId) {
        const controllerCap = new AbortController();
        const timeoutCap = setTimeout(() => controllerCap.abort(), 2500);
        const res = await fetch(`https://api.coincap.io/v2/assets/${coinId}`, { signal: controllerCap.signal });
        clearTimeout(timeoutCap);
        if (res.ok) {
          const data = await res.json();
          const p = parseFloat(data?.data?.priceUsd);
          if (p && !isNaN(p)) {
            setCachedPrice(symbol, p);
            return p;
          }
        }
      }
    } catch (err) {
      console.warn(`Error en respaldo CoinCap para ${symbol}:`, err);
    }
  }

  // 2. ÍNDICES, ETFS Y ACCIONES US (Yahoo Finance / API pública de mercado vía Proxy en DEV)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const baseUrl = import.meta.env?.DEV ? '/api/yahoo' : 'https://query1.finance.yahoo.com';
    const url = `${baseUrl}/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    // Manejo resiliente de error 429 (Too Many Requests)
    if (res.status === 429) {
      console.warn(`[marketQuotesService] Yahoo Finance rate limit reached (429) for ${symbol}, using cached quote`);
      const stalePrice = getAnyCachedPrice(symbol);
      if (stalePrice) return stalePrice;
      if (FALLBACK_PRICES[symbol]) return FALLBACK_PRICES[symbol];
      return null;
    }

    if (res.ok) {
      const data = await res.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price && !isNaN(price) && price > 0) {
        setCachedPrice(symbol, parseFloat(price));
        return parseFloat(price);
      }
    }
  } catch (error) {
    console.warn(`[marketQuotesService] No se pudo obtener cotización remota para ${symbol}:`, error?.message || error);
    const stalePrice = getAnyCachedPrice(symbol);
    if (stalePrice) return stalePrice;
    if (FALLBACK_PRICES[symbol]) {
      const fallback = FALLBACK_PRICES[symbol];
      setCachedPrice(symbol, fallback);
      return fallback;
    }
    return { ticker: symbol, price: null, change: 0, error: 'CORS/Offline' };
  }

  // 3. Respaldo seguro con precio stale o referencia de mercado
  const fallbackStale = getAnyCachedPrice(symbol);
  if (fallbackStale) return fallbackStale;

  if (FALLBACK_PRICES[symbol]) {
    const fallback = FALLBACK_PRICES[symbol];
    setCachedPrice(symbol, fallback);
    return fallback;
  }

  return { ticker: symbol, price: null, change: 0, error: 'CORS/Offline' };
}

/**
 * Consulta la cotización en tiempo real de un activo (crypto, stock, etf)
 * con caché de 20 min y deduplicación in-flight.
 * @param {string} ticker Ticker del activo (ej: BTC, ETH, VOO, SPY, AAPL)
 * @param {string} assetType Tipo de activo: 'crypto' | 'stock' | 'etf' | 'fund' | 'cdt'
 * @returns {Promise<number|null>} Precio unitario en USD
 */
export async function fetchMarketPrice(ticker, assetType = 'crypto') {
  if (!ticker || typeof ticker !== 'string') return null;
  const symbol = ticker.toUpperCase().trim();
  if (!symbol) return null;

  // Ignorar activos no cotizables en bolsa pública
  if (['CDT', 'BONO', 'BOND', 'PRESTAMO', 'LOAN'].includes(symbol) || 
      assetType === 'cdt' || assetType === 'fixed' || assetType === 'loan' || assetType === 'private_loan') {
    return null;
  }

  // 1. Verificar si existe cotización fresca en caché (< 20 min)
  const cached = getCachedPrice(symbol);
  if (cached !== null) {
    return cached;
  }

  // 2. Prevenir peticiones simultáneas duplicadas (In-flight request deduplication)
  if (inFlightRequests.has(symbol)) {
    return inFlightRequests.get(symbol);
  }

  const fetchPromise = (async () => {
    try {
      return await executeFetchPrice(symbol, assetType);
    } finally {
      inFlightRequests.delete(symbol);
    }
  })();

  inFlightRequests.set(symbol, fetchPromise);
  return fetchPromise;
}

/**
 * Consulta en lote las cotizaciones para un conjunto de activos
 * @param {Array} investments Lista de inversiones con { ticker, assetType }
 * @returns {Promise<Object>} Mapa { [ticker]: price }
 */
export async function fetchBatchMarketPrices(investments = []) {
  if (!Array.isArray(investments) || investments.length === 0) return {};

  // Filtrar activos que no son de mercado público
  const validInvestments = investments.filter(inv => {
    const type = inv.assetType || inv.category;
    if (type === 'cdt' || type === 'fixed' || type === 'loan' || inv.subType === 'private_loan' || inv.subType === 'bond') {
      return false;
    }
    return true;
  });

  // Deduplicar símbolos a consultar
  const uniqueTickers = new Map();
  validInvestments.forEach(inv => {
    const raw = inv.ticker || inv.symbol || (inv.name && inv.name.length <= 5 && !inv.name.includes(' ') ? inv.name : null);
    if (raw) {
      const sym = raw.toUpperCase().trim();
      if (!uniqueTickers.has(sym)) {
        uniqueTickers.set(sym, inv.assetType || inv.category);
      }
    }
  });

  const results = {};
  const promises = Array.from(uniqueTickers.entries()).map(async ([symbol, assetType]) => {
    try {
      const res = await fetchMarketPrice(symbol, assetType);
      const price = (typeof res === 'object' && res !== null) ? res.price : res;
      if (price !== null && !isNaN(price) && Number(price) > 0) {
        results[symbol] = Number(price);
      }
    } catch (err) {
      console.warn(`[marketQuotesService] Error consultando cotización para ${symbol}:`, err);
    }
  });

  await Promise.allSettled(promises);
  return results;
}
