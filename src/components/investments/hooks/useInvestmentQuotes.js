import { useState, useCallback, useEffect, useMemo } from 'react';
import { fetchBatchMarketPrices } from '../../../services/marketQuotesService';

/**
 * useInvestmentQuotes
 * Custom hook para la gestión y actualización en vivo de cotizaciones
 * bursátiles y de mercado de los activos del portafolio.
 *
 * @param {Object} params
 * @param {Array} params.investments - Lista de inversiones del usuario
 */
export default function useInvestmentQuotes({ investments = [] } = {}) {
  // Cotizaciones en vivo en tiempo real
  const [livePrices, setLivePrices] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // Clave estable de símbolos cotizables en bolsa para evitar peticiones repetidas innecesarias
  const tickersKey = useMemo(() => {
    if (!Array.isArray(investments)) return '';
    return investments
      .filter(i => {
        const type = i.assetType || i.category;
        return type !== 'cdt' && type !== 'fixed' && type !== 'loan' && i.subType !== 'private_loan' && i.subType !== 'bond';
      })
      .map(i => (i.ticker || i.symbol || (i.name && i.name.length <= 5 && !i.name.includes(' ') ? i.name : '')).toUpperCase().trim())
      .filter(Boolean)
      .sort()
      .join(',');
  }, [investments]);

  // Consulta de cotizaciones en tiempo real
  const handleRefreshQuotes = useCallback(async () => {
    if (!investments || investments.length === 0 || !tickersKey) return;
    setIsRefreshing(true);
    try {
      const quotes = await fetchBatchMarketPrices(investments);
      if (quotes && Object.keys(quotes).length > 0) {
        setLivePrices(prev => ({ ...prev, ...quotes }));
        setLastRefreshedAt(new Date());
      }
    } catch (e) {
      console.warn('Error consultando cotizaciones en vivo:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [investments, tickersKey]);

  // Consulta automática al montar o si cambian los tickers del portafolio
  useEffect(() => {
    if (tickersKey) {
      handleRefreshQuotes();
    }
  }, [tickersKey, handleRefreshQuotes]);

  return {
    livePrices,
    isRefreshing,
    lastRefreshedAt,
    handleRefreshQuotes,
    setLivePrices
  };
}
