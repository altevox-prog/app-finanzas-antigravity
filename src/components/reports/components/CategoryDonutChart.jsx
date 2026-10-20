import React from 'react';
import { getCategoryEmoji, formatAbbreviatedMoney } from '../utils/reportHelpers';

export default function CategoryDonutChart({
  categories = [],
  totalExpenses = 0,
  hoveredCategoryId = null,
  setHoveredCategoryId = () => {},
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  onSelectCategory = () => {},
  onCenterClick = null,
  getCategoryEmoji: propGetCategoryEmoji
}) {
  const resolveEmoji = propGetCategoryEmoji || getCategoryEmoji;
  const hoveredCategory = hoveredCategoryId 
    ? (categories || []).find((c) => c.id === hoveredCategoryId) 
    : null;

  // Parámetros de trazo circular estilizado y espacioso para el centro (viewBox 0 0 200 200)
  const radius = 76;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~477.52

  return (
    <div 
      className="relative w-36 h-36 max-h-[148px] shrink-0 flex items-center justify-center cursor-pointer group select-none"
      title={`Total de gastos: $ ${Number(totalExpenses || 0).toLocaleString('es-CO')}`}
    >
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
        {/* Pista base de fondo circular */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-100 dark:stroke-white/[0.05]"
        />

        {/* Segmentos de categorías con terminación redondeada */}
        {categories.length > 0 && (() => {
          let accumulatedPercent = 0;
          const gap = categories.length > 1 ? 12 : 0;

          return categories.map((cat, index) => {
            const percent = cat.exactPercent || 0;
            const strokeLength = (percent / 100) * circumference;
            const visibleLength = Math.max(percent > 0 ? 3 : 0, strokeLength - gap);
            const offset = (accumulatedPercent / 100) * circumference;
            accumulatedPercent += percent;

            const isHovered = hoveredCategoryId === cat.id;

            return (
              <circle
                key={cat.id || index}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={cat.color}
                strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${visibleLength} ${circumference}`}
                strokeDashoffset={-offset}
                className="transition-all duration-300 cursor-pointer"
                style={{
                  transformOrigin: '100px 100px',
                  opacity: hoveredCategoryId && !isHovered ? 0.35 : 1
                }}
                onMouseEnter={() => setHoveredCategoryId(cat.id)}
                onMouseLeave={() => setHoveredCategoryId(null)}
              />
            );
          });
        })()}
      </svg>

      {/* Contenido central integrado (Total o Categoría activa) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2 select-none">
        {hoveredCategory ? (
          <div className="animate-fadeIn flex flex-col items-center max-w-[80%]">
            <span className="text-[10px] uppercase tracking-wider font-medium text-slate-400 dark:text-zinc-500 truncate max-w-full">
              {hoveredCategory.name}
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white tracking-tight truncate max-w-full leading-tight my-0.5">
              $ {Number(hoveredCategory.amount || 0).toLocaleString('es-CO')}
            </span>
            <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400">
              {hoveredCategory.percent}%
            </span>
          </div>
        ) : (
          <div className="animate-fadeIn flex flex-col items-center max-w-[80%]">
            <span className="text-[10px] uppercase tracking-wider font-medium text-slate-400 dark:text-zinc-500">
              Total
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white tracking-tight truncate max-w-full leading-tight my-0.5">
              $ {Number(totalExpenses || 0).toLocaleString('es-CO')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
