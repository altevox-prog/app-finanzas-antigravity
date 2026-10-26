import React, { useMemo } from 'react';
import { Calendar, ChevronDown, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import { MONTH_NAMES } from '../../data/initialData';

/**
 * MonthlyNetHeroCard
 * Widget cabecera principal ("Hero Net Summary") del Dashboard.
 * Presenta el Neto del mes/día con estado dinámico (superávit/déficit) y bandeja de ingresos y gastos.
 */
export default function MonthlyNetHeroCard({
  netBalance = 0, totalIncome = 0, totalExpense = 0, transactions = [], monthlyTransactions = [],
  selectedDate = new Date(), selectedDay = null, currentMonthLabel = '', onOpenCalendar = null,
  onOpenMonthPicker = null, formatMoney: propFormatMoney = null, className = ''
}) {
  const { formatMoney: privacyFormatMoney, isPrivacyMode } = usePrivacy();
  const formatMoney = propFormatMoney || privacyFormatMoney;

  const monthLabel = useMemo(() => {
    if (selectedDay) {
      const [y, m, d] = String(selectedDay).split('-');
      return `${parseInt(d, 10)} ${(MONTH_NAMES?.[parseInt(m, 10) - 1] || '').slice(0, 3)} ${y}`;
    }
    if (currentMonthLabel) return currentMonthLabel;
    const d = selectedDate instanceof Date ? selectedDate : new Date(selectedDate || Date.now());
    return `${MONTH_NAMES?.[d.getMonth()] || 'Mes actual'} ${d.getFullYear()}`;
  }, [selectedDay, currentMonthLabel, selectedDate]);

  const isTransferTx = (t) => Boolean(
    t && (t.isTransfer || t.is_transfer || t.type === 'transfer' || t.type === 'transferencia' ||
    t.categoryId === 'cat-transfer' || t.category_id === 'cat-transfer' || t.subcategoryId === 'sub-transfer-in' || t.subcategoryId === 'sub-transfer-out')
  );

  const activeTxList = useMemo(() => {
    const src = (transactions?.length > 0) ? transactions : (monthlyTransactions || []);
    if (!src?.length) return [];

    if (selectedDay) {
      const targetDay = String(selectedDay).split('T')[0];
      return src.filter((t) => t?.date && String(t.date).split('T')[0] === targetDay);
    }

    const d = selectedDate instanceof Date ? selectedDate : new Date(selectedDate || Date.now());
    const yr = d.getFullYear();
    const mo = d.getMonth();

    return src.filter((t) => {
      if (!t) return false;
      const rawDate = t.date ? String(t.date).split('T')[0] : (t.created_at ? String(t.created_at).split('T')[0] : '');
      if (!rawDate) return false;
      const [y, m] = rawDate.split('-').map(Number);
      return !isNaN(y) && !isNaN(m) ? y === yr && (m - 1) === mo : true;
    });
  }, [transactions, monthlyTransactions, selectedDay, selectedDate]);

  const calculatedIncome = useMemo(() => {
    if (typeof totalIncome === 'number' && totalIncome > 0) return totalIncome;
    const listInc = activeTxList.filter((t) => (t?.type === 'income' || t?.type === 'ingreso') && !isTransferTx(t))
      .reduce((s, t) => s + (Number(t?.amount) || 0), 0);
    return listInc > 0 ? listInc : (typeof totalIncome === 'number' ? totalIncome : 0);
  }, [totalIncome, activeTxList]);

  const calculatedExpense = useMemo(() => {
    if (typeof totalExpense === 'number' && totalExpense > 0) return totalExpense;
    const listExp = activeTxList.filter((t) => (t?.type === 'expense' || t?.type === 'gasto') && !isTransferTx(t))
      .reduce((s, t) => s + (Number(t?.amount) || 0), 0);
    return listExp > 0 ? listExp : (typeof totalExpense === 'number' ? totalExpense : 0);
  }, [totalExpense, activeTxList]);

  const calculatedNet = useMemo(() => {
    if (calculatedIncome > 0 || calculatedExpense > 0) return calculatedIncome - calculatedExpense;
    return typeof netBalance === 'number' ? netBalance : 0;
  }, [netBalance, calculatedIncome, calculatedExpense]);

  const isPositive = calculatedNet > 0;
  const isNegative = calculatedNet < 0;
  const formattedNet = formatMoney(calculatedNet);
  const netDisplay = isPositive && !isPrivacyMode ? `+${formattedNet}` : formattedNet;

  const handlePeriodClick = (e) => {
    e?.stopPropagation();
    (onOpenMonthPicker || onOpenCalendar)?.();
  };

  return (
    <div className={`w-full h-full select-none ${className}`}>
      <div className="w-full h-full glass-card dark:bg-zinc-900/90 rounded-3xl p-5 sm:p-4 border border-white/75 dark:border-white/[0.08] transition-all flex flex-col justify-between">
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {selectedDay ? 'Neto del día' : 'Neto del mes'}
          </span>
          <button
            type="button"
            onClick={handlePeriodClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/60 text-slate-700 dark:bg-zinc-800/60 dark:text-zinc-200 border border-white/80 dark:border-white/[0.08] backdrop-blur-md transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0 max-w-[65%]"
            title="Cambiar periodo o mes"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="capitalize truncate">{monthLabel}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
          </button>
        </div>

        {/* Cifra Central */}
        <div className="my-3 sm:my-1.5 flex items-center gap-2.5 min-w-0 overflow-hidden">
          <span className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shrink-0 transition-all ${
            isPositive ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]'
            : isNegative ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.55)]'
            : 'bg-slate-400 dark:bg-slate-600'
          }`} aria-hidden="true" />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-50 tabular-nums truncate leading-tight">
            {netDisplay}
          </h2>
          <span className={`hidden xs:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 transition-colors ${
            isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : isNegative ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20'
            : 'bg-slate-100 text-slate-500 dark:bg-zinc-800/60 dark:text-zinc-400 border-slate-200 dark:border-white/[0.08]'
          }`}>
            {isPositive ? 'Superávit' : isNegative ? 'Déficit' : 'Equilibrado'}
          </span>
        </div>

        {/* Bandeja inferior: Dos cápsulas de cristal curvas que se tocan armónicamente */}
        <div className="mt-auto pt-2.5">
          <div className="w-full flex items-center gap-2">
            {/* Cápsula 1: Ingresos (Completamente redondeada) */}
            <div
              className="flex-1 py-2 px-3.5 rounded-2xl flex flex-col justify-center min-w-0 transition-all select-none"
              style={{
                background: 'rgba(255, 255, 255, 0.28)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.90)',
                boxShadow: 'inset 0 1.5px 1px 0 rgba(255, 255, 255, 1), inset 0 0 10px rgba(255, 255, 255, 0.25), 0 4px 12px -2px rgba(15, 23, 42, 0.05)'
              }}
            >
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider min-w-0">
                <ArrowDownRight className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">Ingresos</span>
              </div>
              <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50 truncate mt-0.5">
                {formatMoney(calculatedIncome)}
              </span>
            </div>

            {/* Cápsula 2: Gastos (Completamente redondeada, roja y con su propio contorno) */}
            <div
              className="flex-1 py-2 px-3.5 rounded-2xl flex flex-col justify-center min-w-0 transition-all select-none"
              style={{
                background: 'rgba(255, 255, 255, 0.28)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.90)',
                boxShadow: 'inset 0 1.5px 1px 0 rgba(255, 255, 255, 1), inset 0 0 10px rgba(255, 255, 255, 0.25), 0 4px 12px -2px rgba(15, 23, 42, 0.05)'
              }}
            >
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider min-w-0" style={{ color: '#dc2626' }}>
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-red-600" style={{ color: '#dc2626' }} />
                <span className="truncate" style={{ color: '#dc2626' }}>Gastos</span>
              </div>
              <span className="text-sm sm:text-base font-black font-mono tabular-nums truncate mt-0.5" style={{ color: '#dc2626' }}>
                {formatMoney(calculatedExpense)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
