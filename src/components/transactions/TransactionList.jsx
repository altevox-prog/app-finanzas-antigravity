import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Inbox, ArrowRight, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import TransactionItem from './components/TransactionItem';
import EditTransactionModal from './modals/EditTransactionModal';
import ReceiptModal from './modals/ReceiptModal';
import TransactionDetailModal from './modals/TransactionDetailModal';
import TransactionFilterModal from './modals/TransactionFilterModal';
import TransactionsHeroCard from './TransactionsHeroCard';
import { consolidateTransfers } from '../../utils/transferTxUtils';

export default function TransactionList({ 
  transactions = [], onDeleteTransaction, onEditTransaction, onUpdateTransaction: propUpdateTx,
  onAddCategory, onAddSubcategory, onUpdateSubcategory, onDeleteSubcategory, onAddAccount,
  categories = [], accounts = [], currentMonthLabel, selectedDate = new Date(), selectedDay,
  onSelectDay, onClearSelectedDay, monthlyStats = {}, onOpenMonthPicker, onOpenCalendar, limit, isCompact = false, onViewAll, trm = 4000
}) {
  const onUpdateTransaction = propUpdateTx || onEditTransaction, handleClearSelectedDay = onClearSelectedDay || (() => onSelectDay?.(null));
  const [searchTerm, setSearchTerm] = useState(''), [typeFilter, setTypeFilter] = useState('all'), [accountFilter, setAccountFilter] = useState('all'), [categoryFilter, setCategoryFilter] = useState('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false), [isFilterModalOpen, setIsFilterModalOpen] = useState(false), [currentPage, setCurrentPage] = useState(1);
  const [viewingReceiptTx, setViewingReceiptTx] = useState(null), [selectedDetailTx, setSelectedDetailTx] = useState(null), [editingTx, setEditingTx] = useState(null);
  const searchInputRef = useRef(null), { formatMoney } = usePrivacy();

  useEffect(() => { if (isSearchOpen) searchInputRef.current?.focus(); }, [isSearchOpen]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setIsFilterModalOpen(false); setIsSearchOpen(false); }
      else if ((e.metaKey || e.ctrlKey) && ['k', 'f'].includes(e.key.toLowerCase())) { e.preventDefault(); setIsSearchOpen((p) => !p); }
    };
    const toggleSearch = () => setIsSearchOpen((p) => !p), openFilter = () => setIsFilterModalOpen(true);
    window.addEventListener('keydown', onKey); window.addEventListener('monety:toggle-search', toggleSearch); window.addEventListener('monety:open-filter-modal', openFilter);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('monety:toggle-search', toggleSearch); window.removeEventListener('monety:open-filter-modal', openFilter); };
  }, []);

  const hasActiveFilters = typeFilter !== 'all' || accountFilter !== 'all' || categoryFilter !== 'all' || Boolean(selectedDay);
  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (accountFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0) + (selectedDay ? 1 : 0);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('monety:filter-status-changed', { detail: { hasActiveFilters, activeFilterCount } }));
    window.dispatchEvent(new CustomEvent('monety:search-status-changed', { detail: { isSearchOpen, hasSearchTerm: Boolean(searchTerm) } }));
  }, [hasActiveFilters, activeFilterCount, isSearchOpen, searchTerm]);

  const accountMap = useMemo(() => new Map((accounts || []).map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map((categories || []).map((c) => [c.id, c])), [categories]);
  const safeTransactions = useMemo(() => (Array.isArray(transactions) ? transactions : []), [transactions]);

  const { heroIncome, heroExpense } = useMemo(() => {
    if (!selectedDay && monthlyStats?.totalIncome !== undefined && monthlyStats?.totalExpense !== undefined) {
      return { heroIncome: Number(monthlyStats.totalIncome) || 0, heroExpense: Number(monthlyStats.totalExpense) || 0 };
    }
    const targetDay = selectedDay ? String(selectedDay).split('T')[0] : null;
    let inc = 0, exp = 0;
    safeTransactions.forEach((t) => {
      if (!t || t.isTransfer || t.is_transfer || ['transfer', 'transferencia'].includes(t.type) || t.categoryId === 'cat-transfer' || t.category_id === 'cat-transfer' || ['sub-transfer-in', 'sub-transfer-out'].includes(t.subcategoryId)) return;
      if (targetDay && ((t.date ? String(t.date).split('T')[0] : (t.created_at ? String(t.created_at).split('T')[0] : '')) !== targetDay)) return;
      const amt = Number(t.amount) || 0;
      if (['income', 'ingreso'].includes(String(t.type || '').toLowerCase()) || amt > 0) inc += amt;
      else exp += Math.abs(amt);
    });
    return { heroIncome: selectedDay ? inc : (Number(monthlyStats?.totalIncome) || inc), heroExpense: selectedDay ? exp : (Number(monthlyStats?.totalExpense) || exp) };
  }, [selectedDay, safeTransactions, monthlyStats?.totalIncome, monthlyStats?.totalExpense]);

  const filteredTransactions = useMemo(() => {
    const s = searchTerm.trim().toLowerCase(), targetDay = selectedDay ? String(selectedDay).split('T')[0] : null;
    const base = safeTransactions.filter((tx) => {
      if (!tx || (targetDay && (tx.date ? String(tx.date).split('T')[0] : (tx.created_at ? String(tx.created_at).split('T')[0] : '')) !== targetDay)) return false;
      if (s && ![tx.note, tx.notes, tx.description, tx.category, tx.categoryName, tx.subcategoryName, tx.accountName, tx.fromAccountName, tx.toAccountName].some((f) => f && String(f).toLowerCase().includes(s))) return false;
      if (typeFilter !== 'all' && (['gasto', 'expense'].includes(String(tx.type || '').toLowerCase()) ? 'expense' : 'income') !== typeFilter) return false;
      if (accountFilter !== 'all' && (tx.accountId || tx.account_id) !== accountFilter) return false;
      return !(categoryFilter !== 'all' && (tx.categoryId || tx.category_id) !== categoryFilter && tx.category !== categoryFilter);
    }).sort((a, b) => new Date(((b?.date ? String(b.date).split('T')[0] : b?.created_at?.split('T')[0]) || '1970-01-01') + 'T00:00:00') - new Date(((a?.date ? String(a.date).split('T')[0] : a?.created_at?.split('T')[0]) || '1970-01-01') + 'T00:00:00'));

    return consolidateTransfers(base, accountFilter);
  }, [safeTransactions, selectedDay, searchTerm, typeFilter, accountFilter, categoryFilter]);

  const itemsPerPage = 15;
  useEffect(() => { setCurrentPage(1); }, [searchTerm, typeFilter, accountFilter, categoryFilter, selectedDay, selectedDate]);
  const totalItems = filteredTransactions.length, totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage)), startIndex = (currentPage - 1) * itemsPerPage;
  const itemsToRender = isCompact ? (limit ? filteredTransactions.slice(0, limit) : filteredTransactions) : filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  const handleResetFilters = () => { setTypeFilter('all'); setAccountFilter('all'); setCategoryFilter('all'); handleClearSelectedDay(); };
  const pillCls = (active) => `px-3.5 py-1.5 rounded-2xl text-xs font-semibold shrink-0 transition-all cursor-pointer select-none active:scale-95 ${
    active
      ? 'bg-emerald-500/90 text-white font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_12px_rgba(16,185,129,0.25)] border border-emerald-400/80'
      : 'bg-white/40 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-200 hover:bg-white/60 dark:hover:bg-white/10 border border-white/70 dark:border-white/10 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]'
  }`;

  return (
    <div className={isCompact ? 'ios-card p-3.5 sm:p-4' : 'space-y-4'}>
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
          <div className="my-2.5 sm:my-3"><TransactionsHeroCard income={heroIncome} expense={heroExpense} balance={heroIncome - heroExpense} transactions={safeTransactions} selectedDate={selectedDate} selectedDay={selectedDay} currentMonthLabel={currentMonthLabel} typeFilter={typeFilter} onTypeFilterChange={setTypeFilter} onOpenMonthPicker={onOpenMonthPicker || onOpenCalendar} onOpenCalendar={onOpenCalendar} formatMoney={formatMoney} /></div>
          <div className="flex items-center justify-between mt-3.5 mb-1 px-1"><span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Movimientos • {totalItems} items</span></div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 px-0.5 pr-6 mb-3 select-none">
            <button type="button" onClick={() => setAccountFilter('all')} className={pillCls(accountFilter === 'all')}>Todas las cuentas</button>
            {accounts.map((acc) => (<button key={acc.id} type="button" onClick={() => setAccountFilter(acc.id)} className={`${pillCls(accountFilter === acc.id)} flex items-center gap-1.5`}><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: acc.color || '#007AFF' }} /><span className="truncate max-w-[120px]">{acc.name}</span></button>))}
          </div>
        </>
      )}

      {totalItems === 0 ? (
        <div
          className="text-center py-10 px-4 rounded-3xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-dashed border-white/60 dark:border-white/[0.08] shadow-sm"
        >
          <Inbox className="w-8 h-8 opacity-30 mx-auto mb-2" /><p className="text-xs font-bold text-slate-900 dark:text-white">{selectedDay ? 'No hay movimientos en este día' : 'Sin movimientos registrados este mes'}</p>
          <p className="text-[11px] opacity-50 mt-0.5">{selectedDay ? 'Toca "Ver todo el mes" para ver el período completo.' : 'Usa el botón central (+) para registrar tus ingresos y gastos.'}</p>
          {selectedDay && <button onClick={handleClearSelectedDay} className="mt-3 px-3.5 py-2 bg-[#007AFF] text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 cursor-pointer">Mostrar todo el mes</button>}
        </div>
      ) : (
        <div
          className="rounded-3xl overflow-hidden divide-y divide-white/40 dark:divide-white/[0.06] transition-all bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/60 dark:border-white/[0.08] shadow-sm"
        >
          {itemsToRender.map((tx) => <TransactionItem key={tx.id} transaction={tx} category={categoryMap.get(tx.categoryId)} account={accountMap.get(tx.accountId)} onSelect={setSelectedDetailTx} onEdit={setEditingTx} onDelete={onDeleteTransaction} onViewReceipt={setViewingReceiptTx} />)}
          {!isCompact && totalItems > 0 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/40 dark:border-white/[0.06] text-xs text-slate-600 dark:text-zinc-400 font-medium bg-white/10">
              <span>Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems}</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 disabled:opacity-40 cursor-pointer"><ChevronLeft size={16} /></button>
                <span className="px-2 font-medium">Página {currentPage} de {totalPages}</span>
                <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 disabled:opacity-40 cursor-pointer"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {onViewAll && (
        <div className="pt-2.5 border-t border-slate-200/80 dark:border-white/[0.08] mt-2">
          <button type="button" onClick={onViewAll} className="w-full py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-[#29D691] bg-slate-100 dark:bg-zinc-800/80 hover:bg-emerald-500/10 active:scale-98 cursor-pointer"><span>Ver todos los movimientos</span><ArrowRight className="w-4 h-4" /></button>
        </div>
      )}

      {editingTx && <EditTransactionModal transaction={editingTx} accounts={accounts} categories={categories} onClose={() => setEditingTx(null)} onSave={(u) => { onUpdateTransaction?.(u); setEditingTx(null); }} onDelete={onDeleteTransaction} onAddCategory={onAddCategory} onAddSubcategory={onAddSubcategory} onUpdateSubcategory={onUpdateSubcategory} onDeleteSubcategory={onDeleteSubcategory} onAddAccount={onAddAccount} trm={trm} />}
      {viewingReceiptTx && <ReceiptModal transaction={viewingReceiptTx} onClose={() => setViewingReceiptTx(null)} />}
      {selectedDetailTx && <TransactionDetailModal transaction={selectedDetailTx} categories={categories} onClose={() => setSelectedDetailTx(null)} onEdit={setEditingTx} onDelete={onDeleteTransaction} onViewReceipt={setViewingReceiptTx} />}

      <TransactionFilterModal
        isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)}
        hasActiveFilters={hasActiveFilters} handleResetFilters={handleResetFilters}
        selectedDay={selectedDay} onSelectDay={onSelectDay} handleClearSelectedDay={handleClearSelectedDay}
        categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} categories={categories}
        accountFilter={accountFilter} setAccountFilter={setAccountFilter} accounts={accounts}
        totalItems={totalItems} pillCls={pillCls}
      />
    </div>
  );
}
