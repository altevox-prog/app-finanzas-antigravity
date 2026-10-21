import React from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrency, formatUSD } from '../../../data/initialData';

export default function InvestmentLotHistory({
  asset, lots = [], currency = 'USD', onOpenAddLot, onDeleteLot
}) {
  const { isPrivacyMode, enableDecimals } = usePrivacy();
  const showDecimals = enableDecimals ?? (typeof window !== 'undefined' && localStorage.getItem('app_enable_decimals') === 'true');

  const formatLotMoney = (amt) => (
    currency === 'USD'
      ? formatUSD(amt, isPrivacyMode, showDecimals)
      : formatCurrency(amt, isPrivacyMode, showDecimals)
  );

  const isMarket = ['crypto', 'variable', 'stock', 'etf'].includes(asset?.category) || Boolean(asset?.ticker);
  if (!isMarket) return null;

  return (
    <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Layers className="w-3.5 h-3.5 text-emerald-500" />
          <span>Lotes de Compra ({lots.length})</span>
        </div>
        {onOpenAddLot && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenAddLot(asset); }}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>Añadir compra</span>
          </button>
        )}
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
        {lots.map((lot, idx) => {
          const subtotal = (lot.shares_count * lot.purchase_price_per_share) + (lot.broker_fee || 0);
          return (
            <div
              key={lot.id || idx}
              className="flex items-center justify-between p-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
            >
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {lot.shares_count.toLocaleString('es-CO', { maximumFractionDigits: 6 })} {asset.ticker || 'uds'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    @ {formatLotMoney(lot.purchase_price_per_share)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span>{lot.date || 'Fecha N/A'}</span>
                  {lot.broker_fee > 0 && <span>• Fee: {formatLotMoney(lot.broker_fee)}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 text-xs tabular-nums">
                  {formatLotMoney(subtotal)}
                </span>
                {lots.length > 1 && onDeleteLot && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('¿Eliminar este lote de compra individual?')) onDeleteLot(asset.id, lot.id);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Eliminar lote"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
