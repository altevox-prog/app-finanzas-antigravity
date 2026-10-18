/**
 * Utilidades para formateo y parseo de montos en COP y monedas con soporte opcional de decimales.
 * Formato estándar:
 * - Separador de miles: Coma (,)
 * - Separador de decimales: Punto (.)
 * Ejemplo: $ 100,000 o $ 100,000.50
 */

export function getEnableDecimals() {
  try {
    if (typeof window === 'undefined') return false;
    const direct = localStorage.getItem('app_enable_decimals');
    if (direct !== null) {
      return direct === 'true';
    }
    const userSettingsRaw = localStorage.getItem('user_settings');
    if (userSettingsRaw) {
      const parsed = JSON.parse(userSettingsRaw);
      const val = parsed?.enable_decimals ?? parsed?.enableDecimals ?? parsed?.showDecimals ?? parsed?.allowDecimals;
      if (val !== undefined && val !== null) return Boolean(val);
    }
    return false;
  } catch {
    return false;
  }
}

export function setEnableDecimals(enabled) {
  const next = Boolean(enabled);
  try {
    localStorage.setItem('app_enable_decimals', String(next));
    const userSettingsRaw = localStorage.getItem('user_settings');
    const current = userSettingsRaw ? JSON.parse(userSettingsRaw) : {};
    current.enable_decimals = next;
    current.enableDecimals = next;
    current.showDecimals = next;
    current.allowDecimals = next;
    localStorage.setItem('user_settings', JSON.stringify(current));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_decimals_changed', { detail: { enableDecimals: next } }));
  }
}

/**
 * Formatea una cadena o número entero con comas como separadores de miles
 */
export function formatIntegerWithCommas(intStr) {
  if (intStr === undefined || intStr === null) return '';
  const clean = String(intStr).replace(/\D/g, '');
  if (!clean) return '';
  // Remover ceros a la izquierda innecesarios, excepto si es solo '0'
  const trimmed = clean.replace(/^0+(?=\d)/, '');
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Alias para compatibilidad
export const formatIntegerWithDots = formatIntegerWithCommas;

/**
 * Formatea en tiempo real el valor de un input de moneda.
 * Formato:
 * - Separador de miles: Coma (,)
 * - Separador de decimales: Punto (.)
 * @param {string|number} value
 * @param {boolean} [allowDecimals]
 * @returns {string} Cadena formateada para el input (ej. "100,000" o "100,000.50")
 */
export function formatCurrencyInput(value, allowDecimals = undefined) {
  const isDecimalsAllowed = allowDecimals !== undefined ? Boolean(allowDecimals) : getEnableDecimals();

  if (value === undefined || value === null || value === '') return '';

  // 1. Número primitivo
  if (typeof value === 'number') {
    if (isNaN(value)) return '';
    if (!isDecimalsAllowed) {
      return formatIntegerWithCommas(Math.round(value));
    }
    if (Math.round(value) === value) {
      return formatIntegerWithCommas(value);
    }
    const [intPart, decPart] = String(value).split('.');
    const formattedInt = formatIntegerWithCommas(intPart) || '0';
    return decPart !== undefined && decPart.length > 0
      ? `${formattedInt}.${decPart.slice(0, 2)}`
      : formattedInt;
  }

  let str = String(value).trim();
  if (!str) return '';

  // 2. Si no se permiten decimales, descartar cualquier punto/coma y formatear solo enteros
  if (!isDecimalsAllowed) {
    if (str.includes('.')) {
      const parts = str.split('.');
      if (parts.length === 2 && parts[1].length <= 2) {
        return formatIntegerWithCommas(parts[0]);
      }
    }
    if (str.includes(',')) {
      const parts = str.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        return formatIntegerWithCommas(parts[0]);
      }
    }
    return formatIntegerWithCommas(str);
  }

  // 3. isDecimalsAllowed = true:
  // A. Si termina en punto o coma (estado transitorio al escribir delimitador decimal):
  // Se convierte cualquier coma a punto (.) de forma transparente sin bloquear.
  if (str.endsWith('.') || str.endsWith(',')) {
    const before = str.slice(0, -1);
    const cleanBefore = before.replace(/\D/g, '');
    const formattedBefore = formatIntegerWithCommas(cleanBefore) || (cleanBefore === '0' || before.trim() === '' ? '0' : '');
    return `${formattedBefore || '0'}.`;
  }

  // B. Si contiene punto (.): es el separador decimal canónico
  if (str.includes('.')) {
    const dotIdx = str.indexOf('.');
    const rawInt = str.slice(0, dotIdx);
    const rawDec = str.slice(dotIdx + 1).replace(/\D/g, '').slice(0, 2);
    const cleanInt = rawInt.replace(/\D/g, '');
    const parteEntera = formatIntegerWithCommas(cleanInt) || (cleanInt === '0' || rawInt.trim() === '' || dotIdx === 0 ? '0' : '');
    return rawDec !== '' ? `${parteEntera || '0'}.${rawDec}` : `${parteEntera || '0'}.`;
  }

  // C. Si contiene coma (,) pero NO punto (.):
  if (str.includes(',')) {
    // Si empieza por coma (ej. ",5" o "0,")
    if (str.startsWith(',') || str.startsWith('0,')) {
      const decClean = str.slice(str.indexOf(',') + 1).replace(/\D/g, '').slice(0, 2);
      return `0.${decClean}`;
    }

    const commaParts = str.split(',');
    const lastPart = commaParts[commaParts.length - 1];

    // Si la última parte tiene 1 o 2 dígitos, es un decimal escrito por el usuario con coma
    const isUserDecimal = (commaParts.length === 2 && lastPart.length <= 2);

    if (isUserDecimal) {
      const rawInt = commaParts.slice(0, -1).join('');
      const cleanInt = rawInt.replace(/\D/g, '');
      const rawDec = lastPart.replace(/\D/g, '').slice(0, 2);
      const parteEntera = formatIntegerWithCommas(cleanInt) || '0';
      return rawDec !== '' ? `${parteEntera}.${rawDec}` : `${parteEntera}.`;
    }

    // Comas de miles estándar (ej. "1,000" o "100,000")
    return formatIntegerWithCommas(str);
  }

  // D. Sin coma ni punto: 100% entero
  return formatIntegerWithCommas(str);
}

