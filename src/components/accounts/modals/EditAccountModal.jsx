import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Trash2, Check } from 'lucide-react';
import BrandIcon from '../../BrandIcon';
import { 
  formatNativeCurrency, 
  convertToCOP 
} from '../../../utils/currencyUtils';
import { normalizeAccountType } from '../../../services/syncEngine';
import { useBackHandler } from '../../../hooks/useBackHandler';

/**
 * EditAccountModal
 * Modal/Sheet flotante para editar los atributos de una cuenta existente
 * (nombre, tipo, divisa, saldo, cupo de crédito, o activos de inversión).
 */
export default function EditAccountModal({
  account,
  onClose,
  onSave,
  onDelete,
  trm = 4050
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [currency, setCurrency] = useState('COP');
  const [balance, setBalance] = useState('');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [creditLimit, setCreditLimit] = useState('5000000');
  const [paymentDueDate, setPaymentDueDate] = useState('17');
  const [closingDate, setClosingDate] = useState('25');
  const [color, setColor] = useState('#007AFF');
  const [icon, setIcon] = useState('Building2');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (account) {
      setName(account.name || '');
      setType(normalizeAccountType(account.type || 'bank'));
      setCurrency(account.currency || 'COP');
      const rawVal = account.initialBalance !== undefined && account.initialBalance !== null
        ? account.initialBalance
        : (account.balance !== undefined && account.balance !== null ? account.balance : 0);
      setBalance(String(Math.abs(rawVal)));
      setTicker(account.ticker || '');
      setShares(account.shares !== undefined ? String(account.shares) : '');
      setUnitPrice(account.unitPrice !== undefined ? String(account.unitPrice) : '');
      setCreditLimit(account.creditLimit !== undefined ? String(account.creditLimit) : '5000000');
      setPaymentDueDate(account.paymentDueDate !== undefined ? String(account.paymentDueDate) : '17');
      setClosingDate(account.closingDate !== undefined ? String(account.closingDate) : '25');
      setColor(account.color || '#007AFF');
      setIcon(
        account.icon || 
        (account.type === 'cash' ? 'Wallet' : 
         (account.type === 'card' || account.type === 'credit') ? 'CreditCard' : 
         account.type === 'savings' ? 'Smartphone' : 
         account.type === 'investment' ? 'TrendingUp' : 'Building2')
      );
    }
  }, [account]);

  // Soporte para botón físico/gesto de atrás en Android/PWA
  useBackHandler(Boolean(account), onClose);

  if (!account) return null;

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
    if (submittingRef.current || isSubmitting) return;
    if (!name.trim()) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const isInvestment = type === 'investment';
      const isCreditEdit = normalizeAccountType(type) === 'credit';
      const sharesNum = isInvestment && shares ? parseFloat(shares) : undefined;
      const unitPriceNum = isInvestment && unitPrice ? parseFloat(unitPrice) : undefined;
      let initBal = parseFloat(balance) || 0;
      if (isInvestment && sharesNum && unitPriceNum && (!balance || parseFloat(balance) === 0)) {
        initBal = sharesNum * unitPriceNum;
      }
      // Las tarjetas de crédito almacenan el saldo como deuda (negativo)
      if (isCreditEdit && initBal > 0) {
        initBal = -Math.abs(initBal);
      }

      const normalizedType = normalizeAccountType(type);
      const numericBalance = parseFloat(initBal) || 0;
      const updated = {
        ...account,
        name: name.trim(),
        type: normalizedType,
        currency: currency || 'COP',
        balance: numericBalance,
        initial_balance: numericBalance,
        current_balance: numericBalance,
        initialBalance: numericBalance,
        currentBalance: numericBalance,
        color,
        icon,
        ...(normalizedType === 'credit' || type === 'card' ? {
          creditLimit: parseFloat(creditLimit) || 5000000,
          paymentDueDate: parseInt(paymentDueDate, 10) || 17,
          closingDate: closingDate ? parseInt(closingDate, 10) : undefined
        } : {}),
        ...(isInvestment ? {
          ticker: ticker.trim().toUpperCase(),
          shares: sharesNum,
          unitPrice: unitPriceNum
        } : {})
      };

      if (onSave) {
        const res = onSave(updated);
        if (res && typeof res.catch === 'function') {
          res.catch((err) => {
            console.warn('[Offline/Sync] Advertencia al actualizar cuenta:', err);
          });
        }
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error al actualizar la cuenta:', err);
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleDelete = () => {
    if (window.confirm(`¿Estás seguro de eliminar la cuenta "${account.name}"?`)) {
      if (onDelete) {
        onDelete(account.id);
      }
      if (onClose) {
        onClose();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#12141C] rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera FIJA */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandIcon name={name} size={32} type={type} />
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Editar cuenta / método de pago
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Personaliza el nombre, tipo y saldo de tu cuenta
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Cuerpo con SCROLL interno automático */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
            {/* Tarjeta de VISTA PREVIA EN VIVO (Estilo Tarjeta Fintech Binance) */}
            <div className="rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 p-4 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    <BrandIcon name={name} size={40} type={type} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] tracking-wider font-semibold text-slate-400 uppercase">
                        Vista previa
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {currency}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate leading-tight">
                      {name.trim() || 'Nombre de la cuenta'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {type === 'cash' ? 'Efectivo' : (type === 'card' || type === 'credit') ? 'Tarjeta de crédito' : type === 'savings' ? 'Ahorros / billetera digital' : type === 'investment' ? 'Inversión / acciones' : 'Banco / débito'}
                    </p>
                    {type === 'investment' && parseFloat(shares) > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        {ticker ? `${ticker} · ` : ''}{shares} {parseFloat(shares) === 1 ? 'acción' : 'acciones'} @ {formatNativeCurrency(parseFloat(unitPrice) || 0, currency)} c/u
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] tracking-wider font-semibold text-slate-400 uppercase block mb-0.5">
                    {(type === 'card' || type === 'credit') ? 'Deuda / Saldo utilizado' : 'Saldo base'}
                  </span>
                  <span className={`text-lg sm:text-xl font-bold tabular-nums block ${
                    (type === 'card' || type === 'credit') && (parseFloat(balance) || 0) > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-900 dark:text-white'
                  }`}>
                    {(type === 'card' || type === 'credit') && (parseFloat(balance) || 0) > 0
                      ? `-${formatNativeCurrency(parseFloat(balance) || 0, currency)}`
                      : formatNativeCurrency(parseFloat(balance) || 0, currency)
                    }
                  </span>
                  {currency !== 'COP' && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                      ≈ $ {Math.round(convertToCOP(parseFloat(balance) || 0, currency, trm)).toLocaleString('es-CO')} COP
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Selector de Moneda Principal en Edición */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Divisa principal de la cuenta *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: 'COP', label: '$ COP' },
                  { code: 'USD', label: '$ USD' },
                  { code: 'EUR', label: '€ EUR' }
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setCurrency(item.code)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      currency === item.code
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre de la cuenta o método *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm font-bold px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white"
                placeholder="ej: Bancolombia, Nequi, Daviplata, Efectivo..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de método *
                </label>
                <select
                  value={type}
                  onChange={(e) => {
                    const val = e.target.value;
                    setType(val);
                    if (val === 'cash') setIcon('Wallet');
                    else if (val === 'card' || val === 'credit') setIcon('CreditCard');
                    else if (val === 'savings') setIcon('Smartphone');
                    else if (val === 'investment') setIcon('TrendingUp');
                    else setIcon('Building2');
                  }}
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white"
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
                  {(type === 'card' || type === 'credit')
                    ? 'Deuda actual / Saldo utilizado (opcional)'
                    : `Saldo inicial (${currency}) *`
                  }
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  required
                  placeholder="0"
                  value={balance}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono font-bold tabular-nums"
                />
              </div>
            </div>

            {/* Campos específicos si es Inversión / Acciones en Edición */}
            {type === 'investment' && (
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
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
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
                      value={shares}
                      onChange={(e) => {
                        const sh = e.target.value;
                        setShares(sh);
                        const p = parseFloat(unitPrice) || 0;
                        if (parseFloat(sh) > 0 && p > 0) {
                          setBalance(String((parseFloat(sh) * p).toFixed(2)));
                        }
                      }}
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Precio Unitario ({currency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="ej: 450.00"
                      value={unitPrice}
                      onChange={(e) => {
                        const p = e.target.value;
                        setUnitPrice(p);
                        const sh = parseFloat(shares) || 0;
                        if (sh > 0 && parseFloat(p) > 0) {
                          setBalance(String((sh * parseFloat(p)).toFixed(2)));
                        }
                      }}
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                {parseFloat(shares) > 0 && parseFloat(unitPrice) > 0 && (
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-white/80 dark:bg-black/40 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                    <span>Valor Posición ({shares} × {formatNativeCurrency(parseFloat(unitPrice), currency)}):</span>
                    <strong className="font-bold tabular-nums">
                      {formatNativeCurrency(parseFloat(shares) * parseFloat(unitPrice), currency)}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* Campos especiales si es Tarjeta de Crédito */}
            {(type === 'card' || type === 'credit') && (
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
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
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
                    value={paymentDueDate}
                    onChange={(e) => setPaymentDueDate(e.target.value)}
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
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pie de página FIJO SIEMPRE VISIBLE */}
          <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-[#181B26] border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3.5 py-2.5 text-xs font-semibold text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-xl transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2.5 text-xs font-bold bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Guardando...' : 'Guardar Cuenta'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
