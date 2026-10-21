import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, X } from 'lucide-react';
import AmountInput from '../../common/AmountInput';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrency, formatUSD } from '../../../data/initialData';
import { parseFormattedAmount } from '../../../utils/currencyFormatter';
import { parseStrictNumber, computeLotsSummary } from '../utils/investmentConsolidation';

export default function AddLotModal({ isOpen, onClose, asset, onAddLot }) {
  if (!isOpen || !asset) return null;

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sharesCount, setSharesCount] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(() => (asset.currentPrice ? String(asset.currentPrice) : ''));
  const [brokerFee, setBrokerFee] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isPrivacyMode, enableDecimals } = usePrivacy();
  const showDecimals = enableDecimals ?? (typeof window !== 'undefined' && localStorage.getItem('app_enable_decimals') === 'true');
  const currency = (asset.currency || 'USD').toUpperCase();
  const formatMoney = (val) => currency === 'USD' ? formatUSD(val, isPrivacyMode, showDecimals) : formatCurrency(val, isPrivacyMode, showDecimals);

  const numShares = parseStrictNumber(sharesCount, 0);
  const numPrice = parseFormattedAmount(purchasePrice);
  const numFee = parseFormattedAmount(brokerFee);
  const lotTotal = (numShares * numPrice) + numFee;

  const existingLots = asset.lots || [];
  const previewLots = [...existingLots, { shares_count: numShares, purchase_price_per_share: numPrice, broker_fee: numFee }];
  const { totalShares: newTotalShares, avgBuyPrice: newAvgBuyPrice } = computeLotsSummary(previewLots);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (numShares <= 0 || numPrice <= 0 || isSubmitting) return;
    setIsSubmitting(true);
    const newLot = {
      id: `lot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      asset_id: asset.id,
      date: date || new Date().toISOString().split('T')[0],
      shares_count: numShares,
      purchase_price_per_share: numPrice,
      broker_fee: numFee
    };
    onAddLot?.(asset.id, newLot);
    setIsSubmitting(false);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><PlusCircle className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Añadir compra / Lote</h3>
              <p className="text-[11px] text-slate-400 font-medium">{asset.name} ({asset.ticker || 'Activo'})</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold opacity-70 mb-1">Fecha de compra</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 dark:bg-slate-800 dark:text-white" required />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold opacity-70 mb-1">Cantidad de títulos *</label>
              <input type="number" step="any" min="0.000001" placeholder="ej. 1" value={sharesCount} onChange={(e) => setSharesCount(e.target.value)} className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 dark:bg-slate-800 dark:text-white" required />
            </div>
            <div>
              <label className="block text-[11px] font-bold opacity-70 mb-1">Precio por título ({currency}) *</label>
              <AmountInput value={purchasePrice} onChange={setPurchasePrice} allowDecimals placeholder="0.00" required className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 dark:bg-slate-800 dark:text-white" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold opacity-70 mb-1">Comisión de broker (opcional)</label>
            <AmountInput value={brokerFee} onChange={setBrokerFee} allowDecimals placeholder="0.00" className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 dark:bg-slate-800 dark:text-white" />
          </div>

          {numShares > 0 && numPrice > 0 && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>Costo de este lote:</span><span className="font-bold font-mono text-slate-900 dark:text-white">{formatMoney(lotTotal)}</span></div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold"><span>Nuevo PPP estimado:</span><span className="font-bold font-mono">{formatMoney(newAvgBuyPrice)} ({newTotalShares.toLocaleString('es-CO')} títulos)</span></div>
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={isSubmitting || numShares <= 0 || numPrice <= 0} className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer">
              Registrar Compra
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
