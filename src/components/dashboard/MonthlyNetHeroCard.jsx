import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Info, 
  Calendar, 
  ChevronDown, 
  ArrowDownRight, 
  ArrowUpRight
} from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import { MONTH_NAMES } from '../../data/initialData';

/**
 * MonthlyNetHeroCard
 * Widget cabecera principal y fijo ("Hero Net Summary") del Dashboard.
 * Presenta el Neto del mes con indicador visual de estado y bandeja inferior simétrica.
 */
export default function MonthlyNetHeroCard({
  netBalance = 0,
  totalIncome = 0,
  totalExpense = 0,
  transactions = [],
  monthlyTransactions = [],
  selectedDate = new Date(),
  selectedDay = null,
  currentMonthLabel = '',
  onOpenCalendar = null,
  onOpenMonthPicker = null,
  formatMoney: propFormatMoney = null,
  className = ''
}) {
  const { formatMoney: privacyFormatMoney, isPrivacyMode } = usePrivacy();
  const formatMoney = propFormatMoney || privacyFormatMoney;
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);

  // Cierre del tooltip de información al hacer click afuera
  useEffect(() => {
    if (!showTooltip) return;
    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showTooltip]);

  // Construcción consistente del texto del selector de mes / periodo
  const monthLabel = useMemo(() => {
    if (selectedDay) {
      const parts = String(selectedDay).split('-');
      const dayNum = parseInt(parts[2], 10);
      const mIdx = parseInt(parts[1], 10) - 1;
      const mName = MONTH_NAMES?.[mIdx] || '';
      return `${dayNum} ${mName.slice(0, 3)} ${parts[0]}`;
    }
    if (currentMonthLabel && typeof currentMonthLabel === 'string') {
      return currentMonthLabel;
    }
    let yr, mo;
    if (selectedDate instanceof Date) {
      yr = selectedDate.getFullYear();
      mo = selectedDate.getMonth();
    } else if (typeof selectedDate === 'string' && selectedDate.includes('-')) {
      const sp = selectedDate.split('-');
      yr = parseInt(sp[0], 10);
      mo = parseInt(sp[1], 10) - 1;
    } else {
      const now = new Date();
      yr = now.getFullYear();
      mo = now.getMonth();
    }
    const mName = MONTH_NAMES?.[mo] || 'Mes actual';
    return `${mName} ${yr}`;
  }, [selectedDay, currentMonthLabel, selectedDate]);

  // Helper para excluir transferencias internas de ingresos y gastos reales
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

  // Transacciones activas del periodo para cálculo dinámico resiliente (evita ceros estáticos)
  const activeTxList = useMemo(() => {
    const source = (transactions && transactions.length > 0)
      ? transactions
      : (monthlyTransactions || []);
    if (!source || source.length === 0) return [];

    if (selectedDay) {
      const targetDay = String(selectedDay).split('T')[0];
      return source.filter(t => t && t.date && String(t.date).split('T')[0] === targetDay);
    }

    let yr, mo;
    if (selectedDate instanceof Date) {
      yr = selectedDate.getFullYear();
      mo = selectedDate.getMonth();
    } else if (typeof selectedDate === 'string' && selectedDate.includes('-')) {
      const sp = selectedDate.split('-');
      yr = parseInt(sp[0], 10);
      mo = parseInt(sp[1], 10) - 1;
    } else {
      const now = new Date();
      yr = now.getFullYear();
      mo = now.getMonth();
    }

    return source.filter(t => {
      if (!t) return false;
      const rawDate = t.date ? String(t.date).split('T')[0] : (t.created_at ? String(t.created_at).split('T')[0] : '');
      if (!rawDate) return false;
      const parts = rawDate.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) return y === yr && m === mo;
      }
      return true;
    });
  }, [transactions, monthlyTransactions, selectedDay, selectedDate]);

  // Cálculos dinámicos garantizados
  const calculatedIncome = useMemo(() => {
    if (typeof totalIncome === 'number' && totalIncome > 0) return totalIncome;
    const listIncome = activeTxList
      .filter(t => (t?.type === 'income' || t?.type === 'ingreso') && !isTransferTx(t))
      .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
    if (listIncome > 0) return listIncome;
    if (typeof totalIncome === 'number') return totalIncome;
    return 0;
  }, [totalIncome, activeTxList]);

  const calculatedExpense = useMemo(() => {
    if (typeof totalExpense === 'number' && totalExpense > 0) return totalExpense;
    const listExpense = activeTxList
      .filter(t => (t?.type === 'expense' || t?.type === 'gasto') && !isTransferTx(t))
      .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
    if (listExpense > 0) return listExpense;
    if (typeof totalExpense === 'number') return totalExpense;
    return 0;
  }, [totalExpense, activeTxList]);

  const calculatedNet = useMemo(() => {
    // Si tenemos ingresos o gastos calculados, el neto matemático SIEMPRE es Ingresos - Gastos
    if (calculatedIncome > 0 || calculatedExpense > 0) {
      return calculatedIncome - calculatedExpense;
    }
    if (typeof netBalance === 'number') {
      return netBalance;
    }
    return 0;
  }, [netBalance, calculatedIncome, calculatedExpense]);

  const isPositive = calculatedNet > 0;
  const isNegative = calculatedNet < 0;
  const isZero = calculatedNet === 0;

  // Formato del monto neto
  const formattedNet = formatMoney(calculatedNet);
  const netDisplay = isPositive && !isPrivacyMode ? `+${formattedNet}` : formattedNet;

  const handlePeriodClick = (e) => {
    if (e) e.stopPropagation();
    if (typeof onOpenMonthPicker === 'function') {
      onOpenMonthPicker();
    } else if (typeof onOpenCalendar === 'function') {
      onOpenCalendar();
    }
  };

  return (
    <div className={`w-full select-none ${className}`}>
      <div className="w-full bg-white dark:bg-[#12151E] rounded-3xl p-4 sm:p-5 border border-slate-200/60 dark:border-white/[0.07] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] transition-all">
        {/* 1. Cabecera */}
        <div className="flex items-center justify-between gap-3">
          {/* Izquierda: Etiqueta con Icono Informativo */}
          <div className="relative flex items-center gap-1.5" ref={tooltipRef}>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {selectedDay ? 'Neto del día' : 'Neto del mes'}
            </span>
            <button
              type="button"
              onClick={() => setShowTooltip(prev => !prev)}
              className="p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Neto = Ingresos - Gastos"
              aria-label="Ver fórmula del neto"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {/* Tooltip flotante informativo */}
            {showTooltip && (
              <div className="absolute left-0 top-full mt-1.5 z-30 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-[#181C27] dark:text-slate-100 text-xs shadow-xl border border-slate-700/60 dark:border-white/[0.07] whitespace-nowrap animate-fadeIn">
                <span className="font-semibold">Fórmula:</span> Ingresos − Gastos
              </div>
            )}
          </div>

          {/* Derecha: Selector de Periodo */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={handlePeriodClick}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-[#181C27] dark:text-slate-200 border border-slate-200/50 dark:border-white/[0.07] transition-all cursor-pointer active:scale-95 shadow-2xs"
              title="Cambiar periodo o mes"
              aria-label="Seleccionar periodo o mes"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="capitalize">{monthLabel}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
            </button>
          </div>
        </div>

        {/* 2. Cifra Central Protagonista */}
        <div className="my-2 sm:my-2.5 flex items-center gap-2.5 sm:gap-3">
          {/* Dot / Indicador de estado dinámico */}
          <span 
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shrink-0 transition-all ${
              isPositive
                ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]'
                : isNegative
                ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.55)]'
                : 'bg-slate-400 dark:bg-slate-600'
            }`}
            aria-hidden="true"
          />

          {/* Monto neto display scale */}
          <h2 className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-50 tabular-nums truncate leading-none">
            {netDisplay}
          </h2>

          {/* Badge contextual de estado */}
          <span className={`hidden xs:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
            isPositive
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : isNegative
              ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20'
              : 'bg-slate-100 text-slate-500 dark:bg-[#181C27] dark:text-slate-400 border-slate-200 dark:border-white/[0.07]'
          }`}>
            {isPositive ? 'Superávit' : isNegative ? 'Déficit' : 'Equilibrado'}
          </span>
        </div>

        {/* 3. Bandeja inferior integrada (cápsula interna estilizada: DOS columnas simétricas 50% / 50%) */}
        <div className="mt-3 sm:mt-3.5 py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#181C27] border border-slate-200/50 dark:border-white/[0.07] grid grid-cols-2 divide-x divide-slate-200/50 dark:divide-white/[0.07]">
          {/* Columna 1: Ingresos */}
          <div className="pr-2.5 sm:pr-4 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Ingresos</span>
            </div>
            <span className="mt-0.5 text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50 truncate">
              {formatMoney(calculatedIncome)}
            </span>
          </div>

          {/* Columna 2: Gastos */}
          <div className="pl-2.5 sm:pl-4 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Gastos</span>
            </div>
            <span className="mt-0.5 text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50 truncate">
              {formatMoney(calculatedExpense)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

