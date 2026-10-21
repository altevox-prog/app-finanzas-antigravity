import { fetchMarketPrice } from './marketQuotesService.js';

const POPULAR_TICKERS = [
  { symbol: 'NU', name: 'Nu Holdings Ltd. (Nubank)', exchange: 'NYSE' },
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSE Arca' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ' },
  { symbol: 'MELI', name: 'MercadoLibre Inc.', exchange: 'NASDAQ' },
  { symbol: 'BABA', name: 'Alibaba Group Holding', exchange: 'NYSE' },
  { symbol: 'BTC', name: 'Bitcoin', exchange: 'CRYPTO' },
  { symbol: 'ETH', name: 'Ethereum', exchange: 'CRYPTO' },
  { symbol: 'SOL', name: 'Solana', exchange: 'CRYPTO' },
  { symbol: 'USDT', name: 'Tether USD', exchange: 'CRYPTO' },
  { symbol: 'BNB', name: 'BNB', exchange: 'CRYPTO' }
];

function mergeResults(apiResults = [], localMatches = []) {
  const seen = new Set();
  const combined = [];
  [...apiResults, ...localMatches].forEach((item) => {
    const sym = (item?.symbol || '').toUpperCase().trim();
    if (sym && !seen.has(sym)) {
      seen.add(sym);
      combined.push({
        symbol: sym,
        name: item.name || sym,
        exchange: item.exchange || 'US'
      });
    }
  });
  return combined.slice(0, 8);
}

export async function searchTickers(query) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const localMatches = POPULAR_TICKERS.filter(
    (item) => item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
  );

  const apiKey = import.meta.env?.VITE_FINNHUB_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${apiKey}`);
      if (res.ok) {
        const data = await res.json();
        const items = (data?.result || []).slice(0, 8).map((r) => ({
          symbol: r.displaySymbol || r.symbol,
          name: r.description || r.symbol,
          exchange: r.type || 'US'
        })).filter((it) => it.symbol && !it.symbol.includes('.'));
        if (items.length > 0) return mergeResults(items, localMatches);
      }
    } catch {}
  }

  try {
    const baseUrl = import.meta.env?.DEV ? '/api/yahoo' : 'https://query1.finance.yahoo.com';
    const res = await fetch(`${baseUrl}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`);
    if (res.ok) {
      const data = await res.json();
      const items = (data?.quotes || []).slice(0, 8).map((r) => ({
        symbol: r.symbol,
        name: r.shortname || r.longname || r.symbol,
        exchange: r.exchDisp || r.exchange || 'US'
      })).filter((it) => it.symbol);
      if (items.length > 0) return mergeResults(items, localMatches);
    }
  } catch {}

  return localMatches;
}

export async function fetchCurrentPrice(symbol) {
  if (!symbol || typeof symbol !== 'string') return null;
  const sym = symbol.toUpperCase().trim();
  if (!sym) return null;

  const apiKey = import.meta.env?.VITE_FINNHUB_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${apiKey}`);
      if (res.ok) {
        const data = await res.json();
        const price = parseFloat(data?.c);
        if (!isNaN(price) && price > 0) return price;
      }
    } catch {}
  }

  try {
    const res = await fetchMarketPrice(sym, ['BTC', 'ETH', 'SOL', 'USDT', 'BNB'].includes(sym) ? 'crypto' : 'stock');
    const price = typeof res === 'object' && res !== null ? res.price : res;
    if (price != null && !isNaN(price) && Number(price) > 0) {
      return Number(price);
    }
  } catch {}

  return null;
}
