import React from 'react';

/**
 * DebtMetricsSummary
 * Muestra el resumen de métricas móviles con alto contraste para Préstamos y Deudas.
 */
export default function DebtMetricsSummary({
  activeTab,
  tabTotals,
  formatCurrency,
  filteredItemsCount = 0
}) {
  const isReceivable = activeTab === 'receivable';

  return (
    <div className="space-y-2.5 mb-4">
      {/* Tarjeta Principal: Saldo Pendiente */}
      <div 
        className="p-3.5 sm:p-4 rounded-2xl border"
        style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400 tracking-normal truncate">
            {isReceivable ? 'Saldo por Cobrar Pendiente' : 'Saldo por Pagar Pendiente'}
          </span>
          <span className={`text-[11px] sm:text-[12px] font-semibold font-mono tracking-tight px-2.5 py-0.5 rounded-full shrink-0 tabular-nums ${
            isReceivable ? 'bg-emerald-500/15 text-[#34C759]' : 'bg-red-500/15 text-[#FF3B30]'
          }`}>
            {tabTotals.pendingCount} pendiente{tabTotals.pendingCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className={`text-[28px] sm:text-[32px] font-bold font-mono tracking-tight truncate my-1 tabular-nums leading-tight ${
          isReceivable ? 'text-[#34C759]' : 'text-[#FF3B30]'
        }`}>
          {formatCurrency(tabTotals.outstandingBalance)}
        </div>

        {tabTotals.remainingInterest > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Cap: <strong className="text-slate-700 dark:text-slate-200 font-bold font-mono tracking-tight tabular-nums">{formatCurrency(tabTotals.remainingCapital)}</strong></span>
            <span>•</span>
            <span>Intereses acum.: <strong className="text-amber-500 font-bold font-mono tracking-tight tabular-nums">{formatCurrency(tabTotals.remainingInterest)}</strong></span>
          </div>
        )}

        {/* Barra de progreso de liquidación */}
        <div className="mt-2.5 pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
            <span className="opacity-60">Liquidado de esta sección</span>
            <span className="font-bold font-mono tracking-tight tabular-nums">
              {tabTotals.totalToPay > 0 
                ? `${Math.min(100, Math.round((tabTotals.totalPaid / tabTotals.totalToPay) * 100))}%`
                : '0%'}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--pill-bg)' }}>
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                isReceivable ? 'bg-[#34C759]' : 'bg-[#FF3B30]'
              }`}
              style={{ 
                width: `${tabTotals.totalToPay > 0 ? Math.min(100, (tabTotals.totalPaid / tabTotals.totalToPay) * 100) : 0}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* 2 Tarjetas Secundarias: Total y Estado */}
      <div className="grid grid-cols-2 gap-2.5">
        <div 
          className="p-3 rounded-2xl border"
          style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block truncate">
            {isReceivable ? 'Total Prestado' : 'Total Compromiso'}
          </span>
          <span className="text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums truncate block mt-0.5" style={{ color: 'var(--text-main)' }}>
            {formatCurrency(tabTotals.totalToPay)}
          </span>
          <div className="text-[10px] opacity-75 mt-1 space-y-0.5">
            <div>Abonado: <span className="text-[#34C759] font-bold font-mono tracking-tight tabular-nums">{formatCurrency(tabTotals.totalPaid)}</span></div>
            <div className="text-[9px] text-slate-500 dark:text-slate-400">
              Cap: <span className="font-mono tabular-nums">{formatCurrency(tabTotals.totalCapitalPaid)}</span> | Int: <span className="font-mono tabular-nums">{formatCurrency(tabTotals.totalInterestPaid)}</span>
            </div>
          </div>
        </div>

        <div 
          className="p-3 rounded-2xl border flex flex-col justify-between"
          style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block truncate">
              Cuentas Pagadas
            </span>
            <span className="text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums truncate block mt-0.5" style={{ color: 'var(--text-main)' }}>
              {tabTotals.paidCount} de {filteredItemsCount}
            </span>
          </div>
          <div className="mt-1">
            <span className="text-[10px] font-bold text-[#34C759] block truncate">
              {filteredItemsCount === 0 ? 'Sin cuentas' : tabTotals.pendingCount === 0 ? '✓ 100% al día' : `${tabTotals.pendingCount} pendiente(s)`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
