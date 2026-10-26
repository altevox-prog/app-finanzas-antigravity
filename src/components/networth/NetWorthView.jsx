import React, { useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { calculateNetWorth } from '../../utils/financeMath';
import { getAccountNativeBalance } from '../../utils/currencyUtils';
import { usePrivacy } from '../../context/PrivacyContext';
import NetWorthChart from './components/NetWorthChart';
import AssetLiabilityBreakdown from './components/AssetLiabilityBreakdown';
import FinancialHealthCard from './components/FinancialHealthCard';

/**
 * NetWorthView: Consulta, análisis y balance consolidado del Patrimonio Neto.
 * Ecuación Patrimonial Estricta: Patrimonio Neto = Activos Totales - Pasivos Totales.
 */
export default function NetWorthView({
  accounts = [],
  transactions = [],
  investments = [],
  debtsAndLoans = [],
  trm = 4050,
  onBack = null,
  onNavigate = null,
  fromSettings = false
}) {
  const { formatMoney } = usePrivacy();

  const netWorthData = useMemo(() => {
    return calculateNetWorth({
      accounts, transactions, investments, debtsAndLoans, trm,
      getAccountBalanceFn: (acc, txs, rate) => getAccountNativeBalance(acc, txs, rate)
    });
  }, [accounts, transactions, investments, debtsAndLoans, trm]);

  const {
    totalAssetsCOP, totalLiabilitiesCOP, netWorthCOP, isNetWorthPositive,
    totalAccountsBalanceCOP, totalInvestmentsValueCOP, totalReceivableCOP,
    totalPayableCOP, receivableCount, payableCount
  } = netWorthData;

  const formatVal = (amountCOP) => formatMoney(amountCOP, 'COP');

  const liabilityRatio = totalAssetsCOP > 0 
    ? ((totalLiabilitiesCOP / totalAssetsCOP) * 100).toFixed(1)
    : (totalLiabilitiesCOP > 0 ? '100' : '0');

  const solvencyRatio = totalAssetsCOP > 0
    ? Math.max(0, Math.min(100, Math.round(((totalAssetsCOP - totalLiabilitiesCOP) / totalAssetsCOP) * 100)))
    : (totalLiabilitiesCOP > 0 ? 0 : 100);

  const handleBack = () => {
    if (typeof onBack === 'function') onBack();
    else if (typeof window !== 'undefined' && window.history.length > 2) window.history.back();
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn max-w-4xl mx-auto pb-8">
      {/* Cabecera Estándar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex w-10 h-10 min-w-[40px] min-h-[40px] rounded-2xl items-center justify-center text-slate-700 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-white bg-white/50 dark:bg-zinc-900/50 border border-white/70 dark:border-white/[0.08] backdrop-blur-md hover:bg-white/70 dark:hover:bg-zinc-800/60 active:scale-95 transition-all cursor-pointer shadow-xs shrink-0"
          aria-label="Volver"
          title="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              Patrimonio Neto
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0 backdrop-blur-sm shadow-xs ${
              isNetWorthPositive
                ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/15 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30'
            }`}>
              {isNetWorthPositive ? 'Solvente' : 'Pasivo Alto'}
            </span>
          </div>
          <p className="text-xs text-slate-800 dark:text-zinc-200 font-semibold truncate mt-0.5">
            Balance general de activos y pasivos consolidados
          </p>
        </div>
      </div>

      {/* Bloque 1 - Tarjeta Hero de Balance General */}
      <div className="p-5 sm:p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-white/70 dark:border-white/[0.08] shadow-xs space-y-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-800 dark:text-zinc-200 font-bold flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-emerald-500" />
            <span>Patrimonio Neto Total</span>
          </span>
          <h3 className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums mt-1 leading-tight">
            {formatVal(netWorthCOP)}
          </h3>
          <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium mt-1 font-mono">Calculado en pesos colombianos (COP)</p>
        </div>

        {/* Desglose horizontal: Activos vs Pasivos */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider truncate">Activos Totales</span>
            </div>
            <p className="text-base sm:text-xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums truncate">{formatVal(totalAssetsCOP)}</p>
            <p className="text-[10px] sm:text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5 truncate">Bienes, cuentas & inversiones</p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider truncate">Pasivos Totales</span>
            </div>
            <p className="text-base sm:text-xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400 tabular-nums truncate">{formatVal(totalLiabilitiesCOP)}</p>
            <p className="text-[10px] sm:text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5 truncate">Deudas & compromisos por pagar</p>
          </div>
        </div>

        {/* Ratios */}
        <div className="pt-2 flex items-center justify-between text-xs text-slate-700 dark:text-zinc-300 font-semibold">
          <span className="truncate">
            Pasivos representan el <strong className="text-rose-600 dark:text-rose-400 font-mono font-bold">{liabilityRatio}%</strong> de tus activos.
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold shrink-0">{solvencyRatio}% neto</span>
        </div>
      </div>

      {/* Bloque 2 - Gráfico */}
      <NetWorthChart
        totalAssets={totalAssetsCOP}
        totalLiabilities={totalLiabilitiesCOP}
        netWorth={netWorthCOP}
        formatMoney={formatVal}
      />

      {/* Bloque 3 - Desglose */}
      <AssetLiabilityBreakdown
        accountsBalance={totalAccountsBalanceCOP}
        investmentsValue={totalInvestmentsValueCOP}
        receivableLoans={totalReceivableCOP}
        payableDebts={totalPayableCOP}
        totalAssets={totalAssetsCOP}
        receivableCount={receivableCount}
        payableCount={payableCount}
        formatMoney={formatVal}
        onNavigate={(tab, source) => onNavigate?.(tab, source || 'net_worth')}
      />

      {/* Bloque 4 - Salud Financiera */}
      <FinancialHealthCard totalAssets={totalAssetsCOP} totalLiabilities={totalLiabilitiesCOP} />
    </div>
  );
}
