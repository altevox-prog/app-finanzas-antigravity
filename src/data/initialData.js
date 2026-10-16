// IDs estables para las cuentas demo/iniciales (UUIDs válidos para Supabase)
export const DEMO_ACCOUNT_ID_CASH = '00000001-0000-4000-8000-000000000001';
export const DEMO_ACCOUNT_ID_BANK = '00000002-0000-4000-8000-000000000002';

export const INITIAL_ACCOUNTS = [];

export const DEFAULT_CATEGORIES = [
  // 14 Categorías de Gastos Completas con Subcategorías y Emojis Oficiales
  {
    id: 'cat-alimentacion',
    name: 'Alimentación',
    type: 'expense',
    color: '#FF9500',
    icon: '🍔',
    subcategories: [
      { id: 'sub-mercado', name: '🛒 Mercado / Supermercado' },
      { id: 'sub-restaurantes', name: '🍕 Restaurantes y domicilios' },
      { id: 'sub-cafe', name: '☕ Café y panadería' },
      { id: 'sub-salidas', name: '🍻 Salidas y bares' }
    ]
  },
  {
    id: 'cat-vivienda',
    name: 'Vivienda',
    type: 'expense',
    color: '#FF9500',
    icon: '🏠',
    subcategories: [
      { id: 'sub-arriendo', name: '🔑 Arriendo / Hipoteca' },
      { id: 'sub-administracion', name: '🏢 Administración' },
      { id: 'sub-mantenimiento-hogar', name: '🔧 Mantenimiento y reparaciones' },
      { id: 'sub-muebles', name: '🛋️ Muebles y decoración' }
    ]
  },
  {
    id: 'cat-servicios',
    name: 'Servicios',
    type: 'expense',
    color: '#FFCC00',
    icon: '💡',
    subcategories: [
      { id: 'sub-energia', name: '⚡ Energía eléctrica' },
      { id: 'sub-agua', name: '💧 Agua y alcantarillado' },
      { id: 'sub-gas', name: '🔥 Gas domiciliario' },
      { id: 'sub-internet', name: '🌐 Internet y telefonía' }
    ]
  },
  {
    id: 'cat-transporte',
    name: 'Transporte',
    type: 'expense',
    color: '#007AFF',
    icon: '🚗',
    subcategories: [
      { id: 'sub-gasolina', name: '⛽ Gasolina' },
      { id: 'sub-taxi-uber', name: '🚕 Taxi / Uber / Didi' },
      { id: 'sub-pasajes', name: '🚌 Pasajes / Transmilenio / Metro' },
      { id: 'sub-taller', name: '🔧 Mantenimiento y taller' },
      { id: 'sub-parqueadero', name: '🅿️ Parqueadero y peajes' }
    ]
  },
  {
    id: 'cat-ocio',
    name: 'Ocio',
    type: 'expense',
    color: '#AF52DE',
    icon: '🍿',
    subcategories: [
      { id: 'sub-cine', name: '🎬 Cine y teatro' },
      { id: 'sub-videojuegos', name: '🎮 Videojuegos' },
      { id: 'sub-conciertos', name: '🎵 Conciertos y eventos' },
      { id: 'sub-suscripciones', name: '📺 Suscripciones y streaming' }
    ]
  },
  {
    id: 'cat-salud',
    name: 'Salud',
    type: 'expense',
    color: '#34C759',
    icon: '💊',
    subcategories: [
      { id: 'sub-citas-medicas', name: '🏥 Citas médicas y EPS' },
      { id: 'sub-farmacia', name: '💊 Farmacia y medicamentos' },
      { id: 'sub-aseo-personal', name: '🧴 Aseo personal' },
      { id: 'sub-gimnasio', name: '🏋️ Gimnasio y deportes' }
    ]
  },
  {
    id: 'cat-educacion',
    name: 'Educación',
    type: 'expense',
    color: '#5856D6',
    icon: '📚',
    subcategories: [
      { id: 'sub-libros', name: '📖 Libros y material' },
      { id: 'sub-cursos', name: '💻 Cursos y certificaciones' },
      { id: 'sub-idiomas', name: '🗣️ Idiomas' }
    ]
  },
  {
    id: 'cat-compras',
    name: 'Compras',
    type: 'expense',
    color: '#FF2D55',
    icon: '🛍️',
    subcategories: [
      { id: 'sub-ropa', name: '👕 Ropa y calzado' },
      { id: 'sub-accesorios', name: '🕶️ Accesorios' },
      { id: 'sub-articulos-personales', name: '📦 Artículos personales' }
    ]
  },
  {
    id: 'cat-tecnologia',
    name: 'Tecnología',
    type: 'expense',
    color: '#5AC8FA',
    icon: '📱',
    subcategories: [
      { id: 'sub-celular', name: '📱 Celulares y accesorios' },
      { id: 'sub-computadores', name: '💻 Computadores y tablets' },
      { id: 'sub-software', name: '💾 Software y licencias' },
      { id: 'sub-reparacion-tech', name: '🔌 Reparaciones' }
    ]
  },
  {
    id: 'cat-viajes',
    name: 'Viajes',
    type: 'expense',
    color: '#007AFF',
    icon: '✈️',
    subcategories: [
      { id: 'sub-tiquetes', name: '✈️ Tiquetes aéreos' },
      { id: 'sub-hospedaje', name: '🏨 Hoteles y hospedaje' },
      { id: 'sub-tours', name: '🗺️ Tours y actividades' },
      { id: 'sub-viaticos', name: '🎒 Viáticos y maletas' }
    ]
  },
  {
    id: 'cat-cuidado-personal',
    name: 'Cuidado Personal',
    type: 'expense',
    color: '#EC4899',
    icon: '💇',
    subcategories: [
      { id: 'sub-peluqueria', name: '✂️ Peluquería y barbería' },
      { id: 'sub-spa', name: '💅 Spa y estética' },
      { id: 'sub-cosmeticos', name: '🧴 Cosméticos y cuidado facial' }
    ]
  },
  {
    id: 'cat-mascotas',
    name: 'Mascotas',
    type: 'expense',
    color: '#F97316',
    icon: '🐶',
    subcategories: [
      { id: 'sub-alimento-mascotas', name: '🦴 Alimento y concentrado' },
      { id: 'sub-veterinaria', name: '🩺 Veterinaria y vacunas' },
      { id: 'sub-juguetes-mascotas', name: '🧸 Juguetes y accesorios' },
      { id: 'sub-bano-mascotas', name: '🛁 Peluquería y baño canino' }
    ]
  },
  {
    id: 'cat-finanzas-seguros',
    name: 'Finanzas y Seguros',
    type: 'expense',
    color: '#64748B',
    icon: '🏛️',
    subcategories: [
      { id: 'sub-comisiones-bancarias', name: '🏦 Comisiones y cuotas de manejo' },
      { id: 'sub-impuestos-dian', name: '🏛️ Impuestos DIAN y notarías' },
      { id: 'sub-seguros', name: '🛡️ Pólizas y seguros' },
      { id: 'sub-intereses', name: '📉 Intereses y cargos financieros' }
    ]
  },
  {
    id: 'cat-otros-gastos',
    name: 'Otros Gastos',
    type: 'expense',
    color: '#8E8E93',
    icon: '🏷️',
    subcategories: [
      { id: 'sub-regalos', name: '🎁 Regalos y celebraciones' },
      { id: 'sub-donaciones', name: '🤝 Donaciones y caridad' },
      { id: 'sub-imprevistos', name: '⚠️ Imprevistos y emergencias' },
      { id: 'sub-varios', name: '🏷️ Gastos varios' }
    ]
  },
  // Categoría de Ingresos
  {
    id: 'cat-ingresos',
    name: 'Ingresos',
    type: 'income',
    color: '#34C759',
    icon: '💰',
    subcategories: [
      { id: 'sub-salario', name: '💼 Salario y nómina' },
      { id: 'sub-inversiones', name: '📈 Inversiones y rendimientos' },
      { id: 'sub-freelance', name: '💻 Honorarios y freelance' },
      { id: 'sub-bonos', name: '🎁 Regalos y bonificaciones' }
    ]
  }
];

