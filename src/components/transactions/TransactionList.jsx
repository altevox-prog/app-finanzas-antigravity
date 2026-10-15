import React, { useState } from 'react';
import { 
  Inbox, 
  X, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { MONTH_NAMES } from '../../data/initialData';
import { usePrivacy } from '../../context/PrivacyContext';
import { getEnableDecimals } from '../../utils/currencyFormatter';
import TransactionFilterBar from './components/TransactionFilterBar';
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
        <TransactionFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
          accountFilter={accountFilter}
          onAccountFilterChange={setAccountFilter}
          accounts={accounts}
        />
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
          {displayTransactions.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              category={categories.find(c => c.id === tx.categoryId)}
              account={accounts.find(a => a.id === tx.accountId)}
              onSelect={setSelectedDetailTx}
              onEdit={handleOpenEdit}
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
    </div>
  );
}
