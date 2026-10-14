import React, { useState, useEffect } from 'react';
import { 
  X, 
  HandCoins, 
  Calendar, 
  Wallet, 
  FileText, 
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../utils/currencyFormatter';

export default function AddDisbursementModal({
  isOpen,
  onClose,
  debt,
  accounts = [],
  onSaveDisbursement,
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`
}) {
  useBackHandler(isOpen, onClose);

  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const debtorName = debt?.personName || debt?.name || 'Tercero';
  const currentPrincipal = Number(debt?.principalAmount || debt?.totalAmount || 0);

  useEffect(() => {
    if (isOpen && debt) {
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError('');

      if (accounts && accounts.length > 0) {
        const preferred = accounts.find(a => a.type === 'bank' || a.type === 'cash') || accounts[0];
        setFromAccountId(preferred?.id || accounts[0].id);
      } else {
        setFromAccountId('');
      }
    }
  }, [isOpen, debt, accounts]);

  if (!isOpen || !debt) return null;

  const parsedAmount = parseFormattedAmount(amount);
  const newTotalPrincipal = currentPrincipal + parsedAmount;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (parsedAmount <= 0) {
      setError('Ingresa un monto válido mayor a 0 para desembolsar.');
      return;
    }

    if (!fromAccountId) {
      setError('Selecciona la cuenta de donde saldrá el dinero.');
      return;
    }

    onSaveDisbursement(debt.id, {
      amount: parsedAmount,
      date,
      fromAccountId,
      notes: notes.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-slide-up"
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))',
          color: 'var(--text-main, #0f172a)'
        }}
      >
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <HandCoins className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-base leading-tight truncate" style={{ color: 'var(--text-main)' }}>
                Añadir Desembolso / Prestar Más
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Prestar más dinero a <strong className="text-slate-700 dark:text-slate-300">{debtorName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Monto a desembolsar */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Monto a desembolsar ($) *</span>
              <span className="text-[11px] font-normal normal-case opacity-60">Capital adicional</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              required
              autoFocus
              value={amount}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setAmount(formatCurrencyInput(e.target.value, enableDecimals))}
              className="w-full text-xl font-black px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
              style={{ color: 'var(--text-main)' }}
            />
          </div>

          {/* 2. Resumen previo del impacto en el préstamo */}
          <div className="p-3.5 rounded-2xl border bg-slate-50/80 dark:bg-white/[0.03] space-y-2 text-xs" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Capital inicial actual:</span>
              <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                {formatMoney(currentPrincipal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Nuevo desembolso:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                +{formatMoney(parsedAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t font-bold text-sm text-slate-900 dark:text-white" style={{ borderColor: 'var(--border-color)' }}>
              <span>Nuevo Capital Total Prestado:</span>
              <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatMoney(newTotalPrincipal)}
              </span>
            </div>
          </div>

          {/* 3. Selector de Cuenta Origen */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>¿De qué cuenta sale el dinero prestado? *</span>
            </label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              required
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: 'var(--text-main)' }}
            >
              {accounts.length === 0 ? (
                <option value="">Cuenta Principal</option>
              ) : (
                accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type === 'cash' ? 'Efectivo' : acc.type === 'card' ? 'Tarjeta' : 'Banco'}) - Saldo: {formatMoney(acc.balance || 0)}
                  </option>
                ))
              )}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Se descontará este valor de la cuenta seleccionada y se registrará la transacción de gasto.
            </span>
          </div>

          {/* 4. Fecha del desembolso */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Fecha del desembolso *</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: 'var(--text-main)' }}
            />
          </div>

          {/* 5. Notas opcionales */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Nota o motivo (opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Préstamo adicional para imprevisto"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: 'var(--text-main)' }}
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Confirmar Desembolso</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
