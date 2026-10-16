import React, { useMemo } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import { MONTH_NAMES } from '../../data/initialData';

/**
 * TransactionsHeroCard
 * Tarjeta cabecera flotante de resumen financiero para la vista de Movimientos.
 * Incluye selector centrado de mes/periodo y cápsula interactiva de 3 columnas:
 * Ingresos, Gastos y Balance, con interactividad táctil para filtrar por tipo.
 */
export default function TransactionsHeroCard({
  income: propIncome = null,
  expense: propExpense = null,
  balance: propBalance = null,
  transactions = [],
  selectedDate = new Date(),
  selectedDay = null,
  currentMonthLabel = '',
  typeFilter = 'all',
  onTypeFilterChange = null,
  onOpenMonthPicker = null,
  onOpenCalendar = null,
  formatMoney: propFormatMoney = null,
  className = ''
}) {
  const { formatMoney: privacyFormatMoney, isPrivacyMode } = usePrivacy();
  const formatMoney = propFormatMoney || privacyFormatMoney;

  // Helper para identificar transferencias y no contarlas como gasto/ingreso corriente
  const isTransferTx = (t) => Boolean(
    t && (
      t.isTransfer ||
      t.is_transfer ||
      t.type === 'transfer' ||
      t.type === 'transferencia' ||
      t.categoryId === 'cat-transfer' ||
      t.category_id === 'cat-transfer' ||
      t.subcategoryId === 'sub-transfer-in' ||
      t.subcategoryId === 'sub-transfer-out'
    )
  );

  // Cálculo reactivo si no se proporcionan valores por prop
  const calculatedIncome = useMemo(() => {
    if (propIncome !== null && propIncome !== undefined) return Number(propIncome) || 0;
    return (transactions || [])
      .filter(t => (t?.type === 'income' || t?.type === 'ingreso') && !isTransferTx(t))
      .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
  }, [propIncome, transactions]);

  const calculatedExpense = useMemo(() => {
    if (propExpense !== null && propExpense !== undefined) return Number(propExpense) || 0;
    return (transactions || [])
      .filter(t => (t?.type === 'expense' || t?.type === 'gasto') && !isTransferTx(t))
      .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
  }, [propExpense, transactions]);

  const calculatedBalance = useMemo(() => {
    if (propBalance !== null && propBalance !== undefined) return Number(propBalance) || 0;
    return calculatedIncome - calculatedExpense;
  }, [propBalance, calculatedIncome, calculatedExpense]);

  const income = calculatedIncome;
  const expense = calculatedExpense;
  const balance = calculatedBalance;

  const isPositive = balance > 0;
  const isNegative = balance < 0;

  // Formato del balance con signo respetando privacidad
  const formattedBalance = formatMoney(balance);
  const balanceDisplay = isPositive && !isPrivacyMode ? `+${formattedBalance}` : formattedBalance;

  // Construcción del texto del selector de mes / periodo
  const monthLabel = useMemo(() => {
    if (selectedDay) {
      const parts = String(selectedDay).split('-');
      const dayNum = parseInt(parts[2], 10);
      const dateObj = selectedDate instanceof Date ? selectedDate : (selectedDate ? new Date(selectedDate) : new Date());
      const mName = MONTH_NAMES?.[dateObj.getMonth()] || '';
      return `${dayNum} ${mName.slice(0, 3)} ${parts[0]}`;
    }
    if (currentMonthLabel && typeof currentMonthLabel === 'string') {
      return currentMonthLabel;
    }
    const dateObj = selectedDate instanceof Date ? selectedDate : (selectedDate ? new Date(selectedDate) : new Date());
    const mName = MONTH_NAMES?.[dateObj.getMonth()] || 'Mes actual';
    return `${mName} ${dateObj.getFullYear()}`;
  }, [selectedDay, currentMonthLabel, selectedDate]);

  const handlePeriodClick = () => {
    if (typeof onOpenMonthPicker === 'function') {
      onOpenMonthPicker();
    } else if (typeof onOpenCalendar === 'function') {
      onOpenCalendar();
    }
  };

  const handleIncomeClick = () => {
    if (typeof onTypeFilterChange === 'function') {
      onTypeFilterChange(typeFilter === 'income' ? 'all' : 'income');
    }
  };

  const handleExpenseClick = () => {
    if (typeof onTypeFilterChange === 'function') {
      onTypeFilterChange(typeFilter === 'expense' ? 'all' : 'expense');
    }
  };

  const handleBalanceClick = () => {
    if (typeof onTypeFilterChange === 'function') {
      onTypeFilterChange('all');
    }
  };

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* 1. Selector de periodo superior centrado */}
      <div className="mb-2.5 sm:mb-3">
        <button
          type="button"
          onClick={handlePeriodClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-white/10 shadow-xs transition-all cursor-pointer select-none active:scale-95"
          title="Cambiar mes o periodo"
          aria-label="Seleccionar periodo o mes"
        >
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-zinc-400 shrink-0" />
          <span className="capitalize">{monthLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
        </button>
      </div>

      {/* 2. Tarjeta blanca / adaptativa flotante (cápsula interactiva de 3 columnas simétricas) */}
      <div className="w-full bg-white dark:bg-zinc-900/90 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 border border-slate-200/80 dark:border-white/[0.08] shadow-sm select-none transition-all">
        <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-zinc-700/50">
          {/* Columna 1: Ingresos */}
          <div className="px-0.5 sm:px-1">
            <button
              type="button"
              onClick={handleIncomeClick}
              className={`w-full h-full py-2.5 px-1.5 sm:py-3 sm:px-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${
                typeFilter === 'income'
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 shadow-xs'
                  : 'hover:bg-slate-50 dark:hover:bg-zinc-800/40 border border-transparent'
              }`}
              title={typeFilter === 'income' ? 'Quitar filtro de ingresos' : 'Filtrar por Ingresos'}
              aria-pressed={typeFilter === 'income'}
            >
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center justify-center gap-1 uppercase truncate w-full">
                <span className="font-extrabold text-xs">↑</span>
                <span>Ingresos</span>
              </span>
              <span className="mt-1 text-sm sm:text-base lg:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums truncate w-full">
                {formatMoney(income)}
              </span>
            </button>
          </div>

          {/* Columna 2: Gastos */}
          <div className="px-0.5 sm:px-1">
            <button
              type="button"
              onClick={handleExpenseClick}
              className={`w-full h-full py-2.5 px-1.5 sm:py-3 sm:px-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${
                typeFilter === 'expense'
                  ? 'bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 shadow-xs'
                  : 'hover:bg-slate-50 dark:hover:bg-zinc-800/40 border border-transparent'
              }`}
              title={typeFilter === 'expense' ? 'Quitar filtro de gastos' : 'Filtrar por Gastos'}
              aria-pressed={typeFilter === 'expense'}
            >
              <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 tracking-wider flex items-center justify-center gap-1 uppercase truncate w-full">
                <span className="font-extrabold text-xs">↓</span>
                <span>Gastos</span>
              </span>
              <span className="mt-1 text-sm sm:text-base lg:text-lg font-bold font-mono text-rose-500 dark:text-rose-400 tabular-nums truncate w-full">
                {formatMoney(expense)}
              </span>
            </button>
          </div>

          {/* Columna 3: Balance */}
          <div className="px-0.5 sm:px-1">
            <button
              type="button"
              onClick={handleBalanceClick}
              className={`w-full h-full py-2.5 px-1.5 sm:py-3 sm:px-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${
                typeFilter === 'all'
                  ? 'bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-white/10 shadow-xs'
                  : 'hover:bg-slate-50 dark:hover:bg-zinc-800/40 border border-transparent'
              }`}
              title="Restablecer a todos los movimientos"
              aria-pressed={typeFilter === 'all'}
            >
              <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 tracking-wider flex items-center justify-center gap-1.5 uppercase truncate w-full">
                <span 
                  className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                    isPositive 
                      ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' 
                      : isNegative 
                      ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]' 
                      : 'bg-slate-400 dark:bg-zinc-500'
                  }`} 
                  aria-hidden="true" 
                />
                <span>Balance</span>
              </span>
              <span className={`mt-1 text-sm sm:text-base lg:text-lg font-bold font-mono tabular-nums truncate w-full ${
                isPositive 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : isNegative 
                  ? 'text-rose-500 dark:text-rose-400' 
                  : 'text-slate-700 dark:text-zinc-300'
              }`}>
                {balanceDisplay}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
