import React from 'react';
import { usePrivacy } from '../../context/PrivacyContext';

/**
 * DebtMetricsSummary
 * Hero Card Ejecutiva 3 en 1 para Préstamos y Deudas:
 * - Bloque Superior: Monto principal pendiente + Badge dinámico de cuentas pendientes
 * - Barra de progreso de amortización integrada con porcentaje liquidado
 * - Bloque Inferior: Grid compacto de 3 columnas (Compromiso Total, Total Abonado con desglose, Cuentas Pagadas)
 */
export default function DebtMetricsSummary({
  activeTab,
  tabTotals = {},
  formatCurrency,
  filteredItemsCount = 0
}) {
  const { isPrivacyMode } = usePrivacy();
  const isReceivable = activeTab === 'receivable';

  // Porcentaje de liquidación de la sección actual
  const percentPaid = tabTotals.totalToPay > 0 
    ? Math.min(100, Math.round((tabTotals.totalPaid / tabTotals.totalToPay) * 100))
    : 0;

  const totalAccounts = filteredItemsCount || (tabTotals.paidCount + tabTotals.pendingCount) || 0;

  return (
    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 sm:p-4 shadow-sm shadow-slate-200/50 dark:shadow-xl dark:shadow-black/40 space-y-2.5">
      {/* ============================================================== */}
      {/* BLOQUE SUPERIOR: Monto Principal y Badge de Pendientes         */}
      {/* ============================================================== */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium block tracking-normal">
            {isReceivable ? 'Total pendiente por cobrar' : 'Total pendiente por pagar'}
          </span>
          <div className={`font-bold font-mono tracking-tight tabular-nums text-2xl sm:text-3xl mt-0.5 ${
            isReceivable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(tabTotals.outstandingBalance || 0)}
          </div>
        </div>

        {/* Badge dinámico de cuentas pendientes */}
        <span className={`text-xs font-semibold font-mono tracking-tight px-2.5 py-1 rounded-full shrink-0 border ${
          isReceivable 
            ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30' 
            : 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
        }`}>
          {tabTotals.pendingCount || 0} pendiente{tabTotals.pendingCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ============================================================== */}
      {/* MÉTRICAS SECUNDARIAS: Fila horizontal continua                 */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100 dark:border-slate-800/80 my-2 flex-wrap gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-slate-400 dark:text-slate-500 font-medium">{isReceivable ? 'Prestado:' : 'Compromiso:'}</span>
          <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 tabular-nums">
            {formatCurrency(tabTotals.totalToPay || 0)}
          </span>
        </div>

        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

        <div className="flex items-center gap-1 min-w-0">
          <span className="text-slate-400 dark:text-slate-500 font-medium">Abonado:</span>
          <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(tabTotals.totalPaid || 0)}
          </span>
        </div>

        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

        <div className="flex items-center gap-1 min-w-0">
          <span className="text-slate-400 dark:text-slate-500 font-medium">Progreso:</span>
          <span className="font-semibold font-mono text-slate-700 dark:text-slate-300 tabular-nums">
            {tabTotals.paidCount || 0} de {totalAccounts} ({isPrivacyMode ? '••%' : `${percentPaid}%`})
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* BARRA DE LIQUIDACIÓN INTEGRADA (delgada h-1.5)                 */}
      {/* ============================================================== */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <span>Liquidado: <strong className="text-slate-700 dark:text-slate-200">{isPrivacyMode ? '••%' : `${percentPaid}%`}</strong></span>
          {tabTotals.remainingInterest > 0 && (
            <span className="truncate">
              Intereses pend.: <strong className="text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(tabTotals.remainingInterest)}</strong>
            </span>
          )}
        </div>
        <div className="bg-slate-100 dark:bg-slate-800/80 h-1.5 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isReceivable ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'
            }`}
            style={{ width: `${percentPaid}%` }}
          />
        </div>
      </div>
    </div>
  );
}
