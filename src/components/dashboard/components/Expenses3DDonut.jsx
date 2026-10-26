import React from 'react';

/**
 * Expenses3DDonut
 * Renderizado 3D isométrico limpio con bisel especular, extrusión cilíndrica integrada,
 * núcleo central ahumado con sombra de cavidad y hover selectivo independiente.
 */
export default function Expenses3DDonut({
  totalExpense = 0,
  categoryBreakdown = [],
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  size = 190,
  className = '',
  hoveredCategoryId = null,
  setHoveredCategoryId = null
}) {
  const categories = Array.isArray(categoryBreakdown) ? categoryBreakdown : [];
  const radius = 68, strokeWidth = 22, circumference = 2 * Math.PI * radius; // ~427.26
  const isZero = !totalExpense || totalExpense <= 0 || categories.length === 0;
  const gap = categories.length > 1 ? 4 : 0;

  let currentOffset = 0;
  const segments = categories.map((cat, idx) => {
    const pct = cat.exactPercent || cat.percentage || cat.percent || 0;
    const strokeLen = (pct / 100) * circumference;
    const visibleLen = Math.max(0, strokeLen - gap);
    const offset = currentOffset;
    currentOffset += strokeLen;
    const categoryKey = cat.id !== undefined && cat.id !== null ? String(cat.id) : `cat-${idx}`;
    return { cat, idx, categoryKey, visibleLen, offset, pct };
  });

  const activeHoverKey = hoveredCategoryId !== null && hoveredCategoryId !== undefined ? String(hoveredCategoryId) : null;
  const hoveredItem = activeHoverKey !== null ? categories.find((c, idx) => (c.id !== undefined && c.id !== null ? String(c.id) : `cat-${idx}`) === activeHoverKey) : null;
  const displayAmt = hoveredItem ? formatMoney(hoveredItem.amount) : formatMoney(totalExpense);
  const amtFontSize = displayAmt.length > 13 ? 'text-[11px]' : displayAmt.length > 10 ? 'text-xs' : 'text-sm sm:text-base';

  return (
    <div className={`relative flex items-center justify-center select-none py-1 ${className}`}>
      <div className="absolute bottom-1.5 w-44 h-10 bg-slate-900/12 dark:bg-black/60 rounded-full blur-xl pointer-events-none -z-10" />

      <div className="relative flex items-center justify-center" style={{ width: size, height: size * 0.72, perspective: '900px' }}>
        <div className="relative flex items-center justify-center transition-transform duration-300" style={{ transform: 'rotateX(52deg)', transformStyle: 'preserve-3d', width: size, height: size }}>
          <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="specular-light" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                <stop offset="45%" stopColor="#ffffff" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.32" />
              </linearGradient>
              <linearGradient id="core-cavity" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.92" />
                <stop offset="35%" stopColor="#05070c" stopOpacity="0.68" />
                <stop offset="100%" stopColor="#0b0e17" stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id="core-cavity-light" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" stopOpacity="0.26" />
                <stop offset="40%" stopColor="#334155" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.35" />
              </linearGradient>
              <filter id="compact-depth" x="-20%" y="-10%" width="140%" height="160%">
                <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#064e3b" floodOpacity="0.12" />
                <feDropShadow dx="0" dy="16" stdDeviation="16" floodColor="#0f172a" floodOpacity="0.08" />
              </filter>
            </defs>

            {/* 1. Extrusión cilíndrica inferior */}
            {!isZero && (
              <g transform="translate(0, 9) rotate(-90 100 100)">
                {segments.map(({ cat, categoryKey, visibleLen, offset }) => {
                  const isHov = activeHoverKey !== null && activeHoverKey === categoryKey;
                  const isDimmed = activeHoverKey !== null && !isHov;
                  return (
                    <circle
                      key={`wall-base-${categoryKey}`} cx="100" cy="100" r={radius} fill="none"
                      stroke={cat.color || '#10B981'} strokeWidth={strokeWidth} strokeLinecap="butt"
                      strokeDasharray={`${visibleLen} ${circumference - visibleLen}`} strokeDashoffset={-offset}
                      className="transition-all duration-200 cursor-pointer"
                      style={{ filter: isHov ? 'brightness(0.70) contrast(1.2)' : 'brightness(0.55) contrast(1.15)', opacity: isDimmed ? 0.22 : 1 }}
                      onMouseEnter={() => setHoveredCategoryId?.(categoryKey)} onMouseLeave={() => setHoveredCategoryId?.(null)}
                    />
                  );
                })}
              </g>
            )}

            {/* 2. Cara superior del disco */}
            <g transform="rotate(-90 100 100)">
              <circle cx="100" cy="100" r={radius} fill="none" stroke="#161a24" strokeWidth={strokeWidth} />
              {isZero ? (
                <circle
                  cx="100" cy="100" r={radius} fill="none" stroke="#10b981" strokeWidth={strokeWidth}
                  strokeDasharray="6 12" className="animate-spin opacity-40"
                  style={{ transformOrigin: '100px 100px', animationDuration: '35s' }}
                />
              ) : (
                segments.map(({ cat, categoryKey, visibleLen, offset }) => {
                  const isHov = activeHoverKey !== null && activeHoverKey === categoryKey;
                  const isDimmed = activeHoverKey !== null && !isHov;
                  return (
                    <circle
                      key={`top-${categoryKey}`} cx="100" cy="100" r={radius} fill="none"
                      stroke={cat.color || '#10B981'} strokeWidth={isHov ? strokeWidth + 2 : strokeWidth} strokeLinecap="butt"
                      strokeDasharray={`${visibleLen} ${circumference - visibleLen}`} strokeDashoffset={-offset}
                      className="transition-all duration-200 cursor-pointer"
                      style={{ opacity: isDimmed ? 0.22 : 1 }}
                      onMouseEnter={() => setHoveredCategoryId?.(categoryKey)} onMouseLeave={() => setHoveredCategoryId?.(null)}
                    />
                  );
                })
              )}
              <circle cx="100" cy="100" r={radius} fill="none" stroke="url(#specular-light)" strokeWidth={strokeWidth} pointerEvents="none" />
            </g>

            {/* 3. Biseles perimetrales y núcleo central */}
            <circle cx="100" cy="100" r={radius + strokeWidth / 2} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" pointerEvents="none" />
            <circle cx="100" cy="100" r={radius - strokeWidth / 2} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" pointerEvents="none" />
            <circle
              cx="100"
              cy="100"
              r={radius - strokeWidth / 2}
              fill="none"
              className="stroke-slate-900/10 dark:stroke-white/10"
              strokeWidth="0.8"
              pointerEvents="none"
            />
          </svg>
        </div>

        {/* 4. Núcleo textual flotante */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ transform: 'translateZ(18px)' }}>
          {hoveredItem ? (
            <div className="flex flex-col items-center text-center px-2">
              <span className="text-[9px] font-bold tracking-widest text-slate-500 dark:text-zinc-400 uppercase leading-none mb-1">{hoveredItem.name?.slice(0, 13)}</span>
              <span className={`${amtFontSize} font-extrabold font-mono tracking-tight text-slate-900 dark:text-white leading-none`}>{displayAmt}</span>
              <span className="text-[10px] font-bold font-mono text-emerald-400 leading-none mt-1">{hoveredItem.percentage || hoveredItem.percent}%</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center px-2">
              <span className="text-[9px] font-bold tracking-wider text-slate-500 dark:text-zinc-400 uppercase leading-none mb-1">
                {isZero ? 'ESTADO' : 'TOTAL DEL MES'}
              </span>
              <span className={`${amtFontSize} font-extrabold font-mono tracking-tight text-slate-900 dark:text-white leading-none`}>
                {isZero ? '$0' : displayAmt}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
