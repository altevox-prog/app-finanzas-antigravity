import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrency, formatUSD } from '../../../data/initialData';

/**
 * PortfolioSummaryHeader
 * Cabecera principal del módulo de inversiones:
 * - Título, indicador "En vivo" y timestamp de última actualización
 * - Controles: selector/toggle de divisa, botón de refresco de cotizaciones y botón "Nueva inversión"
 * - Tarjetas de KPI: Capital Invertido, Valor Actual del Portafolio y Rendimiento acumulado (PnL)
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
  const { formatMoney, isPrivacyMode, enableDecimals } = usePrivacy();
  const showDecimals = enableDecimals ?? (typeof window !== 'undefined' && localStorage.getItem('app_enable_decimals') === 'true');

  const formatInvestMoney = (amount, currency = viewCurrency) => {
    if (currency === 'USD') {
      return formatUSD(amount, isPrivacyMode, showDecimals);
    }
    return formatCurrency(amount, isPrivacyMode, showDecimals);
  };

  const handleCurrencySelect = (currency) => {
    if (onToggleCurrency) {
      onToggleCurrency(currency);
    } else if (setViewCurrency) {
      setViewCurrency(currency);
    }
  };

  return (
    <div 
      className="p-4 sm:p-5 rounded-3xl border shadow-sm space-y-4"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      {/* Barra de Título y Botón de Actualización Rápida En Vivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={onBack ? onBack : () => {
              if (typeof window !== 'undefined' && window.history.length > 2) window.history.back();
            }}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 active:scale-95 transition-colors cursor-pointer border border-slate-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm shrink-0"
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-main)' }}>
              Portafolio de Inversiones
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>En vivo</span>
            </span>
            {lastRefreshedAt && (
              <span className="text-[10px] text-slate-400 font-medium hidden md:inline">
                • {lastRefreshedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector / Toggle de Moneda */}
          {(onToggleCurrency || setViewCurrency) && (
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-white/5 p-0.5 border border-slate-200/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => handleCurrencySelect('COP')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewCurrency === 'COP'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                COP
              </button>
              <button
                type="button"
                onClick={() => handleCurrencySelect('USD')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewCurrency === 'USD'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                USD
              </button>
            </div>
          )}

          {/* Botón de Actualización Rápida */}
          <button
            type="button"
            onClick={onRefreshQuotes}
            disabled={isRefreshing || investmentsCount === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/60 dark:border-white/10 active:scale-95 disabled:opacity-50"
            title="Actualizar cotizaciones en tiempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando...' : '↺ Actualizar cotizaciones'}</span>
          </button>
        </div>
      </div>

      {/* 3 Tarjetas Principales del Portafolio: Capital Invertido, Valor Actual y Rendimiento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tarjeta 1: Capital Invertido (Costo base) */}
        <div 
          className="p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between"
          style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block tracking-normal">
              Capital Invertido
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums mt-1 text-slate-900 dark:text-zinc-100">
              {formatMoney(portfolioMetrics?.totalCostCOP || 0, 'COP')}
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            <span className="font-mono tabular-nums tracking-tight">≈ {formatMoney(portfolioMetrics?.totalCostUSD || 0, 'USD')}</span>
          </div>
        </div>

        {/* Tarjeta 2: Valor Actual de Mercado / Valor Total del Portafolio */}
        <div 
          className="p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between"
          style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block tracking-normal">
              Valor Total del Portafolio
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
              {formatMoney(portfolioMetrics?.totalValueCOP || 0, 'COP')}
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5 font-medium flex-wrap">
            <span className="font-mono tabular-nums tracking-tight">≈ {formatMoney(portfolioMetrics?.totalValueUSD || 0, 'USD')}</span>
            <span>•</span>
            <span className="font-mono tabular-nums tracking-tight text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              TRM: {formatInvestMoney(trm || 4050, 'COP')}
            </span>
          </div>
        </div>

        {/* Tarjeta 3: Rendimiento no realizado / Ganancia */}
        <div 
          className="p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between"
          style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block tracking-normal">
              Rendimiento no realizado
            </span>
            <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums mt-1 ${
              portfolioMetrics?.isPositive ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {portfolioMetrics?.isPositive ? '+' : ''}{formatMoney(portfolioMetrics?.netGainCOP || 0, 'COP')}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold font-mono tracking-tight tabular-nums border ${
              portfolioMetrics?.isPositive 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}>
              {portfolioMetrics?.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {portfolioMetrics?.isPositive ? '+' : ''}{(portfolioMetrics?.totalPercentage || 0).toFixed(2)}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono tracking-tight tabular-nums">
              ({portfolioMetrics?.isPositive ? '+' : ''}{formatMoney(portfolioMetrics?.netGainUSD || 0, 'USD')})
            </span>
          </div>
        </div>
      </div>

      {/* Distribución de Activos Segmentada */}
      {allocationByCategory && allocationByCategory.length > 0 && (
        <div className="pt-2 space-y-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Distribución de Activos</span>
            <span className="tabular-nums font-mono text-[11px]">100% Portafolio</span>
          </div>

          {/* Barra segmentada */}
          <div className="w-full h-2.5 bg-black/5 dark:bg-white/10 rounded-full flex overflow-hidden p-0.5 gap-0.5">
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

          {/* Leyenda de Categorías */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
            {allocationByCategory.map(item => (
              <div key={item.id} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="font-bold text-slate-700 dark:text-slate-300">{item.shortName}:</span>
                <span className="opacity-70 tabular-nums">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
