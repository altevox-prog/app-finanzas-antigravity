import React, { useState } from 'react';
import { fetchMarketPrice } from '../../../services/marketQuotesService';
import { formatCurrencyInput, parseFormattedAmount } from '../../../utils/currencyFormatter';
import AmountInput from '../../common/AmountInput';

export default function MarketAssetFields({
  category,
  assetType,
  ticker,
  setTicker,
  shares,
  setShares,
  buyPrice,
  setBuyPrice,
  currentPrice,
  setCurrentPrice,
  investedAmount,
  setInvestedAmount,
  currentAmount,
  setCurrentAmount,
  currency,
  setName,
  setAssetType,
  setCategory,
  setCurrency
}) {
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  if (category === 'fixed') return null;

  // Consulta de cotización en vivo según ticker
  const handleFetchQuote = async (symbolToFetch, explicitAssetType) => {
    const sym = (symbolToFetch || ticker).toUpperCase().trim();
    if (!sym) return;
    setIsFetchingPrice(true);
    try {
      const typeToUse = explicitAssetType || assetType;
      const res = await fetchMarketPrice(sym, typeToUse);
      const price = typeof res === 'object' && res !== null ? res.price : res;
      if (price !== null && !isNaN(price) && Number(price) > 0) {
        const numPrice = Number(price);
        setCurrentPrice(String(numPrice));
        if (!buyPrice) {
          setBuyPrice(String(numPrice));
        }
        if (shares && parseFloat(shares) > 0) {
          const s = parseFloat(shares);
          const curr = Math.round(s * numPrice * 100) / 100;
          setCurrentAmount(formatCurrencyInput(curr, true));
          if (!investedAmount) {
            setInvestedAmount(formatCurrencyInput(curr, true));
          }
        }
      }
    } catch (e) {
      console.warn('Error consultando precio en vivo:', e);
    } finally {
      setIsFetchingPrice(false);
    }
  };

  // Autocalcular montos al cambiar títulos o precios
  const handleSharesChange = (val) => {
    setShares(val);
    const s = parseFloat(val);
    const b = parseFormattedAmount(buyPrice);
    const c = parseFormattedAmount(currentPrice);
    if (!isNaN(s) && s > 0) {
      if (!isNaN(b) && b > 0) setInvestedAmount(formatCurrencyInput(Math.round(s * b * 100) / 100, true));
      if (!isNaN(c) && c > 0) setCurrentAmount(formatCurrencyInput(Math.round(s * c * 100) / 100, true));
      else if (!isNaN(b) && b > 0 && !currentAmount) setCurrentAmount(formatCurrencyInput(Math.round(s * b * 100) / 100, true));
    }
  };

  const handleBuyPriceChange = (val) => {
    setBuyPrice(val);
    const b = parseFormattedAmount(val);
    const s = parseFloat(shares);
    if (!isNaN(b) && b > 0 && !isNaN(s) && s > 0) {
      setInvestedAmount(formatCurrencyInput(Math.round(s * b * 100) / 100, true));
    }
  };

  const handleCurrentPriceChange = (val) => {
    setCurrentPrice(val);
    const c = parseFormattedAmount(val);
    const s = parseFloat(shares);
    if (!isNaN(c) && c > 0 && !isNaN(s) && s > 0) {
      setCurrentAmount(formatCurrencyInput(Math.round(s * c * 100) / 100, true));
    }
  };

  // Preset rápido de ticker
  const handleSelectPreset = (item) => {
    setTicker(item.sym);
    if (setName) setName(item.name);
    if (setAssetType) setAssetType(item.type);
    if (setCategory) setCategory(item.cat);
    if (setCurrency) setCurrency('USD');
    handleFetchQuote(item.sym, item.type);
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Ticker / Símbolo y Consulta en Vivo */}
      <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold opacity-70">
            Ticker / Símbolo de Mercado
          </label>
          {currentPrice && (
            <span className="text-[10px] font-bold text-emerald-500">
              Cotización: ${Number(currentPrice).toLocaleString('es-CO', { maximumFractionDigits: 2 })} {currency}
            </span>
          )}
        </div>

        <div>
          <input
            type="text"
            placeholder="ej. BTC, ETH, VOO, SPY, QQQ, AAPL"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onBlur={() => ticker && handleFetchQuote(ticker)}
            className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none uppercase"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
          />
        </div>

        {/* Presets rápidos de tickers frecuentes */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
          <span className="text-[10px] opacity-40 font-semibold mr-0.5">Top:</span>
          {[
            { sym: 'BTC', name: 'Bitcoin', type: 'crypto', cat: 'crypto' },
            { sym: 'ETH', name: 'Ethereum', type: 'crypto', cat: 'crypto' },
            { sym: 'SOL', name: 'Solana', type: 'crypto', cat: 'crypto' },
            { sym: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'etf', cat: 'variable' },
            { sym: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf', cat: 'variable' },
            { sym: 'QQQ', name: 'Invesco QQQ (Nasdaq 100)', type: 'etf', cat: 'variable' },
            { sym: 'AAPL', name: 'Apple Inc.', type: 'stock', cat: 'variable' },
            { sym: 'NVDA', name: 'Nvidia Corp.', type: 'stock', cat: 'variable' }
          ].map((item) => (
            <button
              key={item.sym}
              type="button"
              onClick={() => handleSelectPreset(item)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                ticker === item.sym 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-slate-200/60 dark:bg-white/5 opacity-70 hover:opacity-100 text-slate-700 dark:text-slate-300'
              }`}
            >
              {item.sym}
            </button>
          ))}
        </div>
      </div>

      {/* Cantidad de Títulos / Fracciones y Precios Unitarios (para acciones/cripto/etfs) */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] font-bold opacity-70 mb-1">
            Cantidad (Títulos)
          </label>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="ej. 0.045"
            value={shares}
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleSharesChange(e.target.value)}
            className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-transparent focus:outline-none"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold opacity-70 mb-1">
            Precio Compra ({currency})
          </label>
          <AmountInput
            value={buyPrice}
            allowDecimals={true}
            placeholder="0"
            onFocus={(e) => e.target.select()}
            onChange={(cleanVal) => handleBuyPriceChange(cleanVal)}
            className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-transparent focus:outline-none"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold opacity-70 mb-1">
            Precio Actual ({currency})
          </label>
          <AmountInput
            value={currentPrice}
            allowDecimals={true}
            placeholder="0"
            onFocus={(e) => e.target.select()}
            onChange={(cleanVal) => handleCurrentPriceChange(cleanVal)}
            className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-transparent focus:outline-none text-emerald-500"
            style={{ backgroundColor: 'var(--bg-input)' }}
          />
        </div>
      </div>
    </div>
  );
}
