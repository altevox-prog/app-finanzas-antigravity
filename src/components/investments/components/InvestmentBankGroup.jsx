import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import InvestmentCard from './InvestmentCard';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrency, formatUSD } from '../../../data/initialData';

/**
 * InvestmentBankGroup
 * Renderiza la lista consolidada de inversiones agrupadas por entidad financiera / banco,
 * con tarjeta de resumen, cifras consolidadas y acordeón expandible de productos individuales.
 */
export default function InvestmentBankGroup({
  groupedInvestments = {},
  viewCurrency = 'COP',
  livePrices = {},
  trm = 4050,
  expandedBanks = {},
  onToggleBank,
  onEditInvestment,
  onDeleteInvestment,
  onQuickUpdate,
  onOpenLiquidation,
}) {
  const { isPrivacyMode, enableDecimals } = usePrivacy();
  const showDecimals = enableDecimals ?? (typeof window !== 'undefined' && localStorage.getItem('app_enable_decimals') === 'true');

  const formatInvestMoney = (amount, currency = viewCurrency) => {
    if (currency === 'USD') {
      return formatUSD(amount, isPrivacyMode, showDecimals);
    }
    return formatCurrency(amount, isPrivacyMode, showDecimals);
  };

  const entries = Object.entries(groupedInvestments);
  if (entries.length === 0) return null;

  return (
    <>
      {entries.map(([bankName, bankData]) => {
        const isExpanded = expandedBanks[bankName] !== false;
        const totalInvested = viewCurrency === 'USD' ? bankData.totalInvestedUSD : bankData.totalInvestedCOP;
        const currentValue = viewCurrency === 'USD' ? bankData.currentValueUSD : bankData.currentValueCOP;
        const netGain = currentValue - totalInvested;
        const gainPercent = totalInvested > 0 ? (netGain / totalInvested) * 100 : 0;
        const isGainPositive = netGain >= 0;

        const productCount = bankData.items.length;
        const cdtCount = bankData.items.filter(i => i.assetType === 'cdt' || i.category === 'fixed').length;
        let productsSummary = `${productCount} ${productCount === 1 ? 'producto' : 'productos'}`;
        if (cdtCount === productCount && cdtCount > 0) {
          productsSummary = `${cdtCount} ${cdtCount === 1 ? 'CDT' : 'CDTs'}`;
        }

        return (
          <div 
            key={bankName}
            className="rounded-3xl border shadow-sm overflow-hidden transition-all"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            {/* Cabecera Consolidada del Banco (Clickeable para desplegar/contraer) */}
            <div 
              onClick={() => onToggleBank && onToggleBank(bankName)}
              className="p-4 sm:p-5 flex flex-col gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Logo de la Entidad */}
                  <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center p-1 bg-slate-100 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 shrink-0">
                    <BrandIcon name={bankName} type="bank" size={32} />
                  </div>

                  <div className="truncate">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                        {bankName}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10">
                        {productsSummary}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Consolidado de inversiones
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Badge de Rendimiento Acumulado */}
                  <div className={`px-2.5 py-1 rounded-xl text-xs font-black tabular-nums border text-right hidden sm:block ${
                    isGainPositive 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  }`}>
                    {isGainPositive ? '+' : ''}{gainPercent.toFixed(2)}%
                  </div>

                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Cifras Consolidadas: Saldo Actual, Invertido y Ganancia */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-xs">
                <div>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Saldo Actual Consolidado
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums block mt-0.5">
                    {formatInvestMoney(currentValue, viewCurrency)}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Total Invertido
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-slate-700 dark:text-slate-300 tabular-nums block mt-0.5">
                    {formatInvestMoney(totalInvested, viewCurrency)}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Ganancia Total Acumulada
                  </span>
                  <span className={`text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums block mt-0.5 ${
                    isGainPositive ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {isGainPositive ? '+' : ''}{formatInvestMoney(netGain, viewCurrency)}
                    <span className="text-xs font-bold font-mono tracking-tight ml-1 sm:hidden">
                      ({isGainPositive ? '+' : ''}{gainPercent.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Acordeón Desplegable: Productos Individuales */}
            {isExpanded && (
              <div className="p-4 sm:p-5 pt-0 space-y-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/40 dark:bg-white/[0.01]">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider pt-3 pb-0.5">
                  <span>Detalle individual ({bankData.items.length})</span>
                  <span className="text-[11px] font-normal normal-case opacity-70">Toca un activo para editar o actualizar</span>
                </div>
                {bankData.items.map(item => (
                  <InvestmentCard
                    key={item.id}
                    investment={item}
                    metrics={item.metrics}
                    viewCurrency={viewCurrency}
                    livePrices={livePrices}
                    trm={trm}
                    onEdit={onEditInvestment}
                    onDelete={onDeleteInvestment}
                    onQuickUpdate={onQuickUpdate}
                    onOpenLiquidation={onOpenLiquidation}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
