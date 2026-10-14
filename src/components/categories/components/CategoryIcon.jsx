import React from 'react';
import {
  Wallet, Building2, CreditCard, PiggyBank, Coins, DollarSign,
  Utensils, Home, Car, Zap, Film, HeartPulse, GraduationCap,
  Briefcase, TrendingUp, ShoppingBag, Plane, Smartphone, Gift,
  MoreHorizontal, CircleDot, Tag, Coffee, Bus, Activity, Sparkles,
  ArrowUpRight, ArrowDownRight, Check
} from 'lucide-react';

export const ICON_MAP = {
  Wallet,
  Building2,
  CreditCard,
  PiggyBank,
  Coins,
  DollarSign,
  Utensils,
  Home,
  Car,
  Zap,
  Film,
  HeartPulse,
  GraduationCap,
  Briefcase,
  TrendingUp,
  ShoppingBag,
  Plane,
  Smartphone,
  Gift,
  MoreHorizontal,
  CircleDot,
  Tag,
  Coffee,
  Bus,
  Activity,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Check
};

// Mapeo exhaustivo de iconos vectoriales antiguos a emojis nativos estilo WhatsApp
export const LEGACY_ICON_MAP = {
  Utensils: '🍔',
  Home: '🏠',
  Car: '🚗',
  Zap: '💡',
  Film: '🍿',
  HeartPulse: '💊',
  Activity: '💊',
  GraduationCap: '📚',
  Briefcase: '💼',
  TrendingUp: '📈',
  ShoppingBag: '🛍️',
  Plane: '✈️',
  Smartphone: '📱',
  Gift: '🎁',
  Coins: '💰',
  DollarSign: '💰',
  Wallet: '👛',
  CreditCard: '💳',
  PiggyBank: '💰',
  Coffee: '☕',
  Bus: '🚌',
  Tag: '🏷️',
  MoreHorizontal: '⋯',
  CircleDot: '🔘',
  Sparkles: '✨'
};

// Mapeo por nombre de categoría
export const CATEGORY_DEFAULT_EMOJIS = {
  'Comida / Restaurantes': '🍔',
  'Alimentación': '🍔',
  'Comida': '🍔',
  'Restaurantes': '🍔',
  'Transporte': '🚗',
  'Vivienda / Hogar': '🏠',
  'Vivienda': '🏠',
  'Hogar': '🏠',
  'Entretenimiento': '🍿',
  'Ocio': '🍿',
  'Salud / Cuidado': '💊',
  'Salud': '💊',
  'Salud y Bienestar': '💊',
  'Educación': '📚',
  'Compras / Ropa': '🛍️',
  'Compras': '🛍️',
  'Ropa': '🛍️',
  'Ingresos': '💰',
  'Salario': '💼',
  'Inversiones': '📈',
  'Servicios': '💡',
  'Viajes': '✈️',
  'Otros Gastos': '🏷️',
  'Otros Ingresos': '💰',
  'Negocio': '📈'
};

export const CATEGORY_DEFAULT_ICONS = {
  ...CATEGORY_DEFAULT_EMOJIS
};

// Lista de emojis disponibles / populares para categorías
export const AVAILABLE_ICONS = [
  '🍔', '🚗', '🏠', '🍿', '💊', '📚', '🛍️', '💰',
  '☕', '⛽', '🔑', '🎬', '🏥', '🎓', '👕', '💼',
  '🛒', '🚕', '💡', '🎮', '🏋️', '💻', '👟', '📈',
  '🍕', '🚌', '💧', '✈️', '🧴', '📖', '📱', '🎁'
];

// Helper para detectar si un string contiene un emoji
const isEmoji = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u.test(str);
};

const SIZE_STYLES = {
  sm: {
    box: 'w-8 h-8 rounded-xl',
    text: 'text-base',
    iconSize: 16
  },
  md: {
    box: 'w-10 h-10 rounded-2xl',
    text: 'text-xl',
    iconSize: 20
  },
  lg: {
    box: 'w-12 h-12 rounded-2xl',
    text: 'text-2xl',
    iconSize: 24
  }
};

/**
 * Componente refinado para visualización de iconos de categorías.
 * Renderiza emojis nativos a todo color (estilo WhatsApp) dentro de un squircle moderno
 * con compatibilidad total para iconos vectoriales legados.
 */
