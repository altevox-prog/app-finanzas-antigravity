import React from 'react';

/**
 * SegmentedControl
 * Control segmentado reutilizable para seleccionar entre 2-4 opciones visibles a un solo toque.
 * 
 * @param {Array<{ id: string|number, label: React.ReactNode, icon?: React.ComponentType, badge?: string|number, count?: number }>} options
 * @param {string|number} value - ID o valor de la opción actualmente seleccionada
 * @param {Function} onChange - Callback invocado con el id seleccionado
 * @param {'sm' | 'md' | 'lg'} size - Tamaño de los botones del control segmentado
 * @param {string} className - Clases CSS adicionales para el riel exterior
 * @param {boolean} fullWidth - Si debe ocupar el 100% del ancho (default: true)
 */
export default function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md',
  className = '',
  fullWidth = true
}) {
  const sizeClasses = {
    sm: 'py-1 px-2.5 text-xs',
    md: 'py-1.5 px-3 text-xs sm:text-sm',
    lg: 'py-2 px-4 text-sm sm:text-base'
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      role="tablist"
      className={`relative p-1 bg-white/40 dark:bg-white/[0.04] backdrop-blur-md border border-white/60 dark:border-white/[0.08] rounded-2xl flex gap-1 select-none shadow-xs ${
        fullWidth ? 'w-full' : 'inline-flex'
      } ${className}`}
    >
      {options.map((opt) => {
        const optId = opt.id ?? opt.value;
        const optLabel = opt.label ?? opt.name ?? opt.title ?? optId;
        const isActive = value === optId;
        const Icon = opt.icon;

        return (
          <button
            key={optId}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange && onChange(optId)}
            className={`flex-1 py-1.5 px-3 text-xs sm:text-sm text-center select-none cursor-pointer rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 ${currentSizeClass} ${
              isActive
                ? `bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md text-slate-950 dark:text-white font-bold shadow-xs border border-white/90 dark:border-white/[0.12] ${
                    opt.activeClassName || ''
                  }`
                : `text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.06] font-semibold transition-all border border-transparent ${
                    opt.inactiveClassName || ''
                  }`
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{optLabel}</span>
            {opt.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  isActive
                    ? 'bg-white/90 dark:bg-zinc-700/80 text-slate-900 dark:text-zinc-100 font-bold border border-white/80 dark:border-white/10'
                    : 'bg-white/40 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-300 font-medium'
                }`}
              >
                {opt.count}
              </span>
            )}
            {opt.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
