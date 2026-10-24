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

  // Formatea montos monetarios asegurando que no haya espacios artificiales tras el signo pesos (ej. "$223.185.273")
  const formatCompactMoney = (amount, currency = 'COP') => {
    const formatted = formatMoney(amount, currency);
    if (typeof formatted === 'string') {
      return formatted.replace(/^([+\-]?[$€£])\s+/, '$1');
    }
    return formatted;
  };

  return (
    <div className="rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm shadow-sm space-y-2.5">
      {/* ============================================================== */}
      {/* BLOQUE SUPERIOR: Métrica Principal (Valor Total del Portafolio)*/}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-2">
        <div>
          <span className="text-xs text-slate-400 dark:text-zinc-400 font-medium block">
            Valor total del portafolio
          </span>
          <div className="flex items-baseline gap-2.5 mt-0.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums text-slate-900 dark:text-white">
              {formatMoney(totalValueCOP, 'COP')}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-tight tabular-nums border ${
              isPositive 
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>
                {isPrivacyMode ? '••••%' : `${isPositive ? '+' : ''}${totalPercentage.toFixed(2)}%`}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MÉTRICAS SECUNDARIAS: 2 Columnas Simétricas (Invertido vs Rdto)*/}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100 dark:border-zinc-800/80 my-2">
        {/* Columna Izquierda (Invertido) */}
        <div>
          <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Invertido
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap block mt-0.5 font-mono tabular-nums">
            {formatCompactMoney(totalCostCOP, 'COP')}
          </span>
        </div>

        {/* Columna Derecha (Rendimiento, alineada a la derecha text-right) */}
        <div className="text-right">
          <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Rendimiento
          </span>
          <span className={`text-xs sm:text-sm font-bold whitespace-nowrap block mt-0.5 font-mono tabular-nums ${
            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
          }`}>
            {isPositive ? '+' : ''}{formatCompactMoney(netGainCOP, 'COP')} ({isPrivacyMode ? '••••%' : `${isPositive ? '+' : ''}${totalPercentage.toFixed(2)}%`})
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PIE DE TARJETA: TRM y Equivalente en USD                       */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
        <span>≈ {formatMoney(totalValueUSD, 'USD')}</span>
        <span>•</span>
        <span>TRM {formatCurrency(trm || 4050, false, false)}</span>
      </div>

      {/* ============================================================== */}
      {/* DISTRIBUCIÓN DE ACTIVOS SEGMENTADA                              */}
      {/* ============================================================== */}
      {allocationByCategory && allocationByCategory.length > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/40">
          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-zinc-400 mb-1.5 gap-2">
            <span className="font-medium shrink-0">Distribución de Activos</span>
            <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-300 font-semibold truncate text-right">
              {(() => {
                const active = allocationByCategory.filter(item => item.percent > 0);
                if (active.length === 0) return '100% Portafolio';
                return active.map(item => `${item.shortName || item.name} ${item.percent}%`).join(' • ');
              })()}
            </span>
          </div>

          {/* Barra segmentada delgada como remate inferior */}
          <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full flex overflow-hidden p-0.5 gap-0.5">
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
        </div>
      )}
    </div>
  );
}
