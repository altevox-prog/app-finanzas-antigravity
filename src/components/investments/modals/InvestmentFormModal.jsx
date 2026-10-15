import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  TrendingUp, 
  Coins, 
  Trash2, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../../utils/currencyFormatter';
import SegmentedControl from '../../common/SegmentedControl';
import FixedIncomeFields from './FixedIncomeFields';
import InvestmentCategoryHeader from '../InvestmentCategoryHeader';
import { fetchMarketPrice } from '../../../services/marketQuotesService';
import { 
  toSafeNumber, 
  calculateCDTAccruedReturn 
} from '../../../utils/financeMath';

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
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  USDT: 'Tether USD',
  USDC: 'USD Coin',
  BNB: 'BNB',
  ADA: 'Cardano',
  XRP: 'XRP',
  DOGE: 'Dogecoin',
  VOO: 'Vanguard S&P 500 ETF',
  SPY: 'SPDR S&P 500 ETF',
  QQQ: 'Invesco QQQ (Nasdaq 100)',
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corp.',
  NVDA: 'Nvidia Corp.',
  TSLA: 'Tesla Inc.',
  AMZN: 'Amazon.com Inc.',
  GOOGL: 'Alphabet Inc.',
  META: 'Meta Platforms Inc.'
};

export default function InvestmentFormModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialInvestment = null,
  initialData = null
}) {
  useBackHandler(isOpen, onClose);

  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();

  const currentInitial = initialInvestment || initialData;
  const isEditing = Boolean(currentInitial);

  // Form State
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [institution, setInstitution] = useState('');
  const [assetType, setAssetType] = useState('crypto'); // 'crypto' | 'stock' | 'etf' | 'fund' | 'cdt'
  const [category, setCategory] = useState('crypto'); // 'crypto' | 'variable' | 'fixed' | 'liquidity' | 'other'
  const [currency, setCurrency] = useState('USD'); // 'COP' | 'USD'
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const submittingRef = useRef(false);
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Conditional CDT fields
  const [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Conditional Subtype fields for Renta Fija
  const [subType, setSubType] = useState('cdt'); // 'cdt' | 'bond'

  // Initialize or reset form when currentInitial changes
  useEffect(() => {
    if (currentInitial) {
      setName(currentInitial.name || '');
      setTicker(currentInitial.ticker || '');
      setInstitution(currentInitial.institution || '');
      setAssetType(currentInitial.assetType || (currentInitial.category === 'crypto' ? 'crypto' : currentInitial.category === 'fixed' ? (currentInitial.subType === 'bond' ? 'bond' : 'cdt') : 'etf'));
      const initialCat = currentInitial.category || 'crypto';
      setCategory(initialCat);
      if (initialCat === 'fixed' || initialCat === 'liquidity') {
        setCurrency('COP');
      } else {
        setCurrency(currentInitial.currency || 'USD');
      }
      setShares(currentInitial.shares !== undefined ? String(currentInitial.shares) : (currentInitial.quantity !== undefined ? String(currentInitial.quantity) : ''));
      setBuyPrice(currentInitial.buyPrice !== undefined ? String(currentInitial.buyPrice) : '');
      setCurrentPrice(currentInitial.currentPrice !== undefined ? String(currentInitial.currentPrice) : '');
      const rawInv = currentInitial.investedAmount ?? currentInitial.invested_amount ?? currentInitial.amount ?? currentInitial.totalInvested;
      setInvestedAmount(
        rawInv !== undefined && rawInv !== null && Number(rawInv) !== 0
          ? formatCurrencyInput(rawInv, true)
          : ''
      );
      const rawCurr = currentInitial.currentAmount ?? currentInitial.currentValue ?? currentInitial.current_value;
      setCurrentAmount(
        rawCurr !== undefined && rawCurr !== null && Number(rawCurr) !== 0
          ? formatCurrencyInput(rawCurr, true)
          : ''
      );
      setNotes(currentInitial.notes || '');
      setInterestRate(currentInitial.interestRate !== undefined ? String(currentInitial.interestRate) : '');
      setStartDate(currentInitial.startDate || '');
      setDueDate(currentInitial.dueDate || '');
      setSubType(currentInitial.subType === 'bond' ? 'bond' : 'cdt');
    } else {
      setName('');
      setTicker('');
      setInstitution('');
      setAssetType('crypto');
      setCategory('crypto');
      setCurrency('USD');
      setShares('');
      setBuyPrice('');
      setCurrentPrice('');
      setInvestedAmount('');
      setCurrentAmount('');
      setNotes('');
      setInterestRate('');
      setSubType('cdt');
      const todayStr = new Date().toISOString().split('T')[0];
      setStartDate(todayStr);
      const future = new Date();
      future.setDate(future.getDate() + 180);
      setDueDate(future.toISOString().split('T')[0]);
    }
  }, [initialInvestment, initialData, isOpen, enableDecimals]);

  // Asegura divisa COP transparente e inalterable en Renta Fija y Liquidez
  useEffect(() => {
    if (category === 'fixed' || category === 'liquidity') {
      if (currency !== 'COP') {
        setCurrency('COP');
      }
    }
  }, [category, currency]);

  const isMarketAsset = category === 'crypto' || category === 'variable';

  // Cálculos reactivos para activos de mercado
  const numShares = parseFloat(shares) || 0;
  const numBuyPrice = parseFloat(buyPrice) || 0;
  const numCurrentPrice = parseFloat(currentPrice) || numBuyPrice;

  const calcInvested = numShares * numBuyPrice;
  const calcCurrent = numShares * numCurrentPrice;
  const pnl = calcCurrent - calcInvested;
  const pnlPercent = calcInvested > 0 ? (pnl / calcInvested) * 100 : 0;
  const isPnlPositive = pnl >= 0;

  const formatInvestNumber = (val) => {
    const n = Number(val) || 0;
    if (currency === 'USD') {
      return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${Math.round(n).toLocaleString('es-CO')}`;
  };

  // Consulta de cotización en vivo según ticker
  const handleFetchQuote = async (symbolToFetch, explicitAssetType) => {
    const sym = (symbolToFetch || ticker).toUpperCase().trim();
    if (!sym) return;
    setIsFetchingPrice(true);
    try {
      const typeToUse = explicitAssetType || assetType || (category === 'crypto' ? 'crypto' : 'stock');
      const res = await fetchMarketPrice(sym, typeToUse);
      const price = typeof res === 'object' && res !== null ? res.price : res;
      if (price !== null && !isNaN(price) && Number(price) > 0) {
        const numPrice = Number(price);
        setCurrentPrice(String(numPrice));
        if (!buyPrice || Number(buyPrice) === 0) {
          setBuyPrice(String(numPrice));
        }
      }
      // Autocompletar nombre del activo si está vacío o si coincide con otro nombre autocompletado
      setName((prev) => {
        if (!prev || !prev.trim() || Object.values(TICKER_NAMES).includes(prev.trim())) {
          return TICKER_NAMES[sym] || sym;
        }
        return prev;
      });
    } catch (e) {
      console.warn('Error consultando precio en vivo:', e);
    } finally {
      setIsFetchingPrice(false);
    }
  };

  // Preset rápido de ticker
  const handleSelectPreset = (item) => {
    setTicker(item.sym);
    setName((prev) => {
      if (!prev || !prev.trim() || Object.values(TICKER_NAMES).includes(prev.trim())) {
        return item.name;
      }
      return prev;
    });
    if (item.type) setAssetType(item.type);
    if (item.cat) setCategory(item.cat);
    if (!isEditing) setCurrency('USD');
    handleFetchQuote(item.sym, item.type);
  };

  // Estimar valor actual de CDT a la fecha presente
  const handleEstimateCurrentCDT = () => {
    const inv = parseFormattedAmount(investedAmount);
    const rate = toSafeNumber(interestRate);
    if (inv > 0 && rate > 0 && startDate) {
      const { maturityTotal } = calculateCDTAccruedReturn(inv, rate, startDate);
      setCurrentAmount(formatCurrencyInput(Number(maturityTotal.toFixed(2)), true));
    }
  };

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (newCat === 'fixed' || newCat === 'liquidity') {
      setCurrency('COP');
      if (newCat === 'fixed') setAssetType('cdt');
      else setAssetType('fund');
    } else {
      if (!isEditing && currency !== 'USD') {
        setCurrency('USD');
      }
      setAssetType(newCat === 'crypto' ? 'crypto' : 'stock');
    }
  };

  // Placeholders dinámicos para Nombre del Activo
  const getNamePlaceholder = (cat) => {
    switch (cat) {
      case 'fixed':
        return 'ej. CDT Bancolombia, CDT Nu...';
      case 'variable':
        return 'ej. Vanguard S&P 500 (VOO), Acciones Apple...';
      case 'crypto':
        return 'ej. Bitcoin, Ethereum, Solana...';
      case 'liquidity':
        return 'ej. Cajita Nu, Bolsillo Lulo, Fondo Tyba Liquidez...';
      default:
        return 'ej. Nombre del activo o inversión...';
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
    if (submittingRef.current || isSubmitting) return;

    const finalName = name.trim();
    if (!finalName) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const sNum = isMarketAsset ? (parseFloat(shares) || 0) : undefined;
      const bNum = isMarketAsset ? (parseFloat(buyPrice) || 0) : undefined;
      const cNum = isMarketAsset ? (parseFloat(currentPrice) || bNum || 0) : undefined;

      let invNum = 0;
      let currNum = 0;

      if (isMarketAsset) {
        invNum = Math.round((sNum || 0) * (bNum || 0) * 100) / 100;
        currNum = Math.round((sNum || 0) * (cNum || 0) * 100) / 100;
      } else {
        invNum = parseFormattedAmount(investedAmount) || 0;
        const rawCurrentStr = String(currentAmount ?? '').trim();
        currNum = rawCurrentStr !== '' ? parseFormattedAmount(rawCurrentStr) : invNum;
      }

      const payload = {
        id: currentInitial ? currentInitial.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`),
        name: finalName,
        ticker: isMarketAsset && ticker ? ticker.toUpperCase().trim() : '',
        assetType: category === 'fixed' ? (subType === 'bond' ? 'bond' : 'cdt') : (category === 'crypto' ? 'crypto' : category === 'variable' ? (assetType || 'stock') : (category === 'liquidity' ? 'fund' : 'other')),
        type: category === 'fixed' ? 'fixed_income' : undefined,
        category,
        subType: category === 'fixed' ? subType : undefined,
        currency,
        institution: institution.trim() || undefined,
        shares: sNum > 0 ? sNum : undefined,
        quantity: sNum > 0 ? sNum : undefined,
        buyPrice: bNum > 0 ? bNum : undefined,
        currentPrice: cNum > 0 ? cNum : undefined,
        investedAmount: invNum,
        invested_amount: invNum,
        amount: invNum,
        currentAmount: currNum,
        currentValue: currNum,
        current_value: currNum,
        notes: notes.trim(),
        interestRate: interestRate ? parseFloat(interestRate) : undefined,
        startDate: category === 'fixed' ? startDate : undefined,
        dueDate: category === 'fixed' ? dueDate : undefined,
        isImmediateLiquidity: category === 'liquidity'
      };

      if (onSave) {
        const res = onSave(payload);
        if (res && typeof res.catch === 'function') {
          res.catch((err) => {
            console.warn('[Offline/Sync] Advertencia al persistir inversión:', err);
          });
        }
      }
      onClose();
    } catch (err) {
      console.error('Error al guardar la inversión:', err);
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleDelete = () => {
    if (!currentInitial) return;
    if (confirm(`¿Eliminar la inversión "${currentInitial.name}"?`)) {
      if (onDelete) onDelete(currentInitial.id);
      onClose();
    }
  };

  const activePresets = category === 'crypto' ? CRYPTO_PRESETS : VARIABLE_PRESETS;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-[#121622] rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp border border-slate-200 dark:border-white/10"
        style={{ backgroundColor: 'var(--modal-bg, #121622)', borderColor: 'var(--border-color)', color: 'var(--text-main, #ffffff)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle superior para móvil */}
        <div className="w-10 h-1 bg-slate-400/30 rounded-full mx-auto sm:hidden mt-2 shrink-0" />

        {/* Cabecera Fija */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {isEditing ? 'Editar Inversión' : 'Nueva Inversión'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Gestiona tus activos y calcula rendimientos</p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Formulario con Scroll Vertical y Pie Fijo */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 pb-6">

            {/* A. BLOQUE SUPERIOR (Siempre visible): Selector de Categoría y Entidad/Broker */}
            <InvestmentCategoryHeader
              category={category}
              onCategoryChange={handleCategoryChange}
              institution={institution}
              setInstitution={setInstitution}
              isEditing={isEditing}
            />

            {/* B. LÓGICA CONDICIONAL SEGÚN CATEGORÍA */}

            {/* CASO 1: CRIPTO O RENTA VARIABLE (Activos de Mercado) */}
            {isMarketAsset && (
              <div className="space-y-3.5 animate-fadeIn">
                {/* Ticker / Símbolo de Mercado y Cotización en Vivo */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold opacity-70">
                      Ticker / Símbolo de Mercado
                    </label>
                    {currentPrice && (
                      <span className="text-[10px] font-bold text-emerald-500 tabular-nums">
                        Cotización: ${Number(currentPrice).toLocaleString(currency === 'USD' ? 'en-US' : 'es-CO', { maximumFractionDigits: 2 })} {currency}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={category === 'crypto' ? 'ej. BTC, ETH, SOL' : 'ej. VOO, SPY, AAPL'}
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                      className="flex-1 text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none uppercase"
                      style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                    />

                    <button
                      type="button"
                      onClick={() => handleFetchQuote()}
                      disabled={!ticker.trim() || isFetchingPrice}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm active:scale-95"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingPrice ? 'animate-spin' : ''}`} />
                      <span>{isFetchingPrice ? 'Buscando...' : 'Cotización'}</span>
                    </button>
                  </div>

                  {/* Chips sugeridos según la categoría */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                    <span className="text-[10px] opacity-40 font-semibold mr-0.5">Top:</span>
                    {activePresets.map((item) => (
                      <button
                        key={item.sym}
                        type="button"
                        onClick={() => handleSelectPreset(item)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
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

                {/* Nombre del Activo */}
                <div>
                  <label className="block text-[11px] font-bold opacity-70 mb-1">
                    Nombre del Activo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={getNamePlaceholder(category)}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none transition-all"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                  />
                </div>

                {/* Moneda de origen (COP vs USD) - Ubicada justo arriba de Cantidad y Precio */}
                <div>
                  <label className="block text-[11px] font-bold opacity-70 mb-1">
                    Moneda de origen *
                  </label>
                  <SegmentedControl
                    options={[
                      { id: 'COP', label: 'COP ($)' },
                      { id: 'USD', label: 'USD ($)' }
                    ]}
                    value={currency}
                    onChange={setCurrency}
                    size="sm"
                  />
                </div>

                {/* Cantidad y Precios */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold opacity-70 mb-1">
                      Cantidad (Títulos / Monedas) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="ej. 0.045"
                      value={shares}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setShares(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-transparent focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold opacity-70 mb-1">
                      Precio de Compra ({currency}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="ej. 60000"
                      value={buyPrice}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-transparent focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold opacity-70 mb-1">
                      Precio Actual ({currency}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="ej. 64500"
                      value={currentPrice}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-transparent focus:outline-none text-emerald-500 font-mono"
                      style={{ backgroundColor: 'var(--bg-input)' }}
                    />
                  </div>
                </div>

                {/* Tarjeta Resumen Visual Automatizada (Read-Only) */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>Cálculo Automático</span>
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-mono">
                      {currency}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-0.5">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                        Monto Invertido
                      </span>
                      <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums block">
                        {formatInvestNumber(calcInvested)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5 truncate">
                        {numShares} × {formatInvestNumber(numBuyPrice)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                        Valor Actual
                      </span>
                      <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums block">
                        {formatInvestNumber(calcCurrent)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5 truncate">
                        {numShares} × {formatInvestNumber(numCurrentPrice)}
                      </span>
                    </div>
                  </div>

                  {calcInvested > 0 && (
                    <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Rendimiento no realizado
                      </span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-xs tabular-nums">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                          isPnlPositive 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {isPnlPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
                        </span>
                        <span className={isPnlPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {isPnlPositive ? '+' : '-'}{formatInvestNumber(Math.abs(pnl))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CASO 2: RENTA FIJA, LIQUIDEZ U OTROS */}
            {!isMarketAsset && (
              <div className="space-y-3.5 animate-fadeIn">
                {/* Nombre del Activo / Producto */}
                <div>
                  <label className="block text-[11px] font-bold opacity-70 mb-1">
                    Nombre del Activo / Producto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={getNamePlaceholder(category)}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none transition-all"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                  />
                </div>

                {/* Monto Invertido y Valor Actual editables directamente (en COP) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold opacity-70 mb-1">
                      Monto Invertido (COP) *
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="0"
                      value={investedAmount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const formatted = formatCurrencyInput(e.target.value, true);
                        setInvestedAmount(formatted);
                        if (!currentAmount || currentAmount === investedAmount) {
                          setCurrentAmount(formatted);
                        }
                      }}
                      className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-transparent focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold opacity-70">
                        Valor Actual / Saldo (COP) *
                      </label>
                      {category === 'fixed' && startDate && dueDate && interestRate && (
                        <button
                          type="button"
                          onClick={handleEstimateCurrentCDT}
                          className="text-[9px] text-[#007AFF] font-bold hover:underline cursor-pointer"
                          title="Estimar acumulado a la fecha"
                        >
                          Estimar a hoy
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="0"
                      value={currentAmount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setCurrentAmount(formatCurrencyInput(e.target.value, true))}
                      className="w-full text-xs font-black px-3 py-2.5 rounded-xl border border-transparent focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>

                {/* Subtipo y campos de Renta Fija (CDT / Bono) */}
                {category === 'fixed' && (
                  <FixedIncomeFields
                    subType={subType}
                    setSubType={setSubType}
                    interestRate={interestRate}
                    setInterestRate={setInterestRate}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    dueDate={dueDate}
                    setDueDate={setDueDate}
                    investedAmount={investedAmount}
                    currency="COP"
                  />
                )}

                {/* Campos de Liquidez: Rendimiento Estimado (% E.A.) */}
                {category === 'liquidity' && (
                  <div 
                    className="p-3.5 rounded-2xl border space-y-2 animate-fadeIn"
                    style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#5AC8FA]">
                        <Coins className="w-4 h-4" />
                        <span>Fondo de Liquidez / Cuenta Remunerada</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-[#5AC8FA]/15 text-[#5AC8FA]">
                        ⚡ Liquidez Inmediata
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold opacity-60 mb-1">
                        Tasa de Interés / Rendimiento Estimado (% E.A. Opcional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="ej. 9.8"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-transparent focus:outline-none"
                        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* C. BLOQUE INFERIOR (Cierre): Notas */}
            <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-white/5">
              {/* Notas únicas (Opcional) */}
              <div>
                <label className="block text-[11px] font-bold opacity-70 mb-1">
                  Notas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Apuntes personales, condiciones o recordatorios..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

          </div>

          {/* Pie de Acciones Fijo Abajo (Sticky Footer) */}
          <div className="p-4 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-3 shrink-0 pb-safe sm:pb-4">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-xs sm:text-sm font-semibold mr-auto cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-xs sm:text-sm font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 cursor-pointer active:scale-98 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Añadir Inversión')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
