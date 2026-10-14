import React, { useRef, useEffect } from 'react';

/**
 * OtpSixDigitInput
 * Reusable 6-digit numeric input with auto-advance, backspace jump, and paste support.
 */
export default function OtpSixDigitInput({ 
  value = '', 
  onChange, 
  disabled = false, 
  autoFocus = true,
  hasError = false 
}) {
  const inputRefs = useRef([]);

  // Array of 6 characters
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    }
  }, [autoFocus, disabled]);

  const handleChange = (index, e) => {
    const rawVal = e.target.value;
    // Keep only numbers
    const cleanDigit = rawVal.replace(/\D/g, '');

    if (!cleanDigit) {
      // Clear this digit
      const nextDigits = [...digits];
      nextDigits[index] = '';
      onChange(nextDigits.join(''));
      return;
    }

    // If typing a single digit or replacement
    const lastChar = cleanDigit.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = lastChar;
    const newCombined = nextDigits.join('');
    onChange(newCombined);

    // Auto-advance
    if (index < 5 && lastChar) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current is already empty, go to previous and clear it
        inputRefs.current[index - 1]?.focus();
        const nextDigits = [...digits];
        nextDigits[index - 1] = '';
        onChange(nextDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pasteData) return;

    const truncated = pasteData.slice(0, 6);
    onChange(truncated);

    // Focus appropriate box
    const nextFocusIndex = Math.min(truncated.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 my-2">
      {digits.map((digit, index) => {
        const isFilled = Boolean(digit);
        return (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border transition-all outline-none select-none ${
              hasError
                ? 'border-rose-500 bg-rose-500/10 text-rose-500 ring-2 ring-rose-500/20'
                : isFilled
                ? 'border-emerald-500/80 bg-emerald-500/10 text-slate-900 dark:text-white font-extrabold shadow-sm'
                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white'
            } focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:bg-white dark:focus:bg-[#1a2030] disabled:opacity-50`}
          />
        );
      })}
    </div>
  );
}
