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
 * Formato latino/colombiano:
 * - Separador de miles: Punto (.)
 * - Separador de decimales: Coma (,)
 * @param {string|number} value
 * @param {boolean} allowDecimals
 * @returns {string} Cadena formateada para el input (ej. "1.250.500" o "1.250.500,50")
 */
export function formatCurrencyInput(value, allowDecimals = true) {
  if (value === undefined || value === null || value === '') return '';

  // 1. Número primitivo
  if (typeof value === 'number') {
    if (isNaN(value)) return '';
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

  // 2. Si no se permiten decimales, descartar cualquier coma/punto decimal y formatear solo enteros
  if (!allowDecimals) {
    if (str.includes(',')) {
      return formatIntegerWithDots(str.split(',')[0]);
    }
    if (str.includes('.')) {
      const parts = str.split('.');
      if (parts.length === 2 && parts[1].length <= 2) {
        return formatIntegerWithDots(parts[0]);
      }
    }
    return formatIntegerWithDots(str);
  }

  // 3. allowDecimals = true:
  // A. Si termina en coma o punto (estado transitorio al escribir delimitador decimal)
  if (str.endsWith(',') || str.endsWith('.')) {
    const before = str.slice(0, -1);
    const cleanBefore = before.replace(/\D/g, '');
    const formattedBefore = formatIntegerWithDots(cleanBefore) || (cleanBefore === '0' || before.trim() === '0' || before.trim() === '' ? '0' : '');
    return `${formattedBefore},`;
  }

  // B. Si contiene coma (,): es el separador decimal canónico
  if (str.includes(',')) {
    const commaIdx = str.indexOf(',');
    const rawInt = str.slice(0, commaIdx);
    const rawDec = str.slice(commaIdx + 1).replace(/\D/g, '').slice(0, 2);
    const cleanInt = rawInt.replace(/\D/g, '');
    const parteEntera = formatIntegerWithDots(cleanInt) || (cleanInt === '0' || rawInt.trim() === '0' || commaIdx === 0 ? '0' : '');
    return rawDec !== '' ? `${parteEntera || '0'},${rawDec}` : `${parteEntera || '0'},`;
  }

  // C. Si contiene punto (.) pero NO coma:
  if (str.includes('.')) {
    // Si empieza por . o 0. (ej. ".5" o "0.5")
    if (str.startsWith('.') || str.startsWith('0.')) {
      const decClean = str.slice(str.indexOf('.') + 1).replace(/\D/g, '').slice(0, 2);
      return `0,${decClean}`;
    }

    const dotParts = str.split('.');
    const lastPart = dotParts[dotParts.length - 1];

    // Distinguir si el último punto es decimal o separador de miles:
    // Un bloque de miles SIEMPRE tiene 3 dígitos completos (ej. "1.000", "75.000", "1.250.500").
    // Si el último bloque tiene 1 o 2 dígitos (ej. "75000.5", "75.000.50", "75000.00", "75000.0"):
    // ES INEQUÍVOCAMENTE UN DECIMAL (incluyendo ceros como .0 o .00).
    const isExplicitDecimal = lastPart.length <= 2;

    if (isExplicitDecimal) {
      const rawInt = dotParts.slice(0, -1).join('');
      const cleanInt = rawInt.replace(/\D/g, '');
      const rawDec = lastPart.replace(/\D/g, '').slice(0, 2);
      const parteEntera = formatIntegerWithDots(cleanInt) || '0';
      return rawDec !== '' ? `${parteEntera},${rawDec}` : `${parteEntera},`;
    }

    // Si tiene exactamente 3 dígitos al final (ej. "75.000", "1.250.500"), son miles
    return formatIntegerWithDots(str);
  }

  // D. Sin coma ni punto: 100% entero
  return formatIntegerWithDots(str);
}

/**
 * Parsea una cadena formateada (ej. "$ 1.250.500,50", "1.250.500,5", "1250500", "75000.50")
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

  // Conservar solo dígitos, comas y puntos
  clean = clean.replace(/[^0-9.,]/g, '');
  if (!clean) return 0;

  // 1. Si hay coma: separador decimal explícito
  if (clean.includes(',')) {
    const idx = clean.indexOf(',');
    const intStr = clean.slice(0, idx).replace(/\D/g, '') || '0';
    const decStr = clean.slice(idx + 1).replace(/\D/g, '').slice(0, 2);
    const num = parseFloat(intStr + (decStr ? `.${decStr}` : ''));
    if (isNaN(num)) return 0;
    return isNegative ? -num : num;
  }

  // 2. Si hay punto:
  if (clean.includes('.')) {
    if (clean.startsWith('.') || clean.startsWith('0.')) {
      const decStr = clean.slice(clean.indexOf('.') + 1).replace(/\D/g, '').slice(0, 2);
      const num = parseFloat(`0.${decStr}`);
      if (isNaN(num)) return 0;
      return isNegative ? -num : num;
    }

    const dotParts = clean.split('.');
    const lastPart = dotParts[dotParts.length - 1];

    // Si el último bloque tiene 1 o 2 dígitos (ej. "75000.5", "75000.00", "75.000.50"), es decimal
    const isExplicitDecimal = lastPart.length <= 2;

    if (isExplicitDecimal) {
      const intStr = dotParts.slice(0, -1).join('').replace(/\D/g, '') || '0';
      const decStr = lastPart.replace(/\D/g, '').slice(0, 2);
      const num = parseFloat(intStr + (decStr ? `.${decStr}` : ''));
      if (isNaN(num)) return 0;
      return isNegative ? -num : num;
    }

    // Puntos de miles (ej. 1.000, 1.250.500)
    const intStr = clean.replace(/\D/g, '');
    const num = parseFloat(intStr);
    if (isNaN(num)) return 0;
    return isNegative ? -num : num;
  }

  // 3. Sin coma ni punto: 100% entero
  const intStr = clean.replace(/\D/g, '');
  const num = parseFloat(intStr);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}
