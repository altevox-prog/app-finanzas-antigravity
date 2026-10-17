import React, { useMemo } from 'react';
import { Calendar, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import { MONTH_NAMES } from '../../data/initialData';

/**
 * TransactionsHeroCard
 * Tarjeta cabecera flotante de resumen financiero para la vista de Movimientos.
 * Incluye selector centrado de mes/periodo y resumen equilibrado en 2 columnas:
 * Ingresos y Gastos, con interactividad táctil para filtrar por tipo.
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

  const income = calculatedIncome;
  const expense = calculatedExpense;

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

      {/* 2. Resumen simétrico de 2 columnas (Ingresos y Gastos) */}
      <div className="w-full grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm select-none">
        {/* Columna 1 (Ingresos - Izquierda) */}
        <button
          type="button"
          onClick={handleIncomeClick}
          className={`flex flex-col text-left transition-all cursor-pointer ${
            typeFilter === 'income' ? 'opacity-100' : 'hover:opacity-80'
          }`}
          title={typeFilter === 'income' ? 'Quitar filtro de ingresos' : 'Filtrar por Ingresos'}
          aria-pressed={typeFilter === 'income'}
        >
          <div className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ArrowUp className="w-3.5 h-3.5 shrink-0" />
            <span>INGRESOS</span>
          </div>
          <span className="text-lg sm:text-xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap mt-1">
            {formatMoney(income)}
          </span>
        </button>

        {/* Columna 2 (Gastos - Derecha) */}
        <button
          type="button"
          onClick={handleExpenseClick}
          className={`flex flex-col text-left transition-all cursor-pointer ${
            typeFilter === 'expense' ? 'opacity-100' : 'hover:opacity-80'
          }`}
          title={typeFilter === 'expense' ? 'Quitar filtro de gastos' : 'Filtrar por Gastos'}
          aria-pressed={typeFilter === 'expense'}
        >
          <div className="text-xs font-semibold tracking-wider text-rose-500 dark:text-rose-400 flex items-center gap-1 px-4">
            <ArrowDown className="w-3.5 h-3.5 shrink-0" />
            <span>GASTOS</span>
          </div>
          <span className="text-lg sm:text-xl font-bold font-mono tracking-tight text-rose-500 dark:text-rose-400 tabular-nums whitespace-nowrap mt-1 px-4">
            {formatMoney(expense)}
          </span>
        </button>
      </div>
    </div>
  );
}
