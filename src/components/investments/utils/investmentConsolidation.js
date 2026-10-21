import { toSafeNumber, convertUSDtoCOP, convertCOPtoUSD } from '../../../utils/financeMath.js';

export const parseStrictNumber = (val, fb = 0) => {
  if (val === null || val === undefined || val === '') return fb;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? fb : val;
  const clean = String(val).replace(/,/g, '.').trim();
  const n = parseFloat(clean);
  return isNaN(n) || !isFinite(n) ? fb : n;
};

export const normalizeLot = (lot, assetId) => ({
  id: lot.id || `lot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  asset_id: assetId || lot.asset_id,
  date: lot.date || new Date().toISOString().split('T')[0],
  shares_count: parseStrictNumber(lot.shares_count ?? lot.shares ?? lot.quantity, 0),
  purchase_price_per_share: parseStrictNumber(lot.purchase_price_per_share ?? lot.buyPrice ?? lot.price, 0),
  broker_fee: parseStrictNumber(lot.broker_fee ?? lot.fee, 0),
  notes: lot.notes || ''
});

export const getAssetLots = (asset) => {
  if (Array.isArray(asset.lots) && asset.lots.length > 0) {
    return asset.lots.map((l) => normalizeLot(l, asset.id));
  }
  const rawLots = asset.raw_data?.lots;
  if (Array.isArray(rawLots) && rawLots.length > 0) {
    return rawLots.map((l) => normalizeLot(l, asset.id));
  }
  const shares = parseStrictNumber(asset.shares ?? asset.quantity, 0);
  const buyPrice = parseStrictNumber(asset.buyPrice ?? asset.purchasePrice, 0);
  const invested = parseStrictNumber(asset.investedAmount ?? asset.invested_amount ?? asset.amount, 0);
  const resolvedPrice = buyPrice > 0 ? buyPrice : (shares > 0 && invested > 0 ? invested / shares : 0);
  if (shares > 0 || resolvedPrice > 0) {
    return [normalizeLot({
      id: `${asset.id}-initial-lot`,
      asset_id: asset.id,
      date: asset.startDate || asset.date || String(asset.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
      shares_count: shares > 0 ? shares : 1,
      purchase_price_per_share: resolvedPrice,
      broker_fee: parseStrictNumber(asset.broker_fee ?? asset.brokerFee, 0)
    }, asset.id)];
  }
  return [];
};

export const computeLotsSummary = (lots = []) => {
  let totalShares = 0;
  let totalInvested = 0;
  lots.forEach((lot) => {
    const s = parseStrictNumber(lot.shares_count, 0);
    const p = parseStrictNumber(lot.purchase_price_per_share, 0);
    const fee = parseStrictNumber(lot.broker_fee, 0);
    totalShares += s;
    totalInvested += (s * p) + fee;
  });
  const avgBuyPrice = totalShares > 0 ? totalInvested / totalShares : 0;
  return { totalShares, totalInvested, avgBuyPrice };
};

export const calculateAssetMetrics = (asset, livePrices = {}, trm = 4050) => {
  if (!asset) return {};
  const ticker = (asset.ticker || asset.symbol || (asset.name && asset.name.length <= 6 ? asset.name : '')).toUpperCase().trim();
  const currency = (asset.currency || 'USD').toUpperCase();
  const trmValue = parseStrictNumber(trm, 4050);
  const livePrice = parseStrictNumber(livePrices[ticker], 0);

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
    const rawTicker = (inv.ticker || inv.symbol || '').trim().toUpperCase();
    if (!rawTicker) {
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
      ...asset,
      shares: totalShares,
      quantity: totalShares,
      buyPrice: avgBuyPrice,
      investedAmount: totalInvested,
      invested_amount: totalInvested,
      amount: totalInvested
    };
  });

  return [...consolidatedMarketAssets, ...nonTickerList];
};