/**
 * Parsea una cadena formateada (ej. "$ 100,000.50", "100,000", "100.23", "$ 1.250.500,50")
 * o número y retorna un float Number limpio para cálculos y persistencia.
 * @param {string|number} strValue
 * @returns {number}
 */
export function parseFormattedAmount(strValue) {
  if (strValue === undefined || strValue === null || strValue === '') return 0;
  if (typeof strValue === 'number') return isNaN(strValue) ? 0 : strValue;

  let clean = String(strValue).trim();
  if (!clean || clean === '-') return 0;

  const isNegative = clean.startsWith('-');
  if (isNegative) clean = clean.substring(1);

  // Si contiene ambos '.' y ',':
  if (clean.includes('.') && clean.includes(',')) {
    const dotIdx = clean.indexOf('.');
    const commaIdx = clean.indexOf(',');
    // Caso estándar: coma es miles y punto es decimal (ej. "100,000.50")
    if (commaIdx < dotIdx) {
      const intStr = clean.slice(0, dotIdx).replace(/\D/g, '') || '0';
      const decStr = clean.slice(dotIdx + 1).replace(/\D/g, '').slice(0, 2);
      const num = parseFloat(intStr + (decStr ? `.${decStr}` : ''));
      if (isNaN(num)) return 0;
      return isNegative ? -num : num;
    } else {
      // Caso legado: punto es miles y coma es decimal (ej. "100.000,50")
      const intStr = clean.slice(0, commaIdx).replace(/\D/g, '') || '0';
      const decStr = clean.slice(commaIdx + 1).replace(/\D/g, '').slice(0, 2);
      const num = parseFloat(intStr + (decStr ? `.${decStr}` : ''));
      if (isNaN(num)) return 0;
      return isNegative ? -num : num;
    }
  }

  // Si solo contiene punto (.):
  if (clean.includes('.')) {
    if (clean.startsWith('.') || clean.startsWith('0.')) {
      const decStr = clean.slice(clean.indexOf('.') + 1).replace(/\D/g, '').slice(0, 2);
      const num = parseFloat(`0.${decStr}`);
      if (isNaN(num)) return 0;
      return isNegative ? -num : num;
    }

    const dotParts = clean.split('.');
    const lastPart = dotParts[dotParts.length - 1];

    // Si el último bloque tiene 1 o 2 dígitos, es decimal (ej. "100.5", "100.50")
    const isExplicitDecimal = lastPart.length <= 2;
    if (isExplicitDecimal) {
      const intStr = dotParts.slice(0, -1).join('').replace(/\D/g, '') || '0';
      const decStr = lastPart.replace(/\D/g, '').slice(0, 2);
      const num = parseFloat(intStr + (decStr ? `.${decStr}` : ''));
      if (isNaN(num)) return 0;
      return isNegative ? -num : num;
    }

    // Puntos de miles de formato legado (ej. "100.000")
    const intStr = clean.replace(/\D/g, '');
    const num = parseFloat(intStr);
    if (isNaN(num)) return 0;
    return isNegative ? -num : num;
  }

  // Si solo contiene coma (,):
  if (clean.includes(',')) {
    const commaParts = clean.split(',');
    // Si la coma es decimal ingresada por usuario (ej. "100,5" o "100,50")
    if (commaParts.length === 2 && commaParts[1].length <= 2) {
      const intStr = commaParts[0].replace(/\D/g, '') || '0';
      const decStr = commaParts[1].replace(/\D/g, '').slice(0, 2);
      const num = parseFloat(intStr + (decStr ? `.${decStr}` : ''));
      if (isNaN(num)) return 0;
      return isNegative ? -num : num;
    }
    // Comas de miles estándar (ej. "100,000")
    const intStr = clean.replace(/\D/g, '');
    const num = parseFloat(intStr);
    if (isNaN(num)) return 0;
    return isNegative ? -num : num;
  }

  // 100% entero sin punto ni coma
  const intStr = clean.replace(/\D/g, '');
  const num = parseFloat(intStr);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}
