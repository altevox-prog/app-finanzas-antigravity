import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Coins, X } from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../../utils/currencyFormatter';
import AmountInput from '../../common/AmountInput';
import SegmentedControl from '../../common/SegmentedControl';
import FixedIncomeFields from './FixedIncomeFields';
import InvestmentCategoryHeader from '../InvestmentCategoryHeader';
import { fetchMarketPrice } from '../../../services/marketQuotesService';
import { toSafeNumber, calculateCDTAccruedReturn } from '../../../utils/financeMath';

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

const PLACEHOLDERS = {
  fixed: 'ej. CDT Bancolombia, CDT Nu...',
  variable: 'ej. Vanguard S&P 500 (VOO), Acciones Apple...',
  crypto: 'ej. Bitcoin, Ethereum, Solana...',
  liquidity: 'ej. Cajita Nu, Bolsillo Lulo, Fondo Tyba Liquidez...'
};

const INPUT_STYLE = { backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' };
const INPUT_CLS = "w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none transition-all";
const NUM_INPUT_CLS = "w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-transparent focus:outline-none";

const calcFutureDate = (baseDateStr, days = 180) => {
  const d = baseDateStr ? new Date(baseDateStr + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export default function InvestmentFormModal({
  isOpen, onClose, onSave, onDelete, initialInvestment = null, initialData = null
}) {
  useBackHandler(isOpen, onClose);
  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();
  const currentInitial = initialInvestment || initialData;
  const isEditing = Boolean(currentInitial);

  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [institution, setInstitution] = useState('');
  const [assetType, setAssetType] = useState('crypto');
  const [category, setCategory] = useState('crypto');
  const [currency, setCurrency] = useState('USD');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const submittingRef = useRef(false);
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [subType, setSubType] = useState('cdt');

  useEffect(() => {
    if (currentInitial) {
      const c = currentInitial, cat = c.category || 'crypto';
      setName(c.name || ''); setTicker(c.ticker || ''); setInstitution(c.institution || '');
      setAssetType(c.assetType || (cat === 'crypto' ? 'crypto' : cat === 'fixed' ? (c.subType === 'bond' ? 'bond' : 'cdt') : 'etf'));
      setCategory(cat); setCurrency(['fixed', 'liquidity'].includes(cat) ? 'COP' : (c.currency || 'USD'));
      setShares(c.shares !== undefined ? String(c.shares) : (c.quantity !== undefined ? String(c.quantity) : ''));
      setBuyPrice(c.buyPrice !== undefined ? String(c.buyPrice) : ''); setCurrentPrice(c.currentPrice !== undefined ? String(c.currentPrice) : '');
      const rawInv = c.investedAmount ?? c.invested_amount ?? c.amount ?? c.totalInvested;
      setInvestedAmount(rawInv && Number(rawInv) !== 0 ? formatCurrencyInput(rawInv, true) : '');
      const rawCurr = c.currentAmount ?? c.currentValue ?? c.current_value;
      setCurrentAmount(rawCurr && Number(rawCurr) !== 0 ? formatCurrencyInput(rawCurr, true) : '');
      setInterestRate(c.interestRate !== undefined ? String(c.interestRate) : (c.rate !== undefined ? String(c.rate) : ''));
      const sDate = c.startDate || c.start_date || c.issueDate || c.issue_date || (cat === 'fixed' ? new Date().toISOString().split('T')[0] : '');
      setStartDate(sDate);
      setDueDate(c.dueDate || c.due_date || (cat === 'fixed' ? calcFutureDate(sDate) : ''));
      setSubType(c.subType === 'bond' ? 'bond' : 'cdt');
    } else {
      setName(''); setTicker(''); setInstitution(''); setAssetType('crypto'); setCategory('crypto'); setCurrency('USD');
      setShares(''); setBuyPrice(''); setCurrentPrice(''); setInvestedAmount(''); setCurrentAmount(''); setInterestRate(''); setSubType('cdt');
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today); setDueDate(calcFutureDate(today));
    }
  }, [initialInvestment, initialData, isOpen, enableDecimals]);

  useEffect(() => {
    if (['fixed', 'liquidity'].includes(category) && currency !== 'COP') setCurrency('COP');
  }, [category, currency]);

  const isMarketAsset = ['crypto', 'variable'].includes(category);

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
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleSelectPreset = (item) => {
    setTicker(item.sym);
    setName((prev) => (!prev || !prev.trim() || Object.values(TICKER_NAMES).includes(prev.trim())) ? item.name : prev);
    if (item.type) setAssetType(item.type);
    if (item.cat) setCategory(item.cat);
    if (!isEditing) setCurrency('USD');
    handleFetchQuote(item.sym, item.type);
  };

  const handleEstimateCurrentCDT = () => {
    const inv = parseFormattedAmount(investedAmount), rate = toSafeNumber(interestRate);
    if (inv > 0 && rate > 0 && startDate) {
      const { maturityTotal } = calculateCDTAccruedReturn(inv, rate, startDate);
      setCurrentAmount(formatCurrencyInput(Number(maturityTotal.toFixed(2)), true));
    }
  };

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (['fixed', 'liquidity'].includes(newCat)) {
      setCurrency('COP');
      if (newCat === 'fixed') {
        setAssetType('cdt');
        if (!startDate) setStartDate(new Date().toISOString().split('T')[0]);
        if (!dueDate) setDueDate(calcFutureDate(startDate));
      } else {
        setAssetType('fund');
      }
    } else {
      if (!isEditing && currency !== 'USD') setCurrency('USD');
      setAssetType(newCat === 'crypto' ? 'crypto' : 'stock');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (submittingRef.current || isSubmitting) return;
    const finalName = name.trim();
    if (!finalName) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const sNum = isMarketAsset ? (parseFloat(shares) || 0) : undefined;
      const bNum = isMarketAsset ? (parseFormattedAmount(buyPrice) || 0) : undefined;
      const cNum = isMarketAsset ? (parseFormattedAmount(currentPrice) || bNum || 0) : undefined;
      const invNum = isMarketAsset ? Math.round((sNum || 0) * (bNum || 0) * 100) / 100 : (parseFormattedAmount(investedAmount) || 0);
      const rawCurrentStr = String(currentAmount ?? '').trim();
      const currNum = isMarketAsset ? Math.round((sNum || 0) * (cNum || 0) * 100) / 100 : (rawCurrentStr !== '' ? parseFormattedAmount(rawCurrentStr) : invNum);
      const isFixed = category === 'fixed';
      const fixedStart = isFixed ? (startDate || new Date().toISOString().split('T')[0]) : undefined;
      const fixedDue = isFixed ? (dueDate || calcFutureDate(fixedStart)) : undefined;

      const payload = {
        id: currentInitial?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`),
        name: finalName,
        ticker: isMarketAsset && ticker ? ticker.toUpperCase().trim() : '',
        assetType: isFixed ? (subType === 'bond' ? 'bond' : 'cdt') : (category === 'crypto' ? 'crypto' : category === 'variable' ? (assetType || 'stock') : (category === 'liquidity' ? 'fund' : 'other')),
        type: isFixed ? 'fixed_income' : undefined,
        category, subType: isFixed ? subType : undefined, currency,
        institution: institution.trim() || undefined,
        shares: sNum > 0 ? sNum : undefined, quantity: sNum > 0 ? sNum : undefined,
        buyPrice: bNum > 0 ? bNum : undefined, currentPrice: cNum > 0 ? cNum : undefined,
        investedAmount: invNum, invested_amount: invNum, amount: invNum,
        currentAmount: currNum, currentValue: currNum, current_value: currNum,
        notes: currentInitial?.notes || '',
        interestRate: interestRate ? parseFloat(interestRate) : undefined, rate: interestRate ? parseFloat(interestRate) : undefined,
        startDate: fixedStart, start_date: fixedStart, dueDate: fixedDue, due_date: fixedDue, issueDate: fixedStart,
        isImmediateLiquidity: category === 'liquidity'
      };

      if (onSave) {
        const res = onSave(payload);
        if (res?.catch) res.catch((err) => console.warn('[Offline/Sync] Advertencia al persistir inversión:', err));
      }
      onClose();
    } catch (err) {
      console.error('Error al guardar la inversión:', err);
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const activePresets = category === 'crypto' ? CRYPTO_PRESETS : VARIABLE_PRESETS;

  const modalContent = (
    <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">{isEditing ? 'Editar inversión' : 'Nueva inversión'}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Gestiona tus activos y calcula rendimientos</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer" title="Cerrar"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
            <InvestmentCategoryHeader category={category} onCategoryChange={handleCategoryChange} institution={institution} setInstitution={setInstitution} isEditing={isEditing} />

            {isMarketAsset && (
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
                  <input type="text" required placeholder={PLACEHOLDERS[category] || 'ej. Nombre del activo...'} value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} style={INPUT_STYLE} />
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
            )}

            {!isMarketAsset && (
              <div className="space-y-3.5 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-bold opacity-70 mb-1">Nombre del Activo / Producto *</label>
                  <input type="text" required placeholder={PLACEHOLDERS[category] || 'ej. Nombre del activo...'} value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} style={INPUT_STYLE} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold opacity-70 mb-1">Monto Invertido (COP) *</label>
                    <AmountInput value={investedAmount} allowDecimals required placeholder="0" onFocus={(e) => e.target.select()} onChange={(cleanVal, formatted) => { setInvestedAmount(formatted); if (!currentAmount || currentAmount === investedAmount) setCurrentAmount(formatted); }} className={NUM_INPUT_CLS} style={INPUT_STYLE} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold opacity-70">Valor Actual (COP) *</label>
                      {category === 'fixed' && startDate && dueDate && interestRate && (
                        <button type="button" onClick={handleEstimateCurrentCDT} className="text-[9px] text-[#007AFF] font-bold hover:underline cursor-pointer" title="Estimar acumulado">Estimar a hoy</button>
                      )}
                    </div>
                    <AmountInput value={currentAmount} allowDecimals required placeholder="0" onFocus={(e) => e.target.select()} onChange={(cleanVal, formatted) => setCurrentAmount(formatted)} className="w-full text-xs font-black px-3 py-2.5 rounded-xl border border-transparent focus:outline-none" style={INPUT_STYLE} />
                  </div>
                </div>

                {category === 'fixed' && (
                  <FixedIncomeFields subType={subType} setSubType={setSubType} interestRate={interestRate} setInterestRate={setInterestRate} startDate={startDate} setStartDate={setStartDate} dueDate={dueDate} setDueDate={setDueDate} investedAmount={investedAmount} currency="COP" />
                )}

                {category === 'liquidity' && (
                  <div className="p-3.5 rounded-2xl border space-y-2 animate-fadeIn" style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#5AC8FA]">
                        <Coins className="w-4 h-4" /><span>Fondo de Liquidez / Cuenta Remunerada</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-[#5AC8FA]/15 text-[#5AC8FA]">⚡ Liquidez Inmediata</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold opacity-60 mb-1">Tasa de Interés / Rendimiento Estimado (% E.A. Opcional)</label>
                      <input type="number" step="0.01" placeholder="ej. 9.8" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-transparent focus:outline-none" style={INPUT_STYLE} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 rounded-b-3xl">
            <button type="submit" disabled={isSubmitting} className={`w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-98 flex items-center justify-center text-xs sm:text-sm ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Añadir inversión')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