export default function CategoryIcon({
  icon,
  name,
  category,
  status,
  size = 'md',
  withBadge = false,
  badgeSize,
  color,
  solidBg = false,
  className = '',
  strokeWidth = 2.2,
  style = {}
}) {
  // Resolver el identificador o emoji
  let rawIcon = icon || name;
  let categoryColor = null;

  if (category && typeof category === 'object') {
    rawIcon = rawIcon || category.icon || CATEGORY_DEFAULT_EMOJIS[category.name];
    categoryColor = category.color;
    if (!status && category.type) {
      status = category.type === 'income' ? 'positive' : 'negative';
    }
  } else if (category && typeof category === 'string') {
    rawIcon = rawIcon || CATEGORY_DEFAULT_EMOJIS[category] || LEGACY_ICON_MAP[category] || category;
  }

  // Si todavía no se resolvió pero hay un nombre legado
  let resolvedEmoji = null;
  let isVectorIcon = false;

  if (rawIcon && isEmoji(rawIcon)) {
    resolvedEmoji = rawIcon;
  } else if (rawIcon && LEGACY_ICON_MAP[rawIcon]) {
    resolvedEmoji = LEGACY_ICON_MAP[rawIcon];
  } else if (rawIcon && ICON_MAP[rawIcon]) {
    isVectorIcon = true;
  } else {
    // Si viene texto descriptivo o categoría
    resolvedEmoji = CATEGORY_DEFAULT_EMOJIS[rawIcon] || '🏷️';
  }

  // Normalizar tamaño
  let sizeKey = 'md';
  if (typeof size === 'number') {
    if (size <= 20) sizeKey = 'sm';
    else if (size <= 28) sizeKey = 'md';
    else sizeKey = 'lg';
  } else if (SIZE_STYLES[size]) {
    sizeKey = size;
  }
  const sizeConf = SIZE_STYLES[sizeKey];

  // Configuración de colores de fondo y borde para el squircle
  const activeColor = color || categoryColor;
  let containerBg = 'rgba(0, 122, 255, 0.12)';
  let containerBorder = 'rgba(0, 122, 255, 0.2)';
  let vectorColor = activeColor || '#007AFF';

  if (solidBg) {
    containerBg = activeColor || '#007AFF';
    containerBorder = 'transparent';
    vectorColor = '#FFFFFF';
  } else if (status === 'positive') {
    containerBg = 'rgba(52, 199, 89, 0.15)';
    containerBorder = 'rgba(52, 199, 89, 0.25)';
    vectorColor = '#34C759';
  } else if (status === 'negative') {
    containerBg = 'rgba(255, 59, 48, 0.14)';
    containerBorder = 'rgba(255, 59, 48, 0.22)';
    vectorColor = '#FF3B30';
  } else if (activeColor) {
    containerBg = `${activeColor}1a`; // ~10% de opacidad
    containerBorder = `${activeColor}33`; // ~20% de opacidad
    vectorColor = activeColor;
  }

  // Contenido interno: Emoji nativo o Icono vectorial
  const renderInnerContent = () => {
    if (!isVectorIcon && resolvedEmoji) {
      return (
        <span 
          className={`leading-none select-none transition-transform duration-200 ${sizeConf.text}`}
          role="img" 
          aria-hidden="true"
        >
          {resolvedEmoji}
        </span>
      );
    }
    const IconComponent = ICON_MAP[rawIcon] || CircleDot;
    return (
      <IconComponent 
        size={sizeConf.iconSize} 
        strokeWidth={strokeWidth} 
        style={{ color: vectorColor }} 
      />
    );
  };

  if (!withBadge) {
    return (
      <span 
        className={`inline-flex items-center justify-center shrink-0 ${className}`} 
        style={style}
      >
        {renderInnerContent()}
      </span>
    );
  }

  const containerDimensionClass = badgeSize || sizeConf.box;

  return (
    <div 
      className={`inline-flex items-center justify-center shrink-0 border shadow-sm select-none transition-transform duration-200 ${containerDimensionClass} ${className}`}
      style={{ 
        backgroundColor: containerBg, 
        borderColor: containerBorder,
        ...style 
      }}
    >
      {renderInnerContent()}
    </div>
  );
}

// Compatibilidad previa para DynamicIcon
export const DynamicIcon = ({ name, size = 20, className = '', color = undefined, withBadge = false }) => {
  return (
    <CategoryIcon 
      name={name} 
      size={size} 
      className={className} 
      color={color} 
      withBadge={withBadge} 
    />
  );
};
