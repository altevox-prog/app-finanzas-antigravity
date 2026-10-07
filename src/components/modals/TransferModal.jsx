import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeftRight, 
  X, 
  Wallet, 
  Check, 
  AlertCircle,
  Calendar,
  FileText
} from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import BrandIcon from '../BrandIcon';
import { 
  getAccountNativeBalance, 
  formatNativeCurrency, 
  convertToCOP, 
  convertFromCOP,
  formatCOP
} from '../../utils/currencyUtils';
import { INITIAL_ACCOUNTS } from '../../data/initialData';

export default function TransferModal({
  isOpen = false,
  onClose,
  accounts = [],
  transactions = [],
  onTransfer,
  trm = 4050
}) {
  useBackHandler(isOpen, onClose);

  const { formatMoney } = usePrivacy();

  // Blindaje defensivo de cuentas con fallback a localStorage
  let accountsList = Array.isArray(accounts) && accounts.length > 0 ? accounts.filter(Boolean) : [];
  if (accountsList.length === 0) {
    try {
      const stored = localStorage.getItem('presu_accounts') || localStorage.getItem('user_accounts') || localStorage.getItem('finanzas_accounts_v3') || '[]';
      const parsed = JSON.parse(stored);
      accountsList = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      accountsList = [];
    }
  }

  // Seleccionar cuentas iniciales predeterminadas (diferentes)
  const defaultFrom = accountsList.length > 0 ? (accountsList[0]?.id || '') : '';
  const defaultTo = accountsList.length > 1 ? (accountsList[1]?.id || '') : '';

  const [fromAccountId, setFromAccountId] = useState(defaultFrom);
  const [toAccountId, setToAccountId] = useState(defaultTo);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Sincronizar cuentas si accountsList llega después de la carga inicial
  React.useEffect(() => {
    if (accountsList.length > 0) {
      if (!fromAccountId || !accountsList.some(a => a?.id === fromAccountId)) {
        setFromAccountId(accountsList[0]?.id || '');
      }
      if (!toAccountId || !accountsList.some(a => a?.id === toAccountId)) {
        const other = accountsList.find(a => a?.id !== (fromAccountId || accountsList[0]?.id));
        setToAccountId(other ? other.id : (accountsList[1]?.id || accountsList[0]?.id || ''));
      }
    }
  }, [accountsList, fromAccountId, toAccountId]);

  if (!isOpen) return null;

  const fromAcc = accountsList.find(a => a?.id === fromAccountId) || accountsList[0] || null;
  const toAcc = accountsList.find(a => a?.id === toAccountId) || (accountsList.length > 1 ? accountsList[1] : null);

  const fromCurrency = fromAcc?.currency || 'COP';
  const toCurrency = toAcc?.currency || 'COP';

  const fromBalance = fromAcc ? getAccountNativeBalance(fromAcc, transactions, trm) : 0;
  const toBalance = toAcc ? getAccountNativeBalance(toAcc, transactions, trm) : 0;

  // Intercambiar cuentas origen y destino
  const handleSwap = () => {
    const temp = fromAccountId;
    setFromAccountId(toAccountId);
    setToAccountId(temp);
    setErrorMsg('');
  };

  // Cálculo de monto destino si las monedas son diferentes
  const numAmount = parseFloat(amount) || 0;
  let destAmount = numAmount;
  if (fromCurrency !== toCurrency && numAmount > 0) {
    const copEquivalent = convertToCOP(numAmount, fromCurrency, trm);
    destAmount = convertFromCOP(copEquivalent, toCurrency, trm);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fromAccountId || !toAccountId) {
      setErrorMsg('Debes seleccionar cuenta de origen y destino.');
      return;
    }

    if (fromAccountId === toAccountId) {
      setErrorMsg('La cuenta de origen y destino no pueden ser la misma.');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Ingresa un monto válido mayor a 0.');
      return;
    }

    if (onTransfer) {
      onTransfer({
        fromAcc,
        toAcc,
        amount: numAmount,
        destAmount,
        fromCurrency,
        toCurrency,
        date,
        note: note.trim()
      });
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 400);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-slide-up border"
        style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
      >
        {/* Cabecera */}
        <div className="shrink-0 px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-[#007AFF] shadow-xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight" style={{ color: 'var(--text-main)' }}>
                Transferencia entre Cuentas
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mueve saldo entre tus cuentas o billeteras
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Selector de Cuentas: Origen y Destino */}
            <div className="space-y-2 relative">
              {/* Cuenta Origen */}
              <div className="p-3.5 rounded-2xl border bg-slate-50/80 dark:bg-white/[0.02]" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Desde (Cuenta Origen)
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                    <BrandIcon name={fromAcc?.name} size={28} type={fromAcc?.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <select
                      value={fromAccountId}
                      onChange={(e) => {
                        setFromAccountId(e.target.value);
                        setErrorMsg('');
                      }}
                      className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none cursor-pointer"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {accountsList.length === 0 ? (
                        <option value="">(Sin cuentas registradas)</option>
                      ) : (
                        accountsList.map(acc => (
                          <option key={acc?.id || Math.random()} value={acc?.id || ''} className="bg-white dark:bg-[#12141C] text-slate-900 dark:text-white">
                            {acc?.name || 'Cuenta'} ({acc?.currency || 'COP'})
                          </option>
                        ))
                      )}
                    </select>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Saldo: <strong className="font-semibold">{formatNativeCurrency(fromBalance, fromCurrency)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón Swap en el medio */}
              <div className="flex justify-center -my-2 relative z-10">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                  title="Invertir cuentas origen y destino"
                >
                  <ArrowLeftRight className="w-4 h-4 rotate-90" />
                </button>
              </div>

              {/* Cuenta Destino */}
              <div className="p-3.5 rounded-2xl border bg-slate-50/80 dark:bg-white/[0.02]" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Hacia (Cuenta Destino)
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                    <BrandIcon name={toAcc?.name} size={28} type={toAcc?.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <select
                      value={toAccountId}
                      onChange={(e) => {
                        setToAccountId(e.target.value);
                        setErrorMsg('');
                      }}
                      className="w-full text-sm font-bold bg-transparent border-0 focus:outline-none cursor-pointer"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {accountsList.length === 0 ? (
                        <option value="">(Sin cuentas registradas)</option>
                      ) : (
                        accountsList.map(acc => (
                          <option key={acc?.id || Math.random()} value={acc?.id || ''} className="bg-white dark:bg-[#12141C] text-slate-900 dark:text-white">
                            {acc?.name || 'Cuenta'} ({acc?.currency || 'COP'})
                          </option>
                        ))
                      )}
                    </select>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Saldo: <strong className="font-semibold">{formatNativeCurrency(toBalance, toCurrency)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monto a transferir */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Monto a transferir ({fromCurrency}) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0"
                  value={amount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    setAmount(val);
                    setErrorMsg('');
                  }}
                  className="w-full text-xl font-black px-4 py-3 rounded-2xl border bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                  {fromCurrency}
                </span>
              </div>

              {/* Vista previa de conversión si las monedas son diferentes */}
              {fromCurrency !== toCurrency && numAmount > 0 && (
                <div className="mt-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs">
                  <div className="flex items-center justify-between">
                    <span>Acreditación estimada en destino:</span>
                    <strong className="font-bold">≈ {formatNativeCurrency(destAmount, toCurrency)}</strong>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Tasa de cambio aplicada: TRM ${Number(trm).toLocaleString('es-CO')} COP
                  </span>
                </div>
              )}
            </div>

            {/* Fecha y Nota */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nota / Motivo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej: Ahorro mensual, Pago..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
            </div>
          </div>

          {/* Pie de página */}
          <div className="shrink-0 px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border-color)' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSuccess}
              className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Transferido</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Confirmar Transferencia</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