export const INITIAL_CATEGORIES = DEFAULT_CATEGORIES;

export const INITIAL_TRANSACTIONS = [];

export const INITIAL_DEBTS_AND_LOANS = [];

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const formatCurrency = (amount, isCensored = false, showDecimalsParam = undefined) => {
  if (isCensored) {
    const num = Number(amount) || 0;
    if (num < 0) return '-$ ••••••';
    return '$ ••••••';
  }
  const num = Number(amount) || 0;
  let enableDecimals = false;
  try {
    enableDecimals = typeof window !== 'undefined' && localStorage.getItem('app_enable_decimals') === 'true';
  } catch {}

  const finalShowDecimals = showDecimalsParam !== undefined ? Boolean(showDecimalsParam) : enableDecimals;

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: finalShowDecimals ? 2 : 0,
    maximumFractionDigits: finalShowDecimals ? 2 : 0
  }).format(num);
};

export const formatUSD = (amount, isCensored = false, showDecimalsParam = undefined) => {
  if (isCensored) {
    const num = Number(amount) || 0;
    if (num < 0) return '-$ ••••••';
    return '$ ••••••';
  }
  const num = Number(amount) || 0;
  let enableDecimals = false;
  try {
    enableDecimals = typeof window !== 'undefined' && localStorage.getItem('app_enable_decimals') === 'true';
  } catch {}

  const finalShowDecimals = showDecimalsParam !== undefined ? Boolean(showDecimalsParam) : enableDecimals;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: finalShowDecimals ? 2 : 0,
    maximumFractionDigits: finalShowDecimals ? 2 : 0
  }).format(num);
};

export const INVESTMENT_CATEGORIES = [
  {
    id: 'variable',
    name: 'Renta Variable',
    shortName: 'Renta Variable',
    color: '#007AFF',
    icon: 'TrendingUp',
    description: 'Acciones globales, ETFs (VOO, QQQ) y fondos bursátiles'
  },
  {
    id: 'fixed',
    name: 'Renta Fija',
    shortName: 'Renta Fija',
    color: '#34C759',
    icon: 'ShieldCheck',
    description: 'Certificados de depósito a término y bonos con tasa pactada'
  },
  {
    id: 'liquidity',
    name: 'Liquidez',
    shortName: 'Liquidez',
    color: '#5AC8FA',
    icon: 'Coins',
    description: 'Cuentas remuneradas y fondos de liquidez a la vista'
  },
  {
    id: 'crypto',
    name: 'Cripto',
    shortName: 'Cripto',
    color: '#FF9500',
    icon: 'Sparkles',
    description: 'Bitcoin, Ethereum, stablecoins y criptoactivos'
  }
];

export const INITIAL_INVESTMENTS = [];

export const INITIAL_SUBSCRIPTIONS = [];

export const INITIAL_BUDGETS = {
  global: 0,
  categories: {}
};

export const INITIAL_SAVINGS_GOALS = [];


