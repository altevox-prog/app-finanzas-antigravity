import React, { useState, useEffect, useRef } from 'react';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../utils/currencyFormatter';

/**
 * AmountInput
 * Componente reutilizable universal para entrada de montos monetarios.
 * - Formatea en tiempo real con separadores de miles (.) y soporte opcional de decimales (,).
 * - Emite el valor numérico limpio en onChange(cleanValue, formattedValue, event) para Supabase y cálculos.
 * - Preserva con precisión la posición del cursor para que no salte al final al editar dígitos intermedios.
 * - Despliega teclado numérico optimizado en móviles (inputMode="decimal" o "numeric").
 */
export default function AmountInput({
  value,
  onChange,
  enableDecimals: propEnableDecimals,
  allowDecimals: propAllowDecimals,
  placeholder = "0",
  className = "",
  containerClassName = "",
  style = {},
  prefix = null,
  suffix = null,
  inputMode,
  onFocus,
  onBlur,
  disabled = false,
  required = false,
  autoFocus = false,
  id,
  name,
  ...rest
}) {
  const decimalsAllowed = propAllowDecimals ?? propEnableDecimals ?? getEnableDecimals();
  const inputRef = useRef(null);
  const isFocusedRef = useRef(false);

  // Formato inicial para la vista
  const [displayValue, setDisplayValue] = useState(() => formatCurrencyInput(value, decimalsAllowed));

  // Sincronización cuando value cambia externamente (ej. carga inicial, reset o botones rápidos)
  useEffect(() => {
    const formattedFromProp = formatCurrencyInput(value, decimalsAllowed);
    const currentNum = parseFormattedAmount(displayValue);
    const propNum = parseFormattedAmount(value);

    if (!isFocusedRef.current || currentNum !== propNum) {
      setDisplayValue(formattedFromProp);
    }
  }, [value, decimalsAllowed]);

  const handleChange = (e) => {
    const input = e.target;
    const raw = input.value;
    const cursor = input.selectionStart || 0;

    // Conteo de dígitos y delimitadores antes del cursor para reposicionamiento preciso
    const rawBeforeCursor = raw.slice(0, cursor);
    const digitsBeforeCursor = rawBeforeCursor.replace(/\D/g, '').length;
    const hasDecimalBeforeCursor = rawBeforeCursor.includes(',') || rawBeforeCursor.endsWith('.') || rawBeforeCursor.includes('.');

    // Formatear valor visual
    const formatted = formatCurrencyInput(raw, decimalsAllowed);

    // Calcular valor numérico limpio para el estado padre (compatible con parseFloat / Supabase)
    let cleanNumeric = '';
    if (formatted) {
      if (formatted.includes(',')) {
        const [intPart, decPart] = formatted.split(',');
        const cleanInt = intPart.replace(/\D/g, '') || '0';
        cleanNumeric = decPart !== undefined && decPart !== '' ? `${cleanInt}.${decPart}` : `${cleanInt}.`;
      } else {
        cleanNumeric = formatted.replace(/\D/g, '');
      }
    }

    setDisplayValue(formatted);

    // Notificar al padre con el valor limpio
    if (typeof onChange === 'function') {
      onChange(cleanNumeric, formatted, e);
    }

    // Calcular la nueva posición del cursor dentro de la cadena formateada
    let newCursor = formatted.length;
    let digitsCounted = 0;

    if (digitsBeforeCursor === 0) {
      // Si el usuario escribió coma o punto al inicio (ej. "," o "." -> "0,")
      newCursor = (hasDecimalBeforeCursor && formatted.includes(',')) ? formatted.indexOf(',') + 1 : 0;
    } else {
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitsCounted++;
        }
        if (digitsCounted === digitsBeforeCursor) {
          newCursor = i + 1;
          // Si el usuario escribió una coma inmediatamente después del dígito
          if (hasDecimalBeforeCursor && formatted[i + 1] === ',') {
            newCursor = i + 2;
          }
          break;
        }
      }
    }

    // Reposicionar cursor en el siguiente frame sin saltar al final
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      const input = e.target;
      const { selectionStart, selectionEnd, value: currentVal } = input;
      // Cursor simple en posición mayor a cero
      if (selectionStart === selectionEnd && selectionStart > 0) {
        // Si el caracter inmediatamente anterior es un punto separador de miles
        if (currentVal[selectionStart - 1] === '.') {
          e.preventDefault();
          // Eliminar el dígito previo al punto en vez del punto mismo
          const before = currentVal.slice(0, selectionStart - 2);
          const after = currentVal.slice(selectionStart);
          const nextVal = before + after;

          const nextFormatted = formatCurrencyInput(nextVal, decimalsAllowed);
          let nextClean = '';
          if (nextFormatted) {
            if (nextFormatted.includes(',')) {
              const [intP, decP] = nextFormatted.split(',');
              nextClean = decP !== undefined && decP !== '' 
                ? `${intP.replace(/\D/g, '') || '0'}.${decP}` 
                : `${intP.replace(/\D/g, '') || '0'}.`;
            } else {
              nextClean = nextFormatted.replace(/\D/g, '');
            }
          }

          setDisplayValue(nextFormatted);
          if (typeof onChange === 'function') {
            onChange(nextClean, nextFormatted, e);
          }

          const newDigitsBefore = before.replace(/\D/g, '').length;
          let nextCursor = 0;
          let counted = 0;
          for (let i = 0; i < nextFormatted.length; i++) {
            if (/\d/.test(nextFormatted[i])) counted++;
            if (counted === newDigitsBefore) {
              nextCursor = i + 1;
              break;
            }
          }
          requestAnimationFrame(() => {
            if (inputRef.current) {
              inputRef.current.setSelectionRange(nextCursor, nextCursor);
            }
          });
        }
      }
    }
  };

  const handleFocus = (e) => {
    isFocusedRef.current = true;
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    isFocusedRef.current = false;
    // Normalizar formato al salir: si quedó en estado transitorio "75.000,", limpiar coma final
    let formatted = formatCurrencyInput(displayValue, decimalsAllowed);
    if (formatted.endsWith(',')) {
      formatted = formatted.slice(0, -1);
    }
    let clean = '';
    if (formatted) {
      if (formatted.includes(',')) {
        const [intP, decP] = formatted.split(',');
        clean = decP !== undefined && decP !== '' 
          ? `${intP.replace(/\D/g, '') || '0'}.${decP}` 
          : intP.replace(/\D/g, '');
      } else {
        clean = formatted.replace(/\D/g, '');
      }
    }
    setDisplayValue(formatted);
    if (typeof onChange === 'function') {
      onChange(clean, formatted, e);
    }
    onBlur?.(e);
  };

  const resolvedInputMode = inputMode || (decimalsAllowed ? "decimal" : "numeric");

  const inputElement = (
    <input
      ref={inputRef}
      type="text"
      inputMode={resolvedInputMode}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      required={required}
      autoFocus={autoFocus}
      id={id}
      name={name}
      className={`tabular-nums ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-12' : ''} ${className}`}
      style={style}
      {...rest}
    />
  );

  if (prefix || suffix) {
    return (
      <div className={`relative w-full ${containerClassName}`}>
        {prefix && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none select-none flex items-center justify-center">
            {prefix}
          </div>
        )}
        {inputElement}
        {suffix && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none select-none flex items-center justify-center">
            {suffix}
          </div>
        )}
      </div>
    );
  }

  return inputElement;
}
