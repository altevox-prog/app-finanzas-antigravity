import React, { useState } from 'react';
import AmountInput from '../../../common/AmountInput';
import SegmentedControl from '../../../common/SegmentedControl';
import { fetchMarketPrice } from '../../../../services/marketQuotesService';

const CRYPTO_PRESETS = [
  { sym: 'BTC', name: 'Bitcoin', type: 'crypto', cat: 'crypto' },
  { sym: 'ETH', name: 'Ethereum', type: 'crypto', cat: 'crypto' },
  { sym: 'SOL', name: 'Solana', type: 'crypto', cat: 'crypto' },
  { sym: 'USDT', name: 'Tether USD', type: 'crypto', cat: 'crypto' },
  { sym: 'BNB', name: 'BNB', type: 'crypto', cat: 'crypto' }
];

const VARIABLE_PRESETS = [
  { sym: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'etf', cat: 'variable' },
  { sym: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf', cat: 'variable' },
  { sym: 'QQQ', name: 'Invesco QQQ (Nasdaq 100)', type: 'etf', cat: 'variable' },
  { sym: 'AAPL', name: 'Apple Inc.', type: 'stock', cat: 'variable' },
  { sym: 'NVDA', name: 'Nvidia Corp.', type: 'stock', cat: 'variable' }
];

const TICKER_NAMES = {
  BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', USDT: 'Tether USD', USDC: 'USD Coin',
  BNB: 'BNB', ADA: 'Cardano', XRP: 'XRP', DOGE: 'Dogecoin', VOO: 'Vanguard S&P 500 ETF',
  SPY: 'SPDR S&P 500 ETF', QQQ: 'Invesco QQQ (Nasdaq 100)', AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corp.', NVDA: 'Nvidia Corp.', TSLA: 'Tesla Inc.', AMZN: 'Amazon.com Inc.',
  GOOGL: 'Alphabet Inc.', META: 'Meta Platforms Inc.'
};

const INPUT_STYLE = { backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' };
const INPUT_CLS = "w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none transition-all";
const NUM_INPUT_CLS = "w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-transparent focus:outline-none";

export default function MarketAssetFields({
  category, currency, setCurrency, name, setName, ticker, setTicker,
  shares, setShares, buyPrice, setBuyPrice, currentPrice, setCurrentPrice,
  assetType, setAssetType, setCategory, isEditing
}) {
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const activePresets = category === 'crypto' ? CRYPTO_PRESETS : VARIABLE_PRESETS;

  const handleFetchQuote = async (symbolToFetch, explicitAssetType) => {
    const sym = (symbolToFetch || ticker).toUpperCase().trim();
    if (!sym) return;
    setIsFetchingPrice(true);
    try {
      const res = await fetchMarketPrice(sym, explicitAssetType || assetType || (category === 'crypto' ? 'crypto' : 'stock'));
      const price = typeof res === 'object' && res !== null ? res.price : res;
      if (price !== null && !isNaN(price) && Number(price) > 0) {
        const numPrice = Number(price);
        setCurrentPrice(String(numPrice));
        if (!buyPrice || Number(buyPrice) === 0) setBuyPrice(String(numPrice));
      }
      setName((prev) => (!prev || !prev.trim() || Object.values(TICKER_NAMES).includes(prev.trim())) ? (TICKER_NAMES[sym] || sym) : prev);
    } catch (e) {
      console.warn('Error consultando precio en vivo:', e);
    } finally { setIsFetchingPrice(false); }
  };

  const handleSelectPreset = (item) => {
    setTicker(item.sym);
    setName((prev) => (!prev || !prev.trim() || Object.values(TICKER_NAMES).includes(prev.trim())) ? item.name : prev);
    if (item.type) setAssetType(item.type);
    if (item.cat) setCategory(item.cat);
    if (!isEditing) setCurrency('USD');
    handleFetchQuote(item.sym, item.type);
  };

  return (
    <div className="space-y-3.5 animate-fadeIn">
      <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold opacity-70">Ticker / Símbolo de Mercado</label>
          {currentPrice && (
            <span className="text-[10px] font-bold text-emerald-500 tabular-nums">
              Cotización: ${Number(currentPrice).toLocaleString(currency === 'USD' ? 'en-US' : 'es-CO', { maximumFractionDigits: 2 })} {currency}
            </span>
          )}
        </div>
        <input type="text" placeholder={category === 'crypto' ? 'ej. BTC, ETH, SOL' : 'ej. VOO, SPY, AAPL'} value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} onBlur={() => ticker && handleFetchQuote(ticker)} className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none uppercase" style={INPUT_STYLE} />
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
          <span className="text-[10px] opacity-40 font-semibold mr-0.5">Top:</span>
          {activePresets.map((item) => (
            <button key={item.sym} type="button" onClick={() => handleSelectPreset(item)} className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${ticker === item.sym ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200/60 dark:bg-white/5 opacity-70 hover:opacity-100 text-slate-700 dark:text-slate-300'}`}>
              {item.sym}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold opacity-70 mb-1">Nombre del Activo *</label>
        <input type="text" required placeholder={category === 'crypto' ? 'ej. Bitcoin, Ethereum, Solana...' : 'ej. Vanguard S&P 500 (VOO)...'} value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} style={INPUT_STYLE} />
      </div>
      <div>
        <label className="block text-[11px] font-bold opacity-70 mb-1">Moneda de origen *</label>
        <SegmentedControl options={[{ id: 'COP', label: 'COP ($)' }, { id: 'USD', label: 'USD ($)' }]} value={currency} onChange={setCurrency} size="sm" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <label className="block text-[10px] font-bold opacity-70 mb-1">Cantidad *</label>
          <input type="number" step="any" min="0" required placeholder="ej. 0.045" value={shares} onFocus={(e) => e.target.select()} onChange={(e) => setShares(e.target.value)} className={NUM_INPUT_CLS} style={INPUT_STYLE} />
        </div>
        <div>
          <label className="block text-[10px] font-bold opacity-70 mb-1">Precio Compra ({currency}) *</label>
          <AmountInput value={buyPrice} onChange={(cleanVal) => setBuyPrice(cleanVal)} allowDecimals required placeholder="0" onFocus={(e) => e.target.select()} className={NUM_INPUT_CLS} style={INPUT_STYLE} />
        </div>
        <div>
          <label className="block text-[10px] font-bold opacity-70 mb-1">Precio Actual ({currency}) *</label>
          <AmountInput value={currentPrice} onChange={(cleanVal) => setCurrentPrice(cleanVal)} allowDecimals required placeholder="0" onFocus={(e) => e.target.select()} className={`${NUM_INPUT_CLS} text-emerald-500 font-mono`} style={{ backgroundColor: 'var(--bg-input)' }} />
        </div>
      </div>
    </div>
  );
}
