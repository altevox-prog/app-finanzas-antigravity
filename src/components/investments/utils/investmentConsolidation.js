import { convertUSDtoCOP, convertCOPtoUSD } from '../../../utils/financeMath.js';
import { calculateCDTAccruedReturn, calculateCDTMaturityReturn } from '../../../utils/math/investmentMath.js';
import { parseStrictNumber, normalizeLot, getAssetLots, computeLotsSummary } from './investmentLots.js';

export { parseStrictNumber, normalizeLot, getAssetLots, computeLotsSummary };

export const calculateAssetMetrics = (asset, livePrices = {}, trm = 4050) => {
  if (!asset) return {};
  const ticker = (asset.ticker || asset.symbol || (asset.name && asset.name.length <= 6 ? asset.name : '')).toUpperCase().trim();
  const currency = (asset.currency || 'USD').toUpperCase();
  const trmValue = parseStrictNumber(trm, 4050);
  const livePrice = parseStrictNumber(livePrices[ticker], 0);

  const isPrivateLoan = asset.subType === 'private_loan' || asset.assetType === 'loan';
  const isCDT = !isPrivateLoan && (
    asset.assetType === 'cdt' || asset.assetType === 'fixed_income' ||
    asset.category === 'fixed' || asset.category === 'CDT' ||
    asset.subType === 'cdt' || asset.subtype === 'cdt'
  );

  if (isCDT) {
    const invested = parseStrictNumber(asset.investedAmount ?? asset.invested_amount ?? asset.amount ?? asset.buyPrice, 0);
    const rate = parseStrictNumber(asset.interestRate ?? asset.rate, 0);
    const startDate = asset.startDate || asset.start_date || (asset.created_at ? String(asset.created_at).split('T')[0] : '');
    const dueDate = asset.dueDate || asset.due_date;
    const isMatured = Boolean(dueDate) && (new Date().toISOString().split('T')[0] >= dueDate);

    let termDays = 0;
    if (startDate && dueDate) termDays = Math.max(1, Math.round((new Date(dueDate + 'T00:00:00') - new Date(startDate + 'T00:00:00')) / 86400000));
    else if (asset.termDays) termDays = parseStrictNumber(asset.termDays);
    else if (dueDate) termDays = Math.max(1, Math.round((new Date(dueDate + 'T00:00:00') - new Date(asset.created_at || Date.now())) / 86400000));
    termDays = (!termDays || termDays <= 0) ? 180 : termDays;

    const accruedStats = calculateCDTAccruedReturn(invested, rate, startDate, new Date(), 0.04);
    const maturityStats = calculateCDTMaturityReturn(invested, rate, termDays, 0.04);
    const pnlOrigin = isMatured ? maturityStats.netReturn : (accruedStats?.netReturn || 0);

    const totalCostOrigin = invested;
    const currentValueOrigin = invested + pnlOrigin;
    const gainOrigin = pnlOrigin;
    const pnlPercentage = invested > 0 ? (gainOrigin / invested) * 100 : 0;

    const totalCostUSD = currency === 'USD' ? totalCostOrigin : convertCOPtoUSD(totalCostOrigin, trmValue);
    const currentValueUSD = currency === 'USD' ? currentValueOrigin : convertCOPtoUSD(currentValueOrigin, trmValue);
    const totalCostCOP = currency === 'COP' ? totalCostOrigin : convertUSDtoCOP(totalCostOrigin, trmValue);
    const currentValueCOP = currency === 'COP' ? currentValueOrigin : convertUSDtoCOP(currentValueOrigin, trmValue);

    return {
      ticker, shares: 0, buyPrice: invested, currentPrice: currentValueOrigin,
      currency, totalCostOrigin, currentValueOrigin, gainOrigin,
      totalCostUSD, currentValueUSD, pnlUSD: currentValueUSD - totalCostUSD,
      totalCostCOP, currentValueCOP, pnlCOP: currentValueCOP - totalCostCOP,
      pnlPercentage, isPositive: gainOrigin >= 0, lots: [],
      isCDT: true, isMatured, accruedStats, maturityStats, termDays
    };
  }

  const lots = getAssetLots(asset);
  const { totalShares, totalInvested, avgBuyPrice } = computeLotsSummary(lots);

  const hasMarketShares = totalShares > 0;
  const currentUnitPrice = livePrice > 0 ? livePrice : parseStrictNumber(asset.currentPrice ?? asset.unitPrice, avgBuyPrice);

  const totalCostOrigin = hasMarketShares ? totalInvested : parseStrictNumber(asset.investedAmount ?? asset.amount, 0);
  const currentValueOrigin = hasMarketShares
    ? (totalShares * currentUnitPrice)
    : parseStrictNumber(asset.currentAmount ?? asset.currentValue, totalCostOrigin);

  const gainOrigin = currentValueOrigin - totalCostOrigin;
  const pnlPercentage = totalCostOrigin > 0 ? (gainOrigin / totalCostOrigin) * 100 : 0;

  const totalCostUSD = currency === 'USD' ? totalCostOrigin : convertCOPtoUSD(totalCostOrigin, trmValue);
  const currentValueUSD = currency === 'USD' ? currentValueOrigin : convertCOPtoUSD(currentValueOrigin, trmValue);
  const totalCostCOP = currency === 'COP' ? totalCostOrigin : convertUSDtoCOP(totalCostOrigin, trmValue);
  const currentValueCOP = currency === 'COP' ? currentValueOrigin : convertUSDtoCOP(currentValueOrigin, trmValue);

  return {
    ticker, shares: totalShares, buyPrice: avgBuyPrice, currentPrice: currentUnitPrice,
    currency, totalCostOrigin, currentValueOrigin, gainOrigin,
    totalCostUSD, currentValueUSD, pnlUSD: currentValueUSD - totalCostUSD,
    totalCostCOP, currentValueCOP, pnlCOP: currentValueCOP - totalCostCOP,
    pnlPercentage, isPositive: gainOrigin >= 0, lots
  };
};

