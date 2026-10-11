import React, { useState } from 'react';
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
  MoreVertical
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import BrandIcon from './BrandIcon';
import CategoryIcon from './CategoryIcon';
import AddRecurringModal from './AddRecurringModal';
import { safeNumber } from '../utils/financeMath';

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
  trm = 4000
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

  // Calculate monthly projected total (active items)
  const safeRecurring = Array.isArray(recurringPayments) ? recurringPayments : [];
  const activeItems = safeRecurring.filter(item => item.isActive !== false);
  const autoItems = safeRecurring.filter(item => (item.mode || 'auto') !== 'manual');
  const manualItems = safeRecurring.filter(item => item.mode === 'manual');

  const autoCount = activeItems.filter(item => (item.mode || 'auto') !== 'manual').length;
  const manualCount = activeItems.filter(item => item.mode === 'manual').length;

  // Monthly projection calculation
  const totalMonthlyProjected = activeItems.reduce((sum, item) => {
    const amt = safeNumber(item.amount);
    if (item.type === 'income') return sum; // Projection of recurring expenses
    if (item.frequency === 'weekly') return sum + Math.round(amt * 4.33);
    if (item.frequency === 'biweekly') return sum + (amt * 2);
    if (item.frequency === 'monthly') return sum + amt;
    if (item.frequency === 'bimonthly') return sum + Math.round(amt / 2);
    if (item.frequency === 'quarterly') return sum + Math.round(amt / 3);
    if (item.frequency === 'semiannual') return sum + Math.round(amt / 6);
    if (item.frequency === 'yearly') return sum + Math.round(amt / 12);
    return sum + amt; // default monthly
  }, 0);

  const hasActivePayments = activeItems.length > 0;

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
      <div
        key={item.id}
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

        {/* Columna Derecha: Monto + Toggle + Menú acciones */}
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

          {/* Botones de Editar y Eliminar */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleOpenEdit(item)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 active:scale-90 transition-all cursor-pointer bg-slate-100 dark:bg-white/5"
              title="Editar pago recurrente"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`¿Eliminar pago recurrente "${item.name}"?`)) {
                  onDeleteRecurring(item.id);
                }
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-all cursor-pointer bg-slate-100 dark:bg-white/5"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
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

      {/* B. Tarjeta de Resumen Mensual (KPI Card) */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] p-5 shadow-sm relative overflow-hidden">
        {/* Halo esmeralda tenue */}
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-20 dark:opacity-30 bg-emerald-500" />

        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 relative z-10">
          Tus pagos recurrentes al mes
        </p>

        <div className="flex items-baseline gap-2 relative z-10 my-1">
          {hasActivePayments ? (
            <>
              <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100">
                {formatMoney(totalMonthlyProjected)}
              </span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                / mes
              </span>
            </>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 dark:text-slate-500">—</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Sin pagos automáticos</span>
            </div>
          )}
        </div>

        {/* Micro desglose opcional */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2.5 border-t border-slate-100 dark:border-white/5 mt-3 relative z-10">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            {autoCount} {autoCount === 1 ? 'automático activo' : 'automáticos activos'}
          </span>
          <span className="opacity-40">•</span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            {manualCount} {manualCount === 1 ? 'recordatorio manual' : 'recordatorios manuales'}
          </span>
        </div>
      </div>

      {/* C. Explicación sutil */}
      <p className="text-xs text-slate-500 dark:text-slate-400 italic px-2 my-3">
        Renta, servicios, cuotas fijas y lo que pagas periódicamente. Configura cuáles anota la app sola y de cuáles deseas recibir un aviso para confirmarlos.
      </p>

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
