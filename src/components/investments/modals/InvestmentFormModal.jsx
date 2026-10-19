import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  TrendingUp, 
  Coins, 
  X
} from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../../utils/currencyFormatter';
import AmountInput from '../../common/AmountInput';
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
      setInterestRate(currentInitial.interestRate !== undefined ? String(currentInitial.interestRate) : (currentInitial.rate !== undefined ? String(currentInitial.rate) : ''));
      const rawStart = currentInitial.startDate || currentInitial.start_date || currentInitial.issueDate || currentInitial.issue_date;
      const initialStart = rawStart || (initialCat === 'fixed' ? new Date().toISOString().split('T')[0] : '');
      setStartDate(initialStart);

      const rawDue = currentInitial.dueDate || currentInitial.due_date;
      if (rawDue) {
        setDueDate(rawDue);
      } else if (initialCat === 'fixed') {
        const baseStart = initialStart ? new Date(initialStart + 'T00:00:00') : new Date();
        baseStart.setDate(baseStart.getDate() + 180);
        setDueDate(baseStart.toISOString().split('T')[0]);
      } else {
        setDueDate('');
      }
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
      if (newCat === 'fixed') {
        setAssetType('cdt');
        if (!startDate) setStartDate(new Date().toISOString().split('T')[0]);
        if (!dueDate) {
          const future = new Date();
          future.setDate(future.getDate() + 180);
          setDueDate(future.toISOString().split('T')[0]);
        }
      } else {
        setAssetType('fund');
      }
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
      const bNum = isMarketAsset ? (parseFormattedAmount(buyPrice) || 0) : undefined;
      const cNum = isMarketAsset ? (parseFormattedAmount(currentPrice) || bNum || 0) : undefined;

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
        notes: currentInitial?.notes || '',
        interestRate: interestRate ? parseFloat(interestRate) : undefined,
        rate: interestRate ? parseFloat(interestRate) : undefined,
        startDate: category === 'fixed' ? (startDate || new Date().toISOString().split('T')[0]) : undefined,
        start_date: category === 'fixed' ? (startDate || new Date().toISOString().split('T')[0]) : undefined,
        dueDate: category === 'fixed' ? (dueDate || (() => {
          const f = new Date((startDate || new Date().toISOString().split('T')[0]) + 'T00:00:00');
          f.setDate(f.getDate() + 180);
          return f.toISOString().split('T')[0];
        })()) : undefined,
        due_date: category === 'fixed' ? (dueDate || (() => {
          const f = new Date((startDate || new Date().toISOString().split('T')[0]) + 'T00:00:00');
          f.setDate(f.getDate() + 180);
          return f.toISOString().split('T')[0];
        })()) : undefined,
        issueDate: category === 'fixed' ? (startDate || new Date().toISOString().split('T')[0]) : undefined,
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

  const activePresets = category === 'crypto' ? CRYPTO_PRESETS : VARIABLE_PRESETS;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Fija */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {isEditing ? 'Editar inversión' : 'Nueva inversión'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Gestiona tus activos y calcula rendimientos</p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario con Scroll Vertical y Pie Fijo */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">

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

                  <div>
                    <input
                      type="text"
                      placeholder={category === 'crypto' ? 'ej. BTC, ETH, SOL' : 'ej. VOO, SPY, AAPL'}
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                      onBlur={() => ticker && handleFetchQuote(ticker)}
                      className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none uppercase"
                      style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                    />
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
                    <AmountInput
                      value={buyPrice}
                      onChange={(cleanVal) => setBuyPrice(cleanVal)}
                      allowDecimals={true}
                      required
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-transparent focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold opacity-70 mb-1">
                      Precio Actual ({currency}) *
                    </label>
                    <AmountInput
                      value={currentPrice}
                      onChange={(cleanVal) => setCurrentPrice(cleanVal)}
                      allowDecimals={true}
                      required
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-transparent focus:outline-none text-emerald-500 font-mono"
                      style={{ backgroundColor: 'var(--bg-input)' }}
                    />
                  </div>
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
                    <AmountInput
                      value={investedAmount}
                      allowDecimals={true}
                      required
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(cleanVal, formatted) => {
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
                    <AmountInput
                      value={currentAmount}
                      allowDecimals={true}
                      required
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(cleanVal, formatted) => setCurrentAmount(formatted)}
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

          </div>

          {/* Pie de Acciones Fijo/Seguro */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 rounded-b-3xl">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-98 flex items-center justify-center text-xs sm:text-sm ${
                isSubmitting ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Añadir inversión')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
