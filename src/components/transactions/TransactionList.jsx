import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Inbox, X, ArrowRight, Search, SlidersHorizontal, Calendar, RotateCcw,
  ChevronLeft, ChevronRight, Pencil, Trash2
} from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import TransactionItem, { formatTxDateClean } from './components/TransactionItem';
import BrandIcon from '../ui/BrandIcon';
import CategoryIcon from '../categories/components/CategoryIcon';
import EditTransactionModal from './modals/EditTransactionModal';
import ReceiptModal from './modals/ReceiptModal';
import TransactionDetailModal from './modals/TransactionDetailModal';
import TransactionsHeroCard from './TransactionsHeroCard';

export default function TransactionList({ 
  transactions = [], onDeleteTransaction, onEditTransaction, onUpdateTransaction: propUpdateTx, 
  onAddCategory, onAddSubcategory, onUpdateSubcategory, onDeleteSubcategory, onAddAccount, 
  categories = [], accounts = [], currentMonthLabel, selectedDate = new Date(),
  selectedDay, onSelectDay, onClearSelectedDay, monthlyStats = {},
  onOpenMonthPicker = null, onOpenCalendar = null, limit, isCompact = false, onViewAll, trm = 4000
}) {
  const onUpdateTransaction = propUpdateTx || onEditTransaction;
  const handleClearSelectedDay = onClearSelectedDay || (() => onSelectDay?.(null));

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [viewingReceiptTx, setViewingReceiptTx] = useState(null);
  const [selectedDetailTx, setSelectedDetailTx] = useState(null);
  const [editingTx, setEditingTx] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const searchInputRef = useRef(null);
  const { formatMoney } = usePrivacy();

  useEffect(() => { if (isSearchOpen && searchInputRef.current) searchInputRef.current.focus(); }, [isSearchOpen]);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { setIsFilterModalOpen(false); if (isSearchOpen) setIsSearchOpen(false); }
      else if ((e.metaKey || e.ctrlKey) && ['k', 'f'].includes(e.key.toLowerCase())) { e.preventDefault(); setIsSearchOpen((p) => !p); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const hasActiveFilters = typeFilter !== 'all' || accountFilter !== 'all' || categoryFilter !== 'all' || Boolean(selectedDay);
  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (accountFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0) + (selectedDay ? 1 : 0);

  useEffect(() => {
    const toggleSearch = () => setIsSearchOpen((prev) => { if (prev) setSearchTerm(''); return !prev; });
    const openFilter = () => setIsFilterModalOpen(true);
    window.addEventListener('monety:toggle-search', toggleSearch);
    window.addEventListener('monety:open-filter-modal', openFilter);
    return () => { window.removeEventListener('monety:toggle-search', toggleSearch); window.removeEventListener('monety:open-filter-modal', openFilter); };
  }, []);

  useEffect(() => { window.dispatchEvent(new CustomEvent('monety:filter-status-changed', { detail: { hasActiveFilters, activeFilterCount } })); }, [hasActiveFilters, activeFilterCount]);
  useEffect(() => { window.dispatchEvent(new CustomEvent('monety:search-status-changed', { detail: { isSearchOpen, hasSearchTerm: Boolean(searchTerm) } })); }, [isSearchOpen, searchTerm]);

  const accountMap = useMemo(() => new Map((accounts || []).map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map((categories || []).map((c) => [c.id, c])), [categories]);
  const safeTransactions = useMemo(() => (Array.isArray(transactions) ? transactions : []), [transactions]);

  const isTransferTx = (t) => Boolean(t && (t.isTransfer || t.is_transfer || ['transfer', 'transferencia'].includes(t.type) || ['cat-transfer'].includes(t.categoryId || t.category_id) || ['sub-transfer-in', 'sub-transfer-out'].includes(t.subcategoryId)));

  const { heroIncome, heroExpense } = useMemo(() => {
    if (!selectedDay && monthlyStats?.totalIncome !== undefined && monthlyStats?.totalExpense !== undefined) {
      return { heroIncome: Number(monthlyStats.totalIncome) || 0, heroExpense: Number(monthlyStats.totalExpense) || 0 };
    }
    const targetDay = selectedDay ? String(selectedDay).split('T')[0] : null;
    let inc = 0, exp = 0;
    safeTransactions.forEach((t) => {
      if (isTransferTx(t)) return;
      if (targetDay && (t?.date ? String(t.date).split('T')[0] : (t?.created_at ? String(t.created_at).split('T')[0] : '')) !== targetDay) return;
      const rawType = String(t?.type || '').toLowerCase(), amt = Number(t?.amount) || 0;
      if (['income', 'ingreso'].includes(rawType) || amt > 0) inc += amt;
      else if (['expense', 'gasto'].includes(rawType) || amt < 0) exp += Math.abs(amt);
    });
    return { heroIncome: selectedDay ? inc : (Number(monthlyStats?.totalIncome) || inc), heroExpense: selectedDay ? exp : (Number(monthlyStats?.totalExpense) || exp) };
  }, [selectedDay, safeTransactions, monthlyStats?.totalIncome, monthlyStats?.totalExpense]);

  const filteredTransactions = useMemo(() => {
    const s = searchTerm.trim().toLowerCase(), targetDay = selectedDay ? String(selectedDay).split('T')[0] : null;
    return safeTransactions.filter((tx) => {
      if (!tx) return false;
      if (targetDay && (tx.date ? String(tx.date).split('T')[0] : (tx.created_at ? String(tx.created_at).split('T')[0] : '')) !== targetDay) return false;
      if (s && ![tx.note, tx.notes, tx.description, tx.category, tx.categoryName, tx.subcategoryName, tx.accountName].some((f) => f && String(f).toLowerCase().includes(s))) return false;
      if (typeFilter !== 'all') {
        const raw = String(tx.type || '').toLowerCase(), norm = ['gasto', 'expense'].includes(raw) ? 'expense' : ['ingreso', 'income'].includes(raw) ? 'income' : raw;
        if (norm !== typeFilter) return false;
      }
      if (accountFilter !== 'all' && (tx.accountId || tx.account_id) !== accountFilter) return false;
      if (categoryFilter !== 'all' && (tx.categoryId || tx.category_id) !== categoryFilter && tx.category !== categoryFilter) return false;
      return true;
    }).sort((a, b) => {
      const dateA = a?.date ? String(a.date).split('T')[0] : (a?.created_at ? String(a.created_at).split('T')[0] : '');
      const dateB = b?.date ? String(b.date).split('T')[0] : (b?.created_at ? String(b.created_at).split('T')[0] : '');
      return new Date((dateB || '1970-01-01') + 'T00:00:00') - new Date((dateA || '1970-01-01') + 'T00:00:00');
    });
  }, [safeTransactions, selectedDay, searchTerm, typeFilter, accountFilter, categoryFilter]);

  const itemsPerPage = 15;
  useEffect(() => { setCurrentPage(1); }, [searchTerm, typeFilter, accountFilter, categoryFilter, selectedDay, selectedDate]);
  const totalItems = filteredTransactions.length, totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage)), startIndex = (currentPage - 1) * itemsPerPage;
  const itemsToRender = isCompact ? (limit ? filteredTransactions.slice(0, limit) : filteredTransactions) : filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const handleResetFilters = () => { setTypeFilter('all'); setAccountFilter('all'); setCategoryFilter('all'); handleClearSelectedDay(); };
  const pillCls = (active) => `px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${active ? 'bg-[#007AFF] text-white shadow-sm font-bold' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200'}`;

  return (
    <div className={`ios-card ${isCompact ? 'p-3.5 sm:p-4' : 'p-3.5 sm:p-5'}`}>
      {isCompact && <h2 className="text-[17px] sm:text-[19px] font-bold tracking-tight text-slate-900 dark:text-white truncate mb-2">Movimientos Recientes</h2>}
      {!isCompact && isSearchOpen && (
        <div className="flex items-center gap-2 w-full mb-3 animate-in fade-in duration-150">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={searchInputRef} type="text" placeholder="Buscar por nota, categoría o cuenta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30" autoFocus />
            {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 flex items-center justify-center text-[10px] cursor-pointer">✕</button>}
          </div>
          <button type="button" onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }} className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white cursor-pointer shrink-0">Cancelar</button>
        </div>
      )}
      {!isCompact && (
        <>
          <div className="my-2.5 sm:my-3">
            <TransactionsHeroCard income={heroIncome} expense={heroExpense} balance={heroIncome - heroExpense} transactions={safeTransactions} selectedDate={selectedDate} selectedDay={selectedDay} currentMonthLabel={currentMonthLabel} typeFilter={typeFilter} onTypeFilterChange={setTypeFilter} onOpenMonthPicker={onOpenMonthPicker || onOpenCalendar} onOpenCalendar={onOpenCalendar} formatMoney={formatMoney} />
          </div>
          <div className="flex items-center justify-between mt-3.5 mb-1 px-1"><span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Movimientos • {totalItems} items</span></div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 px-0.5 pr-6 mb-3 select-none">
            <button type="button" onClick={() => setAccountFilter('all')} className={pillCls(accountFilter === 'all')}>Todas las cuentas</button>
            {accounts.map((acc) => (
              <button key={acc.id} type="button" onClick={() => setAccountFilter(acc.id)} className={`${pillCls(accountFilter === acc.id)} flex items-center gap-1.5`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: acc.color || '#007AFF' }} />
                <span className="truncate max-w-[120px]">{acc.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {totalItems === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 rounded-2xl">
          <Inbox className="w-8 h-8 opacity-30 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedDay ? 'No hay movimientos en este día' : 'Sin movimientos registrados este mes'}</p>
          <p className="text-[11px] opacity-50 mt-0.5">{selectedDay ? 'Toca "Ver todo el mes" para ver el período completo.' : 'Usa el botón central (+) para registrar tus ingresos y gastos.'}</p>
          {selectedDay && <button onClick={handleClearSelectedDay} className="mt-3 px-3.5 py-2 bg-[#007AFF] text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 cursor-pointer">Mostrar todo el mes</button>}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-white/[0.06]">
          {!isCompact && itemsToRender.length > 0 && (
            <div className="hidden md:grid md:grid-cols-12 items-center py-2.5 px-4 border-b border-slate-100 dark:border-white/[0.06] text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider bg-slate-50/60 dark:bg-zinc-800/20 select-none">
              <div className="col-span-4">Concepto / Categoría</div><div className="col-span-3">Cuenta</div><div className="col-span-2 text-center">Fecha</div><div className="col-span-2 text-right">Monto</div><div className="col-span-1 text-right">Acciones</div>
            </div>
          )}
          {itemsToRender.map((tx) => {
            const rawType = String(tx?.type || '').toLowerCase(), amt = Number(tx?.amount) || 0;
            const isTransfer = ['transfer', 'transferencia'].includes(rawType) || Boolean(tx?.isTransfer);
            const isExpense = !isTransfer && (['expense', 'gasto', 'egreso'].includes(rawType) || amt < 0);
            const isIncome = !isTransfer && (['income', 'ingreso'].includes(rawType) || (!isExpense && amt > 0));
            return (
              <React.Fragment key={tx.id}>
                <div className="md:hidden">
                  <TransactionItem transaction={tx} category={categoryMap.get(tx.categoryId)} account={accountMap.get(tx.accountId)} onSelect={setSelectedDetailTx} onEdit={setEditingTx} onDelete={onDeleteTransaction} onViewReceipt={setViewingReceiptTx} />
                </div>
                <div onClick={() => setSelectedDetailTx(tx)} className="hidden md:grid md:grid-cols-12 items-center py-2.5 px-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none">
                  <div className="col-span-4 flex items-center gap-2.5 min-w-0 pr-3">
                    <div className="w-8 h-8 rounded-xl shrink-0 overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-zinc-800 border border-slate-200/60 dark:border-white/10 shadow-xs">
                      <BrandIcon name={tx.note || tx.categoryName || ''} size={16} fallback={<CategoryIcon category={categoryMap.get(tx.categoryId) || tx.categoryName} status={isExpense ? 'negative' : isIncome ? 'positive' : 'neutral'} size={14} withBadge={false} />} />
                    </div>
                    <div className="min-w-0 truncate">
                      <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate block">{tx.note || tx.categoryName}</span>
                      {tx.note && tx.categoryName && <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-normal truncate block">{tx.categoryName}</span>}
                    </div>
                  </div>
                  <div className="col-span-3 min-w-0 pr-3"><span className="text-xs text-slate-400 dark:text-zinc-400 font-medium truncate block">{tx.accountName || accountMap.get(tx.accountId)?.name || 'Principal'}</span></div>
                  <div className="col-span-2 text-center"><span className="text-xs text-slate-400 dark:text-zinc-400 font-mono">{formatTxDateClean(tx)}</span></div>
                  <div className="col-span-2 text-right"><span className={`text-sm font-semibold font-mono tracking-tight tabular-nums whitespace-nowrap ${isExpense ? 'text-rose-500 dark:text-rose-400' : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-zinc-300'}`}>{isExpense ? '-' : isIncome ? '+' : ''}{formatMoney(Math.abs(amt))}</span></div>
                  <div className="col-span-1 flex items-center justify-end gap-1 pl-2">
                    <button type="button" title="Editar" onClick={(e) => { e.stopPropagation(); setEditingTx(tx); }} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><Pencil size={15} /></button>
                    <button type="button" title="Eliminar" onClick={(e) => { e.stopPropagation(); if (window.confirm(`¿Eliminar permanentemente "${tx.note || tx.categoryName || 'este movimiento'}"?`)) onDeleteTransaction(tx.id || tx); }} className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"><Trash2 size={15} /></button>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          {!isCompact && totalItems > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <span>Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems}</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"><ChevronLeft size={16} /></button>
                <span className="px-2 font-medium">Página {currentPage} de {totalPages}</span>
                <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {onViewAll && (
        <div className="pt-2.5 border-t border-slate-200/80 dark:border-white/[0.08] mt-2">
          <button type="button" onClick={onViewAll} className="w-full py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-[#29D691] bg-slate-100 dark:bg-zinc-800/80 hover:bg-emerald-500/10 active:scale-98 cursor-pointer">
            <span>Ver todos los movimientos</span><ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {editingTx && (
        <EditTransactionModal transaction={editingTx} accounts={accounts} categories={categories} onClose={() => setEditingTx(null)} onSave={(updated) => { onUpdateTransaction?.(updated); setEditingTx(null); }} onDelete={onDeleteTransaction} onAddCategory={onAddCategory} onAddSubcategory={onAddSubcategory} onUpdateSubcategory={onUpdateSubcategory} onDeleteSubcategory={onDeleteSubcategory} onAddAccount={onAddAccount} trm={trm} />
      )}
      {viewingReceiptTx && <ReceiptModal transaction={viewingReceiptTx} onClose={() => setViewingReceiptTx(null)} />}
      {selectedDetailTx && (
        <TransactionDetailModal transaction={selectedDetailTx} categories={categories} onClose={() => setSelectedDetailTx(null)} onEdit={setEditingTx} onDelete={onDeleteTransaction} onViewReceipt={setViewingReceiptTx} />
      )}

      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsFilterModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-white/10 max-h-[85vh] overflow-y-auto z-10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"><SlidersHorizontal className="w-4 h-4 text-[#007AFF]" /></div>
                <div><h3 className="text-base font-bold text-slate-900 dark:text-white">Filtros de movimientos</h3><p className="text-xs text-slate-500 dark:text-zinc-400">Ajusta los criterios de búsqueda</p></div>
              </div>
              <div className="flex items-center gap-1">
                {hasActiveFilters && <button type="button" onClick={handleResetFilters} className="px-2.5 py-1 text-xs font-semibold text-rose-500 hover:text-rose-600 rounded-lg cursor-pointer">Restablecer</button>}
                <button type="button" onClick={() => setIsFilterModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer" aria-label="Cerrar filtros"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#007AFF]" /><span>Filtrar por día específico</span></span>
                {selectedDay && <button type="button" onClick={handleClearSelectedDay} className="text-[11px] text-rose-500 hover:underline font-semibold cursor-pointer">Quitar día</button>}
              </div>
              <input type="date" value={selectedDay || ''} onChange={(e) => onSelectDay?.(e.target.value || null)} className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 cursor-pointer" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-2">Categoría</span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-1">
                <button type="button" onClick={() => setCategoryFilter('all')} className={pillCls(categoryFilter === 'all')}>Todas las categorías</button>
                {categories.map((cat) => (
                  <button key={cat.id} type="button" onClick={() => setCategoryFilter(cat.id)} className={`${pillCls(categoryFilter === cat.id)} flex items-center gap-1.5`}>
                    {cat.icon && <span className="text-xs">{cat.icon}</span>}<span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-2">Cuenta o método de pago</span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-1">
                <button type="button" onClick={() => setAccountFilter('all')} className={pillCls(accountFilter === 'all')}>Todas las cuentas</button>
                {accounts.map((acc) => (
                  <button key={acc.id} type="button" onClick={() => setAccountFilter(acc.id)} className={`${pillCls(accountFilter === acc.id)} flex items-center gap-1.5`}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: acc.color || '#007AFF' }} /><span>{acc.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
              {hasActiveFilters && (
                <button type="button" onClick={handleResetFilters} className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer">
                  <RotateCcw className="w-3.5 h-3.5" /><span>Limpiar</span>
                </button>
              )}
              <button type="button" onClick={() => setIsFilterModalOpen(false)} className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#007AFF] hover:bg-[#0062cc] active:scale-98 shadow-md cursor-pointer text-center">
                Ver resultados ({totalItems})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
