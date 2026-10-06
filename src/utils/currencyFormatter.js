/**
 * Utilidades para formateo y parseo de montos en COP y monedas con soporte opcional de decimales.
 * Formato estándar latino/colombiano:
 * - Separador de miles: Punto (.)
 * - Separador de decimales: Coma (,)
 * Ejemplo: $ 1.250.500,50
 */

export function getEnableDecimals() {
  try {
    return localStorage.getItem('app_enable_decimals') === 'true';
  } catch {
    return false;
  }
}

export function setEnableDecimals(enabled) {
  try {
    localStorage.setItem('app_enable_decimals', String(Boolean(enabled)));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_decimals_changed', { detail: { enableDecimals: Boolean(enabled) } }));
  }
}

/**
 * Formatea una cadena o número entero con puntos como separadores de miles
 */
function formatIntegerWithDots(intStr) {
  if (intStr === undefined || intStr === null) return '';
  const clean = String(intStr).replace(/\D/g, '');
  if (!clean) return '';
  // Remover ceros a la izquierda innecesarios, excepto si es solo '0'
  const trimmed = clean.replace(/^0+(?=\d)/, '');
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formatea en tiempo real el valor de un input de moneda.
 * @param {string|number} value
 * @param {boolean} allowDecimals
 * @returns {string} Cadena formateada para el input (ej. "1.250.500" o "1.250.500,50")
 */
export function formatCurrencyInput(value, allowDecimals = false) {
  if (value === undefined || value === null || value === '') return '';

  if (typeof value === 'number') {
    if (!allowDecimals) {
      return formatIntegerWithDots(Math.round(value));
    }
    const [intPart, decPart] = String(value).split('.');
    const formattedInt = formatIntegerWithDots(intPart) || '0';
    if (decPart !== undefined && decPart.length > 0) {
      return `${formattedInt},${decPart.slice(0, 2)}`;
    }
    return formattedInt;
  }

  let str = String(value).trim();
  if (!str) return '';

  if (!allowDecimals) {
    // Si no permite decimales, solo dígitos con puntos de miles
    return formatIntegerWithDots(str);
  }

  // Si allowDecimals es true:
  // Detectar si el usuario acaba de escribir un separador decimal al final (coma o punto)
  if (str.endsWith(',') || str.endsWith('.')) {
    const before = str.slice(0, -1);
    const formattedBefore = formatIntegerWithDots(before) || '0';
    return `${formattedBefore},`;
  }

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  let intPart = '';
  let decPart = null;

  if (hasComma) {
    const parts = str.split(',');
    intPart = parts[0];
    // Ignorar comas/puntos adicionales y dejar máximo 2 dígitos decimales
    decPart = parts.slice(1).join('').replace(/\D/g, '').slice(0, 2);
  } else if (hasDot) {
    const dotParts = str.split('.');
    // Si hay un solo punto y la parte después tiene <= 2 dígitos (ej. "1250.5" o "1250.50")
    if (dotParts.length === 2 && dotParts[1].length <= 2) {
      intPart = dotParts[0];
      decPart = dotParts[1].replace(/\D/g, '').slice(0, 2);
    } else {
      // Puntos múltiples o formato miles (ej. "1.250.500")
      intPart = str.replace(/\./g, '');
    }
  } else {
    intPart = str;
  }

  const formattedInt = formatIntegerWithDots(intPart) || (decPart !== null ? '0' : '');

  if (decPart !== null) {
    return `${formattedInt},${decPart}`;
  }
  return formattedInt;
}

/**
 * Parsea una cadena formateada (ej. "$ 1.250.500,50", "1.250.500,5", "1250500")
 * o número y retorna un float Number limpio para cálculos y persistencia.
 * @param {string|number} strValue
 * @returns {number}
 */
export function parseFormattedAmount(strValue) {
  if (strValue === undefined || strValue === null || strValue === '') return 0;
  if (typeof strValue === 'number') return isNaN(strValue) ? 0 : strValue;

  let clean = String(strValue).trim().replace(/[^0-9.,-]/g, '');
  if (!clean || clean === '-') return 0;

  const isNegative = clean.startsWith('-');
  if (isNegative) clean = clean.substring(1);

  if (clean.includes(',')) {
    const parts = clean.split(',');
    const intStr = parts[0].replace(/\./g, '');
    const decStr = parts.slice(1).join('').replace(/[^0-9]/g, '').slice(0, 2);
    const num = parseFloat((intStr || '0') + '.' + (decStr || '0'));
    return isNegative ? -num : num;
  }

  if (clean.includes('.')) {
    const dotParts = clean.split('.');
    if (dotParts.length > 2) {
      // Múltiples puntos: separadores de miles
      clean = clean.replace(/\./g, '');
    } else if (dotParts.length === 2) {
      if (dotParts[1].length === 3) {
        // Un solo punto con 3 dígitos: ej. 1.000 -> 1000
        clean = clean.replace(/\./g, '');
      }
    }
  }

  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}
