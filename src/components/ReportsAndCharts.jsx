import React, { useState } from 'react';
import { Tag, ChevronRight, PieChart, ArrowRight } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { safeNumber } from '../utils/financeMath';
import AllCategoriesModal from './reports/modals/AllCategoriesModal';
import CategoryDetailModal from './reports/modals/CategoryDetailModal';

const MODERN_PALETTE = [
  '#8B5CF6', // Violeta
  '#10B981', // Verde Esmeralda
  '#F97316', // Naranja Vivo
  '#0EA5E9', // Azul Eléctrico
  '#EC4899', // Rosa Fucsia
  '#F59E0B', // Ámbar
  '#6366F1', // Índigo
  '#14B8A6'  // Verde Azulado
];

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];


const isEmoji = (str) => {
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
function formatAbbreviatedMoney(amount, fallbackFormatter) {
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

export default function ReportsAndCharts({ 
  transactions = [], 
  categories = [], 
  selectedDate = new Date(), 
  selectedDay = null, 
  onOpenCalendar,
  financeActions = null,
  onNavigateToTab = null,
  setActiveTab = null
}) {
  const { formatMoney } = usePrivacy();
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null);
  const [selectedCategoryModal, setSelectedCategoryModal] = useState(null);
  const [showAllCategoriesModal, setShowAllCategoriesModal] = useState(false);

  const handleNav = (tab = 'transactions') => {
    const targetTab = (tab === 'movements' || tab === 'movimientos') ? 'transactions' : tab;
    if (financeActions && typeof financeActions.setActiveTab === 'function') {
      financeActions.setActiveTab(targetTab);
    } else if (financeActions && typeof financeActions.handleTabChange === 'function') {
      financeActions.handleTabChange(targetTab);
    } else if (typeof onNavigateToTab === 'function') {
      onNavigateToTab(targetTab);
    } else if (typeof setActiveTab === 'function') {
      setActiveTab(targetTab);
    }
  };

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  // Filter transactions for period
  const currentMonthTxs = transactions.filter(tx => {
    const d = new Date(tx.date + 'T00:00:00');
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const scopedTransactions = selectedDay 
    ? currentMonthTxs.filter(tx => tx.date === selectedDay)
    : currentMonthTxs;

  const isTransferTx = (tx) => Boolean(
    tx && (
      tx.isTransfer ||
      tx.is_transfer ||
      tx.type === 'transfer' ||
      tx.type === 'transferencia' ||
      tx.categoryId === 'cat-transfer' ||
      tx.category_id === 'cat-transfer' ||
      tx.subcategoryId === 'sub-transfer-in' ||
      tx.subcategoryId === 'sub-transfer-out'
    )
  );

  const monthExpenses = scopedTransactions.filter(t => (t?.type === 'expense' || t?.type === 'gasto') && !isTransferTx(t));
  const totalExpense = monthExpenses.reduce((sum, t) => sum + safeNumber(t?.amount), 0);

  // Group expenses by category
  const expenseByCategoryMap = {};
  monthExpenses.forEach(tx => {
    if (!expenseByCategoryMap[tx.categoryId]) {
      const cat = categories.find(c => c.id === tx.categoryId || c.name === tx.categoryName);
      expenseByCategoryMap[tx.categoryId] = {
        id: tx.categoryId,
        name: tx.categoryName || (cat ? cat.name : 'Varios'),
        icon: cat?.icon,
        color: cat?.color || null,
        amount: 0
      };
    }
    expenseByCategoryMap[tx.categoryId].amount += safeNumber(tx.amount);
  });

  // Calculate percentages and assign vibrant palette
  const categoryExpenses = Object.values(expenseByCategoryMap)
    .sort((a, b) => b.amount - a.amount)
    .map((cat, index) => {
      const exactPercent = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
      const roundedPercent = Math.round(exactPercent);
      return {
        ...cat,
        color: cat.color || MODERN_PALETTE[index % MODERN_PALETTE.length],
        exactPercent,
        percent: roundedPercent,
        percentage: roundedPercent
      };
    });

  const topCategories = categoryExpenses.slice(0, 3);
  const hoveredCategory = categoryExpenses.find(c => c.id === hoveredCategoryId);

  // Period label for pill
  const periodLabel = selectedDay 
    ? selectedDay.split('-').slice(1).join('/')
    : `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  // Data for the single category modal if open
  const categoryTransactions = selectedCategoryModal 
    ? monthExpenses.filter(t => t.categoryId === selectedCategoryModal.id)
    : [];

  const subcategoryBreakdown = {};
  if (selectedCategoryModal) {
    categoryTransactions.forEach(t => {
      const subName = t.subcategoryName || 'General';
      subcategoryBreakdown[subName] = (subcategoryBreakdown[subName] || 0) + Number(t.amount || 0);
    });
  }
  const subcategoriesList = Object.entries(subcategoryBreakdown).map(([name, amount]) => ({
    name,
    amount
  })).sort((a, b) => b.amount - a.amount);

  return (
    <div 
      onClick={() => {
        if (financeActions && typeof financeActions.setActiveTab === 'function') {
          financeActions.setActiveTab('transactions');
        } else {
          handleNav('transactions');
        }
      }}
      className="min-h-[140px] p-5 sm:p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group relative overflow-hidden"
      style={{ 
        backgroundColor: 'var(--bg-card, #ffffff)', 
        borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))' 
      }}
    >
      <div>
        {/* Cabecera limpia interna sin pastilla de fecha ni texto Detalles > */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Tus gastos</span>
          </span>
          {totalExpense > 0 && (
            <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatMoney(totalExpense)}
            </span>
          )}
        </div>

        {/* Zona de visualización (Layout Horizontal 2 Columnas) */}
        <div className="flex items-center justify-between gap-3">
          {/* Columna Izquierda (Mini-Dona estilizada) */}
          <div 
            className="relative w-24 h-24 sm:w-26 sm:h-26 shrink-0 flex items-center justify-center cursor-pointer group"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (financeActions && typeof financeActions.setActiveTab === 'function') {
                financeActions.setActiveTab('transactions');
              } else {
                handleNav('transactions');
              }
            }}
            title={`Total de gastos: ${formatMoney(totalExpense)}`}
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
              {categoryExpenses.length > 0 && (() => {
                const circumference = 2 * Math.PI * 38; // ~238.76
                let accumulatedPercent = 0;

                return categoryExpenses.map((cat, index) => {
                  const percent = cat.exactPercent;
                  const strokeLength = (percent / 100) * circumference;
                  const gap = categoryExpenses.length > 1 ? 1.8 : 0;
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
                        setSelectedCategoryModal(cat);
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
                    {getCategoryEmoji(hoveredCategory, hoveredCategory.name)}
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
                    {totalExpense > 0 ? formatAbbreviatedMoney(totalExpense, formatMoney) : '$0'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha (Icono de planta si vacío, o Top 3 categorías) */}
          {categoryExpenses.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center pl-2 py-1">
              <span className="text-2xl mb-0.5">🌱</span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sin gastos este mes</p>
              <p className="text-[10px] text-slate-400">Tus finanzas están al día</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center gap-1.5 pl-2 min-w-0">
              {topCategories.slice(0, 3).map((cat, index) => {
                const displayEmoji = getCategoryEmoji(cat, cat.name);
                const isHovered = hoveredCategoryId === cat.id;

                return (
                  <div 
                    key={cat.id || cat.name || index} 
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategoryModal(cat);
                    }}
                    onMouseEnter={() => setHoveredCategoryId(cat.id)}
                    onMouseLeave={() => setHoveredCategoryId(null)}
                    className={`flex flex-col gap-0.5 cursor-pointer group rounded-lg p-0.5 transition-all ${
                      isHovered ? 'bg-slate-100/80 dark:bg-white/5' : ''
                    }`}
                    title={`Ver detalle de ${cat.name}: ${formatMoney(cat.amount)}`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 truncate">
                        <span className="text-xs shrink-0 leading-none">{displayEmoji}</span>
                        <span className="truncate group-hover:text-emerald-500 transition-colors">
                          {cat.name}
                        </span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white shrink-0 ml-1 tabular-nums">
                        {cat.percentage}%
                      </span>
                    </div>
                    {/* Barra fina de progreso con su color */}
                    <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, Math.max(3, cat.exactPercent))}%`, 
                          backgroundColor: cat.color 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer homogéneo */}
      <div 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (financeActions && typeof financeActions.setActiveTab === 'function') {
            financeActions.setActiveTab('transactions');
          } else {
            handleNav('transactions');
          }
        }}
        className="pt-2.5 mt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs cursor-pointer"
      >
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          Distribución de gastos
        </span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform">
          <span>Historial de movimientos</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>

      {/* Modales de Historial y Detalle de Categoría */}
      <AllCategoriesModal
        isOpen={showAllCategoriesModal}
        onClose={() => setShowAllCategoriesModal(false)}
        categoryExpenses={categoryExpenses}
        onSelectCategory={(cat) => {
          setShowAllCategoriesModal(false);
          setSelectedCategoryModal(cat);
        }}
        formatMoney={formatMoney}
        getCategoryEmoji={getCategoryEmoji}
        periodLabel={periodLabel}
        totalExpense={totalExpense}
      />

      <CategoryDetailModal
        isOpen={Boolean(selectedCategoryModal)}
        category={selectedCategoryModal}
        onClose={() => setSelectedCategoryModal(null)}
        formatMoney={formatMoney}
        getCategoryEmoji={getCategoryEmoji}
        selectedDay={selectedDay}
        categoryTransactions={categoryTransactions}
        subcategoriesList={subcategoriesList}
      />
    </div>
  );
}
