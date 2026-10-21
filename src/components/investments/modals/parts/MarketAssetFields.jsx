import React, { useState } from 'react';
import { RefreshCw, Edit3, Lock } from 'lucide-react';
import AmountInput from '../../../common/AmountInput';
import SegmentedControl from '../../../common/SegmentedControl';
import TickerSearchInput from './TickerSearchInput';
import InvestmentProfitSummary from './InvestmentProfitSummary';
import { fetchCurrentPrice } from '../../../../services/marketPriceService';

const CRYPTO_PRESETS = [
  { sym: 'BTC', name: 'Bitcoin', type: 'crypto', cat: 'crypto' },
  { sym: 'ETH', name: 'Ethereum', type: 'crypto', cat: 'crypto' },
  { sym: 'SOL', name: 'Solana', type: 'crypto', cat: 'crypto' },
  { sym: 'USDT', name: 'Tether USD', type: 'crypto', cat: 'crypto' },
  { sym: 'BNB', name: 'BNB', type: 'crypto', cat: 'crypto' }
];

const VARIABLE_PRESETS = [
  { sym: 'NU', name: 'Nu Holdings Ltd. (Nubank)', type: 'stock', cat: 'variable' },
  { sym: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'etf', cat: 'variable' },
  { sym: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf', cat: 'variable' },
  { sym: 'QQQ', name: 'Invesco QQQ (Nasdaq 100)', type: 'etf', cat: 'variable' },
  { sym: 'AAPL', name: 'Apple Inc.', type: 'stock', cat: 'variable' }
];

const INPUT_STYLE = { backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' };
const INPUT_CLS = "w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none transition-all";
const NUM_INPUT_CLS = "w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-transparent focus:outline-none";

export default function MarketAssetFields({
  category, currency, setCurrency, name, setName, ticker, setTicker,
  shares, setShares, buyPrice, setBuyPrice, currentPrice, setCurrentPrice,
  assetType, setAssetType, setCategory, isEditing
}) {
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [isManualPrice, setIsManualPrice] = useState(false);
  const [isManualAsset, setIsManualAsset] = useState(false);
  const activePresets = category === 'crypto' ? CRYPTO_PRESETS : VARIABLE_PRESETS;

  const handleFetchQuote = async (symbolToFetch) => {
    const sym = (symbolToFetch || ticker).toUpperCase().trim();
    if (!sym) return;
    setIsFetchingPrice(true);
    try {
      const price = await fetchCurrentPrice(sym);
      if (price !== null && !isNaN(price) && Number(price) > 0) {
        const numPrice = Number(price);
        setCurrentPrice(String(numPrice));
        if (!buyPrice || Number(buyPrice) === 0) setBuyPrice(String(numPrice));
      }
    } catch {} finally { setIsFetchingPrice(false); }
  };

  const handleSelectSuggestedTicker = (item) => {
    const sym = item.symbol.toUpperCase().trim();
    setTicker(sym);
    setName(item.name || sym);
    handleFetchQuote(sym);
  };

  const handleClearSelectedTicker = () => {
    setTicker('');
    setName('');
  };

  const handleSelectPreset = (item) => {
    setTicker(item.sym);
    setName(item.name);
    if (item.type) setAssetType(item.type);
    if (item.cat) setCategory(item.cat);
    if (!isEditing) setCurrency('USD');
    handleFetchQuote(item.sym);
  };

  return (
    <div className="space-y-3.5 animate-fadeIn">
      {isManualAsset ? (
        <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold opacity-70">Activo manual / no listado</label>
            <button type="button" onClick={() => setIsManualAsset(false)} className="text-xs text-emerald-500 hover:underline cursor-pointer">Volver al buscador</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="text" placeholder="Ticker (ej. MI-ACTIVO)" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} className={INPUT_CLS} style={INPUT_STYLE} />
            <input type="text" required placeholder="Nombre del activo *" value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} style={INPUT_STYLE} />
          </div>
        </div>
      ) : (
        <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
          <label className="text-[11px] font-bold opacity-70 block">Activo de Inversión</label>
          <TickerSearchInput ticker={ticker} name={name} onSelect={handleSelectSuggestedTicker} onClear={handleClearSelectedTicker} placeholder={category === 'crypto' ? 'Buscar cripto (ej. BTC, ETH)' : 'Buscar acción o ETF (ej. Nubank, AAPL)'} inputStyle={INPUT_STYLE} className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none uppercase" />
          {!ticker && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
              <span className="text-[10px] opacity-40 font-semibold mr-0.5">Top:</span>
              {activePresets.map((item) => (
                <button key={item.sym} type="button" onClick={() => handleSelectPreset(item)} className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 bg-slate-200/60 dark:bg-white/5 opacity-70 hover:opacity-100 text-slate-700 dark:text-slate-300">
                  {item.sym}
                </button>
              ))}
            </div>
          )}
          <div className="pt-0.5">
            <button type="button" onClick={() => setIsManualAsset(true)} className="text-[11px] text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-white underline cursor-pointer">
              ¿Activo privado o no listado en bolsa? Registrar manualmente
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-bold opacity-70 mb-1">Moneda de origen *</label>
        <SegmentedControl options={[{ id: 'COP', label: 'COP ($)' }, { id: 'USD', label: 'USD ($)' }]} value={currency} onChange={setCurrency} size="sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <label className="block text-[10px] font-bold opacity-70 mb-1">Cantidad *</label>
          <input type="number" step="any" min="0.000001" required placeholder="ej. 1" value={shares} onFocus={(e) => e.target.select()} onChange={(e) => setShares(e.target.value)} className={NUM_INPUT_CLS} style={INPUT_STYLE} />
        </div>
        <div>
          <label className="block text-[10px] font-bold opacity-70 mb-1">Precio Compra ({currency}) *</label>
          <AmountInput value={buyPrice} onChange={(cleanVal) => setBuyPrice(cleanVal)} allowDecimals required placeholder="0.00" onFocus={(e) => e.target.select()} className={NUM_INPUT_CLS} style={INPUT_STYLE} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold opacity-70">Precio Actual ({currency})</label>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => handleFetchQuote(ticker)} disabled={isFetchingPrice || !ticker} title="Actualizar cotización" className="p-0.5 rounded text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer disabled:opacity-30">
                <RefreshCw className={`w-3 h-3 ${isFetchingPrice ? 'animate-spin text-emerald-500' : ''}`} />
              </button>
              <button type="button" onClick={() => setIsManualPrice((p) => !p)} title={isManualPrice ? 'Fijar modo automático' : 'Modo manual'} className="text-[9px] font-semibold text-slate-400 hover:text-emerald-500 flex items-center gap-0.5 cursor-pointer">
                {isManualPrice ? <Lock className="w-2.5 h-2.5" /> : <Edit3 className="w-2.5 h-2.5" />}
                <span>{isManualPrice ? 'Auto' : 'Manual'}</span>
              </button>
            </div>
          </div>
          <AmountInput value={currentPrice} onChange={(cleanVal) => setCurrentPrice(cleanVal)} allowDecimals readOnly={!isManualPrice} placeholder={isFetchingPrice ? 'Cargando...' : '0.00'} className={`${NUM_INPUT_CLS} ${isManualPrice ? 'text-amber-500' : 'text-emerald-500'} font-mono`} style={{ backgroundColor: 'var(--bg-input)' }} />
        </div>
      </div>

      <InvestmentProfitSummary shares={shares} buyPrice={buyPrice} currentPrice={currentPrice} currency={currency} />
    </div>
  );
}
