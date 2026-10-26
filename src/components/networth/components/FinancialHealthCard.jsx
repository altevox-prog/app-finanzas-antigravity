import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';

/**
 * FinancialHealthCard
 * Indicador de Salud Financiera según el ratio deuda/activos (Leverage Ratio)
 */
export default function FinancialHealthCard({
  totalAssets = 0,
  totalLiabilities = 0
}) {
  const assetsSafe = Math.max(0, Number(totalAssets) || 0);
  const liabilitiesSafe = Math.max(0, Number(totalLiabilities) || 0);

  // Ratio de Endeudamiento (Pasivos / Activos)
  const debtRatio = assetsSafe > 0 
    ? (liabilitiesSafe / assetsSafe) * 100 
    : (liabilitiesSafe > 0 ? 100 : 0);

  let statusConfig = {
    label: 'Saludable',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    icon: ShieldCheck,
    iconColor: 'text-emerald-500',
    description: 'Excelente nivel de solvencia. Tu nivel de endeudamiento es bajo y cuentas con sólido respaldo para imprevistos o nuevas inversiones.'
  };

  if (debtRatio >= 50) {
    statusConfig = {
      label: 'Atención',
      badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
      icon: AlertCircle,
      iconColor: 'text-rose-500',
      description: 'Nivel de endeudamiento elevado. Más del 50% de tus activos están comprometidos. Prioriza amortizar las obligaciones con mayores intereses.'
    };
  } else if (debtRatio >= 30) {
    statusConfig = {
      label: 'Moderado',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      description: 'Apalancamiento bajo control. Tus pasivos representan una fracción razonable. Mantén las cuotas al día y vigila nuevos créditos.'
    };
  }

  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-white/70 dark:border-white/[0.08] shadow-xs flex items-start gap-3.5">
      <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 ${statusConfig.iconColor} shrink-0 mt-0.5`}>
        <StatusIcon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Salud Financiera & Apalancamiento
          </h4>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.badgeClass}`}>
            {statusConfig.label} ({debtRatio.toFixed(1)}% deuda)
          </span>
        </div>
        <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">
          {statusConfig.description}
        </p>
      </div>
    </div>
  );
}
