import React, { useState } from 'react';
import { Tag, ChevronRight, PieChart, ArrowRight } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import { safeNumber } from '../../utils/financeMath';
import AllCategoriesModal from './modals/AllCategoriesModal';
import CategoryDetailModal from './modals/CategoryDetailModal';

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


import { 
  isEmoji, 
  getCategoryEmoji, 
  formatAbbreviatedMoney 
} from './utils/reportHelpers';
import CategoryDonutChart from './components/CategoryDonutChart';

export { getCategoryEmoji };


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
          <CategoryDonutChart
            categories={categoryExpenses}
            totalExpenses={totalExpense}
            hoveredCategoryId={hoveredCategoryId}
            setHoveredCategoryId={setHoveredCategoryId}
            formatMoney={formatMoney}
            onSelectCategory={(cat) => setSelectedCategoryModal(cat)}
            onCenterClick={() => {
              if (financeActions && typeof financeActions.setActiveTab === 'function') {
                financeActions.setActiveTab('transactions');
              } else {
                handleNav('transactions');
              }
            }}
            getCategoryEmoji={getCategoryEmoji}
          />

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
