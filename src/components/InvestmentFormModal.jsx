import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  TrendingUp, 
  Coins, 
  Trash2 
} from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../utils/currencyFormatter';
import SegmentedControl from './common/SegmentedControl';
import FixedIncomeFields from './investments/modals/FixedIncomeFields';
import MarketAssetFields from './investments/modals/MarketAssetFields';
import InvestmentCategoryHeader from './investments/InvestmentCategoryHeader';
import { 
  toSafeNumber, 
  calculateCDTAccruedReturn 
} from '../utils/financeMath';

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
  const [category, setCategory] = useState('crypto');
  const [currency, setCurrency] = useState('USD'); // 'COP' | 'USD'
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
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
      setCategory(currentInitial.category || 'crypto');
      setCurrency(currentInitial.currency || 'USD');
      setShares(currentInitial.shares !== undefined ? String(currentInitial.shares) : '');
      setBuyPrice(currentInitial.buyPrice !== undefined ? String(currentInitial.buyPrice) : '');
      setCurrentPrice(currentInitial.currentPrice !== undefined ? String(currentInitial.currentPrice) : '');
      setInvestedAmount(
        currentInitial.investedAmount !== undefined && currentInitial.investedAmount !== null && Number(currentInitial.investedAmount) !== 0
          ? formatCurrencyInput(currentInitial.investedAmount, enableDecimals)
          : ''
      );
      setCurrentAmount(
        currentInitial.currentAmount !== undefined && currentInitial.currentAmount !== null && Number(currentInitial.currentAmount) !== 0
          ? formatCurrencyInput(currentInitial.currentAmount, enableDecimals)
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
      // Default 180 days ahead for CDT
      const future = new Date();
      future.setDate(future.getDate() + 180);
      setDueDate(future.toISOString().split('T')[0]);
    }
  }, [initialInvestment, isOpen, enableDecimals]);

  // Estimar valor actual de CDT a la fecha presente
  const handleEstimateCurrentCDT = () => {
    const inv = parseFormattedAmount(investedAmount);
    const rate = toSafeNumber(interestRate);
    if (inv > 0 && rate > 0 && startDate) {
      const { maturityTotal } = calculateCDTAccruedReturn(inv, rate, startDate);
      setCurrentAmount(formatCurrencyInput(enableDecimals ? Number(maturityTotal.toFixed(2)) : Math.round(maturityTotal), enableDecimals));
    }
  };


  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (newCat === 'fixed') {
      setAssetType('cdt');
      if (!isEditing) setCurrency('COP');
    } else if (newCat === 'crypto') {
      setAssetType('crypto');
      if (!isEditing) setCurrency('USD');
    } else if (newCat === 'liquidity') {
      setAssetType('fund');
      if (!isEditing) setCurrency('COP');
    }
  };

  // Placeholders dinámicos e inteligentes para Nombre del Activo
  const getNamePlaceholder = (cat) => {
    switch (cat) {
      case 'fixed':
        return 'ej. CDT Bancolombia, CDT Nu, Bono...';
      case 'variable':
        return 'ej. Vanguard S&P 500 (VOO), Acciones Apple...';
      case 'crypto':
        return 'ej. Bitcoin, Ethereum, Solana...';
      case 'liquidity':
      case 'other':
      default:
        return 'ej. Cajita de Ahorro, Fondo Fiducuenta...';
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalName = name.trim();
    if (!finalName) return;

    const sNum = parseFloat(shares) || 0;
    const bNum = parseFloat(buyPrice) || 0;
    const cNum = parseFloat(currentPrice) || bNum;

    let invNum = parseFormattedAmount(investedAmount) || 0;
    if (invNum === 0 && sNum > 0 && bNum > 0) {
      invNum = Math.round(sNum * bNum * 100) / 100;
    }

    let currNum = currentAmount !== '' ? parseFormattedAmount(currentAmount) : invNum;
    if (sNum > 0 && cNum > 0 && (currNum === 0 || currNum === invNum)) {
      currNum = Math.round(sNum * cNum * 100) / 100;
    }

    const payload = {
      id: initialInvestment ? initialInvestment.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`),
      name: finalName,
      ticker: ticker ? ticker.toUpperCase().trim() : '',
      assetType: category === 'fixed' ? (subType === 'bond' ? 'bond' : 'cdt') : assetType,
      type: category === 'fixed' ? 'fixed_income' : undefined,
      category,
      subType: category === 'fixed' ? subType : undefined,
      currency,
      institution: institution.trim() || undefined,
      shares: sNum > 0 ? sNum : undefined,
      buyPrice: bNum > 0 ? bNum : undefined,
      currentPrice: cNum > 0 ? cNum : undefined,
      investedAmount: invNum,
      currentAmount: currNum,
      notes: notes.trim(),
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      startDate: category === 'fixed' ? startDate : undefined,
      dueDate: category === 'fixed' ? dueDate : undefined,
      isImmediateLiquidity: category === 'liquidity'
    };

    onSave(payload);
    onClose();
  };

  const handleDelete = () => {
    if (!currentInitial) return;
    if (confirm(`¿Eliminar la inversión "${currentInitial.name}"?`)) {
      if (onDelete) onDelete(currentInitial.id);
      onClose();
    }
  };

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

        {/* Formulario completo con cuerpo scrollable y pie fijo abajo */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Cuerpo con Scroll y Padding Inferior Suficiente */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 pb-6">
            {/* Cabecera de Categoría y Entidad */}
            <InvestmentCategoryHeader
              category={category}
              onCategoryChange={handleCategoryChange}
              institution={institution}
              setInstitution={setInstitution}
              isEditing={isEditing}
            />

            {/* Activos de Mercado (Ticker, Cotización en vivo, Títulos y Precios) */}
            <MarketAssetFields
              category={category}
              assetType={assetType}
              ticker={ticker}
              setTicker={setTicker}
              shares={shares}
              setShares={setShares}
              buyPrice={buyPrice}
              setBuyPrice={setBuyPrice}
              currentPrice={currentPrice}
              setCurrentPrice={setCurrentPrice}
              investedAmount={investedAmount}
              setInvestedAmount={setInvestedAmount}
              currentAmount={currentAmount}
              setCurrentAmount={setCurrentAmount}
              currency={currency}
              setName={setName}
              setAssetType={setAssetType}
              setCategory={setCategory}
              setCurrency={setCurrency}
            />

            {/* Nombre / Activo */}
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


          {/* Moneda de origen (COP vs USD) */}
          <div>
            <label className="block text-[11px] font-bold opacity-70 mb-1">
              Moneda de origen *
            </label>
            <SegmentedControl
              options={[
                { id: 'COP', label: 'COP' },
                { id: 'USD', label: 'USD' }
              ]}
              value={currency}
              onChange={setCurrency}
              size="sm"
            />
          </div>

          {/* Montos: Invertido y Actual */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold opacity-70 mb-1">
                Monto Invertido ({currency}) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="0"
                value={investedAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const formatted = formatCurrencyInput(e.target.value, enableDecimals);
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
                  Valor Actual ({currency}) *
                </label>
                {category === 'fixed' && startDate && dueDate && interestRate && (
                  <button
                    type="button"
                    onClick={handleEstimateCurrentCDT}
                    className="text-[9px] text-[#007AFF] font-bold hover:underline"
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
                onChange={(e) => setCurrentAmount(formatCurrencyInput(e.target.value, enableDecimals))}
                className="w-full text-xs font-black px-3 py-2.5 rounded-xl border border-transparent focus:outline-none"
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
              />
            </div>
          </div>

          {/* CAMPOS CONDICIONALES: Renta Fija */}
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
              currency={currency}
            />
          )}

          {/* CAMPOS CONDICIONALES: Fondos de Liquidez / Fiducuentas */}
          {category === 'liquidity' && (
            <div 
              className="p-3 rounded-2xl border space-y-2 animate-fadeIn"
              style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#5AC8FA]">
                  <Coins className="w-4 h-4" />
                  <span>Fondo a la Vista</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-[#5AC8FA]/15 text-[#5AC8FA]">
                  ⚡ Liquidez Inmediata
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-semibold opacity-60 mb-0.5">
                  Rendimiento Estimado (% E.A. Opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="ej. 9.8"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-1.5 rounded-lg border border-transparent focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                />
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-[11px] font-bold opacity-70 mb-1">
              Notas / Broker / Entidad (Opcional)
            </label>
            <input
              type="text"
              placeholder="ej. Interactive Brokers, Bancolombia, Hapi, Kraken..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none"
              style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
            />
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
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 cursor-pointer active:scale-98"
            >
              {isEditing ? 'Guardar Cambios' : 'Añadir Inversión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
