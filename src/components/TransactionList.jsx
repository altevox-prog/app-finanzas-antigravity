import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Trash2, 
  Pencil, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  CreditCard, 
  Inbox, 
  ChevronRight, 
  X, 
  ArrowRight,
  Camera,
  Plus
} from 'lucide-react';
import { formatCurrency, MONTH_NAMES } from '../data/initialData';
import { usePrivacy } from '../context/PrivacyContext';
import { getEnableDecimals } from '../utils/currencyFormatter';
import CategoryIcon from './CategoryIcon';
import FinancialIcon from './common/FinancialIcon';
import BrandIcon from './BrandIcon';
import SegmentedControl from './common/SegmentedControl';
import EditTransactionModal from './transactions/modals/EditTransactionModal';
import { useBackHandler } from '../hooks/useBackHandler';

export default function TransactionList({ 
  transactions, 
  onDeleteTransaction, 
  onUpdateTransaction, 
  onAddCategory, 
  onAddSubcategory, 
  onUpdateSubcategory,
  onDeleteSubcategory,
  onAddAccount, 
  categories, 
  accounts, 
  currentMonthLabel, 
  selectedDay, 
  onSelectDay, 
  limit, 
  isCompact = false, 
  onViewAll,
  onOpenTransaction,
  onOpenAddTransaction,
  setIsAddTransactionOpen,
  modalControls,
  trm = 4000
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [accountFilter, setAccountFilter] = useState('all');
  const { formatMoney, enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();

  // Receipt Viewer Modal State
  const [viewingReceiptTx, setViewingReceiptTx] = useState(null);

  // Transaction Detail Modal State
  const [selectedDetailTx, setSelectedDetailTx] = useState(null);

  // Edit Modal State
  const [editingTx, setEditingTx] = useState(null);

  useBackHandler(Boolean(selectedDetailTx), () => setSelectedDetailTx(null));
  useBackHandler(Boolean(viewingReceiptTx), () => setViewingReceiptTx(null));

  // Sort transactions by date descending (newest first)
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const sortedTransactions = [...safeTransactions].sort((a, b) => {
    const dateA = a?.date ? String(a.date).split('T')[0] : (a?.created_at ? String(a.created_at).split('T')[0] : '');
    const dateB = b?.date ? String(b.date).split('T')[0] : (b?.created_at ? String(b.created_at).split('T')[0] : '');
    return new Date((dateB || '1970-01-01') + 'T00:00:00') - new Date((dateA || '1970-01-01') + 'T00:00:00');
  });

  // Filter by day if selectedDay is active, plus search, type, and account filters
  const filteredTransactions = sortedTransactions.filter((tx) => {
    if (!tx) return false;
    const txDate = tx.date ? String(tx.date).split('T')[0] : (tx.created_at ? String(tx.created_at).split('T')[0] : '');

    if (selectedDay) {
      const targetDay = String(selectedDay).split('T')[0];
      if (txDate !== targetDay) {
        return false;
      }
    }

    const searchLower = searchTerm.trim().toLowerCase();
    const matchesSearch = !searchLower ||
      (tx.note && String(tx.note).toLowerCase().includes(searchLower)) ||
      (tx.notes && String(tx.notes).toLowerCase().includes(searchLower)) ||
      (tx.description && String(tx.description).toLowerCase().includes(searchLower)) ||
      (tx.category && String(tx.category).toLowerCase().includes(searchLower)) ||
      (tx.categoryName && String(tx.categoryName).toLowerCase().includes(searchLower)) ||
      (tx.subcategoryName && String(tx.subcategoryName).toLowerCase().includes(searchLower)) ||
      (tx.accountName && String(tx.accountName).toLowerCase().includes(searchLower));

    const rawType = String(tx.type || '').toLowerCase();
    const normalizedTxType = (rawType === 'gasto' || rawType === 'expense') ? 'expense' : ((rawType === 'ingreso' || rawType === 'income') ? 'income' : rawType);
    const matchesType = typeFilter === 'all' || normalizedTxType === typeFilter;

    const txAccountId = tx.accountId || tx.account_id;
    const matchesAccount = accountFilter === 'all' || txAccountId === accountFilter;

    return matchesSearch && matchesType && matchesAccount;
  });

  console.log('[TransactionsView] Total recibidas:', transactions?.length, 'Filtradas para mostrar:', filteredTransactions?.length);

  const displayTransactions = limit ? filteredTransactions.slice(0, limit) : filteredTransactions;

  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
  };

  const handleSaveEdit = (updated) => {
    onUpdateTransaction(updated);
    setEditingTx(null);
  };

  const formatTxDateTime = (tx) => {
    if (!tx.date) return '';
    const parts = tx.date.split('-');
    if (parts.length < 3) return tx.date;
    const [y, m, d] = parts;
    const monthIdx = parseInt(m, 10) - 1;
    const monthName = MONTH_NAMES[monthIdx] ? MONTH_NAMES[monthIdx].slice(0, 3) : m;
    const dayNum = parseInt(d, 10);

    let timeStr = tx.time;
    if (!timeStr) {
      const hours = ['09:15', '11:30', '13:45', '14:30', '16:20', '18:10', '20:05'];
      let hash = 0;
      const str = tx.id || tx.date || '';
      for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % hours.length;
      timeStr = hours[Math.abs(hash)];
    }

    return `${dayNum} ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} · ${timeStr}`;
  };

  const formatTxDateClean = (tx) => {
    if (!tx.date) return '';
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    if (tx.date === todayStr) {
      return 'Hoy';
    }
    if (tx.date === yesterdayStr) {
      return 'Ayer';
    }
    
    const parts = tx.date.split('-');
    if (parts.length < 3) return tx.date;
    const [y, m, d] = parts;
    const monthIdx = parseInt(m, 10) - 1;
    const monthName = MONTH_NAMES[monthIdx] ? MONTH_NAMES[monthIdx].slice(0, 3) : m;
    const dayNum = parseInt(d, 10);
    return `${dayNum} ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
  };

  return (
    <div className={`ios-card ${isCompact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'}`}>
      {/* Top Bar with Title and Actions */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] sm:text-[18px] font-bold tracking-tight text-slate-900 dark:text-white">
              {isCompact ? 'Movimientos Recientes' : (selectedDay 
                ? `Gastos del ${selectedDay.split('-')[2]} de ${MONTH_NAMES[parseInt(selectedDay.split('-')[1]) - 1]}` 
                : 'Movimientos')} {!isCompact && `(${filteredTransactions.length})`}
            </h2>

            {selectedDay && onSelectDay && (
              <button
                onClick={() => onSelectDay(null)}
                className="text-[11px] text-[#007AFF] bg-blue-500/10 hover:bg-blue-500/15 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                title="Mostrar todo el mes"
              >
                <span>Ver todo el mes</span>
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          {!isCompact && (
            <p className="text-[11px] sm:text-[12px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              {selectedDay ? `Filtrado por fecha específica: ${selectedDay}` : currentMonthLabel}
            </p>
          )}
        </div>

        {/* En escritorio y en widgets compactos se muestra el acceso de añadir movimiento */}
        {(onOpenTransaction || onOpenAddTransaction || setIsAddTransactionOpen) && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (modalControls && typeof modalControls.openAddTransaction === 'function') {
                modalControls.openAddTransaction('expense');
              } else if (onOpenTransaction) {
                onOpenTransaction('expense');
              } else if (onOpenAddTransaction) {
                onOpenAddTransaction('expense');
              } else if (setIsAddTransactionOpen) {
                setIsAddTransactionOpen(true);
              }
            }}
            className={`${isCompact ? 'flex px-2.5 py-1 text-xs' : 'flex py-2 px-3.5 text-xs'} bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm active:scale-95 transition-all items-center gap-1.5 cursor-pointer shrink-0`}
            title="Nuevo Movimiento"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isCompact ? 'Nuevo' : 'Nuevo Movimiento'}</span>
          </button>
        )}
      </div>

      {/* Filters and Search - Stacked cleanly for mobile */}
      {!isCompact && (
        <div className="space-y-2 mb-3">
            {/* iOS Style Search Bar */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 opacity-40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nota, categoría o cuenta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Segmented Control Tipo: Todos | Ingresos | Gastos y Selector de Período */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex-1">
                <SegmentedControl
                  options={[
                    { id: 'all', label: 'Todos' },
                    { id: 'income', label: 'Ingresos' },
                    { id: 'expense', label: 'Gastos' }
                  ]}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  size="md"
                />
              </div>
              {onSelectDay && (
                <div className="w-full sm:w-44 shrink-0">
                  <SegmentedControl
                    options={[
                      { id: 'month', label: 'Mes' },
                      { id: 'day', label: selectedDay ? `Día ${selectedDay.split('-')[2]}` : 'Día' }
                    ]}
                    value={selectedDay ? 'day' : 'month'}
                    onChange={(val) => {
                      if (val === 'month') {
                        onSelectDay(null);
                      } else {
                        const today = new Date().toISOString().split('T')[0];
                        onSelectDay(selectedDay || today);
                      }
                    }}
                    size="md"
                  />
                </div>
              )}
            </div>

            {/* Quick Filter Horizontal Scroll by Account */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-0.5">
              <button
                type="button"
                onClick={() => setAccountFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                  accountFilter === 'all'
                    ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 opacity-75 hover:opacity-100'
                }`}
              >
                Todas
              </button>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountFilter(acc.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                    accountFilter === acc.id
                      ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 opacity-75 hover:opacity-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: acc.color || '#007AFF' }} />
                  <span>{acc.name}</span>
                </button>
              ))}
            </div>
          </div>
      )}

      {/* Transaction List Items */}
      {displayTransactions.length === 0 ? (
        <div 
          className="text-center py-8 px-4 border border-dashed border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 rounded-2xl"
        >
          <Inbox className="w-8 h-8 opacity-30 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            {selectedDay ? 'No hay movimientos en este día' : 'Sin movimientos registrados este mes'}
          </p>
          <p className="text-[11px] opacity-50 mt-0.5">
            {selectedDay ? 'Toca "Ver todo el mes" para ver el período completo.' : 'Registra tu primer ingreso o gasto para tus cuentas.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            {(onOpenTransaction || onOpenAddTransaction || setIsAddTransactionOpen) && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onOpenTransaction) onOpenTransaction();
                  else if (setIsAddTransactionOpen) setIsAddTransactionOpen(true);
                  else if (onOpenAddTransaction) onOpenAddTransaction();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Movimiento</span>
              </button>
            )}
            {selectedDay && onSelectDay && (
              <button
                onClick={() => onSelectDay(null)}
                className="px-3.5 py-2 bg-[#007AFF] text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 cursor-pointer"
              >
                Mostrar todo el mes
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-white/[0.06] ${isCompact ? '' : 'lg:max-h-[640px] lg:overflow-y-auto'}`}>
          {displayTransactions.map((tx) => {
            const isExpense = tx.type === 'expense';
            const categoryObj = categories.find(c => c.id === tx.categoryId);
            const accountObj = accounts.find(a => a.id === tx.accountId);

            return (
              <div 
                key={tx.id} 
                onClick={() => setSelectedDetailTx(tx)}
                className="min-h-[52px] p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer flex flex-col justify-center gap-1 select-none active:bg-slate-100/60 dark:active:bg-white/[0.05]"
              >
                {/* Línea 1 (Superior): Concepto/Descripción a la izq y Monto a la der */}
                <div className="flex items-center justify-between gap-2">
                  {/* Izquierda: Icono de categoría + Concepto/Descripción */}
                  <div className="flex items-center gap-2 min-w-0 max-w-[60%]">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg shrink-0 overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-white/[0.06] shadow-sm">
                      <BrandIcon
                        name={tx.note || tx.categoryName || ''}
                        size={14}
                        fallback={
                          <CategoryIcon
                            category={categoryObj || tx.categoryName}
                            status={isExpense ? 'negative' : 'positive'}
                            size={14}
                            withBadge={false}
                          />
                        }
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">
                      {tx.note || tx.categoryName}
                    </span>
                  </div>

                  {/* Derecha: Monto monetario */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums whitespace-nowrap ${
                      isExpense ? 'text-slate-900 dark:text-zinc-100' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isExpense ? '-' : '+'}{formatMoney(tx.amount)}
                    </span>

                    {/* Botón de acción / editar (en desktop / tablet) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(tx);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg active:scale-95 transition-colors cursor-pointer hidden md:flex"
                      title="Editar movimiento"
                      aria-label="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Línea 2 (Inferior): Badge compacto de cuenta a la izq y Fecha/hora a la der */}
                <div className="flex items-center justify-between gap-2">
                  {/* Izquierda: Badge de cuenta + subcategoría / recibo */}
                  <div className="flex items-center gap-1.5 min-w-0 max-w-[60%]">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 truncate inline-flex items-center gap-1.5">
                      <BrandIcon 
                        name={tx.accountName} 
                        type={accountObj?.type} 
                        size={11} 
                        className="shrink-0"
                        fallback={<span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accountObj?.color || '#10B981' }} />}
                      />
                      <span className="truncate">{tx.accountName}</span>
                    </span>

                    {tx.subcategoryName && (
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono truncate hidden xs:inline">
                        • {tx.subcategoryName}
                      </span>
                    )}

                    {tx.receiptImage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingReceiptTx(tx);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md hover:bg-emerald-500/20 transition-colors shrink-0 cursor-pointer"
                        title="Ver recibo adjunto"
                      >
                        <Camera className="w-3 h-3" />
                        <span className="hidden sm:inline">Recibo</span>
                      </button>
                    )}
                  </div>

                  {/* Derecha: Moneda original + Fecha/hora */}
                  <div className="flex items-center gap-2 shrink-0">
                    {tx.originalCurrency && tx.originalCurrency !== 'COP' && (
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono tabular-nums hidden sm:inline">
                        ({Number(tx.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tx.originalCurrency})
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono shrink-0">
                      {formatTxDateClean(tx)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón 'Ver todos los movimientos' al final de la lista */}
      {onViewAll && (
        <div className="pt-2.5 border-t border-slate-200/80 dark:border-white/[0.08] mt-2">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              if (e) {
                if (typeof e.preventDefault === 'function') e.preventDefault();
                if (typeof e.stopPropagation === 'function') e.stopPropagation();
              }
              onViewAll();
            }}
            className="w-full py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-[#29D691] bg-slate-100 dark:bg-zinc-800/80 hover:bg-emerald-500/10 active:scale-98 transition-all cursor-pointer"
          >
            <span>Ver todos los movimientos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal para Editar Transacción */}
      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          accounts={accounts}
          categories={categories}
          onClose={() => setEditingTx(null)}
          onSave={handleSaveEdit}
          onDelete={onDeleteTransaction}
          onAddCategory={onAddCategory}
          onAddSubcategory={onAddSubcategory}
          onUpdateSubcategory={onUpdateSubcategory}
          onDeleteSubcategory={onDeleteSubcategory}
          onAddAccount={onAddAccount}
          trm={trm}
        />
      )}

      {/* Modal / Lightbox para Visualizar Comprobante de Recibo */}
      {viewingReceiptTx && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => setViewingReceiptTx(null)}
        >
          <div 
            className="rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-white space-y-3.5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <h4 className="text-sm font-bold flex items-center gap-1.5 truncate">
                  <Camera className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">Comprobante / Recibo</span>
                </h4>
                <p className="text-[11px] opacity-60 truncate">
                  {viewingReceiptTx.note || viewingReceiptTx.categoryName} · {formatMoney(viewingReceiptTx.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptTx(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden max-h-[55vh] bg-slate-100 dark:bg-zinc-800 flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08]">
              <img 
                src={viewingReceiptTx.receiptImage} 
                alt="Foto del recibo" 
                className="w-full h-auto object-contain max-h-[55vh]"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] opacity-60 pt-0.5">
              <span>Fecha: {formatTxDateTime(viewingReceiptTx)}</span>
              <span>Cuenta: {viewingReceiptTx.accountName}</span>
            </div>

            <button
              type="button"
              onClick={() => setViewingReceiptTx(null)}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-colors bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalle Completo de Transacción */}
      {selectedDetailTx && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fadeIn"
          onClick={() => setSelectedDetailTx(null)}
        >
          <div 
            className="rounded-t-[32px] sm:rounded-2xl p-5 sm:p-6 max-w-sm sm:max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-white space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* iOS Handle */}
            <div className="w-10 h-1 bg-slate-500/30 rounded-full mx-auto sm:hidden shrink-0" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
              <div>
                <h4 className="text-base font-bold">Detalle del Movimiento</h4>
                <p className="text-[11px] opacity-60">Información completa registrada</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailTx(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 opacity-60 hover:opacity-100 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Hero con Monto y Tipo */}
            <div className="text-center py-3.5 px-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/50 space-y-1">
              <BrandIcon 
                name={selectedDetailTx.note || selectedDetailTx.categoryName || ''} 
                size={30} 
                wrapperClassName="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm overflow-hidden mx-auto mb-2" 
                fallback={null} 
              />
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-1" style={{
                backgroundColor: selectedDetailTx.type === 'expense' ? 'rgba(255,59,48,0.15)' : 'rgba(52,199,89,0.15)',
                color: selectedDetailTx.type === 'expense' ? '#FF3B30' : '#34C759'
              }}>
                {selectedDetailTx.type === 'expense' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                <span>{selectedDetailTx.type === 'expense' ? 'Gasto' : 'Ingreso'}</span>
              </div>
              <div className={`text-3xl font-extrabold tabular-nums tracking-tight ${
                selectedDetailTx.type === 'expense' ? 'text-[#FF3B30]' : 'text-[#34C759]'
              }`}>
                {selectedDetailTx.type === 'expense' ? '-' : '+'}{formatMoney(selectedDetailTx.amount)}
              </div>
              {selectedDetailTx.originalCurrency && selectedDetailTx.originalCurrency !== 'COP' && (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                  ({Number(selectedDetailTx.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedDetailTx.originalCurrency} @ ${Number(selectedDetailTx.exchangeRate || 1).toLocaleString('es-CO')} COP)
                </p>
              )}
              <p className="text-xs font-semibold opacity-70">
                {selectedDetailTx.note || selectedDetailTx.categoryName}
              </p>
            </div>

            {/* Lista de Atributos */}
            <div className="space-y-2 text-xs">
              {/* Sección Multidivisa si aplica */}
              {selectedDetailTx.originalCurrency && selectedDetailTx.originalCurrency !== 'COP' && (
                <div className="p-3 rounded-xl border space-y-1.5 bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-500/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">Divisa original</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {Number(selectedDetailTx.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedDetailTx.originalCurrency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                    <span>Tasa de cambio (TRM)</span>
                    <span className="font-bold tabular-nums">
                      $ {Number(selectedDetailTx.exchangeRate || 1).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 pt-1 border-t border-emerald-200/40 dark:border-emerald-500/20">
                    <span className="font-semibold">Equivalente en balance</span>
                    <span className="font-extrabold tabular-nums">
                      $ {Number(selectedDetailTx.amount || 0).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40">
                <span className="opacity-60 font-medium">Categoría</span>
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categories.find(c => c.id === selectedDetailTx.categoryId)?.color || '#007AFF' }} />
                  {selectedDetailTx.categoryName || 'General'}
                </span>
              </div>

              {selectedDetailTx.subcategoryName && (
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40">
                  <span className="opacity-60 font-medium">Subcategoría / Etiqueta</span>
                  <span className="font-bold">{selectedDetailTx.subcategoryName}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40">
                <span className="opacity-60 font-medium">Cuenta / Tarjeta</span>
                <span className="font-bold flex items-center gap-1.5">
                  <BrandIcon name={selectedDetailTx.accountName || 'Principal'} size={18} />
                  <span>{selectedDetailTx.accountName || 'Principal'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40">
                <span className="opacity-60 font-medium">Fecha y Hora</span>
                <span className="font-semibold tabular-nums">{formatTxDateTime(selectedDetailTx)}</span>
              </div>

              {selectedDetailTx.receiptImage && (
                <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40 space-y-1.5">
                  <span className="opacity-60 font-medium block">Comprobante / Recibo</span>
                  <div 
                    onClick={() => {
                      const imgTx = selectedDetailTx;
                      setSelectedDetailTx(null);
                      setViewingReceiptTx(imgTx);
                    }}
                    className="relative rounded-lg overflow-hidden border border-slate-200/80 dark:border-white/[0.08] max-h-36 cursor-pointer group flex items-center justify-center bg-slate-100 dark:bg-zinc-800"
                  >
                    <img src={selectedDetailTx.receiptImage} alt="Recibo" className="w-full h-36 object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                      Toca para ampliar
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Acciones al pie */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const txToEdit = selectedDetailTx;
                  setSelectedDetailTx(null);
                  handleOpenEdit(txToEdit);
                }}
                className="py-2.5 px-3 bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('¿Eliminar este movimiento permanentemente?')) {
                    onDeleteTransaction(selectedDetailTx.id);
                    setSelectedDetailTx(null);
                  }
                }}
                className="py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-[#FF3B30] border border-red-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
