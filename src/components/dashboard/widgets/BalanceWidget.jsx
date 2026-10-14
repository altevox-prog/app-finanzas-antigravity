import React from 'react';
import { 
  Eye, 
  EyeOff, 
  Calendar, 
  ChevronDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  ReceiptText 
} from 'lucide-react';
import { usePrivacy } from '../../../context/PrivacyContext';
import { MONTH_NAMES } from '../../../data/initialData';

export default function BalanceWidget({
  monthlyStats,
  selectedDate = new Date(),
  selectedDay = null,
  onOpenCalendar,
  txCount = 0
}) {
  const { isPrivacyMode, togglePrivacyMode, formatMoney } = usePrivacy();

  const isPositiveBalance = monthlyStats?.netBalance >= 0;
  const currentMonthName = MONTH_NAMES[selectedDate.getMonth()];
  const currentYear = selectedDate.getFullYear();

  // Label for the compact date pill
  let pillDateLabel = `${currentMonthName} ${currentYear}`;
  if (selectedDay) {
    const parts = selectedDay.split('-');
    const dayNum = parseInt(parts[2], 10);
    pillDateLabel = `Día ${dayNum} · ${currentMonthName.slice(0, 3)}`;
  }

  return (
    <div 
      className="p-4 sm:p-5 rounded-3xl border shadow-sm dark:shadow-xl transition-all relative overflow-hidden bg-white dark:bg-[#12141C] border-slate-200/80 dark:border-white/10"
    >
      {/* Halo interno esmeralda sutil en modo oscuro */}
      <div 
        className="absolute -right-8 -top-8 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-20 dark:opacity-30 bg-emerald-500"
      />

      {/* Fila Superior: 'Saldo Disponible' + Ojo a la izquierda, Píldora de Fecha a la derecha */}
      <div className="flex items-center justify-between relative z-10 gap-2 mb-1">
        {/* Izquierda: Etiqueta y control de privacidad */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400 tracking-normal truncate">
            Saldo Disponible
          </span>
          <button
            type="button"
            onClick={togglePrivacyMode}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            title={isPrivacyMode ? "Mostrar cifras" : "Ocultar cifras"}
          >
            {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Derecha: Píldora compacta para el Selector de Fecha */}
        <button
          type="button"
          onClick={onOpenCalendar}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
          title="Abrir selector de fecha y mes"
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="capitalize text-[11px] sm:text-xs tracking-tight">
            {pillDateLabel}
          </span>
          <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
        </button>
      </div>

      {/* Monto Principal Destacado: Grafito en claro, Blanco titanio en oscuro */}
      <div className="my-2.5 relative z-10">
        <span className="text-[30px] sm:text-[32px] font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight block tabular-nums leading-none">
          {formatMoney(monthlyStats?.availableLiquidBalance ?? 0)}
        </span>
      </div>

      {/* Cápsula inferior Bento de Métricas Rápidas (3 columnas integradas con divisores limpios) */}
      <div 
        className="mt-3.5 p-3 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-[#1A1D27]/70 grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/10 items-center relative z-10"
      >
        {/* Columna 1: ↑ Ingresos */}
        <div className="flex flex-col items-center sm:items-start px-2 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase truncate">
              INGRESOS
            </span>
          </div>
          <span className="text-[13px] sm:text-[14px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums truncate block w-full text-center sm:text-left">
            +{formatMoney(monthlyStats?.totalIncome ?? 0)}
          </span>
        </div>

        {/* Columna 2: ↓ Gastos */}
        <div className="flex flex-col items-center sm:items-start px-2 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase truncate">
              GASTOS
            </span>
          </div>
          <span className="text-[13px] sm:text-[14px] font-bold text-rose-500 dark:text-rose-400 tabular-nums truncate block w-full text-center sm:text-left">
            -{formatMoney(monthlyStats?.totalExpense ?? 0)}
          </span>
        </div>

        {/* Columna 3: Transacciones */}
        <div className="flex flex-col items-center sm:items-start px-2 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <ReceiptText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase truncate">
              MOVS
            </span>
          </div>
          <span className="text-[13px] sm:text-[14px] font-bold text-slate-800 dark:text-slate-200 tabular-nums truncate block w-full text-center sm:text-left">
            {txCount} reg.
          </span>
        </div>
      </div>
    </div>
  );
}
