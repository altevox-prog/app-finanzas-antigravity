import React from 'react';

/**
 * InvestmentQuickUpdateModal
 * Modal compacto para actualizar de forma rápida y manual
 * el valor actual o precio de mercado de una inversión.
 */
export default function InvestmentQuickUpdateModal({
  item,
  value,
  onChangeValue,
  onClose,
  onConfirm,
}) {
  if (!item) return null;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (onConfirm) onConfirm(e);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] rounded-3xl shadow-2xl border p-5 animate-modal-pop space-y-3.5"
        style={{ 
          backgroundColor: 'var(--modal-bg)', 
          borderColor: 'var(--border-color)', 
          color: 'var(--text-main)' 
        }}
      >
        <div 
          className="flex items-center justify-between pb-2 border-b" 
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div>
            <h4 className="text-sm font-extrabold">Actualizar Valor de Mercado</h4>
            <p className="text-[10px] opacity-60 truncate max-w-[220px]">{item.name}</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 text-xs font-bold cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card-sub)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold opacity-70 mb-1">
              Nuevo Valor Actual ({item.currency || 'COP'}) *
            </label>
            <input 
              type="number"
              step="any"
              min="0"
              required
              autoFocus
              value={value}
              onChange={(e) => onChangeValue && onChangeValue(e.target.value)}
              className="w-full text-base font-black px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none"
              style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold opacity-70 hover:opacity-100 rounded-xl cursor-pointer transition-opacity"
              style={{ backgroundColor: 'var(--bg-card-sub)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm active:scale-95 cursor-pointer transition-all"
            >
              Actualizar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