export const consolidateInvestmentsList = (list = []) => {
  const tickerMap = new Map();
  const nonTickerList = [];

  list.forEach((inv) => {
    if (!inv) return;
    const isPrivateLoan = inv.subType === 'private_loan' || inv.assetType === 'loan';
    const isCDT = !isPrivateLoan && (
      inv.assetType === 'cdt' || inv.assetType === 'fixed_income' ||
      inv.category === 'fixed' || inv.category === 'CDT' ||
      inv.subType === 'cdt' || inv.subtype === 'cdt'
    );
    const rawTicker = (inv.ticker || inv.symbol || '').trim().toUpperCase();
    if (!rawTicker || isCDT || isPrivateLoan) {
      nonTickerList.push(inv);
      return;
    }
    if (!tickerMap.has(rawTicker)) {
      tickerMap.set(rawTicker, { ...inv, lots: getAssetLots(inv) });
    } else {
      const existing = tickerMap.get(rawTicker);
      const combinedLots = [...(existing.lots || []), ...getAssetLots(inv)];
      const { totalShares, totalInvested, avgBuyPrice } = computeLotsSummary(combinedLots);
      tickerMap.set(rawTicker, {
        ...existing,
        lots: combinedLots,
        shares: totalShares,
        quantity: totalShares,
        buyPrice: avgBuyPrice,
        investedAmount: totalInvested,
        invested_amount: totalInvested,
        amount: totalInvested,
        currentPrice: parseStrictNumber(inv.currentPrice, existing.currentPrice) || avgBuyPrice
      });
    }
  });

  const consolidatedMarketAssets = Array.from(tickerMap.values()).map((asset) => {
    const { totalShares, totalInvested, avgBuyPrice } = computeLotsSummary(asset.lots);
    return {
      ...asset, shares: totalShares, quantity: totalShares, buyPrice: avgBuyPrice,
      investedAmount: totalInvested, invested_amount: totalInvested, amount: totalInvested
    };
  });

  return [...consolidatedMarketAssets, ...nonTickerList].sort((a, b) => (
    (a.symbol || a.ticker || a.name || '').localeCompare(b.symbol || b.ticker || b.name || '') || String(a.id).localeCompare(String(b.id))
  ));
};
