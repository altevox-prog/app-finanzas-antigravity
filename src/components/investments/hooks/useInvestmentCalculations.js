import { useMemo, useCallback } from 'react';
import { 
  toSafeNumber, 
  convertUSDtoCOP, 
  convertCOPtoUSD 
} from '../../../utils/financeMath';
import { INVESTMENT_CATEGORIES } from '../../../data/initialData';

/**
 * useInvestmentCalculations
 * Custom hook memoizado para centralizar cálculos matemáticos de métricas globales del portafolio,
 * filtros por categoría, agrupación por entidad financiera y distribución porcentual.
 *
 * @param {Object} params
 * @param {Array} params.investments - Lista de inversiones del usuario
 * @param {Object} params.livePrices - Mapa de cotizaciones en tiempo real por ticker
 * @param {string} params.selectedCategoryFilter - Categoría seleccionada ('all' o id específico)
 * @param {string} params.viewCurrency - Divisa de visualización ('COP' | 'USD')
 * @param {number} params.trm - Tasa Representativa del Mercado oficial (COP por USD)
 */
export default function useInvestmentCalculations({
  investments = [],
  livePrices = {},
  selectedCategoryFilter = 'all',
  viewCurrency = 'COP',
  trm = 4050
} = {}) {

  /**
   * Calcula las métricas individuales de cada posición de inversión
   * (PnL, Costo Total, Valor Actual, normalización a COP y USD)
   */
  const calculatePositionMetrics = useCallback((asset) => {
    if (!asset) return {};
    const ticker = (asset.ticker || asset.symbol || (asset.name && asset.name.length <= 6 ? asset.name : '')).toUpperCase().trim();
    const livePrice = livePrices[ticker];
    
    // Precio actual: prioriza cotización en vivo si existe
    const currentPrice = toSafeNumber(
      livePrice || 
      asset.currentPrice || 
      asset.unitPrice || 
      (asset.shares > 0 && asset.currentAmount > 0 ? asset.currentAmount / asset.shares : asset.buyPrice) || 
      (asset.investedAmount && asset.shares ? asset.investedAmount / asset.shares : 0)
    );

    const buyPrice = toSafeNumber(
      asset.buyPrice || 
      (asset.shares > 0 && asset.investedAmount > 0 ? asset.investedAmount / asset.shares : currentPrice) || 
      0
    );

    const shares = toSafeNumber(
      asset.shares || 
      (buyPrice > 0 ? toSafeNumber(asset.investedAmount || asset.currentAmount) / buyPrice : 1)
    );

    const currency = asset.currency || 'USD';
    const trmValue = toSafeNumber(trm) || 4050;

    // Valores en moneda de origen
    const totalCostOrigin = shares > 0 && buyPrice > 0 
      ? (shares * buyPrice) 
      : toSafeNumber(asset.investedAmount);

    const currentValueOrigin = shares > 0 && currentPrice > 0 
      ? (shares * currentPrice) 
      : toSafeNumber(asset.currentAmount || totalCostOrigin);

    // Normalización en USD (Usa convertCOPtoUSD si origen es COP)
    const totalCostUSD = currency === 'USD' ? totalCostOrigin : convertCOPtoUSD(totalCostOrigin, trmValue);
    const currentValueUSD = currency === 'USD' ? currentValueOrigin : convertCOPtoUSD(currentValueOrigin, trmValue);
    const pnlUSD = currentValueUSD - totalCostUSD;

    // Normalización en COP usando la TRM oficial (¡Multiplicación estricta para USD a COP!)
    const totalCostCOP = currency === 'COP' ? totalCostOrigin : convertUSDtoCOP(totalCostOrigin, trmValue);
    const currentValueCOP = currency === 'COP' ? currentValueOrigin : convertUSDtoCOP(currentValueOrigin, trmValue);
    const pnlCOP = currentValueCOP - totalCostCOP;

    // Rendimiento porcentual
    const pnlPercentage = totalCostOrigin > 0 ? ((currentValueOrigin - totalCostOrigin) / totalCostOrigin) * 100 : 0;
    const isPositive = pnlPercentage >= 0;

    return {
      ticker,
      shares,
      buyPrice,
      currentPrice,
      currency,
      totalCostOrigin,
      currentValueOrigin,
      totalCostUSD,
      currentValueUSD,
      pnlUSD,
      totalCostCOP,
      currentValueCOP,
      pnlCOP,
      pnlPercentage,
      isPositive
    };
  }, [livePrices, trm]);

  // Cálculo consolidado de todo el portafolio de inversiones
  const portfolioMetrics = useMemo(() => {
    let totalValueCOP = 0;
    let totalCostCOP = 0;
    let totalValueUSD = 0;
    let totalCostUSD = 0;

    investments.forEach((inv) => {
      if (inv.status === 'liquidated' || inv.isLiquidated) return;
      const m = calculatePositionMetrics(inv);
      totalValueCOP += m.currentValueCOP;
      totalCostCOP += m.totalCostCOP;
      totalValueUSD += m.currentValueUSD;
      totalCostUSD += m.totalCostUSD;
    });

    const netGainCOP = totalValueCOP - totalCostCOP;
    const netGainUSD = totalValueUSD - totalCostUSD;
    const totalPercentage = totalCostCOP > 0 ? (netGainCOP / totalCostCOP) * 100 : 0;

    return {
      totalValueCOP,
      totalCostCOP,
      totalValueUSD,
      totalCostUSD,
      netGainCOP,
      netGainUSD,
      totalPercentage,
      isPositive: netGainCOP >= 0
    };
  }, [investments, calculatePositionMetrics]);

  // Inversiones filtradas según categoría
  const filteredInvestments = useMemo(() => {
    return investments.filter(inv => {
      if (inv.status === 'liquidated' || inv.isLiquidated) return false;
      if (selectedCategoryFilter === 'all') return true;
      return inv.category === selectedCategoryFilter || inv.assetType === selectedCategoryFilter;
    });
  }, [investments, selectedCategoryFilter]);

  // Agrupación de Inversiones por Entidad / Banco
  const groupedInvestments = useMemo(() => {
    return filteredInvestments.reduce((acc, inv) => {
      let bank = inv.institution?.trim();
      if (!bank && inv.name) {
        const lowerName = inv.name.toLowerCase();
        if (lowerName.includes('nu') || lowerName.includes('cuenta nu')) bank = 'Nu';
        else if (lowerName.includes('bancolombia')) bank = 'Bancolombia';
        else if (lowerName.includes('lulo')) bank = 'Lulo Bank';
        else if (lowerName.includes('davivienda') || lowerName.includes('daviplata')) bank = 'Davivienda';
        else if (lowerName.includes('bbva')) bank = 'BBVA';
        else if (lowerName.includes('tyba')) bank = 'Tyba';
        else if (lowerName.includes('trii')) bank = 'Trii';
        else if (lowerName.includes('littio')) bank = 'Littio';
        else if (lowerName.includes('binance')) bank = 'Binance';
        else if (lowerName.includes('hapi')) bank = 'Hapi';
        else if (lowerName.includes('pibank')) bank = 'Pibank';
        else if (lowerName.includes('finandina')) bank = 'Finandina';
      }
      if (!bank) bank = 'Otras Entidades';

      if (!acc[bank]) {
        acc[bank] = {
          bank,
          items: [],
          totalInvestedCOP: 0,
          currentValueCOP: 0,
          totalInvestedUSD: 0,
          currentValueUSD: 0
        };
      }
      const m = calculatePositionMetrics(inv);
      acc[bank].items.push({ ...inv, metrics: m });
      acc[bank].totalInvestedCOP += m.totalCostCOP;
      acc[bank].currentValueCOP += m.currentValueCOP;
      acc[bank].totalInvestedUSD += m.totalCostUSD;
      acc[bank].currentValueUSD += m.currentValueUSD;
      return acc;
    }, {});
  }, [filteredInvestments, calculatePositionMetrics]);

  // Distribución de activos por categoría
  const allocationByCategory = useMemo(() => {
    return INVESTMENT_CATEGORIES.map(cat => {
      const catTotalCOP = investments
        .filter(inv => inv.status !== 'liquidated' && !inv.isLiquidated)
        .filter(inv => inv.category === cat.id || inv.assetType === cat.id)
        .reduce((sum, inv) => {
          const m = calculatePositionMetrics(inv);
          return sum + m.currentValueCOP;
        }, 0);

      const percent = portfolioMetrics.totalValueCOP > 0 
        ? (catTotalCOP / portfolioMetrics.totalValueCOP) * 100 
        : 0;

      return {
        ...cat,
        totalCOP: catTotalCOP,
        percent: Math.round(percent * 10) / 10
      };
    }).filter(cat => cat.totalCOP > 0 || cat.percent > 0);
  }, [investments, calculatePositionMetrics, portfolioMetrics.totalValueCOP]);

  return {
    portfolioMetrics,
    filteredInvestments,
    groupedInvestments,
    allocationByCategory,
    calculatePositionMetrics
  };
}
