import React, { useState, useEffect, useRef } from 'react';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../utils/currencyFormatter';

const toCleanNumeric = (fmt) => {
  if (!fmt) return '';
  if (fmt.includes('.')) {
    const [intP, decP] = fmt.split('.');
    const cleanInt = intP.replace(/\D/g, '') || '0';
    return decP !== undefined && decP !== '' ? `${cleanInt}.${decP}` : `${cleanInt}.`;
  }
  return fmt.replace(/\D/g, '');
};

/**
 * AmountInput
 * Componente universal para entrada de montos con formato en tiempo real,
 * retención precisa del cursor numérico y soporte de decimales.
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

  const [displayValue, setDisplayValue] = useState(() => formatCurrencyInput(value, decimalsAllowed));

  useEffect(() => {
    const formattedFromProp = formatCurrencyInput(value, decimalsAllowed);
    if (!isFocusedRef.current || parseFormattedAmount(displayValue) !== parseFormattedAmount(value)) {
      setDisplayValue(formattedFromProp);
    }
  }, [value, decimalsAllowed]);

  const handleChange = (e) => {
    const input = e.target;
    const raw = input.value;
    const cursor = input.selectionStart || 0;

    const rawBeforeCursor = raw.slice(0, cursor);
    const digitsBeforeCursor = rawBeforeCursor.replace(/\D/g, '').length;
    const hasDecimalBeforeCursor = rawBeforeCursor.includes('.') || rawBeforeCursor.includes(',');

    const formatted = formatCurrencyInput(raw, decimalsAllowed);
    const cleanNumeric = toCleanNumeric(formatted);

    setDisplayValue(formatted);
    onChange?.(cleanNumeric, formatted, e);

    let newCursor = formatted.length;
    let digitsCounted = 0;

    if (digitsBeforeCursor === 0) {
      newCursor = (hasDecimalBeforeCursor && formatted.includes('.')) ? formatted.indexOf('.') + 1 : 0;
    } else {
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) digitsCounted++;
        if (digitsCounted === digitsBeforeCursor) {
          newCursor = i + 1;
          if (hasDecimalBeforeCursor && formatted[i + 1] === '.') newCursor = i + 2;
          break;
        }
      }
    }

    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(newCursor, newCursor);
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      const input = e.target;
      const { selectionStart, selectionEnd, value: currentVal } = input;
      if (selectionStart === selectionEnd && selectionStart > 0 && currentVal[selectionStart - 1] === ',') {
        e.preventDefault();
        const before = currentVal.slice(0, selectionStart - 2);
        const nextVal = before + currentVal.slice(selectionStart);
        const nextFormatted = formatCurrencyInput(nextVal, decimalsAllowed);
        const nextClean = toCleanNumeric(nextFormatted);

        setDisplayValue(nextFormatted);
        onChange?.(nextClean, nextFormatted, e);

        const newDigitsBefore = before.replace(/\D/g, '').length;
        let nextCursor = 0, counted = 0;
        for (let i = 0; i < nextFormatted.length; i++) {
          if (/\d/.test(nextFormatted[i])) counted++;
          if (counted === newDigitsBefore) {
            nextCursor = i + 1;
            break;
          }
        }
        requestAnimationFrame(() => {
          inputRef.current?.setSelectionRange(nextCursor, nextCursor);
        });
      }
    }
  };

  const handleBlur = (e) => {
    isFocusedRef.current = false;
    let formatted = formatCurrencyInput(displayValue, decimalsAllowed);
    if (formatted.endsWith('.')) formatted = formatted.slice(0, -1);
    const clean = toCleanNumeric(formatted);

    setDisplayValue(formatted);
    onChange?.(clean, formatted, e);
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
      onFocus={(e) => { isFocusedRef.current = true; onFocus?.(e); }}
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
