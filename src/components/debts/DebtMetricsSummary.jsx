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
    <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/60 dark:border-white/[0.08] rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
      {/* ============================================================== */}
      {/* BLOQUE SUPERIOR: Monto Principal y Badge de Pendientes         */}
      {/* ============================================================== */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-slate-700 dark:text-zinc-300 text-xs sm:text-sm font-semibold block tracking-normal">
            {isReceivable ? 'Total pendiente por cobrar' : 'Total pendiente por pagar'}
          </span>
          <div className={`font-bold font-mono tracking-tight tabular-nums text-2xl sm:text-3xl mt-0.5 ${
            isReceivable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(tabTotals.outstandingBalance || 0)}
          </div>
        </div>

        {/* Badge dinámico de cuentas pendientes */}
        <span className={`text-xs font-semibold font-mono tracking-tight px-2.5 py-1 rounded-full shrink-0 border backdrop-blur-xs ${
          isReceivable
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300'
        }`}>
          {tabTotals.pendingCount || 0} pendiente{tabTotals.pendingCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ============================================================== */}
      {/* MÉTRICAS SECUNDARIAS: Fila horizontal continua                 */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100 dark:border-zinc-800/80 my-2 flex-wrap gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-slate-600 dark:text-zinc-400 font-semibold">{isReceivable ? 'Prestado:' : 'Compromiso:'}</span>
          <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 tabular-nums">
            {formatCurrency(tabTotals.totalToPay || 0)}
          </span>
        </div>

        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

        <div className="flex items-center gap-1 min-w-0">
          <span className="text-slate-600 dark:text-zinc-400 font-semibold">Abonado:</span>
          <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(tabTotals.totalPaid || 0)}
          </span>
        </div>

        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

        <div className="flex items-center gap-1 min-w-0">
          <span className="text-slate-600 dark:text-zinc-400 font-semibold">Progreso:</span>
          <span className="font-semibold font-mono text-slate-700 dark:text-slate-300 tabular-nums">
            {tabTotals.paidCount || 0} de {totalAccounts} ({isPrivacyMode ? '••%' : `${percentPaid}%`})
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* BARRA DE LIQUIDACIÓN INTEGRADA (delgada h-1.5)                 */}
      {/* ============================================================== */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-zinc-300 font-semibold font-mono">
          <span>Liquidado: <strong className="text-slate-900 dark:text-white font-bold">{isPrivacyMode ? '••%' : `${percentPaid}%`}</strong></span>
          {tabTotals.remainingInterest > 0 && (
            <span className="truncate">
              Intereses pend.: <strong className="text-amber-700 dark:text-amber-400 font-bold font-mono">{formatCurrency(tabTotals.remainingInterest)}</strong>
            </span>
          )}
        </div>
        <div className="bg-slate-900/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden border border-white/40 dark:border-white/5">
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
