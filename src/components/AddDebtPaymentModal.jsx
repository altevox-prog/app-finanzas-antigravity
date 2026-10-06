import React, { useState, useEffect } from 'react';
import { 
  X, 
  Coins, 
  Percent, 
  Layers, 
  Calendar, 
  Wallet, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  CreditCard
} from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../utils/currencyFormatter';

export default function AddDebtPaymentModal({
  isOpen,
  onClose,
  debt,
  stats,
  accounts = [],
  onSavePayment,
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`
}) {
  useBackHandler(isOpen, onClose);

  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();

  // 'capital' | 'interest' | 'mixed'
  const [paymentMode, setPaymentMode] = useState('capital');
  const [capitalAmount, setCapitalAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const isReceivable = debt?.type === 'receivable';
  const debtorName = debt?.personName || debt?.name || 'Registro';
  const outstandingCapital = stats?.remainingCapital ?? (stats?.outstandingCapital ?? (stats?.outstandingBalance ?? (Number(debt?.totalAmount) || 0)));
  const outstandingInterest = stats?.remainingInterest ?? (stats?.accruedInterest ?? 0);

  // Initialize or reset form when debt or isOpen changes
  useEffect(() => {
    if (isOpen && debt) {
      setPaymentMode('capital');
      setCapitalAmount(outstandingCapital > 0 ? formatCurrencyInput(outstandingCapital, enableDecimals) : '');
      setInterestAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNote(isReceivable ? `Abono de ${debtorName}` : `Pago a ${debtorName}`);
      setError('');

      // Auto-select first liquid/bank account if available
      if (accounts && accounts.length > 0) {
        const preferred = accounts.find(a => a.type === 'bank' || a.type === 'cash') || accounts[0];
        setAccountId(preferred?.id || accounts[0].id);
      } else {
        setAccountId('');
      }
    }
  }, [isOpen, debt, outstandingCapital, debtorName, isReceivable, enableDecimals]);

  if (!isOpen || !debt) return null;

  // Numerical values
  const capVal = paymentMode === 'interest' ? 0 : parseFormattedAmount(capitalAmount);
  const intVal = paymentMode === 'capital' ? 0 : parseFormattedAmount(interestAmount);
  const totalDisbursed = capVal + intVal;

  const handleModeChange = (mode) => {
    setPaymentMode(mode);
    setError('');
    if (mode === 'capital') {
      if (!capitalAmount || parseFormattedAmount(capitalAmount) <= 0) {
        setCapitalAmount(formatCurrencyInput(outstandingCapital, enableDecimals));
      }
      setInterestAmount('');
    } else if (mode === 'interest') {
      setCapitalAmount('');
      if (!interestAmount || parseFormattedAmount(interestAmount) <= 0) {
        const estInt = outstandingInterest > 0 
          ? outstandingInterest 
          : (stats?.interestAmount || (stats?.base ? stats.base * ((debt.interestRate || 0) / 100) : 0));
        setInterestAmount(estInt > 0 ? formatCurrencyInput(estInt, enableDecimals) : '');
      }
    } else if (mode === 'mixed') {
      if (!capitalAmount) {
        // Cuota sugerida o mitad de cuota
        const sug = stats?.suggestedInstallment || Math.round(outstandingCapital / 2);
        setCapitalAmount(formatCurrencyInput(sug > 0 ? sug : outstandingCapital, enableDecimals));
      }
      if (!interestAmount) {
        const estInt = outstandingInterest > 0 ? outstandingInterest : (stats?.interestAmount || 0);
        setInterestAmount(estInt > 0 ? formatCurrencyInput(estInt, enableDecimals) : '');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (totalDisbursed <= 0) {
      setError('Debes ingresar un monto válido mayor a 0.');
      return;
    }

    if (paymentMode === 'capital' && capVal <= 0) {
      setError('Ingresa el monto a capital.');
      return;
    }

    if (paymentMode === 'interest' && intVal <= 0) {
      setError('Ingresa el monto de intereses.');
      return;
    }

    if (paymentMode === 'mixed' && (capVal <= 0 || intVal <= 0)) {
      setError('En modo mixto debes ingresar tanto abono a capital como a intereses.');
      return;
    }

    const selectedAcc = accounts.find(a => a.id === accountId);

    const paymentData = {
      id: 'pay-' + Date.now(),
      date: paymentDate,
      mode: paymentMode, // 'capital' | 'interest' | 'mixed'
      capitalAmount: capVal,
      interestAmount: intVal,
      amount: totalDisbursed,
      accountId: selectedAcc?.id || accountId || '',
      accountName: selectedAcc?.name || 'General',
      note: note.trim()
    };

    onSavePayment(debt.id, paymentData);
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
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isReceivable 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {isReceivable ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
            </div>
            <div className="truncate">
              <h3 className="font-bold text-base leading-tight truncate" style={{ color: 'var(--text-main)' }}>
                {isReceivable ? 'Registrar Cobro / Abono' : 'Registrar Pago / Abono'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {debtorName} • Cap: <strong className="text-slate-700 dark:text-slate-300">{formatMoney(outstandingCapital)}</strong>
                {outstandingInterest > 0 && (
                  <> • Int: <strong className="text-amber-500">{formatMoney(outstandingInterest)}</strong></>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario con Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* 1. Selector de Destino del Abono (Chips / Tabs) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Destino del Abono *
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-black/30 border border-slate-200/80 dark:border-white/5">
              <button
                type="button"
                onClick={() => handleModeChange('capital')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMode === 'capital'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>Solo Capital</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('interest')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMode === 'interest'
                    ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Percent className="w-4 h-4" />
                <span>Solo Intereses</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('mixed')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMode === 'mixed'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Mixto / Cuota</span>
              </button>
            </div>

            {/* Mensaje descriptivo del modo activo */}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 px-1">
              {paymentMode === 'capital' && '✨ Este abono amortiza directamente el capital y reduce el saldo de la deuda.'}
              {paymentMode === 'interest' && '⚠️ Este abono cubre únicamente intereses pactados y no reduce el saldo de capital adeudado.'}
              {paymentMode === 'mixed' && '📊 Divide la cuota en abono a capital (reduce deuda) y abono a intereses (gasto financiero).'}
            </p>
          </div>

          {/* 2. Inputs Dinámicos según Destino */}
          {paymentMode === 'capital' && (
            <div className="space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Monto a capital ($) *
                </label>
                {outstandingCapital > 0 && (
                  <button
                    type="button"
                    onClick={() => setCapitalAmount(String(Math.round(outstandingCapital)))}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Liquidar saldo ({formatMoney(outstandingCapital)})
                  </button>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                required
                value={capitalAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setCapitalAmount(formatCurrencyInput(e.target.value, enableDecimals))}
                className="w-full text-lg font-black px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
                style={{ color: 'var(--text-main)' }}
              />
            </div>
          )}

          {paymentMode === 'interest' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Monto de intereses pagados ($) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                required
                value={interestAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setInterestAmount(formatCurrencyInput(e.target.value, enableDecimals))}
                className="w-full text-lg font-black px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-amber-500 tabular-nums"
                style={{ color: 'var(--text-main)' }}
              />
            </div>
          )}

          {paymentMode === 'mixed' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Abono a Capital ($) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    required
                    value={capitalAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCapitalAmount(formatCurrencyInput(e.target.value, enableDecimals))}
                    className="w-full text-base font-black px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
                    style={{ color: 'var(--text-main)' }}
                  />
                  <span className="text-[10px] text-slate-400 block">Reduce saldo adeudado</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Abono a Intereses ($) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    required
                    value={interestAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setInterestAmount(formatCurrencyInput(e.target.value, enableDecimals))}
                    className="w-full text-base font-black px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-amber-500 tabular-nums"
                    style={{ color: 'var(--text-main)' }}
                  />
                  <span className="text-[10px] text-slate-400 block">Costo financiero / servicio</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Tarjeta Resumen en Vivo del Desembolso */}
          <div className="p-3.5 rounded-2xl border bg-slate-50/80 dark:bg-white/[0.03] space-y-2" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{isReceivable ? 'Total a ingresar a tu cuenta:' : 'Total a descontar de tu cuenta:'}</span>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white tabular-nums">
                {formatMoney(totalDisbursed)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[11px]" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <span className="text-slate-400 block">Amortiza Capital:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{formatMoney(capVal)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Intereses Pagados:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  +{formatMoney(intVal)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Selector de Cuenta */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>{isReceivable ? '¿A qué cuenta entra el dinero?' : '¿De qué cuenta sale el dinero?'} *</span>
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ color: 'var(--text-main)' }}
            >
              {accounts.length === 0 ? (
                <option value="">Cuenta Principal</option>
              ) : (
                accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({(acc.type === 'card' || acc.type === 'credit') ? 'Tarjeta' : acc.type === 'cash' ? 'Efectivo' : 'Banco'})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 5. Fecha del Abono */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Fecha del abono *</span>
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ color: 'var(--text-main)' }}
            />
          </div>

          {/* 6. Nota Opcional */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Nota (opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Cuota mes de septiembre"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ color: 'var(--text-main)' }}
            />
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              style={{ color: 'var(--text-main)' }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={totalDisbursed <= 0}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isReceivable
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
              }`}
            >
              {isReceivable ? 'Confirmar Abono' : 'Confirmar Pago'} ({formatMoney(totalDisbursed)})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
