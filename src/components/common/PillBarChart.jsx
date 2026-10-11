import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PillBarChart({
  data = [],
  title = "Flujo Financiero",
  subtitle = "Distribución del período",
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`,
  height = 180,
  className = ""
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const hasAnyData = data.some(d => (Number(d.value) || 0) > 0);
  const maxValue = Math.max(...data.map(d => Number(d.value) || 0), 1);
  const demoFallbackHeights = [25, 65, 85, 40, 20];

  return (
    <div className={`bg-brand-light-card dark:bg-brand-dark-card border border-brand-light-border dark:border-brand-dark-border rounded-2xl p-5 select-none relative ${className}`}>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-brand-light-text dark:text-brand-dark-text tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] font-medium text-brand-light-muted dark:text-brand-dark-muted">
              {subtitle}
            </p>
          )}
        </div>
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-brand-light-muted dark:text-brand-dark-muted block">
              {data[hoveredIndex].label}
            </span>
            <span className="text-xs font-bold font-mono text-[#29D691]">
              {formatMoney(Number(data[hoveredIndex].value) || 0)}
            </span>
          </div>
        )}
      </div>

      {/* Área de barras con suficiente espacio superior para tooltips flotantes sin cortes */}
      <div className="flex items-end justify-between gap-2 pt-10 relative" style={{ height: `${height}px` }}>
        {data.map((item, idx) => {
          const rawValue = Number(item.value) || 0;
          const percentage = hasAnyData
            ? Math.max((rawValue / maxValue) * 100, 8)
            : demoFallbackHeights[idx % demoFallbackHeights.length];
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={idx}
              className="relative flex-1 flex flex-col items-center justify-end h-full pt-8 cursor-pointer group select-none"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => setHoveredIndex(idx)}
            >
              {/* Tooltip flotante individual centrado con z-50 */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: -10, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-7 z-50 px-2.5 py-1 rounded-md bg-slate-900/95 dark:bg-slate-800/95 text-white text-[11px] font-mono whitespace-nowrap shadow-xl border border-white/10 pointer-events-none"
                  >
                    {formatMoney(rawValue)}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cápsula de la barra */}
              <div
                className={`w-full max-w-[28px] h-full flex items-end justify-center rounded-full p-1 transition-all duration-200 ${
                  isHovered
                    ? 'bg-[#29D691]/20 ring-2 ring-[#29D691]/50'
                    : 'bg-slate-100/90 dark:bg-white/5'
                }`}
              >
                <motion.div
                  className="w-full rounded-full"
                  style={{
                    height: `${percentage}%`,
                    transformOrigin: 'bottom',
                    backgroundColor: isHovered
                      ? '#29D691'
                      : item.active
                        ? '#10B981'
                        : rawValue > 0
                          ? '#10B981'
                          : hasAnyData
                            ? 'rgba(16, 185, 129, 0.25)'
                            : 'rgba(41, 214, 145, 0.4)',
                    boxShadow: isHovered ? '0 0 14px rgba(41, 214, 145, 0.6)' : 'none'
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 14,
                    delay: idx * 0.05
                  }}
                />
              </div>

              {/* Etiqueta inferior */}
              <span
                className={`text-[10px] font-mono mt-2 transition-colors duration-150 ${
                  isHovered || item.active
                    ? 'text-[#29D691] font-bold'
                    : 'text-brand-light-muted dark:text-brand-dark-muted'
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
