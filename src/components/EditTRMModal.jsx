import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, X, Check, Sparkles, TrendingUp } from 'lucide-react';

const COMMON_TRM_PRESETS = [3900, 4000, 4100, 4200, 4400];

export default function EditTRMModal({
  isOpen,
  onClose,
  currentTRM = 4000,
  onSaveTRM
}) {
  const [trmInput, setTrmInput] = useState(() => String(currentTRM || 4000));
  const [error, setError] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTrmInput(String(currentTRM || 4000));
      setError('');
    }
  }, [isOpen, currentTRM]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e?.preventDefault();
    const val = parseFloat(trmInput);
    if (isNaN(val) || val <= 0) {
      setError('Por favor ingresa una tasa de cambio válida (ej: 4000).');
      return;
    }
    onSaveTRM(val);
    onClose();
  };

  const parsedVal = parseFloat(trmInput) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div
        ref={modalRef}
        className="w-full max-w-sm bg-white dark:bg-[#121622] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 p-5 space-y-4 animate-scaleUp select-none"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                Tasa de Cambio (USD a COP)
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Ajusta la TRM para conversiones en vivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Valor de 1 USD en Pesos Colombianos (COP):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                $
              </span>
              <input
                type="number"
                step="any"
                min="1"
                required
                autoFocus
                value={trmInput}
                onChange={(e) => {
                  setTrmInput(e.target.value);
                  setError('');
                }}
                placeholder="4000"
                className="w-full pl-8 pr-16 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl text-base font-extrabold text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                COP
              </span>
            </div>
            {error && <p className="text-xs text-rose-500 font-semibold mt-1">{error}</p>}
          </div>

          {/* Chips de acceso rápido a valores sugeridos */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              Sugerencias rápidas:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COMMON_TRM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setTrmInput(String(preset));
                    setError('');
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    Number(trmInput) === preset
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  ${preset.toLocaleString('es-CO')}
                </button>
              ))}
            </div>
          </div>

          {/* Cálculo en vivo / Preview */}
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span>Equivalente en balance:</span>
              <span className="font-mono font-extrabold">
                100 USD = ${Math.round(parsedVal * 100).toLocaleString('es-CO')} COP
              </span>
            </div>
            <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70">
              Se guardará en tu navegador como custom_trm para tus registros.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar TRM</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
