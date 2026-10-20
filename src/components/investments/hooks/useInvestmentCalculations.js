import { useMemo, useCallback } from 'react';
import { toSafeNumber, convertUSDtoCOP, convertCOPtoUSD } from '../../../utils/financeMath';
import { INVESTMENT_CATEGORIES } from '../../../data/initialData';

const BANK_MATCHERS = [
  ['nu', 'Nu'], ['bancolombia', 'Bancolombia'], ['lulo', 'Lulo Bank'],
  ['davivienda', 'Davivienda'], ['daviplata', 'Davivienda'], ['bbva', 'BBVA'],
  ['tyba', 'Tyba'], ['trii', 'Trii'], ['littio', 'Littio'],
  ['binance', 'Binance'], ['hapi', 'Hapi'], ['pibank', 'Pibank'], ['finandina', 'Finandina']
];

const resolveBank = (inv) => {
  if (inv.institution?.trim()) return inv.institution.trim();
  const lower = (inv.name || '').toLowerCase();
  const match = BANK_MATCHERS.find(([key]) => lower.includes(key));
  return match ? match[1] : 'Otras Entidades';
};

export default function useInvestmentCalculations({
  investments = [], livePrices = {}, selectedCategoryFilter = 'all', viewCurrency = 'COP', trm = 4050
} = {}) {
  const calculatePositionMetrics = useCallback((asset) => {
    if (!asset) return {};
    const ticker = (asset.ticker || asset.symbol || (asset.name && asset.name.length <= 6 ? asset.name : '')).toUpperCase().trim();
    const livePrice = livePrices[ticker];
    const rawInvested = toSafeNumber(asset.investedAmount ?? asset.invested_amount ?? asset.amount ?? asset.totalInvested);
    const rawCurrent = toSafeNumber(asset.currentAmount ?? asset.currentValue ?? asset.current_value);
    const shares = asset.shares && Number(asset.shares) > 0 ? toSafeNumber(asset.shares) : 0;

    let buyPrice = toSafeNumber(asset.buyPrice || asset.purchasePrice);
    if (buyPrice === 0 && shares > 0 && rawInvested > 0) buyPrice = rawInvested / shares;

    let currentPrice = toSafeNumber(livePrice || asset.currentPrice || asset.unitPrice);
    if (currentPrice === 0 && shares > 0 && rawCurrent > 0) currentPrice = rawCurrent / shares;
    else if (currentPrice === 0 && buyPrice > 0) currentPrice = buyPrice;

    const currency = asset.currency || 'USD', trmValue = toSafeNumber(trm) || 4050;
    const totalCostOrigin = rawInvested > 0 ? rawInvested : (shares > 0 && buyPrice > 0 ? shares * buyPrice : 0);

    let currentValueOrigin = rawCurrent > 0 ? rawCurrent : totalCostOrigin;
    if (livePrice && shares > 0) currentValueOrigin = shares * livePrice;
    else if (rawCurrent === 0 && shares > 0 && currentPrice > 0) currentValueOrigin = shares * currentPrice;

    const totalCostUSD = currency === 'USD' ? totalCostOrigin : convertCOPtoUSD(totalCostOrigin, trmValue);
    const currentValueUSD = currency === 'USD' ? currentValueOrigin : convertCOPtoUSD(currentValueOrigin, trmValue);
    const pnlUSD = currentValueUSD - totalCostUSD;

    const totalCostCOP = currency === 'COP' ? totalCostOrigin : convertUSDtoCOP(totalCostOrigin, trmValue);
    const currentValueCOP = currency === 'COP' ? currentValueOrigin : convertUSDtoCOP(currentValueOrigin, trmValue);
    const pnlCOP = currentValueCOP - totalCostCOP;
    const pnlPercentage = totalCostOrigin > 0 ? ((currentValueOrigin - totalCostOrigin) / totalCostOrigin) * 100 : 0;

    return {
      ticker, shares, buyPrice, currentPrice, currency,
      totalCostOrigin, currentValueOrigin,
      totalCostUSD, currentValueUSD, pnlUSD,
      totalCostCOP, currentValueCOP, pnlCOP,
      pnlPercentage, isPositive: pnlPercentage >= 0
    };
  }, [livePrices, trm]);

  const portfolioMetrics = useMemo(() => {
    let totalValueCOP = 0, totalCostCOP = 0, totalValueUSD = 0, totalCostUSD = 0;
    investments.forEach((inv) => {
      if (inv.status === 'liquidated' || inv.isLiquidated) return;
      const m = calculatePositionMetrics(inv);
      totalValueCOP += m.currentValueCOP;
      totalCostCOP += m.totalCostCOP;
      totalValueUSD += m.currentValueUSD;
      totalCostUSD += m.totalCostUSD;
    });
    const netGainCOP = totalValueCOP - totalCostCOP, netGainUSD = totalValueUSD - totalCostUSD;
    const totalPercentage = totalCostCOP > 0 ? (netGainCOP / totalCostCOP) * 100 : 0;
    return { totalValueCOP, totalCostCOP, totalValueUSD, totalCostUSD, netGainCOP, netGainUSD, totalPercentage, isPositive: netGainCOP >= 0 };
  }, [investments, calculatePositionMetrics]);

  const filteredInvestments = useMemo(() => investments.filter(inv => {
    if (inv.status === 'liquidated' || inv.isLiquidated) return false;
    return selectedCategoryFilter === 'all' || inv.category === selectedCategoryFilter || inv.assetType === selectedCategoryFilter;
  }), [investments, selectedCategoryFilter]);

  const groupedInvestments = useMemo(() => {
    return filteredInvestments.reduce((acc, inv) => {
      const bank = resolveBank(inv);
      if (!acc[bank]) acc[bank] = { bank, items: [], totalInvestedCOP: 0, currentValueCOP: 0, totalInvestedUSD: 0, currentValueUSD: 0 };
      const m = calculatePositionMetrics(inv);
      acc[bank].items.push({ ...inv, metrics: m });
      acc[bank].totalInvestedCOP += m.totalCostCOP;
      acc[bank].currentValueCOP += m.currentValueCOP;
      acc[bank].totalInvestedUSD += m.totalCostUSD;
      acc[bank].currentValueUSD += m.currentValueUSD;
      return acc;
    }, {});
  }, [filteredInvestments, calculatePositionMetrics]);

  const allocationByCategory = useMemo(() => {
    return INVESTMENT_CATEGORIES.map(cat => {
      const catTotalCOP = investments
        .filter(inv => inv.status !== 'liquidated' && !inv.isLiquidated && (inv.category === cat.id || inv.assetType === cat.id))
        .reduce((sum, inv) => sum + calculatePositionMetrics(inv).currentValueCOP, 0);
      const percent = portfolioMetrics.totalValueCOP > 0 ? (catTotalCOP / portfolioMetrics.totalValueCOP) * 100 : 0;
      return { ...cat, totalCOP: catTotalCOP, percent: Math.round(percent * 10) / 10 };
    }).filter(cat => cat.totalCOP > 0 || cat.percent > 0);
  }, [investments, calculatePositionMetrics, portfolioMetrics.totalValueCOP]);

  return { portfolioMetrics, filteredInvestments, groupedInvestments, allocationByCategory, calculatePositionMetrics };
}
