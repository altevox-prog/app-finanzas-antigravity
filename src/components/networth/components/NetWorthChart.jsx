import React from 'react';

/**
 * NetWorthChart
 * Gráfico de Anillo (Donut) estilizado con centro hueco en SVG nativo
 * y barra proporcional de división Activos vs Pasivos.
 */
export default function NetWorthChart({
  totalAssets = 0,
  totalLiabilities = 0,
  netWorth = 0,
  formatMoney = (val) => `$${val}`
}) {
  const assetsSafe = Math.max(0, Number(totalAssets) || 0);
  const liabilitiesSafe = Math.max(0, Number(totalLiabilities) || 0);
  const totalVolume = assetsSafe + liabilitiesSafe;

  // Proporción de Activos y Pasivos
  const assetsShare = totalVolume > 0 ? (assetsSafe / totalVolume) * 100 : 100;
  const liabilitiesShare = totalVolume > 0 ? (liabilitiesSafe / totalVolume) * 100 : 0;

  // Solvencia Neta sobre Activos
  const solvencyRate = assetsSafe > 0 
    ? Math.max(0, Math.min(100, Math.round(((assetsSafe - liabilitiesSafe) / assetsSafe) * 100))) 
    : (liabilitiesSafe > 0 ? 0 : 100);

  // Parámetros SVG
  const radius = 56;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~351.86

  // Longitudes de arco
  const assetsStroke = totalVolume > 0 ? (assetsShare / 100) * circumference : circumference;
  const liabilitiesStroke = totalVolume > 0 ? (liabilitiesShare / 100) * circumference : 0;

  return (
    <div className="bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          Proporción de Balance
        </h4>
        <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
          Activos vs Pasivos
        </span>
      </div>

      {/* Gráfico Donut SVG */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-1">
        <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
            {/* Fondo del anillo */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-100 dark:text-zinc-800"
            />
            {/* Segmento de Activos (Verde Esmeralda) */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="#10B981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${assetsStroke} ${circumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
            {/* Segmento de Pasivos (Coral / Rosa) */}
            {liabilitiesStroke > 0 && (
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#F43F5E"
                strokeWidth={strokeWidth}
                strokeDasharray={`${liabilitiesStroke} ${circumference}`}
                strokeDashoffset={-assetsStroke}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            )}
          </svg>

          {/* Centro hueco: Indicador de Solvencia Neta */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
            <span className="text-2xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums leading-none">
              {solvencyRate}%
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mt-1">
              Solvencia
            </span>
          </div>
        </div>

        {/* Leyenda lateral en desktop / vertical en móvil */}
        <div className="space-y-3 w-full sm:w-auto flex-1">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Activos ({assetsShare.toFixed(1)}%)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Bienes, cuentas & inversiones
                </p>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatMoney(assetsSafe)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  Pasivos ({liabilitiesShare.toFixed(1)}%)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Deudas & créditos por pagar
                </p>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
              {formatMoney(liabilitiesSafe)}
            </span>
          </div>
        </div>
      </div>

      {/* Barra Proporcional Dividida (Progress Split Bar) */}
      <div className="space-y-1.5 pt-1">
        <div className="h-2.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
          <div
            className="h-full bg-emerald-500 transition-all duration-700 ease-out"
            style={{ width: `${assetsShare}%` }}
            title={`Activos: ${assetsShare.toFixed(1)}%`}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-700 ease-out"
            style={{ width: `${liabilitiesShare}%` }}
            title={`Pasivos: ${liabilitiesShare.toFixed(1)}%`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400 pt-0.5">
          <span>● {assetsShare.toFixed(1)}% en Activos</span>
          <span>● {liabilitiesShare.toFixed(1)}% en Pasivos</span>
        </div>
      </div>
    </div>
  );
}
