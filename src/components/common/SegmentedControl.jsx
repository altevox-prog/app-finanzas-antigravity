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
      className={`relative p-1 bg-slate-100 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] rounded-xl flex gap-1 select-none ${
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
                ? `bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-medium shadow-sm border border-slate-200/80 dark:border-white/[0.08] ${
                    opt.activeClassName || ''
                  }`
                : `text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40 font-normal transition-colors border border-transparent ${
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
                    ? 'bg-slate-100 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200'
                    : 'bg-slate-200/70 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
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
