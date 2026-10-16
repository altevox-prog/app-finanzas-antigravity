import React from 'react';
import { 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrency } from '../../../data/initialData';

/**
 * PortfolioSummaryHeader
 * Hero Card de Portafolio consolidada (3 en 1):
 * - Bloque Superior: Valor Total del Portafolio + Badge dinámico de Rendimiento porcentual
 * - Divisor sutil
 * - Bloque Inferior: Grid de 2 columnas compactas (Capital Invertido | Rendimiento no realizado)
 * - Pie de tarjeta: TRM y equivalente en USD
 * - Barra segmentada de distribución de activos por categoría
 */
export default function PortfolioSummaryHeader({
  portfolioMetrics,
  allocationByCategory = [],
  viewCurrency = 'COP',
  onToggleCurrency,
  setViewCurrency,
  isRefreshing = false,
  lastRefreshedAt = null,
  onRefreshQuotes,
  onNewInvestment,
  trm = 4050,
  investmentsCount = 0,
  onBack = null
}) {
  const { formatMoney, isPrivacyMode } = usePrivacy();

  const isPositive = portfolioMetrics?.isPositive ?? true;
  const totalValueCOP = portfolioMetrics?.totalValueCOP || 0;
  const totalCostCOP = portfolioMetrics?.totalCostCOP || 0;
  const netGainCOP = portfolioMetrics?.netGainCOP || 0;
  const totalValueUSD = portfolioMetrics?.totalValueUSD || 0;
  const totalPercentage = portfolioMetrics?.totalPercentage || 0;

  return (
    <div className="rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm shadow-sm space-y-3">
      {/* ============================================================== */}
      {/* BLOQUE SUPERIOR: Métrica Principal (Valor Total del Portafolio)*/}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 block tracking-normal">
            Valor Total del Portafolio
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums mt-1 text-slate-900 dark:text-white">
            {formatMoney(totalValueCOP, 'COP')}
          </div>
        </div>

        {/* Badge dinámico de rendimiento porcentual */}
        <div className="self-start sm:self-end">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono tracking-tight tabular-nums border ${
            isPositive 
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
          }`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>
              {isPrivacyMode ? '••••%' : `${isPositive ? '+' : ''}${totalPercentage.toFixed(2)}%`}
            </span>
          </span>
        </div>
      </div>

      {/* DIVISOR SUTIL */}
      <div className="border-t border-slate-100 dark:border-zinc-800/60 my-3" />

      {/* ============================================================== */}
      {/* BLOQUE INFERIOR: Grid de 2 columnas compactas                  */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Columna 1: Capital Invertido */}
        <div>
          <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">
            Capital Invertido
          </span>
          <div className="text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums mt-0.5 text-slate-800 dark:text-zinc-200">
            {formatMoney(totalCostCOP, 'COP')}
          </div>
        </div>

        {/* Columna 2: Rendimiento no realizado */}
        <div>
          <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">
            Rendimiento no realizado
          </span>
          <div className={`text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums mt-0.5 ${
            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
          }`}>
            {isPositive ? '+' : ''}{formatMoney(netGainCOP, 'COP')}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PIE DE TARJETA: TRM y Equivalente en USD                       */}
      {/* ============================================================== */}
      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/40 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
        <span>≈ {formatMoney(totalValueUSD, 'USD')}</span>
        <span>TRM: {formatCurrency(trm || 4050, false, false)}</span>
      </div>

      {/* ============================================================== */}
      {/* DISTRIBUCIÓN DE ACTIVOS SEGMENTADA                              */}
      {/* ============================================================== */}
      {allocationByCategory && allocationByCategory.length > 0 && (
        <div className="pt-2 space-y-1.5 border-t border-slate-100 dark:border-zinc-800/40">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
            <span className="font-semibold">Distribución de Activos</span>
            <span className="tabular-nums font-mono">100% Portafolio</span>
          </div>

          {/* Barra segmentada */}
          <div className="w-full h-2 bg-black/5 dark:bg-white/10 rounded-full flex overflow-hidden p-0.5 gap-0.5">
            {allocationByCategory.map(item => (
              <div
                key={item.id}
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(2, item.percent)}%`,
                  backgroundColor: item.color
                }}
                title={`${item.shortName}: ${item.percent}%`}
              />
            ))}
          </div>

          {/* Leyenda compacta de Categorías */}
          <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-[10px]">
            {allocationByCategory.map(item => (
              <div key={item.id} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="font-bold text-slate-700 dark:text-slate-300">{item.shortName}:</span>
                <span className="text-slate-500 dark:text-zinc-400 tabular-nums">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
