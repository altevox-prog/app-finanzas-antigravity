import React, { useState, useEffect } from 'react';
import { 
  CalendarSync, 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  Zap, 
  Bell, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  MoreVertical,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import BrandIcon from '../ui/BrandIcon';
import CategoryIcon from '../categories/components/CategoryIcon';
import AddRecurringModal from './modals/AddRecurringModal';
import SwipeableRow from '../common/SwipeableRow';
import { safeNumber } from '../../utils/financeMath';
import { processDueRecurringPayments } from '../../services/recurring/recurringAutoProcessor';

export default function RecurringView({
  recurringPayments = [],
  onAddRecurring,
  onUpdateRecurring,
  onDeleteRecurring,
  onToggleActiveRecurring,
  onOpenCreateModal = null,
  onOpenAddRecurring = null,
  setIsAddRecurringOpen = null,
  onBack,
  fromSettings = false,
  previousView,
  accounts = [],
  categories = [],
  onAddCategory,
  onAddSubcategory,
  trm = 4000,
  onAddTransaction = null
}) {
  const { formatMoney } = usePrivacy();

  // Internal modal state for edit or local empty state create
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const handleOpenLocalCreate = () => {
    setEditingItem(null);
    if (setIsAddRecurringOpen) {
      setIsAddRecurringOpen(true);
    } else if (onOpenAddRecurring) {
      onOpenAddRecurring();
    } else if (onOpenCreateModal) {
      onOpenCreateModal();
    } else {
      setIsModalOpen(true);
    }
  };

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else if (fromSettings || previousView === 'settings') {
      if (typeof window !== 'undefined' && window.history.length > 2) {
        window.history.back();
      }
    } else if (typeof window !== 'undefined' && window.history.length > 2) {
      window.history.back();
    }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveItem = (itemData) => {
    if (editingItem) {
      onUpdateRecurring(itemData);
    } else {
      onAddRecurring(itemData);
    }
    setEditingItem(null);
  };

  // Filtro de visualización: 'all' | 'expense' | 'income'
  const [filterType, setFilterType] = useState('all');

  // Evaluación y ejecución automática de movimientos vencidos al cargar la vista
  useEffect(() => {
    if (typeof onAddTransaction === 'function' && typeof onUpdateRecurring === 'function' && recurringPayments?.length > 0) {
      processDueRecurringPayments({
        recurringPayments,
        onAddTransaction,
        onUpdateRecurring
      });
    }
  }, [recurringPayments, onAddTransaction, onUpdateRecurring]);

  // Lista normalizada y elementos activos
  const safeRecurring = Array.isArray(recurringPayments) ? recurringPayments : [];
  const activeItems = safeRecurring.filter(item => item.isActive !== false && item.active !== false);

  const autoCount = activeItems.filter(item => (item.mode || 'auto') !== 'manual').length;
  const manualCount = activeItems.filter(item => item.mode === 'manual').length;

  // Función de proyección mensual según frecuencia
  const toMonthlyAmount = (item) => {
    const amt = safeNumber(item.amount);
    switch (item.frequency) {
      case 'weekly': return Math.round(amt * 4.33);
      case 'biweekly': return amt * 2;
      case 'monthly': return amt;
      case 'bimonthly': return Math.round(amt / 2);
      case 'quarterly': return Math.round(amt / 3);
      case 'semiannual': return Math.round(amt / 6);
      case 'yearly': return Math.round(amt / 12);
      default: return amt;
    }
  };

  // 1. Total Ingresos Recurrentes esperados
  const totalIncomeProjected = activeItems
    .filter(item => item.type === 'income')
    .reduce((sum, item) => sum + toMonthlyAmount(item), 0);

  // 2. Total Gastos Recurrentes comprometidos
  const totalExpenseProjected = activeItems
    .filter(item => item.type !== 'income')
    .reduce((sum, item) => sum + toMonthlyAmount(item), 0);

  // Filtrado reactivo de elementos para la lista
  const filteredRecurring = safeRecurring.filter(item => {
    if (filterType === 'expense') return item.type !== 'income';
    if (filterType === 'income') return item.type === 'income';
    return true;
  });

  const autoItems = filteredRecurring.filter(item => (item.mode || 'auto') !== 'manual');
  const manualItems = filteredRecurring.filter(item => item.mode === 'manual');

  // Helper for human-readable frequency text
  const formatFrequencyLabel = (item) => {
    switch (item.frequency) {
      case 'weekly': {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayName = item.billingDayOfWeek != null ? days[item.billingDayOfWeek] : '';
        return dayName ? `Semanal • ${dayName}` : 'Semanal';
      }
      case 'biweekly':
        return 'Quincenal (Días 15 y 30)';
      case 'monthly':
        return `Mensual • Día ${item.billingDay || 1}`;
      case 'bimonthly':
        return 'Bimestral (cada 2 meses)';
      case 'quarterly':
        return 'Trimestral (cada 3 meses)';
      case 'semiannual':
        return 'Semestral (cada 6 meses)';
      case 'yearly':
        return `Anual • Día ${item.billingDay || 1}`;
      default:
        return 'Mensual';
    }
  };

  // Render an individual card
  const renderRecurringCard = (item) => {
    const isExpense = item.type !== 'income';
    const categoryObj = categories.find(c => c.id === item.categoryId);
    const accountObj = accounts.find(a => a.id === item.accountId);
    const isActive = item.isActive !== false;

    return (
      <SwipeableRow
        key={item.id}
        onEdit={() => handleOpenEdit(item)}
        onDelete={() => {
          if (confirm(`¿Eliminar pago recurrente "${item.name}"?`)) {
            onDeleteRecurring(item.id);
          }
        }}
        className="rounded-2xl"
        contentClassName="rounded-2xl"
      >
        <div
          className={`p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isActive 
              ? 'border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15' 
              : 'border-slate-200/40 dark:border-white/[0.08] opacity-60 bg-slate-50/50 dark:bg-white/[0.01]'
          }`}
        >
          {/* Columna Izquierda: Icono + Detalles */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <BrandIcon
              name={item.name || item.categoryName || ''}
              size={24}
              wrapperClassName="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden border border-slate-200/50 dark:border-white/5"
              fallback={
                <CategoryIcon
                  category={categoryObj || item.categoryName}
                  status={isExpense ? 'negative' : 'positive'}
                  size={22}
                  withBadge={false}
                />
              }
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {item.name}
                </h3>
                {!isActive && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                    Pausado
                  </span>
                )}
              </div>

              {/* Frecuencia + Próxima fecha + Cuenta */}
              <div className="flex items-center gap-1.5 pt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {formatFrequencyLabel(item)}
                </span>
                {(item.nextDate || item.next_date) && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Próx: {new Date((item.nextDate || item.next_date) + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </span>
                  </>
                )}
                {item.accountName && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 inline-flex items-center gap-1 truncate max-w-[130px]">
                      <BrandIcon name={item.accountName} type={accountObj?.type} size={11} fallback={null} />
                      <span className="truncate">{item.accountName}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Monto + Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
            {/* Monto */}
            <div className="text-right">
              <span className={`font-bold font-mono tracking-tight text-base tabular-nums whitespace-nowrap block leading-tight ${
                isExpense ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {isExpense ? '-' : '+'}{formatMoney(item.amount)}
              </span>
              {item.originalCurrency && item.originalCurrency !== 'COP' && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tight tabular-nums">
                  ({Number(item.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.originalCurrency})
                </span>
              )}
            </div>

            {/* Switch Toggle Activo/Pausado */}
            <label 
              className="relative inline-flex items-center cursor-pointer select-none"
              title={isActive ? 'Pausar recurrencia' : 'Activar recurrencia'}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => onToggleActiveRecurring(item.id)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none dark:bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 transition-colors shadow-inner" />
            </label>
          </div>
        </div>
      </SwipeableRow>
    );
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-12">
      {/* A. Cabecera (Header) */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {(onBack || fromSettings) && (
            <button
              type="button"
              onClick={handleGoBack}
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer border border-slate-200/60 dark:border-white/[0.08] bg-white dark:bg-zinc-900 shadow-sm shrink-0"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight truncate">
              Pagos recurrentes
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Control de gastos fijos y suscripciones automáticas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenLocalCreate}
          className="py-2 px-3 sm:py-2.5 sm:px-4 bg-[#007AFF] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 ml-auto sm:ml-0"
        >
          <Plus className="w-4 h-4" />
          <span className="sm:hidden">Añadir</span>
          <span className="hidden sm:inline">Nuevo pago recurrente</span>
        </button>
      </div>

      {/* B. Tarjetas de Resumen Financiero Recurrente (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Total Ingresos Recurrentes esperados */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Ingresos esperados
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight tabular-nums text-emerald-500 dark:text-emerald-400">
            +{formatMoney(totalIncomeProjected)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Proyección mensual activa
          </p>
        </div>

        {/* Total Gastos Recurrentes comprometidos */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              Gastos comprometidos
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight tabular-nums text-rose-500 dark:text-rose-400">
            -{formatMoney(totalExpenseProjected)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
            {autoCount} automáticos • {manualCount} manuales
          </p>
        </div>
      </div>

      {/* C. Filtros de vista ("Todos" | "Gastos" | "Ingresos") */}
      {safeRecurring.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-white/5">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos ({safeRecurring.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'expense'
                  ? 'bg-white dark:bg-zinc-900 text-rose-500 dark:text-rose-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400'
              }`}
            >
              Gastos ({safeRecurring.filter(r => r.type !== 'income').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'income'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-500 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400'
              }`}
            >
              Ingresos ({safeRecurring.filter(r => r.type === 'income').length})
            </button>
          </div>

          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Mostrando {filteredRecurring.length} de {safeRecurring.length}
          </span>
        </div>
      )}

      {/* D. Estado Vacío (Empty State) - Si no hay recurrentes registrados */}
      {recurringPayments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-white/10 p-8 text-center bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
            <CalendarSync className="w-8 h-8" />
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2">
            Empieza a automatizar tus finanzas
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Registra gastos o ingresos que se repiten con frecuencia (arriendo, servicios, gimnasio, cuotas) para que Monety los registre automáticamente o te avise a tiempo.
          </p>

          <button
            type="button"
            onClick={handleOpenLocalCreate}
            className="mt-6 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-600/25 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Crear pago recurrente</span>
          </button>
        </div>
      ) : (
        /* E. Listado Activo (Cuando ya existen elementos creados) */
        <div className="space-y-6">
          {filteredRecurring.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200/80 dark:border-white/10 p-8 text-center bg-slate-50/50 dark:bg-white/[0.01]">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                No hay movimientos recurrentes registrados para el filtro de {filterType === 'expense' ? 'Gastos' : 'Ingresos'}.
              </p>
            </div>
          )}

          {/* Sección 1: Anotación automática */}
          {autoItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Anotación automática
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                    Auto
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {autoItems.length} {autoItems.length === 1 ? 'servicio' : 'servicios'}
                </span>
              </div>

              <div className="space-y-2.5">
                {autoItems.map(item => renderRecurringCard(item))}
              </div>
            </div>
          )}

          {/* Sección 2: Pendientes por confirmar */}
          {manualItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Pendientes por confirmar
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                    Manual
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {manualItems.length} {manualItems.length === 1 ? 'recordatorio' : 'recordatorios'}
                </span>
              </div>

              <div className="space-y-2.5">
                {manualItems.map(item => renderRecurringCard(item))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      <AddRecurringModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        editingItem={editingItem}
        editingPayment={editingItem}
        accounts={accounts}
        categories={categories}
        onAddCategory={onAddCategory}
        onAddSubcategory={onAddSubcategory}
        trm={trm}
      />
    </div>
  );
}
