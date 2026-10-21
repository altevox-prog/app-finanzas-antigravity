import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import InvestmentCard from './InvestmentCard';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrency, formatUSD } from '../../../data/initialData';

export default function InvestmentBankGroup({
  groupedInvestments = {}, viewCurrency = 'COP', livePrices = {}, trm = 4050,
  onToggleBank, onEditInvestment, onDeleteInvestment, onOpenLiquidation,
  onOpenAddLot, onDeleteLot
}) {
  const [localExpandedBanks, setLocalExpandedBanks] = useState({});
  const { isPrivacyMode, enableDecimals } = usePrivacy();
  const showDecimals = enableDecimals ?? (typeof window !== 'undefined' && localStorage.getItem('app_enable_decimals') === 'true');

  const formatInvestMoney = (amount, currency = viewCurrency) => (
    currency === 'USD' ? formatUSD(amount, isPrivacyMode, showDecimals) : formatCurrency(amount, isPrivacyMode, showDecimals)
  );

  const handleToggleBank = (bankName) => {
    setLocalExpandedBanks((prev) => ({ ...prev, [bankName]: !prev[bankName] }));
    if (onToggleBank) onToggleBank(bankName);
  };

  const entries = Object.entries(groupedInvestments);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      {entries.map(([bankName, bankData]) => {
        const isExpanded = Boolean(localExpandedBanks[bankName]);
        const totalInvested = viewCurrency === 'USD' ? bankData.totalInvestedUSD : bankData.totalInvestedCOP;
        const currentValue = viewCurrency === 'USD' ? bankData.currentValueUSD : bankData.currentValueCOP;
        const netGain = currentValue - totalInvested;
        const gainPercent = totalInvested > 0 ? (netGain / totalInvested) * 100 : 0;
        const isGainPositive = netGain >= 0;

        const productCount = bankData.items.length;
        const cdtCount = bankData.items.filter((i) => i.assetType === 'cdt' || i.category === 'fixed').length;
        const productsSummary = (cdtCount === productCount && cdtCount > 0)
          ? `${cdtCount} ${cdtCount === 1 ? 'CDT' : 'CDTs'}`
          : `${productCount} ${productCount === 1 ? 'producto' : 'productos'}`;

        return (
          <div key={bankName} className="rounded-2xl border shadow-sm overflow-hidden transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div onClick={() => handleToggleBank(bankName)} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-slate-100 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 shrink-0">
                  <BrandIcon name={bankName} type="bank" size={28} />
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight truncate">{bankName}</span>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 shrink-0">{productsSummary}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Portafolio en custodia</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-right">
                <div className="flex flex-col items-end justify-center">
                  <span className="text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100 leading-tight">
                    {formatInvestMoney(currentValue, viewCurrency)}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-tight tabular-nums border ${isGainPositive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                      {isGainPositive ? '+' : ''}{gainPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="p-1 text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-emerald-500' : ''}`} /></div>
              </div>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[5000px] opacity-100 border-t border-slate-100 dark:border-white/5' : 'max-h-0 opacity-0 pointer-events-none'}`}>
              <div className="p-3 sm:p-3.5 bg-slate-50/40 dark:bg-white/[0.01]">
                <div className="flex flex-col gap-2.5">
                  {bankData.items.map((item) => (
                    <InvestmentCard
                      key={item.id} investment={item} metrics={item.metrics} viewCurrency={viewCurrency} livePrices={livePrices} trm={trm}
                      onEdit={onEditInvestment} onDelete={onDeleteInvestment} onOpenLiquidation={onOpenLiquidation}
                      onOpenAddLot={onOpenAddLot} onDeleteLot={onDeleteLot}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
