import React, { useState, useRef, useEffect } from 'react';
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
  trm = 4000,
  onBack = null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [accountFilter, setAccountFilter] = useState('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
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
        setIsPeriodMenuOpen(false);
        if (isSearchOpen) {
          setIsSearchOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Indicador de filtros activos
  const hasActiveFilters = typeFilter !== 'all' || accountFilter !== 'all' || Boolean(selectedDay);
  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (accountFilter !== 'all' ? 1 : 0) + (selectedDay ? 1 : 0);

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
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] sm:text-[18px] font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {isCompact ? 'Movimientos Recientes' : 'Movimientos'}
                  </h2>
                  {!isCompact && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 shrink-0">
                      ({filteredTransactions.length})
                    </span>
                  )}
                </div>

                {/* Subtítulo / Selector de fecha interactivo con popover */}
                {!isCompact && (
                  <div className="relative inline-block mt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
                      className="group/period flex items-center gap-1 text-[11px] sm:text-[12px] font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="truncate max-w-[190px] sm:max-w-[280px]">
                        {selectedDay 
                          ? `Día ${selectedDay.split('-')[2]} de ${MONTH_NAMES[parseInt(selectedDay.split('-')[1]) - 1] || ''}` 
                          : (currentMonthLabel || 'Mes actual')}
                      </span>
                      <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isPeriodMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Popover flotante compacto para selección de período */}
                    {isPeriodMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsPeriodMenuOpen(false)} 
                        />
                        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[240px] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-white/10 p-2 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                            Período de consulta
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectDay) onSelectDay(null);
                              setIsPeriodMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                              !selectedDay 
                                ? 'bg-[#007AFF]/10 text-[#007AFF] font-bold' 
                                : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <span>Ver todo el mes ({currentMonthLabel || 'Mes actual'})</span>
                            {!selectedDay && <Check className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectDay) {
                                const todayStr = new Date().toISOString().split('T')[0];
                                onSelectDay(selectedDay || todayStr);
                              }
                              setIsPeriodMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                              selectedDay 
                                ? 'bg-[#007AFF]/10 text-[#007AFF] font-bold' 
                                : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <span>Filtrar por día específico</span>
                            {selectedDay && <Check className="w-3.5 h-3.5" />}
                          </button>

                          {selectedDay && onSelectDay && (
                            <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-white/5 space-y-1">
                              <label className="text-[10px] text-slate-400 font-semibold px-2 block">
                                Seleccionar día:
                              </label>
                              <input
                                type="date"
                                value={selectedDay}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    onSelectDay(e.target.value);
                                  }
                                }}
                                className="w-full text-xs bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-xl px-2.5 py-1.5 border border-slate-200/80 dark:border-white/10"
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
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

      {/* Nivel 2: Fila única de segmentación rápida (Carrusel horizontal con scroll suave) */}
      {!isCompact && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 px-0.5 pr-6 mb-3 select-none">
          {/* Píldoras compactas de Tipo */}
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm font-bold'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('income')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              typeFilter === 'income'
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-600'
            }`}
          >
            Ingresos
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('expense')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              typeFilter === 'expense'
                ? 'bg-rose-600 text-white shadow-sm font-bold'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-rose-500/10 hover:text-rose-600'
            }`}
          >
            Gastos
          </button>

          {/* Divisor vertical sutil */}
          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 mx-1 shrink-0" aria-hidden="true" />

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
            Todas
          </button>
          {accounts.map((acc) => {
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

      {/* Modal / Bottom Sheet de Filtros Avanzados */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => setIsFilterModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200/80 dark:border-white/10 max-h-[85vh] overflow-y-auto z-10 space-y-5 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
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
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Cerrar filtros"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Tipo de movimiento */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-2">
                Tipo de movimiento
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'income', label: 'Ingresos' },
                  { id: 'expense', label: 'Gastos' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTypeFilter(opt.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      typeFilter === opt.id
                        ? opt.id === 'income'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : opt.id === 'expense'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Período / Fecha */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-2">
                Período
              </span>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectDay) onSelectDay(null);
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                    !selectedDay
                      ? 'bg-[#007AFF]/10 border-[#007AFF]/40 text-[#007AFF] font-bold'
                      : 'border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Mes completo ({currentMonthLabel || 'Mes actual'})</span>
                  </span>
                  {!selectedDay && <Check className="w-4 h-4 text-[#007AFF]" />}
                </button>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Filtrar por día específico:
                    </span>
                    {selectedDay && onSelectDay && (
                      <button
                        type="button"
                        onClick={() => onSelectDay(null)}
                        className="text-[11px] text-rose-500 hover:underline font-semibold"
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
                    className="w-full text-xs bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-xl px-3 py-2 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                  />
                </div>
              </div>
            </div>

            {/* 3. Cuenta / Método de pago */}
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
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccountFilter(acc.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      accountFilter === acc.id
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
                ))}
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
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#007AFF] hover:bg-[#0062cc] active:scale-98 transition-all shadow-md cursor-pointer"
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
