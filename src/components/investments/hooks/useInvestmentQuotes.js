import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { fetchBatchMarketPrices } from '../../../services/marketQuotesService';

export default function useInvestmentQuotes({ investments = [] } = {}) {
  const [livePrices, setLivePrices] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const investmentsRef = useRef(investments);
  investmentsRef.current = investments;

  const symbolsSignature = Array.isArray(investments)
    ? investments.map((i) => `${i.id || ''}:${i.ticker || i.symbol || i.name || ''}`).sort().join('|')
    : '';

  const symbolsKey = useMemo(() => {
    if (!Array.isArray(investmentsRef.current)) return '';
    return investmentsRef.current
      .filter((i) => {
        const type = i.assetType || i.category;
        return type !== 'cdt' && type !== 'fixed' && type !== 'loan' && i.subType !== 'private_loan' && i.subType !== 'bond';
      })
      .map((i) => (i.ticker || i.symbol || (i.name && i.name.length <= 5 && !i.name.includes(' ') ? i.name : '') || i.id).toUpperCase().trim())
      .filter(Boolean)
      .sort()
      .join(',');
  }, [symbolsSignature]);

  const handleRefreshQuotes = useCallback(async () => {
    const list = investmentsRef.current;
    if (!list || list.length === 0 || !symbolsKey) return;
    setIsRefreshing(true);
    try {
      const quotes = await fetchBatchMarketPrices(list);
      if (quotes && Object.keys(quotes).length > 0) {
        setLivePrices((prev) => ({ ...prev, ...quotes }));
        setLastRefreshedAt(new Date());
      }
    } catch (e) {
      console.warn('Error consultando cotizaciones en vivo:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [symbolsKey]);

  useEffect(() => {
    if (symbolsKey) {
      handleRefreshQuotes();
    }
  }, [symbolsKey, handleRefreshQuotes]);

  return {
    livePrices,
    isRefreshing,
    lastRefreshedAt,
    handleRefreshQuotes,
    setLivePrices
  };
}
