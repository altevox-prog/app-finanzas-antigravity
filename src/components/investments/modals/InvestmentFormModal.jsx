import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, X } from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../../utils/currencyFormatter';
import InvestmentCategoryHeader from '../InvestmentCategoryHeader';
import MarketAssetFields from './parts/MarketAssetFields';
import NonMarketAssetFields from './parts/NonMarketAssetFields';
import { toSafeNumber, calculateCDTAccruedReturn } from '../../../utils/financeMath';
import { parseStrictNumber } from '../utils/investmentConsolidation';

const calcFutureDate = (baseDateStr, days = 180) => {
  const d = baseDateStr ? new Date(baseDateStr + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export default function InvestmentFormModal({ isOpen, onClose, onSave, initialInvestment = null, initialData = null }) {
  useBackHandler(isOpen, onClose);
  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();
  const currentInitial = initialInvestment || initialData, isEditing = Boolean(currentInitial);

  const [name, setName] = useState(''), [ticker, setTicker] = useState(''), [institution, setInstitution] = useState('');
  const [assetType, setAssetType] = useState('crypto'), [category, setCategory] = useState('crypto'), [currency, setCurrency] = useState('USD');
  const [shares, setShares] = useState(''), [buyPrice, setBuyPrice] = useState(''), [currentPrice, setCurrentPrice] = useState('');
  const [investedAmount, setInvestedAmount] = useState(''), [currentAmount, setCurrentAmount] = useState(''), [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState(''), [dueDate, setDueDate] = useState(''), [subType, setSubType] = useState('cdt');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (currentInitial) {
      const c = currentInitial, cat = c.category || 'crypto';
      setName(c.name || ''); setTicker(c.ticker || ''); setInstitution(c.institution || '');
      setAssetType(c.assetType || (cat === 'crypto' ? 'crypto' : cat === 'fixed' ? (c.subType === 'bond' ? 'bond' : 'cdt') : 'etf'));
      setCategory(cat); setCurrency(['fixed', 'liquidity'].includes(cat) ? 'COP' : (c.currency || 'USD'));
      setShares(c.shares !== undefined ? String(c.shares) : (c.quantity !== undefined ? String(c.quantity) : ''));
      setBuyPrice(c.buyPrice !== undefined ? String(c.buyPrice) : ''); setCurrentPrice(c.currentPrice !== undefined ? String(c.currentPrice) : '');
      const rawInv = c.investedAmount ?? c.invested_amount ?? c.amount ?? c.totalInvested;
      setInvestedAmount(rawInv && Number(rawInv) !== 0 ? formatCurrencyInput(rawInv, true) : '');
      const rawCurr = c.currentAmount ?? c.currentValue ?? c.current_value;
      setCurrentAmount(rawCurr && Number(rawCurr) !== 0 ? formatCurrencyInput(rawCurr, true) : '');
      setInterestRate(c.interestRate !== undefined ? String(c.interestRate) : (c.rate !== undefined ? String(c.rate) : ''));
      const sDate = c.startDate || c.start_date || c.issueDate || (cat === 'fixed' ? new Date().toISOString().split('T')[0] : '');
      setStartDate(sDate); setDueDate(c.dueDate || c.due_date || (cat === 'fixed' ? calcFutureDate(sDate) : ''));
      setSubType(c.subType === 'bond' ? 'bond' : 'cdt');
    } else {
      setName(''); setTicker(''); setInstitution(''); setAssetType('crypto'); setCategory('crypto'); setCurrency('USD');
      setShares(''); setBuyPrice(''); setCurrentPrice(''); setInvestedAmount(''); setCurrentAmount(''); setInterestRate(''); setSubType('cdt');
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today); setDueDate(calcFutureDate(today));
    }
  }, [initialInvestment, initialData, isOpen, enableDecimals]);

  const isMarketAsset = ['crypto', 'variable'].includes(category);

  const handleEstimateCurrentCDT = () => {
    const inv = parseFormattedAmount(investedAmount), rate = toSafeNumber(interestRate);
    if (inv > 0 && rate > 0 && startDate) {
      const { maturityTotal } = calculateCDTAccruedReturn(inv, rate, startDate);
      setCurrentAmount(formatCurrencyInput(Number(maturityTotal.toFixed(2)), true));
    }
  };

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (['fixed', 'liquidity'].includes(newCat)) {
      setCurrency('COP');
      if (newCat === 'fixed') { setAssetType('cdt'); if (!startDate) setStartDate(new Date().toISOString().split('T')[0]); if (!dueDate) setDueDate(calcFutureDate(startDate)); }
      else setAssetType('fund');
    } else {
      if (!isEditing && currency !== 'USD') setCurrency('USD');
      setAssetType(newCat === 'crypto' ? 'crypto' : 'stock');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (submittingRef.current || isSubmitting || !name.trim()) return;
    submittingRef.current = true; setIsSubmitting(true);
    try {
      const sNum = isMarketAsset ? parseStrictNumber(shares, 0) : undefined;
      const bNum = isMarketAsset ? parseFormattedAmount(buyPrice) : undefined;
      const cNum = isMarketAsset ? (parseFormattedAmount(currentPrice) || bNum || 0) : undefined;
      const invNum = isMarketAsset ? Math.round((sNum || 0) * (bNum || 0) * 100) / 100 : (parseFormattedAmount(investedAmount) || 0);
      const currNum = isMarketAsset ? Math.round((sNum || 0) * (cNum || 0) * 100) / 100 : (currentAmount ? parseFormattedAmount(currentAmount) : invNum);
      const isFixed = category === 'fixed', fixedStart = isFixed ? (startDate || new Date().toISOString().split('T')[0]) : undefined;
      const fixedDue = isFixed ? (dueDate || calcFutureDate(fixedStart)) : undefined;
      const lots = isMarketAsset && sNum > 0 ? [{ id: `lot-${Date.now()}`, date: startDate || new Date().toISOString().split('T')[0], shares_count: sNum, purchase_price_per_share: bNum || 0, broker_fee: 0 }] : [];

      const payload = {
        id: currentInitial?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`),
        name: name.trim(), ticker: isMarketAsset && ticker ? ticker.toUpperCase().trim() : '',
        assetType: isFixed ? (subType === 'bond' ? 'bond' : 'cdt') : (category === 'crypto' ? 'crypto' : category === 'variable' ? (assetType || 'stock') : (category === 'liquidity' ? 'fund' : 'other')),
        type: isFixed ? 'fixed_income' : undefined, category, subType: isFixed ? subType : undefined, currency,
        institution: institution.trim() || undefined, shares: sNum > 0 ? sNum : undefined, quantity: sNum > 0 ? sNum : undefined,
        buyPrice: bNum > 0 ? bNum : undefined, currentPrice: cNum > 0 ? cNum : undefined,
        investedAmount: invNum, amount: invNum, currentAmount: currNum, currentValue: currNum, lots,
        interestRate: interestRate ? parseFloat(interestRate) : undefined, rate: interestRate ? parseFloat(interestRate) : undefined,
        startDate: fixedStart, dueDate: fixedDue
      };

      if (onSave) await onSave(payload);
      onClose();
    } finally { setIsSubmitting(false); submittingRef.current = false; }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5" /></div>
            <div><h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">{isEditing ? 'Editar inversión' : 'Nueva inversión'}</h3><p className="text-[11px] text-slate-500">Gestiona tus activos y calcula rendimientos</p></div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
            <InvestmentCategoryHeader category={category} onCategoryChange={handleCategoryChange} institution={institution} setInstitution={setInstitution} isEditing={isEditing} />
            {isMarketAsset ? (
              <MarketAssetFields category={category} currency={currency} setCurrency={setCurrency} name={name} setName={setName} ticker={ticker} setTicker={setTicker} shares={shares} setShares={setShares} buyPrice={buyPrice} setBuyPrice={setBuyPrice} currentPrice={currentPrice} setCurrentPrice={setCurrentPrice} assetType={assetType} setAssetType={setAssetType} setCategory={setCategory} isEditing={isEditing} />
            ) : (
              <NonMarketAssetFields category={category} name={name} setName={setName} investedAmount={investedAmount} setInvestedAmount={setInvestedAmount} currentAmount={currentAmount} setCurrentAmount={setCurrentAmount} startDate={startDate} setStartDate={setStartDate} dueDate={dueDate} setDueDate={setDueDate} interestRate={interestRate} setInterestRate={setInterestRate} subType={subType} setSubType={setSubType} handleEstimateCurrentCDT={handleEstimateCurrentCDT} />
            )}
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 rounded-b-3xl">
            <button type="submit" disabled={isSubmitting} className={`w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg transition-all cursor-pointer active:scale-98 flex items-center justify-center text-xs sm:text-sm ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Añadir inversión')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
