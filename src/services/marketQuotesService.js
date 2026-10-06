/**
 * marketQuotesService.js
 * Servicio de cotizaciones en tiempo real para criptomonedas, ETFs y acciones
 * con caché de 1 minuto y respaldo seguro ante caídas de conexión o CORS.
 */

const MARKET_CACHE_KEY = 'presu_market_quotes_cache';
const CACHE_TTL_MS = 60 * 1000; // 1 minuto de vigencia de caché

// Precios de referencia de mercado en caso de fallo de red o restricciones de CORS
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

/**
 * Lee la cotización de caché si aún no ha expirado (< 1 minuto)
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
 * Consulta la cotización en tiempo real de un activo (crypto, stock, etf)
 * @param {string} ticker Ticker del activo (ej: BTC, ETH, VOO, SPY, AAPL)
 * @param {string} assetType Tipo de activo: 'crypto' | 'stock' | 'etf' | 'fund' | 'cdt'
 * @returns {Promise<number|null>} Precio unitario en USD
 */
export async function fetchMarketPrice(ticker, assetType = 'crypto') {
  if (!ticker || typeof ticker !== 'string') return null;
  const symbol = ticker.toUpperCase().trim();
  if (!symbol) return null;

  // 1. Verificar si existe cotización fresca en caché (< 1 min)
  const cached = getCachedPrice(symbol);
  if (cached !== null) {
    return cached;
  }

  // 2. CRIPTOMONEDAS: Binance Public API (CORS habilitado públicamente)
  const isCrypto = assetType === 'crypto' || ['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'BNB', 'ADA', 'XRP', 'DOGE', 'AVAX'].includes(symbol);
  if (isCrypto) {
    try {
      const pair = (symbol === 'USDT' || symbol === 'USDC') ? 'USDCUSDT' : `${symbol}USDT`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

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
        const timeoutCap = setTimeout(() => controllerCap.abort(), 2000);
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

  // 3. ÍNDICES, ETFS Y ACCIONES US (Yahoo Finance / API pública de mercado)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price && !isNaN(price) && price > 0) {
        setCachedPrice(symbol, parseFloat(price));
        return parseFloat(price);
      }
    }
  } catch (e) {
    console.warn(`Error consultando mercado US ${symbol} en Yahoo Finance:`, e);
  }

  // 4. Respaldo seguro con precio de referencia de mercado
  if (FALLBACK_PRICES[symbol]) {
    const fallback = FALLBACK_PRICES[symbol];
    setCachedPrice(symbol, fallback);
    return fallback;
  }

  return null;
}

/**
 * Consulta en lote las cotizaciones para un conjunto de activos
 * @param {Array} investments Lista de inversiones con { ticker, assetType }
 * @returns {Promise<Object>} Mapa { [ticker]: price }
 */
export async function fetchBatchMarketPrices(investments = []) {
  if (!Array.isArray(investments) || investments.length === 0) return {};
  
  const results = {};
  const promises = investments.map(async (inv) => {
    const ticker = inv.ticker || inv.symbol || (inv.name && inv.name.length <= 5 ? inv.name : null);
    if (!ticker) return;
    const price = await fetchMarketPrice(ticker, inv.assetType || inv.category);
    if (price !== null) {
      results[ticker.toUpperCase()] = price;
    }
  });

  await Promise.allSettled(promises);
  return results;
}
