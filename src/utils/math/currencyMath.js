import { toSafeNumber } from './mathHelpers';

/**
 * Conversión Multidivisa (TRM)
 * USD a COP: Valor COP = Valor USD * TRM (¡Multiplicación estricta, nunca división!)
 * COP a USD: Valor USD = Valor COP / TRM
 */
export const convertUSDtoCOP = (amountUSD, trm = 4050) => {
  const usd = toSafeNumber(amountUSD);
  const rate = toSafeNumber(trm) || 4050;
  return usd * rate;
};

export const convertEURtoCOP = (amountEUR, trm = 4050) => {
  const eur = toSafeNumber(amountEUR);
  const rate = toSafeNumber(trm) || 4050;
  const eurRate = Math.round(rate * 1.08);
  return eur * eurRate;
};

export const convertCOPtoUSD = (amountCOP, trm = 4050) => {
  const cop = toSafeNumber(amountCOP);
  const rate = toSafeNumber(trm) || 4050;
  return cop / (rate || 1);
};

export const convertCOPtoEUR = (amountCOP, trm = 4050) => {
  const cop = toSafeNumber(amountCOP);
  const rate = toSafeNumber(trm) || 4050;
  const eurRate = Math.round(rate * 1.08);
  return cop / (eurRate || 1);
};

/**
 * Módulo DIAN y Topes de Renta
 * Multiplicación oficial: Tope = UVT * Valor UVT
 * Progreso en CSS: Math.min(100, Math.max(0, porcentaje))
 */
export const calculateUVTThreshold = (thresholdUVT, uvtValue) => {
  return toSafeNumber(thresholdUVT) * toSafeNumber(uvtValue);
};

export const calculateTaxProgressPercentage = (currentAmount, thresholdAmount) => {
  const curr = toSafeNumber(currentAmount);
  const thresh = toSafeNumber(thresholdAmount);
  if (thresh <= 0) return 0;
  const raw = (curr / thresh) * 100;
  return Math.min(100, Math.max(0, Number(raw.toFixed(1))));
};
