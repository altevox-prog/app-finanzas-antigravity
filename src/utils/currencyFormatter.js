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
export function formatCurrencyInput(value, allowDecimals = true) {
  if (value === undefined || value === null || value === '') return '';

  // 1. Si es un número primitivo
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

  if (!allowDecimals) {
    if (str.includes(',')) {
      return formatIntegerWithDots(str.split(',')[0]);
    }
    return formatIntegerWithDots(str);
  }

  // 2. Si el usuario escribe una coma o punto al final (inicio explícito de decimales)
  if (str.endsWith(',') || str.endsWith('.')) {
    const before = str.slice(0, -1);
    const formattedBefore = formatIntegerWithDots(before) || '0';
    return `${formattedBefore},`;
  }

  // 3. Si hay coma explícita: divide en [parteEntera, parteDecimal]
  if (str.includes(',')) {
    const idx = str.indexOf(',');
    const rawInt = str.slice(0, idx);
    const rawDec = str.slice(idx + 1).replace(/\D/g, '').slice(0, 2);
    const parteEntera = formatIntegerWithDots(rawInt) || '0';
    return rawDec !== '' ? `${parteEntera},${rawDec}` : `${parteEntera},`;
  }

  // 4. Si hay un punto:
  // En este formato, los puntos normales son separadores de miles ('1.000', '1.250.500').
  // Al borrar un cero de '1.000' queda '1.00', que debe interpretarse como entero ('100').
  // Solo se considera punto decimal explícito si:
  // a) Empieza por '0.' o '.' (ej. '0.5' o '.5')
  // b) O tiene decimales explícitos no-cero (ej. pegado '1000.5' o '800000.50')
  if (str.includes('.')) {
    const dotParts = str.split('.');
    const lastPart = dotParts[dotParts.length - 1];

    const isExplicitDecimal = 
      (str.startsWith('0.') || str.startsWith('.')) ||
      (dotParts.length === 2 && lastPart.length <= 2 && !/^0+$/.test(lastPart)) ||
      (dotParts.length > 2 && lastPart.length <= 2 && !/^0+$/.test(lastPart));

    if (isExplicitDecimal) {
      const rawInt = dotParts.slice(0, -1).join('');
      const rawDec = lastPart.replace(/\D/g, '').slice(0, 2);
      const parteEntera = formatIntegerWithDots(rawInt) || '0';
      return `${parteEntera},${rawDec}`;
    }

    // Puntos de miles o remanentes de backspace: 100% entero
    return formatIntegerWithDots(str);
  }

  // 5. Sin coma ni punto: 100% entero
  return formatIntegerWithDots(str);
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
    const dotParts = clean.split('.');
    const lastPart = dotParts[dotParts.length - 1];
    const isExplicitDecimal = 
      (clean.startsWith('0.') || clean.startsWith('.')) ||
      (dotParts.length === 2 && lastPart.length <= 2 && !/^0+$/.test(lastPart)) ||
      (dotParts.length > 2 && lastPart.length <= 2 && !/^0+$/.test(lastPart));

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
