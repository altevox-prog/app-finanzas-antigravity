import { useMemo, useCallback } from 'react';
import { INVESTMENT_CATEGORIES } from '../../../data/initialData';
import { calculateAssetMetrics } from '../utils/investmentConsolidation';

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
    return calculateAssetMetrics(asset, livePrices, trm);
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

  const filteredInvestments = useMemo(() => investments.filter((inv) => {
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
    return INVESTMENT_CATEGORIES.map((cat) => {
      const catTotalCOP = investments
        .filter((inv) => inv.status !== 'liquidated' && !inv.isLiquidated && (inv.category === cat.id || inv.assetType === cat.id))
        .reduce((sum, inv) => sum + calculatePositionMetrics(inv).currentValueCOP, 0);
      const percent = portfolioMetrics.totalValueCOP > 0 ? (catTotalCOP / portfolioMetrics.totalValueCOP) * 100 : 0;
      return { ...cat, totalCOP: catTotalCOP, percent: Math.round(percent * 10) / 10 };
    }).filter((cat) => cat.totalCOP > 0 || cat.percent > 0);
  }, [investments, calculatePositionMetrics, portfolioMetrics.totalValueCOP]);

  return { portfolioMetrics, filteredInvestments, groupedInvestments, allocationByCategory, calculatePositionMetrics };
}
