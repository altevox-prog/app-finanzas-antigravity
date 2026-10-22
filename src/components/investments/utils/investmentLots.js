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
