/**
 * Utilidades base de casting, parsing y redondeo numérico seguro.
 */

export const safeNumber = (val) => {
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val;
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return 0;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number(trimmed);
      if (!isNaN(n) && isFinite(n)) return n;
    }
  }
  return toSafeNumber(val);
};

export const toSafeNumber = (val) => {
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val;
  if (val === null || val === undefined || val === '') return 0;

  let str = String(val).trim();
  if (!/[0-9]/.test(str)) return 0;

  const isNegative = str.startsWith('-') || str.includes('-$') || str.includes('$-');

  str = str.replace(/[^0-9.,-]/g, '');
  if (!str || str === '-') return 0;

  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // Formato COP / Latino: 1.250.500,50 -> 1250500.50
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato US / Internacional: 1,250,500.50 -> 1250500.50
      str = str.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const commaParts = str.split(',');
    if (commaParts.length === 2) {
      str = commaParts[0].replace(/\./g, '') + '.' + commaParts[1];
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    const dotParts = str.split('.');
    if (dotParts.length > 2) {
      str = str.replace(/\./g, '');
    } else if (dotParts.length === 2 && dotParts[1].length === 3 && dotParts[0].length <= 3) {
      // Formato de miles: ej. 1.000 o 50.000
      str = str.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(str);
  if (isNaN(parsed) || !isFinite(parsed)) return 0;
  return isNegative ? -Math.abs(parsed) : Math.abs(parsed);
};

/**
 * Redondeo Financiero para COP (entero estándar, o 2 decimales si está habilitado)
 */
export const roundCOP = (val, allowDecimals = undefined) => {
  const isDecimalsAllowed = allowDecimals !== undefined ? Boolean(allowDecimals) : (() => {
    try {
      if (typeof window === 'undefined') return false;
      const direct = localStorage.getItem('app_enable_decimals');
      if (direct !== null) return direct === 'true';
      const userSettingsRaw = localStorage.getItem('user_settings');
      if (userSettingsRaw) {
        const parsed = JSON.parse(userSettingsRaw);
        const v = parsed?.enable_decimals ?? parsed?.enableDecimals ?? parsed?.showDecimals ?? parsed?.allowDecimals;
        if (v !== undefined && v !== null) return Boolean(v);
      }
      return false;
    } catch {
      return false;
    }
  })();

  const num = toSafeNumber(val);
  if (isDecimalsAllowed) {
    return Number(Math.round(Number(num + 'e2')) + 'e-2');
  }
  return Math.round(num);
};

/**
 * Redondeo Financiero para USD y tasas de interés (2 o 4 decimales inmune a float quirks)
 */
export const roundUSD = (val, decimals = 2) => {
  const num = toSafeNumber(val);
  return Number(Math.round(Number(num + `e${decimals}`)) + `e-${decimals}`);
};

/**
 * Redondeo de porcentajes
 */
export const roundPercentage = (val, decimals = 1) => {
  const num = toSafeNumber(val);
  return Number(Math.round(Number(num + `e${decimals}`)) + `e-${decimals}`);
};
