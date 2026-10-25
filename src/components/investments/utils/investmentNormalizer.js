import { toSafeNumber } from '../../../utils/financeMath.js';
import { ensureUUID } from '../../../services/syncEngine.js';
import { normalizeRemoteInvestment } from '../../../services/sync/syncNormalizers.js';
import { getAssetLots, computeLotsSummary, normalizeLot, parseStrictNumber } from './investmentConsolidation.js';

const pickNum = (...cands) => {
  for (const c of cands) { const n = parseStrictNumber(c, 0); if (n > 0) return n; }
  return 0;
};

export function sanitizeInvestment(inv) {
  if (!inv || typeof inv !== 'object') return inv;
  const raw = typeof inv.raw_data === 'string' ? (() => { try { return JSON.parse(inv.raw_data); } catch { return {}; } })() : (inv.raw_data || {});
  const norm = normalizeRemoteInvestment({ ...raw, ...inv });
  const baseLots = getAssetLots({ ...norm, ...inv, raw_data: raw });
  const { totalShares, totalInvested, avgBuyPrice } = computeLotsSummary(baseLots);

  const finalShares = totalShares > 0 ? totalShares : parseStrictNumber(inv.shares ?? inv.quantity ?? norm.shares, 0);
  const finalBuyPrice = avgBuyPrice > 0 ? avgBuyPrice : parseStrictNumber(inv.buyPrice ?? norm.buyPrice, 0);
  const investedAmount = totalInvested > 0 ? totalInvested : parseStrictNumber(norm.investedAmount || norm.amount, 0);
  const foundPrice = [raw.currentPrice, inv.currentPrice, norm.currentPrice, raw.current_price, inv.current_price, norm.current_price].map((p) => parseStrictNumber(p, 0)).find((p) => p > 0);
  const currentPrice = foundPrice > 0 ? foundPrice : finalBuyPrice;

  const rawCurr = raw.currency || (typeof inv.raw_data === 'string' ? (() => { try { return JSON.parse(inv.raw_data || '{}')?.currency; } catch { return null; } })() : inv.raw_data?.currency);
  const finalCurrency = (inv.currency || norm.currency || rawCurr || (['crypto', 'variable', 'stock', 'etf'].includes(norm.category || inv.category) ? 'USD' : 'COP')).toUpperCase();
  const finalDueDate = inv.dueDate || inv.due_date || norm.dueDate || norm.due_date || raw.dueDate || raw.due_date || null;
  const finalStartDate = inv.startDate || inv.start_date || norm.startDate || norm.start_date || raw.startDate || raw.start_date || null;

  const isFixed = norm.category === 'fixed' || norm.subtype === 'cdt' || inv.category === 'fixed' || inv.subtype === 'cdt';
  const currentAmount = (finalShares > 0 && currentPrice > 0)
    ? finalShares * currentPrice
    : isFixed
      ? (pickNum(raw.currentAmount, norm.currentAmount, raw.currentValue, norm.currentValue) || investedAmount)
      : (pickNum(raw.currentAmount, norm.currentAmount, raw.currentValue, norm.currentValue) || parseStrictNumber(norm.currentAmount || norm.currentValue, investedAmount));

  return {
    ...inv, ...raw, ...norm,
    id: inv.id || norm.id || raw.id || crypto.randomUUID(),
    name: inv.name || norm.name || raw.name || 'Inversión',
    ticker: (inv.ticker || norm.ticker || raw.ticker || '').toUpperCase().trim() || null,
    category: norm.category || 'fixed',
    assetType: norm.assetType || (norm.category === 'fixed' ? 'cdt' : 'other'),
    type: norm.type || 'fixed_income',
    subtype: norm.subtype || 'cdt',
    currency: finalCurrency,
    quantity: finalShares,
    shares: finalShares,
    buyPrice: finalBuyPrice,
    currentPrice,
    current_price: currentPrice,
    lots: baseLots,
    rate: Number(norm.rate ?? inv.rate ?? 0),
    interestRate: Number(norm.interestRate ?? inv.interestRate ?? norm.rate ?? 0),
    institution: inv.institution || norm.institution || null,
    issueDate: inv.issueDate || inv.issue_date || null,
    dueDate: finalDueDate,
    due_date: finalDueDate,
    startDate: finalStartDate,
    start_date: finalStartDate,
    status: norm.status || inv.status || raw.status || 'active',
    isLiquidated: Boolean(norm.isLiquidated || inv.isLiquidated || raw.isLiquidated || norm.status === 'liquidated' || inv.status === 'liquidated' || raw.status === 'liquidated'),
    liquidatedAt: norm.liquidatedAt || inv.liquidatedAt || raw.liquidatedAt || null,
    liquidatedAmount: pickNum(norm.liquidatedAmount, inv.liquidatedAmount, raw.liquidatedAmount, 0),
    liquidatedAccountId: norm.liquidatedAccountId || inv.liquidatedAccountId || raw.liquidatedAccountId || null,
    investedAmount, invested_amount: investedAmount, amount: investedAmount, totalInvested: investedAmount,
    currentAmount, currentValue: currentAmount, current_value: currentAmount,
    created_at: inv.created_at || norm.created_at || new Date().toISOString(),
    updated_at: inv.updated_at || norm.updated_at || new Date().toISOString()
  };
}

