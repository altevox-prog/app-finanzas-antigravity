import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { searchTickers } from '../../../../services/marketPriceService';

export default function TickerSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = 'ej. NU, AAPL, BTC...',
  inputStyle,
  className
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!value || value.trim().length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchTickers(value);
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (item) => {
    onSelect(item);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={`${className} pr-8`}
          style={inputStyle}
          autoComplete="off"
        />
        <div className="absolute right-3 text-slate-400 pointer-events-none">
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" /> : <Search className="w-3.5 h-3.5" />}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800/60">
          {suggestions.map((item) => (
            <li
              key={`${item.symbol}-${item.exchange}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
              className="px-3.5 py-2.5 flex items-center justify-between hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer transition-colors"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{item.symbol}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">{item.exchange}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.name}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
