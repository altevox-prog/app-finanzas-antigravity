export const DEMO_ACCOUNT_ID_CASH = '00000001-0000-4000-8000-000000000001';
export const DEMO_ACCOUNT_ID_BANK = '00000002-0000-4000-8000-000000000002';
export const INITIAL_ACCOUNTS = [];

const createCat = (id, name, type, color, icon, subs) => ({
  id, name, type, color, icon,
  subcategories: subs.map(([sid, sname]) => ({ id: sid, name: sname }))
});

export const DEFAULT_CATEGORIES = [
  createCat('cat-alimentacion', 'Alimentación', 'expense', '#FF9500', '🍔', [
    ['sub-mercado', '🛒 Mercado / Supermercado'], ['sub-restaurantes', '🍕 Restaurantes y domicilios'],
    ['sub-cafe', '☕ Café y panadería'], ['sub-salidas', '🍻 Salidas y bares']
  ]),
  createCat('cat-vivienda', 'Vivienda', 'expense', '#FF9500', '🏠', [
    ['sub-arriendo', '🔑 Arriendo / Hipoteca'], ['sub-administracion', '🏢 Administración'],
    ['sub-mantenimiento-hogar', '🔧 Mantenimiento y reparaciones'], ['sub-muebles', '🛋️ Muebles y decoración']
  ]),
  createCat('cat-servicios', 'Servicios', 'expense', '#FFCC00', '💡', [
    ['sub-energia', '⚡ Energía eléctrica'], ['sub-agua', '💧 Agua y alcantarillado'],
    ['sub-gas', '🔥 Gas domiciliario'], ['sub-internet', '🌐 Internet y telefonía']
  ]),
  createCat('cat-transporte', 'Transporte', 'expense', '#007AFF', '🚗', [
    ['sub-gasolina', '⛽ Gasolina'], ['sub-taxi-uber', '🚕 Taxi / Uber / Didi'],
    ['sub-pasajes', '🚌 Pasajes / Transmilenio / Metro'], ['sub-taller', '🔧 Mantenimiento y taller'],
    ['sub-parqueadero', '🅿️ Parqueadero y peajes']
  ]),
  createCat('cat-ocio', 'Ocio', 'expense', '#AF52DE', '🍿', [
    ['sub-cine', '🎬 Cine y teatro'], ['sub-videojuegos', '🎮 Videojuegos'],
    ['sub-conciertos', '🎵 Conciertos y eventos'], ['sub-suscripciones', '📺 Suscripciones y streaming']
  ]),
  createCat('cat-salud', 'Salud', 'expense', '#34C759', '💊', [
    ['sub-citas-medicas', '🏥 Citas médicas y EPS'], ['sub-farmacia', '💊 Farmacia y medicamentos'],
    ['sub-aseo-personal', '🧴 Aseo personal'], ['sub-gimnasio', '🏋️ Gimnasio y deportes']
  ]),
  createCat('cat-educacion', 'Educación', 'expense', '#5856D6', '📚', [
    ['sub-libros', '📖 Libros y material'], ['sub-cursos', '💻 Cursos y certificaciones'], ['sub-idiomas', '🗣️ Idiomas']
  ]),
  createCat('cat-compras', 'Compras', 'expense', '#FF2D55', '🛍️', [
    ['sub-ropa', '👕 Ropa y calzado'], ['sub-accesorios', '🕶️ Accesorios'], ['sub-articulos-personales', '📦 Artículos personales']
  ]),
  createCat('cat-tecnologia', 'Tecnología', 'expense', '#5AC8FA', '📱', [
    ['sub-celular', '📱 Celulares y accesorios'], ['sub-computadores', '💻 Computadores y tablets'],
    ['sub-software', '💾 Software y licencias'], ['sub-reparacion-tech', '🔌 Reparaciones']
  ]),
  createCat('cat-viajes', 'Viajes', 'expense', '#007AFF', '✈️', [
    ['sub-tiquetes', '✈️ Tiquetes aéreos'], ['sub-hospedaje', '🏨 Hoteles y hospedaje'],
    ['sub-tours', '🗺️ Tours y actividades'], ['sub-viaticos', '🎒 Viáticos y maletas']
  ]),
  createCat('cat-cuidado-personal', 'Cuidado Personal', 'expense', '#EC4899', '💇', [
    ['sub-peluqueria', '✂️ Peluquería y barbería'], ['sub-spa', '💅 Spa y estética'], ['sub-cosmeticos', '🧴 Cosméticos y cuidado facial']
  ]),
  createCat('cat-mascotas', 'Mascotas', 'expense', '#F97316', '🐶', [
    ['sub-alimento-mascotas', '🦴 Alimento y concentrado'], ['sub-veterinaria', '🩺 Veterinaria y vacunas'],
    ['sub-juguetes-mascotas', '🧸 Juguetes y accesorios'], ['sub-bano-mascotas', '🛁 Peluquería y baño canino']
  ]),
  createCat('cat-finanzas-seguros', 'Finanzas y Seguros', 'expense', '#64748B', '🏛️', [
    ['sub-comisiones-bancarias', '🏦 Comisiones y cuotas de manejo'], ['sub-impuestos-dian', '🏛️ Impuestos DIAN y notarías'],
    ['sub-seguros', '🛡️ Pólizas y seguros'], ['sub-intereses', '📉 Intereses y cargos financieros']
  ]),
  createCat('cat-otros-gastos', 'Otros Gastos', 'expense', '#8E8E93', '🏷️', [
    ['sub-regalos', '🎁 Regalos y celebraciones'], ['sub-donaciones', '🤝 Donaciones y caridad'],
    ['sub-imprevistos', '⚠️ Imprevistos y emergencias'], ['sub-varios', '🏷️ Gastos varios']
  ]),
  createCat('cat-ingresos', 'Ingresos', 'income', '#34C759', '💰', [
    ['sub-salario', '💼 Salario y nómina'], ['sub-inversiones', '📈 Inversiones y rendimientos'],
    ['sub-freelance', '💻 Honorarios y freelance'], ['sub-bonos', '🎁 Regalos y bonificaciones']
  ])
];

