import React, { useState, useRef, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import AmountInput from '../../common/AmountInput';
import { 
  formatNativeCurrency 
} from '../../../utils/currencyUtils';
import { normalizeAccountType } from '../../../services/syncEngine';
import { useBackHandler } from '../../../hooks/useBackHandler';

const PRESET_BRANDS = [
  { name: 'Bancolombia', label: 'Bancolombia', brandKey: 'bancolombia', type: 'bank' },
  { name: 'Nequi', label: 'Nequi', brandKey: 'nequi', type: 'savings' },
  { name: 'Davivienda', label: 'Davivienda', brandKey: 'davivienda', type: 'bank' },
  { name: 'Nu', label: 'Nu', brandKey: 'nu', type: 'bank' },
  { 
    name: 'BBVA', 
    label: 'BBVA', 
    brandKey: 'bbva', 
    type: 'bank',
    fallback: (
      <div className="w-6 h-6 rounded bg-[#004481] text-white font-black text-[9px] flex items-center justify-center tracking-tighter">
        BBVA
      </div>
    )
  },
  { name: 'Efectivo', label: 'Efectivo', brandKey: 'efectivo', type: 'cash' },
  { name: 'Tarjeta Crédito', label: 'Tarjeta', brandKey: 'mastercard', type: 'credit' },
  { name: 'Inversiones', label: 'Inversión', brandKey: 'dinero', type: 'investment' },
];

const isBBVA = (str) => typeof str === 'string' && str.toLowerCase().includes('bbva');

/**
 * AddAccountModal
 * Modal/Sheet flotante para crear nuevas cuentas o métodos de pago
 * (bancos, efectivo, tarjeta de crédito, ahorros o inversiones).
 */
export default function AddAccountModal({
  isOpen = false,
  onClose,
  onCreateAccount,
  trm = 4050
}) {
  // Estados internos del formulario de creación
  const [newAccName, setNewAccName] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const iconPickerRef = useRef(null);
  const [newAccType, setNewAccType] = useState('bank');
  const [newAccCurrency, setNewAccCurrency] = useState('COP');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccTicker, setNewAccTicker] = useState('');
  const [newAccShares, setNewAccShares] = useState('');
  const [newAccUnitPrice, setNewAccUnitPrice] = useState('');
  const [newAccCreditLimit, setNewAccCreditLimit] = useState('5000000');
  const [newAccPaymentDueDate, setNewAccPaymentDueDate] = useState('17');
  const [newAccClosingDate, setNewAccClosingDate] = useState('25');
  const [newAccColor, setNewAccColor] = useState('#007AFF');
  const [newAccIcon, setNewAccIcon] = useState('Building2');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const resetForm = () => {
    setNewAccName('');
    setSelectedBrand(null);
    setShowIconPicker(false);
    setNewAccType('bank');
    setNewAccCurrency('COP');
    setNewAccBalance('');
    setNewAccTicker('');
    setNewAccShares('');
    setNewAccUnitPrice('');
    setNewAccCreditLimit('5000000');
    setNewAccPaymentDueDate('17');
    setNewAccClosingDate('25');
    setNewAccColor('#007AFF');
    setNewAccIcon('Building2');
  };

  useEffect(() => {
    if (!showIconPicker) return;
    const handleClickOutside = (e) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(e.target)) {
        setShowIconPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showIconPicker]);

  const handleSelectPreset = (item) => {
    setSelectedBrand(item.brandKey || item.name);
    setNewAccName(item.name);
    if (item.type) {
      setNewAccType(item.type);
    }
    setShowIconPicker(false);
  };

  const handleClose = () => {
    resetForm();
    if (onClose) onClose();
  };

  // Soporte para botón físico/gesto de atrás en Android/PWA
  useBackHandler(isOpen, handleClose);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
    if (submittingRef.current || isSubmitting) return;
    if (!newAccName.trim()) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      let iconName = newAccIcon;
      if (!iconName) {
        if (newAccType === 'cash') iconName = 'Wallet';
        else if (newAccType === 'card' || newAccType === 'credit') iconName = 'CreditCard';
        else if (newAccType === 'savings') iconName = 'Smartphone';
        else if (newAccType === 'investment') iconName = 'TrendingUp';
        else iconName = 'Building2';
      }

      const isInvestment = newAccType === 'investment';
      const isCreditNew = normalizeAccountType(newAccType) === 'credit';
      const parseDecNum = (val) => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (!val) return 0;
        const cleaned = String(val).replace(/,/g, '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      const sharesNum = isInvestment && newAccShares ? parseDecNum(newAccShares) : undefined;
      const unitPriceNum = isInvestment && newAccUnitPrice ? parseDecNum(newAccUnitPrice) : undefined;
      let initBal = parseDecNum(newAccBalance);
      if (isInvestment && sharesNum && unitPriceNum && (!newAccBalance || parseDecNum(newAccBalance) === 0)) {
        initBal = sharesNum * unitPriceNum;
      }
      // Las tarjetas de crédito almacenan el saldo como deuda (negativo)
      if (isCreditNew && initBal > 0) {
        initBal = -Math.abs(initBal);
      }

      const normalizedType = normalizeAccountType(newAccType);
      const numericNewBalance = Number(initBal) || 0;
      const newAcc = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('acc-' + Date.now()),
        name: newAccName.trim(),
        type: normalizedType,
        currency: newAccCurrency || 'COP',
        balance: numericNewBalance,
        initial_balance: numericNewBalance,
        current_balance: numericNewBalance,
        initialBalance: numericNewBalance,
        currentBalance: numericNewBalance,
        color: newAccColor,
        icon: iconName,
        ...(normalizedType === 'credit' || newAccType === 'card' ? {
          creditLimit: parseFloat(newAccCreditLimit) || 5000000,
          paymentDueDate: parseInt(newAccPaymentDueDate, 10) || 17,
          closingDate: newAccClosingDate ? parseInt(newAccClosingDate, 10) : undefined
        } : {}),
        ...(isInvestment ? {
          ticker: newAccTicker.trim().toUpperCase(),
          shares: sharesNum,
          unitPrice: unitPriceNum
        } : {})
      };

      if (onCreateAccount) {
        const res = onCreateAccount(newAcc);
        if (res && typeof res.catch === 'function') {
          res.catch((err) => {
            console.warn('[Offline/Sync] Advertencia al persistir cuenta:', err);
          });
        }
      }
      resetForm();
      if (onClose) onClose();
    } catch (err) {
      console.error('Error al guardar la cuenta:', err);
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" 
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#12141C] rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] shadow-2xl overflow-hidden animate-slide-up" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera FIJA */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
            Nueva cuenta
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Cuerpo con SCROLL interno automático */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
            {/* Selector de Divisa Compacto y Sutil (Tabs superiores) */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Divisa principal
              </span>
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.06]">
                {['COP', 'USD', 'EUR'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setNewAccCurrency(code)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      newAccCurrency === code
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {/* Fila 1: Nombre de la cuenta (Ancho completo 100%) con avatar interactivo */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Nombre de la cuenta *
              </label>
              <div className="flex items-center gap-2.5 w-full">
                {/* Avatar / Icono interactivo de entidad bancaria */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker((prev) => !prev)}
                    title="Seleccionar icono o entidad"
                    className="w-11 h-11 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                  >
                    <BrandIcon 
                      name={selectedBrand || newAccName || 'Cuenta'} 
                      type={newAccType} 
                      size={26}
                      fallback={
                        isBBVA(selectedBrand || newAccName) ? (
                          <div className="w-6 h-6 rounded bg-[#004481] text-white font-extrabold text-[9px] flex items-center justify-center tracking-tighter">
                            BBVA
                          </div>
                        ) : null
                      }
                    />
                  </button>

                  {/* Popover / Menú desplegable para selección manual */}
                  {showIconPicker && (
                    <div 
                      ref={iconPickerRef}
                      className="absolute left-0 top-full mt-2 z-50 w-64 p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl animate-fadeIn"
                    >
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                        Entidades y Logos
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {PRESET_BRANDS.map((item) => (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => handleSelectPreset(item)}
                            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-center cursor-pointer group"
                            title={item.name}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-zinc-800/80 group-hover:scale-110 transition-transform">
                              <BrandIcon 
                                name={item.brandKey || item.name} 
                                size={22} 
                                fallback={item.fallback || null}
                              />
                            </div>
                            <span className="text-[10px] font-medium text-slate-600 dark:text-zinc-300 truncate w-full">
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Input de texto a ancho completo 100% restante */}
                <input
                  type="text"
                  required
                  placeholder="ej: Bancolombia, Nequi, Davivienda, BBVA..."
                  value={newAccName}
                  onChange={(e) => {
                    setNewAccName(e.target.value);
                    if (selectedBrand) setSelectedBrand(null);
                  }}
                  className="flex-1 min-w-0 w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-medium"
                />
              </div>
            </div>

            {/* Fila 2: Dividida en 2 columnas (grid grid-cols-1 sm:grid-cols-2 gap-4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  Tipo de método / cuenta *
                </label>
                <select
                  value={newAccType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewAccType(val);
                    if (val === 'cash') setNewAccIcon('Wallet');
                    else if (val === 'card' || val === 'credit') setNewAccIcon('CreditCard');
                    else if (val === 'savings') setNewAccIcon('Smartphone');
                    else if (val === 'investment') setNewAccIcon('TrendingUp');
                    else setNewAccIcon('Building2');
                  }}
                  className="w-full h-11 text-xs sm:text-sm px-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-medium cursor-pointer"
                >
                  <option value="bank">Banco / débito</option>
                  <option value="cash">Efectivo</option>
                  <option value="credit">Tarjeta de crédito</option>
                  <option value="savings">Ahorros / billetera digital</option>
                  <option value="investment">Inversión / acciones</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  {(newAccType === 'card' || newAccType === 'credit')
                    ? 'Deuda actual / Saldo utilizado (opcional)'
                    : `Saldo inicial (${newAccCurrency}) *`
                  }
                </label>
                <AmountInput
                  value={newAccBalance}
                  onChange={(cleanVal) => setNewAccBalance(cleanVal)}
                  allowDecimals={true}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono font-bold"
                />
              </div>
            </div>

            {/* Campos específicos si es Inversión / Acciones */}
            {newAccType === 'investment' && (
              <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <TrendingUp className="w-4 h-4" />
                  <span>Detalles de Acciones / Títulos (Opcional)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Ticker / Activo
                    </label>
                    <input
                      type="text"
                      placeholder="ej: CSPX, VOO, Apple"
                      value={newAccTicker}
                      onChange={(e) => setNewAccTicker(e.target.value.toUpperCase())}
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Nº Acciones / Títulos
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="ej: 15.5"
                      value={newAccShares}
                      onChange={(e) => {
                        const sh = e.target.value;
                        setNewAccShares(sh);
                        const p = parseFloat(newAccUnitPrice) || 0;
                        if (parseFloat(sh) > 0 && p > 0) {
                          setNewAccBalance(String((parseFloat(sh) * p).toFixed(2)));
                        }
                      }}
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Precio Unitario ({newAccCurrency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="ej: 450.00"
                      value={newAccUnitPrice}
                      onChange={(e) => {
                        const p = e.target.value;
                        setNewAccUnitPrice(p);
                        const sh = parseFloat(newAccShares) || 0;
                        if (sh > 0 && parseFloat(p) > 0) {
                          setNewAccBalance(String((sh * parseFloat(p)).toFixed(2)));
                        }
                      }}
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                {parseFloat(newAccShares) > 0 && parseFloat(newAccUnitPrice) > 0 && (
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-white/80 dark:bg-black/40 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                    <span>Valor Posición ({newAccShares} × {formatNativeCurrency(parseFloat(newAccUnitPrice), newAccCurrency)}):</span>
                    <strong className="font-bold tabular-nums">
                      {formatNativeCurrency(parseFloat(newAccShares) * parseFloat(newAccUnitPrice), newAccCurrency)}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* Campos especiales si es Tarjeta de Crédito */}
            {(newAccType === 'card' || newAccType === 'credit') && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40 animate-fadeIn">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Cupo Total ($ COP) *</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="1"
                    required
                    placeholder="5000000"
                    value={newAccCreditLimit}
                    onChange={(e) => setNewAccCreditLimit(e.target.value)}
                    className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Día Límite de Pago *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    required
                    placeholder="ej: 17"
                    value={newAccPaymentDueDate}
                    onChange={(e) => setNewAccPaymentDueDate(e.target.value)}
                    className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Día de Corte (Opcional)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    placeholder="ej: 25"
                    value={newAccClosingDate}
                    onChange={(e) => setNewAccClosingDate(e.target.value)}
                    className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pie de página FIJO SIEMPRE VISIBLE */}
          <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-[#181B26] border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 h-11 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 sm:flex-initial px-6 py-2.5 h-11 text-xs font-bold bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
