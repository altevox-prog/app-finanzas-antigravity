/**
 * currencyFormatter.js
 * Formateo y parseo de montos con soporte opcional de decimales.
 * Formato: Miles con Coma (,), Decimales con Punto (.).
 */

export function getEnableDecimals() {
  try {
    if (typeof window === 'undefined') return false;
    const direct = localStorage.getItem('app_enable_decimals');
    if (direct !== null) return direct === 'true';
    const raw = localStorage.getItem('user_settings');
    if (raw) {
      const p = JSON.parse(raw);
      const val = p?.enable_decimals ?? p?.enableDecimals ?? p?.showDecimals ?? p?.allowDecimals;
      if (val != null) return Boolean(val);
    }
  } catch {}
  return false;
}

export function setEnableDecimals(enabled) {
  const next = Boolean(enabled);
  try {
    localStorage.setItem('app_enable_decimals', String(next));
    const raw = localStorage.getItem('user_settings');
    const cur = raw ? JSON.parse(raw) : {};
    cur.enable_decimals = cur.enableDecimals = cur.showDecimals = cur.allowDecimals = next;
    localStorage.setItem('user_settings', JSON.stringify(cur));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_decimals_changed', { detail: { enableDecimals: next } }));
  }
}

/**
 * Formatea una cadena o número entero con comas como separadores de miles
 */
export function formatIntegerWithCommas(intStr) {
  if (intStr == null) return '';
  const clean = String(intStr).replace(/\D/g, '');
  if (!clean) return '';
  return clean.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export const formatIntegerWithDots = formatIntegerWithCommas;

/**
 * Formatea en tiempo real el valor de un input de moneda.
 */
export function formatCurrencyInput(value, allowDecimals = undefined) {
  const isDecimalsAllowed = allowDecimals !== undefined ? Boolean(allowDecimals) : getEnableDecimals();
  if (value == null || value === '') return '';

  if (typeof value === 'number') {
    if (isNaN(value)) return '';
    if (!isDecimalsAllowed || Math.round(value) === value) return formatIntegerWithCommas(Math.round(value));
    const [intPart, decPart] = String(value).split('.');
    return `${formatIntegerWithCommas(intPart) || '0'}.${(decPart || '').slice(0, 2)}`;
  }

  const str = String(value).trim();
  if (!str) return '';

  if (!isDecimalsAllowed) {
    const parts = str.split(/[.,]/);
    return formatIntegerWithCommas(parts.length === 2 && parts[1].length <= 2 ? parts[0] : str);
  }

  // Si termina en delimitador decimal
  if (str.endsWith('.') || str.endsWith(',')) {
    const cleanBefore = str.slice(0, -1).replace(/\D/g, '');
    return `${formatIntegerWithCommas(cleanBefore) || '0'}.`;
  }

  // Si contiene punto (.)
  if (str.includes('.')) {
    const dotIdx = str.indexOf('.');
    const parteEntera = formatIntegerWithCommas(str.slice(0, dotIdx).replace(/\D/g, '')) || '0';
    const rawDec = str.slice(dotIdx + 1).replace(/\D/g, '').slice(0, 2);
    return rawDec !== '' ? `${parteEntera}.${rawDec}` : `${parteEntera}.`;
  }

  // Si contiene coma (,)
  if (str.includes(',')) {
    if (str.startsWith(',') || str.startsWith('0,')) {
      return `0.${str.slice(str.indexOf(',') + 1).replace(/\D/g, '').slice(0, 2)}`;
    }
    const commaParts = str.split(',');
    const lastPart = commaParts[commaParts.length - 1];
    if (commaParts.length === 2 && lastPart.length <= 2) {
      const parteEntera = formatIntegerWithCommas(commaParts[0].replace(/\D/g, '')) || '0';
      const rawDec = lastPart.replace(/\D/g, '').slice(0, 2);
      return rawDec !== '' ? `${parteEntera}.${rawDec}` : `${parteEntera}.`;
    }
    return formatIntegerWithCommas(str);
  }

  return formatIntegerWithCommas(str);
}

/**
 * Parsea una cadena formateada o número y retorna un float Number limpio.
 */
export function parseFormattedAmount(strValue) {
  if (strValue == null || strValue === '') return 0;
  if (typeof strValue === 'number') return isNaN(strValue) ? 0 : strValue;

  let clean = String(strValue).trim();
  if (!clean || clean === '-') return 0;

  const isNeg = clean.startsWith('-');
  if (isNeg) clean = clean.substring(1);

  let num = 0;

  if (clean.includes('.') && clean.includes(',')) {
    const dotIdx = clean.indexOf('.');
    const commaIdx = clean.indexOf(',');
    const decSepIdx = commaIdx < dotIdx ? dotIdx : commaIdx;
    const intStr = clean.slice(0, decSepIdx).replace(/\D/g, '') || '0';
    const decStr = clean.slice(decSepIdx + 1).replace(/\D/g, '').slice(0, 2);
    num = parseFloat(`${intStr}.${decStr}`);
  } else if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      num = parseFloat(`${parts[0].replace(/\D/g, '') || '0'}.${parts[1].replace(/\D/g, '')}`);
    } else {
      num = parseFloat(clean.replace(/\D/g, '') || '0');
    }
  } else if (clean.includes(',')) {
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      num = parseFloat(`${parts[0].replace(/\D/g, '') || '0'}.${parts[1].replace(/\D/g, '')}`);
    } else {
      num = parseFloat(clean.replace(/\D/g, '') || '0');
    }
  } else {
    num = parseFloat(clean.replace(/\D/g, '') || '0');
  }

  if (isNaN(num)) return 0;
  return isNeg ? -num : num;
}
