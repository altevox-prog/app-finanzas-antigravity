/**
 * Utilidades de formato, emojis y transformación visual para Reportes y Gráficos
 */

export const isEmoji = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u.test(str);
};

export function getCategoryEmoji(item, fallbackName = '') {
  // 1. Icono asignado directamente si ya es emoji
  const icon = item?.icon;
  if (icon && isEmoji(icon)) {
    return icon;
  }

  // 2. Mapeo de iconos vectoriales legados de Lucide
  const LEGACY_ICON_MAP = {
    Utensils: '🍔',
    Car: '🚗',
    Home: '🏠',
    Zap: '🏠',
    Film: '🍿',
    HeartPulse: '💊',
    Activity: '💊',
    GraduationCap: '📚',
    ShoppingBag: '🛍️',
    Briefcase: '💼',
    TrendingUp: '📈',
    Coins: '💰',
    DollarSign: '💰',
    Wallet: '👛',
    CreditCard: '💳',
    PiggyBank: '💰',
    Plane: '🚗',
    Smartphone: '🛍️',
    Gift: '🛍️',
    Tag: '📦',
    MoreHorizontal: '📦',
    CircleDot: '📦'
  };
  if (icon && LEGACY_ICON_MAP[icon]) {
    return LEGACY_ICON_MAP[icon];
  }

  // 3. Si el nombre ya contiene un emoji embebido (ej: "☕ Café", "🛒 Mercado", "🔑 Arriendo")
  const rawName = item?.name || fallbackName || '';
  const emojiMatch = rawName.match(/(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u);
  if (emojiMatch) {
    return emojiMatch[0];
  }

  // 4. Mapeo rápido por nombre (reglas oficiales fintech)
  const lower = rawName.toLowerCase().trim();

  // Alimentación / Comida: 🍔
  if (lower.includes('alimento') || lower.includes('alimentac') || lower.includes('comida') || lower.includes('restaurante') || lower.includes('cafe') || lower.includes('café') || lower.includes('mercado') || lower.includes('pizza') || lower.includes('domicilio')) {
    return '🍔';
  }
  // Transporte: 🚗
  if (lower.includes('transporte') || lower.includes('gasolina') || lower.includes('taxi') || lower.includes('uber') || lower.includes('pasaje') || lower.includes('viaje') || lower.includes('carro') || lower.includes('mantenimiento') || lower.includes('moto') || lower.includes('bus')) {
    return '🚗';
  }
  // Hogar / Servicios: 🏠
  if (lower.includes('hogar') || lower.includes('servicio') || lower.includes('vivienda') || lower.includes('arriendo') || lower.includes('luz') || lower.includes('agua') || lower.includes('internet') || lower.includes('energia')) {
    return '🏠';
  }
  // Entretenimiento: 🍿
  if (lower.includes('entretenimiento') || lower.includes('ocio') || lower.includes('cine') || lower.includes('juego') || lower.includes('videojuego') || lower.includes('viajes') || lower.includes('suscrip') || lower.includes('netflix') || lower.includes('spotify')) {
    return '🍿';
  }
  // Salud: 💊
  if (lower.includes('salud') || lower.includes('cuidado') || lower.includes('medico') || lower.includes('médic') || lower.includes('cita') || lower.includes('doctor') || lower.includes('farmacia') || lower.includes('gym') || lower.includes('gimnasio') || lower.includes('aseo')) {
    return '💊';
  }
  // Compras: 🛍️
  if (lower.includes('compra') || lower.includes('ropa') || lower.includes('calzado') || lower.includes('tecnolog') || lower.includes('zapatos') || lower.includes('mall') || lower.includes('tienda') || lower.includes('shopping')) {
    return '🛍️';
  }
  // Educación: 📚
  if (lower.includes('educacion') || lower.includes('educación') || lower.includes('universidad') || lower.includes('libro') || lower.includes('curso') || lower.includes('estudio') || lower.includes('colegio')) {
    return '📚';
  }

  // Otros: 📦
  return '📦';
}

// Formateador compacto legible (ej: $1.2M, $450k, $1.250.000)
export function formatAbbreviatedMoney(amount, fallbackFormatter) {
  if (!amount || amount <= 0) return '$0';
  if (amount >= 1_000_000_000) {
    const b = (amount / 1_000_000_000).toFixed(1).replace('.0', '');
    return `$${b}B`;
  }
  if (amount >= 1_000_000) {
    const m = (amount / 1_000_000).toFixed(1).replace('.0', '');
    return `$${m}M`;
  }
  if (amount >= 100_000) {
    const k = Math.round(amount / 1_000);
    return `$${k}k`;
  }
  return fallbackFormatter ? fallbackFormatter(amount) : `$${amount}`;
}

export function hexToRgba(hex, alpha = 0.15) {
  if (!hex) return `rgba(148, 163, 184, ${alpha})`;
  if (hex.startsWith('rgba')) {
    return hex.replace(/[\d\.]+\)$/g, `${alpha})`);
  }
  if (hex.startsWith('rgb(')) {
    return hex.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(x => x + x).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return `rgba(148, 163, 184, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