export const INITIAL_CATEGORIES = DEFAULT_CATEGORIES;
export const INITIAL_TRANSACTIONS = [];
export const INITIAL_DEBTS_AND_LOANS = [];
export const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const getDecimalsSetting = () => {
  try {
    if (typeof window === 'undefined') return false;
    const raw = localStorage.getItem('app_enable_decimals');
    if (raw !== null) return raw === 'true';
    const parsed = JSON.parse(localStorage.getItem('user_settings') || '{}');
    return Boolean(parsed?.enable_decimals ?? parsed?.enableDecimals ?? parsed?.showDecimals ?? parsed?.allowDecimals);
  } catch { return false; }
};

export const formatCurrency = (amount, isCensored = false, showDecimalsParam = undefined) => {
  const num = Number(amount) || 0;
  if (isCensored) return num < 0 ? '-$ ••••••' : '$ ••••••';
  const showDecimals = showDecimalsParam !== undefined ? Boolean(showDecimalsParam) : getDecimalsSetting();
  const digits = showDecimals ? 2 : 0;
  const val = showDecimals ? Math.abs(num) : Math.round(Math.abs(num));
  return `${num < 0 ? '-' : ''}$ ${val.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

export const formatUSD = (amount, isCensored = false, showDecimalsParam = undefined) =>
  formatCurrency(amount, isCensored, showDecimalsParam);

export const INVESTMENT_CATEGORIES = [
  ['variable', 'Renta Variable', 'Renta Variable', '#007AFF', 'TrendingUp', 'Acciones globales, ETFs (VOO, QQQ) y fondos bursátiles'],
  ['fixed', 'Renta Fija', 'Renta Fija', '#34C759', 'ShieldCheck', 'Certificados de depósito a término y bonos con tasa pactada'],
  ['liquidity', 'Liquidez', 'Liquidez', '#5AC8FA', 'Coins', 'Cuentas remuneradas y fondos de liquidez a la vista'],
  ['crypto', 'Cripto', 'Cripto', '#FF9500', 'Sparkles', 'Bitcoin, Ethereum, stablecoins y criptoactivos']
].map(([id, name, shortName, color, icon, description]) => ({ id, name, shortName, color, icon, description }));

export const INITIAL_INVESTMENTS = [];
export const INITIAL_SUBSCRIPTIONS = [];
export const INITIAL_BUDGETS = { global: 0, categories: {} };
export const INITIAL_SAVINGS_GOALS = [];