export function mapInvestmentToSupabasePayload(inv, userId) {
  const cleanId = ensureUUID(inv.id);
  const nowIso = new Date().toISOString();
  const lots = (inv.lots || []).map((l) => normalizeLot(l, cleanId));
  const { totalShares, totalInvested, avgBuyPrice } = computeLotsSummary(lots);
  const invested = totalInvested > 0 ? totalInvested : toSafeNumber(inv.investedAmount ?? inv.amount);
  const current = totalShares > 0 && inv.currentPrice > 0 ? totalShares * inv.currentPrice : toSafeNumber(inv.currentAmount ?? invested);
  const finalCurrency = (inv.currency || 'USD').toUpperCase();
  const dueDateVal = inv.dueDate || inv.due_date || null;
  const startDateVal = inv.startDate || inv.start_date || null;

  return {
    id: cleanId,
    user_id: userId,
    name: inv.name || 'Inversión',
    ticker: inv.ticker ? inv.ticker.toUpperCase().trim() : null,
    category: inv.category || inv.assetType || 'stock',
    raw_data: {
      ...(typeof inv.raw_data === 'object' && inv.raw_data !== null ? inv.raw_data : {}),
      quantity: totalShares > 0 ? totalShares : toSafeNumber(inv.quantity || inv.shares),
      shares: totalShares > 0 ? totalShares : toSafeNumber(inv.shares || inv.quantity),
      buyPrice: avgBuyPrice > 0 ? avgBuyPrice : toSafeNumber(inv.buyPrice || inv.purchasePrice),
      currentPrice: toSafeNumber(inv.currentPrice || inv.unitPrice || avgBuyPrice),
      lots,
      rate: toSafeNumber(inv.rate ?? inv.interestRate),
      interestRate: toSafeNumber(inv.interestRate ?? inv.rate),
      institution: inv.institution || null,
      startDate: startDateVal,
      start_date: startDateVal,
      dueDate: dueDateVal,
      due_date: dueDateVal,
      subtype: inv.subtype || inv.subType || inv.type || 'stock',
      subType: inv.subType || inv.subtype || inv.type || 'stock',
      assetType: inv.assetType || inv.asset_type || inv.category || 'other',
      currency: finalCurrency,
      investedAmount: invested,
      currentAmount: current,
      status: inv.status || 'active',
      isLiquidated: Boolean(inv.isLiquidated || inv.status === 'liquidated'),
      liquidatedAt: inv.liquidatedAt || null,
      liquidatedAmount: toSafeNumber(inv.liquidatedAmount),
      liquidatedAccountId: inv.liquidatedAccountId || null
    },
    updated_at: nowIso
  };
}

export function applyNewLot(asset, lot) {
  const normLot = normalizeLot(lot, asset.id);
  const nextLots = [...(asset.lots || []), normLot];
  const { totalShares, totalInvested, avgBuyPrice } = computeLotsSummary(nextLots);
  const curPrice = parseStrictNumber(asset.currentPrice, avgBuyPrice);
  const curAmount = totalShares * curPrice;

  return {
    ...asset,
    lots: nextLots,
    shares: totalShares,
    quantity: totalShares,
    buyPrice: avgBuyPrice,
    investedAmount: totalInvested,
    invested_amount: totalInvested,
    amount: totalInvested,
    currentAmount: curAmount,
    currentValue: curAmount,
    current_value: curAmount
  };
}

export function applyDeleteLot(asset, lotId) {
  const nextLots = (asset.lots || []).filter((l) => l.id !== lotId);
  const { totalShares, totalInvested, avgBuyPrice } = computeLotsSummary(nextLots);
  const curPrice = parseStrictNumber(asset.currentPrice, avgBuyPrice);
  const curAmount = totalShares * curPrice;

  return {
    ...asset,
    lots: nextLots,
    shares: totalShares,
    quantity: totalShares,
    buyPrice: avgBuyPrice,
    investedAmount: totalInvested,
    invested_amount: totalInvested,
    amount: totalInvested,
    currentAmount: curAmount,
    currentValue: curAmount,
    current_value: curAmount
  };
}
