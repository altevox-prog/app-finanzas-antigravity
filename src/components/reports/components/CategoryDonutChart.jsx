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

  return (
    <div 
      className="relative w-24 h-24 sm:w-26 sm:h-26 shrink-0 flex items-center justify-center cursor-pointer group"
      onClick={(e) => {
        if (onCenterClick) {
          e.preventDefault();
          e.stopPropagation();
          onCenterClick(e);
        }
      }}
      title={`Total de gastos: ${formatMoney(totalExpenses)}`}
    >
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Pista base de fondo */}
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          strokeWidth="9"
          className="stroke-slate-100 dark:stroke-white/5"
        />

        {/* Segmentos de categorías */}
        {categories.length > 0 && (() => {
          const circumference = 2 * Math.PI * 38; // ~238.76
          let accumulatedPercent = 0;

          return categories.map((cat, index) => {
            const percent = cat.exactPercent;
            const strokeLength = (percent / 100) * circumference;
            const gap = categories.length > 1 ? 1.8 : 0;
            const visibleLength = Math.max(0, strokeLength - gap);
            const offset = (accumulatedPercent / 100) * circumference;
            accumulatedPercent += percent;

            const isHovered = hoveredCategoryId === cat.id;

            return (
              <circle
                key={cat.id || index}
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke={cat.color}
                strokeWidth={isHovered ? 11 : 9}
                strokeDasharray={`${visibleLength} ${circumference}`}
                strokeDashoffset={-offset}
                className="transition-all duration-300 cursor-pointer"
                style={{
                  transformOrigin: '50px 50px',
                  opacity: hoveredCategoryId && !isHovered ? 0.35 : 1
                }}
                onMouseEnter={() => setHoveredCategoryId(cat.id)}
                onMouseLeave={() => setHoveredCategoryId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCategory(cat);
                }}
              />
            );
          });
        })()}
      </svg>

      {/* Centro de la dona */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-1 select-none">
        {hoveredCategory ? (
          <div className="animate-fadeIn flex flex-col items-center">
            <span className="text-base leading-none mb-0.5">
              {resolveEmoji(hoveredCategory, hoveredCategory.name)}
            </span>
            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[65px]">
              {hoveredCategory.name}
            </span>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
              {hoveredCategory.percent}%
            </span>
          </div>
        ) : (
          <div className="animate-fadeIn flex flex-col items-center">
            <span className="text-[9px] text-slate-400 uppercase font-semibold leading-none">
              Total
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white tabular-nums tracking-tight mt-0.5 truncate max-w-[75px]">
              {totalExpenses > 0 ? formatAbbreviatedMoney(totalExpenses, formatMoney) : '$0'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
