import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Inbox, 
  X, 
  ArrowRight,
  ArrowLeft,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Check,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { MONTH_NAMES } from '../../data/initialData';
import { usePrivacy } from '../../context/PrivacyContext';
import { getEnableDecimals } from '../../utils/currencyFormatter';
import TransactionItem from './components/TransactionItem';
import EditTransactionModal from './modals/EditTransactionModal';
import ReceiptModal from './modals/ReceiptModal';
import TransactionDetailModal from './modals/TransactionDetailModal';
import TransactionsHeroCard from './TransactionsHeroCard';

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
  selectedDate = new Date(),
  selectedDay, 
  onSelectDay, 
  monthlyStats = {},
  onOpenMonthPicker = null,
  onOpenCalendar = null,
  limit, 
  isCompact = false, 
  onViewAll,
  onOpenTransaction,
  onOpenAddTransaction,
  setIsAddTransactionOpen,
  modalControls,
  trm = 4000,
  onBack = null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const searchInputRef = useRef(null);

  const { formatMoney, enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();

  // Receipt Viewer Modal State
  const [viewingReceiptTx, setViewingReceiptTx] = useState(null);

  // Transaction Detail Modal State
  const [selectedDetailTx, setSelectedDetailTx] = useState(null);

  // Edit Modal State
  const [editingTx, setEditingTx] = useState(null);

  // Auto-enfoque al abrir barra de búsqueda
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Manejo de tecla Escape para cerrar modales y menús
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFilterModalOpen(false);
        if (isSearchOpen) {
          setIsSearchOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Indicador de filtros activos
  const hasActiveFilters = typeFilter !== 'all' || accountFilter !== 'all' || categoryFilter !== 'all' || Boolean(selectedDay);
  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (accountFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0) + (selectedDay ? 1 : 0);

  // Sort transactions by date descending (newest first)
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const sortedTransactions = [...safeTransactions].sort((a, b) => {
    const dateA = a?.date ? String(a.date).split('T')[0] : (a?.created_at ? String(a.created_at).split('T')[0] : '');
    const dateB = b?.date ? String(b.date).split('T')[0] : (b?.created_at ? String(b.created_at).split('T')[0] : '');
    return new Date((dateB || '1970-01-01') + 'T00:00:00') - new Date((dateA || '1970-01-01') + 'T00:00:00');
  });

  // Cálculo de métricas del periodo seleccionado (Ingresos, Gastos, Balance) para TransactionsHeroCard
  const isTransferTx = (t) => Boolean(
    t && (
      t.isTransfer ||
      t.is_transfer ||
      t.type === 'transfer' ||
      t.type === 'transferencia' ||
      t.categoryId === 'cat-transfer' ||
      t.category_id === 'cat-transfer' ||
      t.subcategoryId === 'sub-transfer-in' ||
      t.subcategoryId === 'sub-transfer-out'
    )
  );

  const heroIncome = useMemo(() => {
    if (selectedDay) {
      return (safeTransactions || [])
        .filter(t => {
          const d = t?.date ? String(t.date).split('T')[0] : (t?.created_at ? String(t.created_at).split('T')[0] : '');
          return d === String(selectedDay).split('T')[0] && (t?.type === 'income' || t?.type === 'ingreso') && !isTransferTx(t);
        })
        .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
    }
    if (monthlyStats?.totalIncome !== undefined) {
      return Number(monthlyStats.totalIncome) || 0;
    }
    return (safeTransactions || [])
      .filter(t => (t?.type === 'income' || t?.type === 'ingreso') && !isTransferTx(t))
      .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
  }, [selectedDay, safeTransactions, monthlyStats?.totalIncome]);

  const heroExpense = useMemo(() => {
    if (selectedDay) {
      return (safeTransactions || [])
        .filter(t => {
          const d = t?.date ? String(t.date).split('T')[0] : (t?.created_at ? String(t.created_at).split('T')[0] : '');
          return d === String(selectedDay).split('T')[0] && (t?.type === 'expense' || t?.type === 'gasto') && !isTransferTx(t);
        })
        .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
    }
    if (monthlyStats?.totalExpense !== undefined) {
      return Number(monthlyStats.totalExpense) || 0;
    }
    return (safeTransactions || [])
      .filter(t => (t?.type === 'expense' || t?.type === 'gasto') && !isTransferTx(t))
      .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
  }, [selectedDay, safeTransactions, monthlyStats?.totalExpense]);

  const heroBalance = heroIncome - heroExpense;

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

    const txCatId = tx.categoryId || tx.category_id;
    const matchesCategory = categoryFilter === 'all' || txCatId === categoryFilter || tx.category === categoryFilter;

    return matchesSearch && matchesType && matchesAccount && matchesCategory;
  });

  const displayTransactions = limit ? filteredTransactions.slice(0, limit) : filteredTransactions;

  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
  };

  const handleSaveEdit = (updated) => {
    onUpdateTransaction(updated);
    setEditingTx(null);
  };

  return (
    <div className={`ios-card ${isCompact ? 'p-3.5 sm:p-4' : 'p-3.5 sm:p-5'}`}>
      {/* Nivel 1: Barra superior unificada (Navegación + Título/Período + Lupa/Filtros) */}
      <div className="flex items-center justify-between gap-2 mb-2 min-h-[40px]">
        {isSearchOpen ? (
          <div className="flex items-center gap-2 w-full animate-in fade-in duration-150">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por nota, categoría o cuenta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 flex items-center justify-center text-[10px] hover:bg-slate-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
                  title="Limpiar texto"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchTerm('');
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              {!isCompact && (
                <button
                  type="button"
                  onClick={onBack ? onBack : () => {
                    if (typeof window !== 'undefined' && window.history.length > 2) window.history.back();
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-colors cursor-pointer border border-slate-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm shrink-0"
                  aria-label="Volver"
                  title="Volver"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] sm:text-[20px] font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  {isCompact ? 'Movimientos Recientes' : 'Transacciones'}
                </h2>
              </div>
            </div>

            {/* Acciones Rápidas (Lupa + Filtro) */}
            {!isCompact && (
              <div className="flex items-center gap-1 shrink-0">
                {/* Botón 1: Lupa */}
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors relative cursor-pointer"
                  aria-label="Buscar movimientos"
                  title="Buscar movimientos"
                >
                  <Search className="w-4 h-4" />
                  {searchTerm && (
                    <span className="w-2 h-2 rounded-full bg-[#007AFF] absolute top-1.5 right-1.5" />
                  )}
                </button>

                {/* Botón 2: Filtros avanzados */}
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors relative cursor-pointer"
                  aria-label="Filtros avanzados"
                  title="Filtros avanzados"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {hasActiveFilters && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#007AFF] text-white text-[9px] font-bold flex items-center justify-center absolute -top-0.5 -right-0.5 shadow-sm">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tarjeta Cabecera de Resumen Financiero (Hero Card) */}
      {!isCompact && (
        <>
          <div className="my-2.5 sm:my-3">
            <TransactionsHeroCard
              income={heroIncome}
              expense={heroExpense}
              balance={heroBalance}
              transactions={safeTransactions}
              selectedDate={selectedDate}
              selectedDay={selectedDay}
              currentMonthLabel={currentMonthLabel}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              onOpenMonthPicker={onOpenMonthPicker || onOpenCalendar}
              onOpenCalendar={onOpenCalendar}
              formatMoney={formatMoney}
            />
          </div>

          <div className="flex items-center justify-between mt-3.5 mb-1 px-1">
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              Movimientos • {filteredTransactions.length} items
            </span>
          </div>
        </>
      )}

      {/* Nivel 2: Fila única de segmentación rápida (Carrusel horizontal de Cuentas / Métodos de pago) */}
      {!isCompact && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 px-0.5 pr-6 mb-3 select-none">
          {/* Píldoras de Cuentas */}
          <button
            type="button"
            onClick={() => setAccountFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              accountFilter === 'all'
                ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            Todas las cuentas
          </button>
          {(accounts || []).map((acc) => {
            const isSelected = accountFilter === acc.id;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => setAccountFilter(acc.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: acc.color || '#007AFF' }} 
                />
                <span className="truncate max-w-[120px]">{acc.name}</span>
              </button>
            );
          })}

          {/* Espaciador final para evitar recorte de la última tarjeta al final del scroll */}
          <div className="w-4 shrink-0 h-1 pointer-events-none" aria-hidden="true" />
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
            {selectedDay ? 'Toca "Ver todo el mes" para ver el período completo.' : 'Usa el botón central (+) para registrar tus ingresos y gastos.'}
          </p>
          {selectedDay && onSelectDay && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <button
                onClick={() => onSelectDay(null)}
                className="px-3.5 py-2 bg-[#007AFF] text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 cursor-pointer"
              >
                Mostrar todo el mes
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={`rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-white/[0.06] ${isCompact ? '' : 'lg:max-h-[640px] lg:overflow-y-auto'}`}>
          {displayTransactions.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              category={categories.find(c => c.id === tx.categoryId)}
              account={accounts.find(a => a.id === tx.accountId)}
              onSelect={setSelectedDetailTx}
              onEdit={handleOpenEdit}
              onDelete={onDeleteTransaction}
              onViewReceipt={setViewingReceiptTx}
            />
          ))}
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
        <ReceiptModal
          transaction={viewingReceiptTx}
          onClose={() => setViewingReceiptTx(null)}
        />
      )}

      {/* Modal de Detalle Completo de Transacción */}
      {selectedDetailTx && (
        <TransactionDetailModal
          transaction={selectedDetailTx}
          categories={categories}
          onClose={() => setSelectedDetailTx(null)}
          onEdit={handleOpenEdit}
          onDelete={onDeleteTransaction}
          onViewReceipt={(tx) => setViewingReceiptTx(tx)}
        />
      )}

      {/* Modal de Filtros Avanzados (Centrado en pantalla con backdrop) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsFilterModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-white/10 max-h-[85vh] overflow-y-auto z-10 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  <SlidersHorizontal className="w-4 h-4 text-[#007AFF]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Filtros de movimientos
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Ajusta los criterios de búsqueda
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter('all');
                      setAccountFilter('all');
                      setCategoryFilter('all');
                      if (onSelectDay) onSelectDay(null);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Limpiar todos los filtros"
                  >
                    Restablecer
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  aria-label="Cerrar filtros"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 1. Filtrar por día específico */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>Filtrar por día específico</span>
                </span>
                {selectedDay && onSelectDay && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(null)}
                    className="text-[11px] text-rose-500 hover:underline font-semibold cursor-pointer"
                  >
                    Quitar día
                  </button>
                )}
              </div>
              <input
                type="date"
                value={selectedDay || ''}
                onChange={(e) => {
                  if (onSelectDay) {
                    onSelectDay(e.target.value || null);
                  }
                }}
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all cursor-pointer"
              />
            </div>

            {/* 2. Selector de Categorías */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-2">
                Categoría
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    categoryFilter === 'all'
                      ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  Todas las categorías
                </button>
                {(Array.isArray(categories) ? categories : []).map((cat) => {
                  const isSelected = categoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {cat.icon && <span className="text-xs">{cat.icon}</span>}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Selector de Cuentas / Métodos de pago */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-2">
                Cuenta o método de pago
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => setAccountFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    accountFilter === 'all'
                      ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  Todas las cuentas
                </button>
                {(Array.isArray(accounts) ? accounts : []).map((acc) => {
                  const isSelected = accountFilter === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setAccountFilter(acc.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <span 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: acc.color || '#007AFF' }} 
                      />
                      <span>{acc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer de acciones */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('all');
                    setAccountFilter('all');
                    setCategoryFilter('all');
                    if (onSelectDay) onSelectDay(null);
                  }}
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#007AFF] hover:bg-[#0062cc] active:scale-98 transition-all shadow-md cursor-pointer text-center"
              >
                Ver resultados ({filteredTransactions.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
