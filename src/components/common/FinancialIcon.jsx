import React from 'react';
import { 
  Wallet, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown,
  Scale
} from 'lucide-react';

/**
 * Componente reutilizable para iconos financieros con tamaño uniforme
 * y soporte dinámico de color según estado (positivo, negativo, neutral).
 * 
 * @param {'wallet'|'balance'|'income'|'expense'|'trend-up'|'trend-down'} type Tipo de métrica financiera
 * @param {'positive'|'negative'|'neutral'|'auto'} status Estado de color
 * @param {number} size Tamaño uniforme (default: 20px, también soporta 24px u otro)
 * @param {boolean} withBadge Si es true, añade contenedor/insignia redondeada con color de fondo
 * @param {string} className Clases adicionales Tailwind
 * @param {number} strokeWidth Grosor del trazo (default: 2.2)
 */
export default function FinancialIcon({
  type = 'wallet',
  status = 'neutral',
  size = 20,
  withBadge = false,
  badgeSize,
  className = '',
  strokeWidth = 2.2,
  amount = null,
  style = {}
}) {
  // Resolución automática de estado si se proporciona un monto
  let resolvedStatus = status;
  if (status === 'auto' && amount !== null) {
    const num = Number(amount) || 0;
    if (num > 0) resolvedStatus = 'positive';
    else if (num < 0) resolvedStatus = 'negative';
    else resolvedStatus = 'neutral';
  } else if (status === 'neutral' && type === 'income') {
    resolvedStatus = 'positive';
  } else if (status === 'neutral' && type === 'expense') {
    resolvedStatus = 'negative';
  }

  // Paleta de colores estándar para estados financieros
  const STATUS_CONFIG = {
    positive: {
      color: '#34C759',
      textColor: 'text-[#34C759]',
      bgColor: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/25'
    },
    negative: {
      color: '#FF3B30',
      textColor: 'text-[#FF3B30]',
      bgColor: 'bg-red-500/15',
      borderColor: 'border-red-500/25'
    },
    neutral: {
      color: '#007AFF',
      textColor: 'text-[#007AFF]',
      bgColor: 'bg-blue-500/15',
      borderColor: 'border-blue-500/25'
    }
  };

  const currentStatus = STATUS_CONFIG[resolvedStatus] || STATUS_CONFIG.neutral;

  // Selección de Icono Lucide según el tipo
  const renderIcon = () => {
    switch (type) {
      case 'wallet':
      case 'balance':
        return <Wallet size={size} strokeWidth={strokeWidth} />;
      case 'income':
        return <ArrowUpRight size={size} strokeWidth={strokeWidth} />;
      case 'expense':
        return <ArrowDownRight size={size} strokeWidth={strokeWidth} />;
      case 'arrow-up':
        return <ArrowUp size={size} strokeWidth={strokeWidth} />;
      case 'arrow-down':
        return <ArrowDown size={size} strokeWidth={strokeWidth} />;
      case 'trend-up':
        return <TrendingUp size={size} strokeWidth={strokeWidth} />;
      case 'trend-down':
        return <TrendingDown size={size} strokeWidth={strokeWidth} />;
      default:
        return <Scale size={size} strokeWidth={strokeWidth} />;
    }
  };

  // Si no requiere contenedor/badge, devuelve el icono puro con color
  if (!withBadge) {
    return (
      <span 
        className={`inline-flex items-center justify-center shrink-0 ${currentStatus.textColor} ${className}`}
        style={{ color: currentStatus.color, ...style }}
      >
        {renderIcon()}
      </span>
    );
  }

  // Cálculo de dimensiones de badge según el tamaño de icono (20px -> ~36px, 24px -> ~44px)
  const defaultBadgeSize = size >= 24 ? 'w-10 h-10 rounded-2xl' : size >= 20 ? 'w-8 h-8 rounded-xl' : 'w-7 h-7 rounded-lg';
  const resolvedBadgeClass = badgeSize || defaultBadgeSize;

  return (
    <div 
      className={`inline-flex items-center justify-center shrink-0 ${resolvedBadgeClass} ${currentStatus.bgColor} ${currentStatus.textColor} ${className}`}
      style={{ color: currentStatus.color, ...style }}
    >
      {renderIcon()}
    </div>
  );
}
