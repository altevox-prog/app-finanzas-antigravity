import React, { useState, useEffect } from 'react';
import { 
  CalendarSync, 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  Zap, 
  Bell, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Check
} from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import BrandIcon from '../ui/BrandIcon';
import CategoryIcon from '../categories/components/CategoryIcon';
import AddRecurringModal from './modals/AddRecurringModal';
import SwipeableRow from '../common/SwipeableRow';
import { safeNumber } from '../../utils/financeMath';
import { 
  processDueRecurringPayments, 
  advanceNextDate, 
  getTodayLocalString,
  normalizeDateToYYYYMMDD
} from '../../services/recurring/recurringAutoProcessor';
import { generateUUID } from '../../utils/recordMerger';

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
  const [processingId, setProcessingId] = useState(null);

  // Fecha local canónica actual
  const todayStr = getTodayLocalString();

  // Helper para normalizar la fecha de próximo pago y estado activo
  const getItemNextDate = (item) => {
    const raw = item?.nextPaymentDate || item?.nextDate || item?.next_date || '';
    return normalizeDateToYYYYMMDD(raw);
  };
  const isItemActive = (item) => item?.isActive !== false && item?.active !== false;

  // Manejador para Aprobar / Registrar movimiento en modo Por Confirmar
  const handleApprovePending = async (item) => {
    if (!item || processingId === item.id) return;
    setProcessingId(item.id);

    try {
      const nextDate = getItemNextDate(item) || todayStr;
      const type = item.type === 'income' ? 'income' : 'expense';
      const description = item.name || item.description || item.note || 'Movimiento recurrente';
      const amount = Number(item.amount) || 0;

      const newTx = {
        id: generateUUID(),
        description,
        note: description,
        amount,
        originalAmount: Number(item.originalAmount || item.amount) || amount,
        currency: item.currency || item.originalCurrency || 'COP',
        originalCurrency: item.originalCurrency || item.currency || 'COP',
        exchangeRate: Number(item.exchangeRate) || 1,
        type,
        category: item.categoryName || item.category || 'Recurrentes',
        categoryName: item.categoryName || item.category || 'Recurrentes',
        categoryId: item.categoryId || item.category_id || '',
        subcategoryId: item.subcategoryId || item.subcategory_id || null,
        subcategoryName: item.subcategoryName || null,
        accountId: item.accountId || item.account_id || '',
        accountName: item.accountName || 'Principal',
        date: nextDate,
        createdAt: new Date().toISOString(),
        isRecurring: true,
        recurringId: item.id
      };

      const newNextDate = advanceNextDate(nextDate, item.frequency, item.billingDay);
      const updatedItem = {
        ...item,
        nextDate: newNextDate,
        next_date: newNextDate,
        nextPaymentDate: newNextDate,
        lastProcessedDate: nextDate,
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (typeof onAddTransaction === 'function') {
        await onAddTransaction(newTx);
      }
      if (typeof onUpdateRecurring === 'function') {
        await onUpdateRecurring(updatedItem);
      }
    } catch (err) {
      console.error('[RecurringView] Error al aprobar movimiento recurrente:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Manejador para Omitir movimiento (avanzar ciclo sin registrar transacción)
  const handleSkipPending = async (item) => {
    if (!item || processingId === item.id) return;
    setProcessingId(item.id);

    try {
      const nextDate = getItemNextDate(item) || todayStr;
      const newNextDate = advanceNextDate(nextDate, item.frequency, item.billingDay);
      const updatedItem = {
        ...item,
        nextDate: newNextDate,
        next_date: newNextDate,
        nextPaymentDate: newNextDate,
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (typeof onUpdateRecurring === 'function') {
        await onUpdateRecurring(updatedItem);
      }
    } catch (err) {
      console.error('[RecurringView] Error al omitir movimiento recurrente:', err);
    } finally {
      setProcessingId(null);
    }
  };

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
  const activeItems = safeRecurring.filter(item => isItemActive(item));

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

  // 1. Ítems pendientes por confirmar (Modo manual, activos, y con nextPaymentDate <= hoy)
  const pendingConfirmationItems = filteredRecurring.filter(item => {
    const isManual = item.mode === 'manual';
    const isActive = isItemActive(item);
    const nextDate = getItemNextDate(item);
    return isManual && isActive && nextDate && nextDate <= todayStr;
  });

  // 2. Ítems en anotación automática
  const autoItems = filteredRecurring.filter(item => (item.mode || 'auto') !== 'manual');

  // 3. Ítems regulares en modo manual que NO están pendientes urgentes (futuros o pausados)
  const regularManualItems = filteredRecurring.filter(item => {
    if (item.mode !== 'manual') return false;
    const isActive = isItemActive(item);
    const nextDate = getItemNextDate(item);
    if (isActive && nextDate && nextDate <= todayStr) return false;
    return true;
  });

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
  const renderRecurringCard = (item, isPending = false) => {
    const isExpense = item.type !== 'income';
    const categoryObj = categories.find(c => c.id === item.categoryId);
    const accountObj = accounts.find(a => a.id === item.accountId);
    const nextDate = getItemNextDate(item);
    const isOverdue = isPending && Boolean(nextDate && nextDate < todayStr);

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
          className={`p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border transition-all shadow-sm flex flex-col justify-between gap-3 group relative ${
            isPending
              ? (isOverdue 
                  ? 'border-rose-300 dark:border-rose-500/30 bg-rose-500/[0.02]' 
                  : 'border-amber-300 dark:border-amber-500/30 bg-amber-500/[0.02]')
              : 'border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15'
          }`}
        >
          {/* Fila Principal: Icono + Detalles + Monto / Acciones */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {item.name}
                  </h3>
                  {isPending && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                      isOverdue 
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' 
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {isOverdue ? 'Vencido' : 'Pendiente hoy'}
                    </span>
                  )}
                </div>

                {/* Frecuencia + Próxima fecha + Cuenta */}
                <div className="flex items-center gap-1.5 pt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {formatFrequencyLabel(item)}
                  </span>
                  {nextDate && (
                    <>
                      <span className="opacity-40">•</span>
                      <span className={`text-[11px] font-semibold ${
                        isPending
                          ? (isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400')
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isPending ? (isOverdue ? 'Venció: ' : 'Vence hoy: ') : 'Próx: '}
                        {new Date(nextDate + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
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

            {/* Columna Derecha: Monto + Microbotones en Hover (Escritorio) */}
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

              {/* Slot reservado de microbotones en hover para PC */}
              <div className="hidden md:flex items-center justify-end w-14 shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(item);
                  }}
                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Editar"
                  aria-label="Editar"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`¿Eliminar pago recurrente "${item.name}"?`)) {
                      onDeleteRecurring(item.id);
                    }
                  }}
                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Eliminar"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Barra de Acciones para ítems pendientes por confirmar */}
          {isPending && (
            <div 
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="flex items-center justify-between pt-2.5 mt-1 border-t border-slate-100 dark:border-white/5 gap-2"
            >
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
                ¿Deseas registrar este movimiento?
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  disabled={processingId === item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkipPending(item);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer border border-slate-200/80 dark:border-white/10 disabled:opacity-50"
                  title="Avanzar al siguiente ciclo sin registrar gasto/ingreso"
                >
                  Omitir
                </button>
                <button
                  type="button"
                  disabled={processingId === item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprovePending(item);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Registrar en transacciones y avanzar fecha"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aprobar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </SwipeableRow>
    );
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-12">
      {/* A. Cabecera (Header) */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          {Boolean(onBack || fromSettings || previousView === 'settings') && (
            <button
              type="button"
              onClick={handleGoBack}
              className="lg:hidden w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 active:scale-95 transition-colors cursor-pointer border border-slate-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm shrink-0"
              aria-label="Volver"
              title="Volver"
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
            Registra gastos o ingresos que se repiten con frecuencia (arriendo, servicios, gimnasio, cuotas) usando el botón central (+) para que Monety los registre automáticamente o te avise a tiempo.
          </p>
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

          {/* Sección 1: Pendientes por confirmar (Vencidos hoy o anteriores) */}
          {pendingConfirmationItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Pendientes por confirmar
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                    {pendingConfirmationItems.length} {pendingConfirmationItems.length === 1 ? 'pendiente' : 'pendientes'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Requiere tu aprobación
                </span>
              </div>

              <div className="space-y-2.5">
                {pendingConfirmationItems.map(item => renderRecurringCard(item, true))}
              </div>
            </div>
          )}

          {/* Sección 2: Anotación automática */}
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
                {autoItems.map(item => renderRecurringCard(item, false))}
              </div>
            </div>
          )}

          {/* Sección 3: Programados por confirmar (Fecha futura o pausados) */}
          {regularManualItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Programados por confirmar
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                    Manual
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {regularManualItems.length} {regularManualItems.length === 1 ? 'recordatorio' : 'recordatorios'}
                </span>
              </div>

              <div className="space-y-2.5">
                {regularManualItems.map(item => renderRecurringCard(item, false))}
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
