import React, { useState, useEffect, useMemo } from 'react';
import { CalendarSync, ArrowLeft, Pencil, Trash2, TrendingDown, Repeat, AlertCircle, Clock, Check } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import BrandIcon from '../ui/BrandIcon';
import CategoryIcon from '../categories/components/CategoryIcon';
import AddRecurringModal from './modals/AddRecurringModal';
import SwipeableRow from '../common/SwipeableRow';
import { safeNumber } from '../../utils/financeMath';
import { processDueRecurringPayments, advanceNextDate, getTodayLocalString, normalizeDateToYYYYMMDD } from '../../services/recurring/recurringAutoProcessor';
import { generateUUID } from '../../utils/recordMerger';
const FREQ_FACTORS = { weekly: 4.33, biweekly: 2, monthly: 1, bimonthly: 0.5, quarterly: 1/3, semiannual: 1/6, yearly: 1/12 };
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export default function RecurringView({
  recurringPayments = [], onAddRecurring, onUpdateRecurring, onDeleteRecurring,
  onBack, fromSettings = false, previousView, accounts = [], categories = [],
  onAddCategory, onAddSubcategory, trm = 4000, onAddTransaction = null
}) {
  const { formatMoney } = usePrivacy();
  const [isModalOpen, setIsModalOpen] = useState(false), [editingItem, setEditingItem] = useState(null);
  const [filterType, setFilterType] = useState('all'), [processingId, setProcessingId] = useState(null);
  const todayStr = getTodayLocalString();
  const accountMap = useMemo(() => new Map((accounts || []).map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map((categories || []).map((c) => [c.id, c])), [categories]);
  const getItemNextDate = (item) => normalizeDateToYYYYMMDD(item?.nextPaymentDate || item?.nextDate || item?.next_date || '');
  const isItemActive = (item) => item?.isActive !== false && item?.active !== false;
  const handleGoBack = () => (onBack ? onBack() : (typeof window !== 'undefined' && window.history.length > 2 && window.history.back()));
  const handleOpenEdit = (item) => { setEditingItem(item); setIsModalOpen(true); };
  const handleSaveItem = (itemData) => { (editingItem ? onUpdateRecurring : onAddRecurring)?.(itemData); setEditingItem(null); };
  const processRecurringCycle = async (item, shouldRecordTx) => {
    if (!item || processingId === item.id) return;
    setProcessingId(item.id);
    try {
      const nextDate = getItemNextDate(item) || todayStr, newNextDate = advanceNextDate(nextDate, item.frequency, item.billingDay);
      const updatedItem = { ...item, nextDate: newNextDate, next_date: newNextDate, nextPaymentDate: newNextDate, lastProcessedDate: nextDate, updatedAt: new Date().toISOString(), updated_at: new Date().toISOString() };
      if (shouldRecordTx && typeof onAddTransaction === 'function') {
        const desc = item.name || item.description || item.note || 'Movimiento recurrente', amount = Number(item.amount) || 0;
        await onAddTransaction({
          id: generateUUID(), description: desc, note: desc, amount, originalAmount: Number(item.originalAmount || item.amount) || amount,
          currency: item.currency || item.originalCurrency || 'COP', originalCurrency: item.originalCurrency || item.currency || 'COP',
          exchangeRate: Number(item.exchangeRate) || 1, type: item.type === 'income' ? 'income' : 'expense',
          category: item.categoryName || item.category || 'Recurrentes', categoryName: item.categoryName || item.category || 'Recurrentes',
          categoryId: item.categoryId || item.category_id || '', subcategoryId: item.subcategoryId || item.subcategory_id || null,
          subcategoryName: item.subcategoryName || null, accountId: item.accountId || item.account_id || '', accountName: item.accountName || 'Principal',
          date: nextDate, createdAt: new Date().toISOString(), isRecurring: true, recurringId: item.id
        });
      }
      await onUpdateRecurring?.(updatedItem);
    } catch (err) { console.error('[RecurringView] Error process cycle:', err); } finally { setProcessingId(null); }
  };
  useEffect(() => {
    if (typeof onAddTransaction === 'function' && typeof onUpdateRecurring === 'function' && recurringPayments?.length > 0) {
      processDueRecurringPayments({ recurringPayments, onAddTransaction, onUpdateRecurring });
    }
  }, [recurringPayments, onAddTransaction, onUpdateRecurring]);
  const safeRecurring = Array.isArray(recurringPayments) ? recurringPayments : [];
  const activeItems = safeRecurring.filter(isItemActive);
  const totalExpenseProjected = activeItems.filter((i) => i.type !== 'income').reduce((sum, i) => sum + Math.round(safeNumber(i.amount) * (FREQ_FACTORS[i.frequency] || 1)), 0);
  const filteredRecurring = safeRecurring.filter((i) => (filterType === 'expense' ? i.type !== 'income' : filterType === 'income' ? i.type === 'income' : true));
  const pendingItems = filteredRecurring.filter((i) => i.mode === 'manual' && isItemActive(i) && getItemNextDate(i) && getItemNextDate(i) <= todayStr);
  const autoItems = filteredRecurring.filter((i) => (i.mode || 'auto') !== 'manual');
  const regularManualItems = filteredRecurring.filter((i) => i.mode === 'manual' && !(isItemActive(i) && getItemNextDate(i) && getItemNextDate(i) <= todayStr));
  const formatFreq = (i) => (i.frequency === 'weekly' ? (i.billingDayOfWeek != null ? `Semanal • ${DAYS[i.billingDayOfWeek]}` : 'Semanal') : i.frequency === 'biweekly' ? 'Quincenal (15 y 30)' : i.frequency === 'monthly' ? `Mensual • Día ${i.billingDay || 1}` : i.frequency === 'yearly' ? `Anual • Día ${i.billingDay || 1}` : { bimonthly: 'Bimestral', quarterly: 'Trimestral', semiannual: 'Semestral' }[i.frequency] || 'Mensual');
  const renderCard = (item, isPending = false) => {
    const isExpense = item.type !== 'income', nextDate = getItemNextDate(item), isOverdue = isPending && Boolean(nextDate && nextDate < todayStr);
    return (
      <SwipeableRow key={item.id} onEdit={() => handleOpenEdit(item)} onDelete={() => { if (confirm(`¿Eliminar "${item.name}"?`)) onDeleteRecurring?.(item.id); }} className="rounded-2xl" contentClassName="rounded-2xl">
        <div className={`p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border transition-all shadow-sm flex flex-col justify-between gap-3 group relative ${isPending ? (isOverdue ? 'border-rose-300 dark:border-rose-500/30 bg-rose-500/[0.02]' : 'border-amber-300 dark:border-amber-500/30 bg-amber-500/[0.02]') : 'border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <BrandIcon name={item.name || item.categoryName || ''} size={24} wrapperClassName="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden border border-slate-200/50" fallback={<CategoryIcon category={categoryMap.get(item.categoryId) || item.categoryName} status={isExpense ? 'negative' : 'positive'} size={22} withBadge={false} />} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.name}</h3>
                  {isPending && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${isOverdue ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'}`}>{isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}<span>{isOverdue ? 'Vencido' : 'Pendiente hoy'}</span></span>}
                </div>
                <div className="flex items-center gap-1.5 pt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="font-medium text-slate-600 dark:text-slate-300">{formatFreq(item)}</span>
                  {nextDate && (<><span className="opacity-40">•</span><span className={`text-[11px] font-semibold ${isPending ? (isOverdue ? 'text-rose-600' : 'text-amber-600') : 'text-emerald-600 dark:text-emerald-400'}`}>{isPending ? (isOverdue ? 'Venció: ' : 'Vence hoy: ') : 'Próx: '}{new Date(nextDate + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span></>)}
                  {item.accountName && (<><span className="opacity-40">•</span><span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/60 inline-flex items-center gap-1 truncate max-w-[130px]"><BrandIcon name={item.accountName} type={accountMap.get(item.accountId)?.type} size={11} fallback={null} /><span className="truncate">{item.accountName}</span></span></>)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
              <div className="text-right">
                <span className={`font-bold font-mono text-base tabular-nums whitespace-nowrap block leading-tight ${isExpense ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{isExpense ? '-' : '+'}{formatMoney(item.amount)}</span>
                {item.originalCurrency && item.originalCurrency !== 'COP' && <span className="text-[10px] text-slate-400 font-mono tracking-tight tabular-nums">({Number(item.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {item.originalCurrency})</span>}
              </div>
              <div className="hidden md:flex items-center justify-end w-14 shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 flex items-center justify-center cursor-pointer" title="Editar"><Pencil className="w-3 h-3" /></button>
                <button type="button" onClick={(e) => { e.stopPropagation(); if (confirm(`¿Eliminar "${item.name}"?`)) onDeleteRecurring?.(item.id); }} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer" title="Eliminar"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
          {isPending && (
            <div onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} className="flex items-center justify-between pt-2.5 mt-1 border-t border-slate-100 dark:border-white/5 gap-2">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">¿Deseas registrar este movimiento?</span>
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" disabled={processingId === item.id} onClick={(e) => { e.stopPropagation(); processRecurringCycle(item, false); }} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer border border-slate-200/80 disabled:opacity-50">Omitir</button>
                <button type="button" disabled={processingId === item.id} onClick={(e) => { e.stopPropagation(); processRecurringCycle(item, true); }} className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"><Check className="w-3.5 h-3.5" /><span>Aprobar</span></button>
              </div>
            </div>
          )}
        </div>
      </SwipeableRow>
    );
  };
  return (
    <div className="space-y-4 animate-fadeIn pb-12">
      <div className="flex items-center gap-3 min-w-0 mb-2">
        {Boolean(onBack || fromSettings || previousView === 'settings') && (
          <button type="button" onClick={handleGoBack} className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer border border-slate-200/60 bg-white dark:bg-zinc-900 shadow-sm shrink-0" title="Volver"><ArrowLeft className="w-5 h-5" /></button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight truncate">Pagos recurrentes</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Control de gastos fijos y suscripciones automáticas</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Gastos comprometidos', icon: <TrendingDown className="w-3.5 h-3.5 text-rose-500"/>, dot: 'bg-rose-500', val: `-${formatMoney(totalExpenseProjected)}`, sub: 'Proyección mensual fija', valCls: 'text-rose-500 dark:text-rose-400' },
          { label: 'Servicios activos', icon: <Repeat className="w-3.5 h-3.5 text-indigo-500"/>, dot: 'bg-indigo-500', val: activeItems.length, sub: `${activeItems.filter(i => (i.mode || 'auto') !== 'manual').length} automáticos • ${activeItems.filter(i => i.mode === 'manual').length} manuales`, valCls: 'text-slate-800 dark:text-white' }
        ].map((m, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">{m.icon} {m.label}</span><span className={`w-2 h-2 rounded-full ${m.dot} shrink-0`} /></div>
            <div className={`text-xl sm:text-2xl font-extrabold font-mono tracking-tight tabular-nums ${m.valCls}`}>{m.val}</div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">{m.sub}</p>
          </div>
        ))}
      </div>
      {safeRecurring.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/60">
            {[{ id: 'all', label: `Todos (${safeRecurring.length})`, col: 'text-slate-900 dark:text-white' }, { id: 'expense', label: `Gastos (${safeRecurring.filter((r) => r.type !== 'income').length})`, col: 'text-rose-500 dark:text-rose-400' }, { id: 'income', label: `Ingresos (${safeRecurring.filter((r) => r.type === 'income').length})`, col: 'text-emerald-500 dark:text-emerald-400' }].map(({ id, label, col }) => (
              <button key={id} type="button" onClick={() => setFilterType(id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterType === id ? `bg-white dark:bg-zinc-900 ${col} shadow-xs` : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'}`}>{label}</button>
            ))}
          </div>
          <span className="text-xs text-slate-400 font-medium">Mostrando {filteredRecurring.length} de {safeRecurring.length}</span>
        </div>
      )}
      {safeRecurring.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-white/10 p-8 text-center bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400"><CalendarSync className="w-8 h-8" /></div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2">Empieza a automatizar tus finanzas</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">Registra gastos o ingresos periódicos con el botón (+) para que se sincronicen y avisen puntualmente.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { title: 'Pendientes por confirmar', badge: `${pendingItems.length} pendientes`, badgeCls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25', sub: 'Requiere tu aprobación', items: pendingItems, pending: true },
            { title: 'Anotación automática', badge: 'Auto', badgeCls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25', sub: `${autoItems.length} servicios`, items: autoItems, pending: false },
            { title: 'Programados por confirmar', badge: 'Manual', badgeCls: 'bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400', sub: `${regularManualItems.length} recordatorios`, items: regularManualItems, pending: false }
          ].filter((s) => s.items?.length > 0).map((s) => (
            <div key={s.title} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2"><h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.title}</h2><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badgeCls}`}>{s.badge}</span></div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{s.sub}</span>
              </div>
              <div className="space-y-2.5">{s.items.map((item) => renderCard(item, s.pending))}</div>
            </div>
          ))}
        </div>
      )}
      <AddRecurringModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingItem(null); }} onSave={handleSaveItem} editingItem={editingItem} editingPayment={editingItem} accounts={accounts} categories={categories} onAddCategory={onAddCategory} onAddSubcategory={onAddSubcategory} trm={trm} />
    </div>
  );
}