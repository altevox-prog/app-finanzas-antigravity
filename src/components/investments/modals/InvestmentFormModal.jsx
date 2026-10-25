import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, X } from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../../utils/currencyFormatter';
import InvestmentCategoryHeader from '../InvestmentCategoryHeader';
import MarketAssetFields from './parts/MarketAssetFields';
import NonMarketAssetFields from './parts/NonMarketAssetFields';
import { calculateCDTAccruedReturn } from '../../../utils/financeMath';

const parseInputNumber = (val) => (!val && val !== 0 ? 0 : (isNaN(parseFloat(String(val).replace(/,/g, '').trim())) ? 0 : parseFloat(String(val).replace(/,/g, '').trim())));
const toDateInputString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val.includes('T') ? val.split('T')[0] : val.slice(0, 10);
  try { const d = new Date(val); return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : ''; } catch { return ''; }
};

export default function InvestmentFormModal({
  isOpen, onClose, onSave, initialInvestment = null, initialData = null, accounts = []
}) {
  useBackHandler(isOpen, onClose);
  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals(), currentInitial = initialInvestment || initialData, isEditing = Boolean(currentInitial);
  const availableAccounts = Array.isArray(accounts) ? accounts.filter((a) => a && !a.isArchived && !a.archived) : [];
  const [name, setName] = useState(''), [ticker, setTicker] = useState(''), [institution, setInstitution] = useState(''), [assetType, setAssetType] = useState('crypto');
  const [category, setCategory] = useState('crypto'), [currency, setCurrency] = useState('USD'), [shares, setShares] = useState(''), [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState(''), [investedAmount, setInvestedAmount] = useState(''), [currentAmount, setCurrentAmount] = useState('');
  const [interestRate, setInterestRate] = useState(''), [startDate, setStartDate] = useState(''), [dueDate, setDueDate] = useState(''), [subType, setSubType] = useState('cdt');
  const [deductFromAccount, setDeductFromAccount] = useState(!isEditing), [originAccountId, setOriginAccountId] = useState(() => availableAccounts[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false); const submittingRef = useRef(false);

  useEffect(() => {
    if (currentInitial) {
      const c = currentInitial, cat = c.category || 'crypto';
      const rawData = typeof c.raw_data === 'string' ? (() => { try { return JSON.parse(c.raw_data || '{}'); } catch { return {}; } })() : (c.raw_data || {});
      const resolvedCurrency = (c.currency || rawData.currency || (['crypto', 'variable'].includes(cat) ? 'USD' : 'COP')).toUpperCase();
      setName(c.name || ''); setTicker(c.ticker || ''); setInstitution(c.institution || '');
      setAssetType(c.assetType || (cat === 'crypto' ? 'crypto' : cat === 'fixed' ? (c.subType === 'bond' ? 'bond' : 'cdt') : 'etf'));
      setCategory(cat); setCurrency(resolvedCurrency);
      setShares(c.shares !== undefined ? String(c.shares) : (c.quantity !== undefined ? String(c.quantity) : ''));
      setBuyPrice(c.buyPrice !== undefined ? String(c.buyPrice) : ''); setCurrentPrice(c.currentPrice !== undefined ? String(c.currentPrice) : '');
      const rawInv = c.investedAmount ?? c.invested_amount ?? c.amount ?? c.totalInvested; setInvestedAmount(rawInv && Number(rawInv) !== 0 ? formatCurrencyInput(rawInv, true) : '');
      const rawCurr = c.currentAmount ?? c.currentValue ?? c.current_value; setCurrentAmount(rawCurr && Number(rawCurr) !== 0 ? formatCurrencyInput(rawCurr, true) : '');
      setInterestRate(c.interestRate !== undefined ? String(c.interestRate) : (c.rate !== undefined ? String(c.rate) : ''));
      const rawStart = c.startDate || c.start_date || rawData.startDate || rawData.start_date || c.issueDate || c.purchaseDate || c.investmentDate || c.date || c.lots?.[0]?.date || c.created_at || c.createdAt;
      setStartDate(toDateInputString(rawStart));
      const rawDue = c.dueDate || c.due_date || rawData.dueDate || rawData.due_date || null;
      setDueDate(rawDue ? toDateInputString(rawDue) : ''); setSubType(c.subType === 'bond' ? 'bond' : 'cdt'); setDeductFromAccount(false);
    } else {
      setName(''); setTicker(''); setInstitution(''); setAssetType('crypto'); setCategory('crypto'); setCurrency('USD');
      setShares(''); setBuyPrice(''); setCurrentPrice(''); setInvestedAmount(''); setCurrentAmount(''); setInterestRate(''); setSubType('cdt');
      setStartDate(''); setDueDate(''); setDeductFromAccount(true);
    }
  }, [initialInvestment, initialData, isOpen, enableDecimals]);

  useEffect(() => {
    if (!isEditing && availableAccounts.length > 0 && (!originAccountId || !availableAccounts.some((a) => a.id === originAccountId))) setOriginAccountId(availableAccounts[0].id);
  }, [availableAccounts, isEditing, originAccountId]);

  const isMarketAsset = ['crypto', 'variable'].includes(category);
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (['fixed', 'liquidity'].includes(newCat)) { setCurrency('COP'); setAssetType(newCat === 'fixed' ? 'cdt' : 'fund'); }
    else { if (!isEditing && currency !== 'USD') setCurrency('USD'); setAssetType(newCat === 'crypto' ? 'crypto' : 'stock'); }
  };
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const resolvedName = (name || ticker || '').trim();
    if (submittingRef.current || isSubmitting || !resolvedName) return;
    submittingRef.current = true; setIsSubmitting(true);
    try {
      const sNum = isMarketAsset ? parseInputNumber(shares) : undefined, bNum = isMarketAsset ? parseInputNumber(buyPrice) : undefined, cNum = isMarketAsset ? (parseInputNumber(currentPrice) || bNum) : undefined;
      const invNum = isMarketAsset ? Math.round(sNum * bNum * 100) / 100 : (parseFormattedAmount(investedAmount) || 0), isFixed = category === 'fixed', isCDT = isFixed && (subType === 'cdt' || assetType === 'cdt'), isCrypto = category === 'crypto';
      const finalStartDate = toDateInputString(startDate) || (isEditing ? toDateInputString(currentInitial?.startDate || currentInitial?.start_date || currentInitial?.created_at) : null);
      const finalDueDate = toDateInputString(dueDate) || (isEditing ? toDateInputString(currentInitial?.dueDate || currentInitial?.due_date) : null);

      let currNum;
      if (isMarketAsset) currNum = Math.round(sNum * cNum * 100) / 100;
      else if (isCDT) {
        const rateVal = parseFloat(interestRate || 0);
        const accrued = (invNum > 0 && rateVal > 0 && finalStartDate) ? calculateCDTAccruedReturn(invNum, rateVal, finalStartDate, new Date(), 0.04) : null;
        currNum = Math.round((accrued?.maturityTotal || invNum) * 100) / 100;
      } else currNum = currentAmount ? parseFormattedAmount(currentAmount) : invNum;

      let resolvedLots = currentInitial?.lots || [];
      if (isEditing && currentInitial?.lots?.length === 1) {
        const lot0 = currentInitial.lots[0];
        resolvedLots = [{ ...lot0, shares_count: sNum > 0 ? sNum : (lot0.shares_count ?? lot0.shares), purchase_price_per_share: bNum > 0 ? bNum : (lot0.purchase_price_per_share ?? lot0.buyPrice ?? 0), date: finalStartDate || lot0.date || new Date().toISOString().split('T')[0] }];
      } else if (isMarketAsset && (!resolvedLots || resolvedLots.length === 0) && sNum > 0 && bNum > 0) {
        resolvedLots = [{ id: `lot-${Date.now()}`, shares_count: sNum, purchase_price_per_share: bNum, date: finalStartDate || new Date().toISOString().split('T')[0] }];
      }

      const finalOriginAccountId = deductFromAccount ? (originAccountId || availableAccounts[0]?.id || null) : null;
      const payload = {
        ...(currentInitial || {}),
        id: currentInitial?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`),
        name: resolvedName, ticker: isMarketAsset && ticker ? ticker.toUpperCase().trim() : (currentInitial?.ticker || ''),
        institution: institution.trim() || currentInitial?.institution || undefined, category, currency: currency.toUpperCase(),
        assetType: isCrypto ? 'crypto' : isFixed ? (subType === 'bond' ? 'bond' : 'cdt') : category === 'variable' ? (assetType || 'stock') : (category === 'liquidity' ? 'fund' : 'other'),
        subType: isFixed ? subType : undefined, type: isCrypto ? 'crypto' : isFixed ? 'fixed_income' : (currentInitial?.type || undefined),
        shares: sNum > 0 ? sNum : undefined, quantity: sNum > 0 ? sNum : undefined, buyPrice: bNum > 0 ? bNum : undefined, currentPrice: cNum > 0 ? cNum : undefined,
        investedAmount: invNum, amount: invNum, currentAmount: currNum, currentValue: currNum,
        interestRate: interestRate ? parseFloat(interestRate) : undefined, rate: interestRate ? parseFloat(interestRate) : undefined,
        startDate: finalStartDate, start_date: finalStartDate, dueDate: finalDueDate, due_date: finalDueDate, lots: resolvedLots,
        originAccountId: finalOriginAccountId, deductFromAccount: !isEditing && deductFromAccount && Boolean(finalOriginAccountId)
      };
      if (isCrypto) { delete payload.subType; delete payload.subtype; }
      if (payload.raw_data && typeof payload.raw_data === 'object') payload.raw_data = { ...payload.raw_data, currency: currency.toUpperCase(), dueDate: finalDueDate, due_date: finalDueDate, startDate: finalStartDate, start_date: finalStartDate };
      if (onSave) await onSave(payload);
      onClose();
    } finally { setIsSubmitting(false); submittingRef.current = false; }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800/90 flex flex-col max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800/90 shrink-0">
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
              <MarketAssetFields category={category} currency={currency} setCurrency={setCurrency} name={name} setName={setName} ticker={ticker} setTicker={setTicker} shares={shares} setShares={setShares} buyPrice={buyPrice} setBuyPrice={setBuyPrice} currentPrice={currentPrice} setCurrentPrice={setCurrentPrice} assetType={assetType} setAssetType={setAssetType} setCategory={setCategory} isEditing={isEditing} startDate={startDate} setStartDate={setStartDate} />
            ) : (
              <NonMarketAssetFields category={category} name={name} setName={setName} investedAmount={investedAmount} setInvestedAmount={setInvestedAmount} currentAmount={currentAmount} setCurrentAmount={setCurrentAmount} startDate={startDate} setStartDate={setStartDate} dueDate={dueDate} setDueDate={setDueDate} interestRate={interestRate} setInterestRate={setInterestRate} subType={subType} setSubType={setSubType} />
            )}
            {!isEditing && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={deductFromAccount} onChange={(e) => setDeductFromAccount(e.target.checked)} className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Descontar capital de una cuenta</span>
                </label>
                {deductFromAccount && (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400">Cuenta de origen *</label>
                    {availableAccounts.length > 0 ? (
                      <select value={originAccountId || availableAccounts[0]?.id || ''} onChange={(e) => setOriginAccountId(e.target.value)} className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer" style={{ backgroundColor: 'var(--bg-input, inherit)', color: 'var(--text-main, inherit)' }}>
                        {availableAccounts.map((acc) => <option key={acc.id} value={acc.id} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-100">{acc.name} ({acc.currency || 'COP'} ${Number(acc.balance || acc.current_balance || 0).toLocaleString('es-CO')})</option>)}
                      </select>
                    ) : <p className="text-[11px] text-amber-500 dark:text-amber-400 font-medium pl-1">No hay cuentas bancarias activas disponibles para debitar.</p>}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-zinc-800/90 bg-white dark:bg-zinc-950 shrink-0 rounded-b-3xl">
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