import React, { useState, useRef } from 'react';
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
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../utils/currencyFormatter';
import CategoryCombobox from './CategoryCombobox';
import SubcategoryCombobox from './SubcategoryCombobox';
import AccountCombobox from './AccountCombobox';
import CategoryIcon from './CategoryIcon';
import FinancialIcon from './common/FinancialIcon';
import BrandIcon from './BrandIcon';
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

  useBackHandler(Boolean(editingTx), () => setEditingTx(null));
  useBackHandler(Boolean(selectedDetailTx), () => setSelectedDetailTx(null));
  useBackHandler(Boolean(viewingReceiptTx), () => setViewingReceiptTx(null));

  const [editType, setEditType] = useState('expense');
  const [editAmount, setEditAmount] = useState('');
  const [editOriginalCurrency, setEditOriginalCurrency] = useState('COP');
  const [editExchangeRate, setEditExchangeRate] = useState('4000');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editSubcategoryId, setEditSubcategoryId] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editReceiptImage, setEditReceiptImage] = useState(null);
  const editFileInputRef = useRef(null);

  const handleEditImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        setEditReceiptImage(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Sort transactions by date descending (newest first)
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const sortedTransactions = [...safeTransactions].sort((a, b) => {
    return new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00');
  });

  // Filter by day if selectedDay is active, plus search and type filters
  const filteredTransactions = sortedTransactions.filter((tx) => {
    if (selectedDay && tx.date !== selectedDay) {
      return false;
    }

    const matchesSearch = 
      (tx.note && tx.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.categoryName && tx.categoryName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.subcategoryName && tx.subcategoryName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.accountName && tx.accountName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesAccount = accountFilter === 'all' || tx.accountId === accountFilter;

    return matchesSearch && matchesType && matchesAccount;
  });

  const displayTransactions = limit ? filteredTransactions.slice(0, limit) : filteredTransactions;

  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    setEditType(tx.type);
    const curr = tx.originalCurrency || 'COP';
    setEditOriginalCurrency(curr);
    const origAmt = (curr !== 'COP' && tx.originalAmount != null) ? tx.originalAmount : tx.amount;
    setEditAmount(origAmt != null ? formatCurrencyInput(origAmt, enableDecimals) : '');
    const rate = tx.exchangeRate != null ? String(tx.exchangeRate) : (curr === 'EUR' ? '4400' : String(trm || 4000));
    setEditExchangeRate(rate);
    setEditCategoryId(tx.categoryId);
    setEditSubcategoryId(tx.subcategoryId || '');
    setEditAccountId(tx.accountId);
    setEditDate(tx.date);
    setEditNote(tx.note || '');
    setEditReceiptImage(tx.receiptImage || null);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingTx) return;

    const numAmount = parseFormattedAmount(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const rateNum = editOriginalCurrency === 'COP' ? 1 : (parseFloat(editExchangeRate) || 1);
    const calculatedAmount = editOriginalCurrency === 'COP' ? numAmount : (numAmount * rateNum);
    const finalAmount = enableDecimals 
      ? Number(calculatedAmount.toFixed(2)) 
      : Math.round(calculatedAmount);

    const selectedCat = categories.find(c => c.id === editCategoryId);
    const selectedSub = selectedCat?.subcategories?.find(s => s.id === editSubcategoryId);
    const selectedAcc = accounts.find(a => a.id === editAccountId);

    const updated = {
      ...editingTx,
      type: editType,
      amount: finalAmount,
      originalCurrency: editOriginalCurrency,
      originalAmount: numAmount,
      exchangeRate: editOriginalCurrency === 'COP' ? 1 : rateNum,
      categoryId: editCategoryId,
      categoryName: selectedCat ? selectedCat.name : editingTx.categoryName,
      subcategoryId: selectedSub ? selectedSub.id : null,
      subcategoryName: selectedSub ? selectedSub.name : null,
      accountId: editAccountId,
      accountName: selectedAcc ? selectedAcc.name : editingTx.accountName,
      date: editDate,
      note: editNote.trim(),
      receiptImage: editReceiptImage || null
    };

    onUpdateTransaction(updated);
    setEditingTx(null);
    setEditReceiptImage(null);
  };

  // Subcategories available for currently selected category in edit modal
  const editCategoryObj = categories.find(c => c.id === editCategoryId);
  const availableEditSubcategories = editCategoryObj?.subcategories || [];

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
            <h2 className="text-[15px] sm:text-[18px] font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
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
              if (onOpenTransaction) onOpenTransaction();
              else if (onOpenAddTransaction) onOpenAddTransaction();
              else if (setIsAddTransactionOpen) setIsAddTransactionOpen(true);
            }}
            className={`${isCompact ? 'flex px-2.5 py-1 text-xs' : 'hidden lg:flex py-2 px-3.5 text-xs'} bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs active:scale-95 transition-all items-center gap-1.5 cursor-pointer shrink-0`}
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
                className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-transparent focus:outline-none transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-input)', 
                  color: 'var(--text-main)'
                }}
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

            {/* Segmented Control Tipo: Todos | Ingresos | Gastos */}
            <div className="flex items-center justify-between gap-2">
              <div className="ios-segmented flex-1">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                    typeFilter === 'all'
                      ? 'bg-[#007AFF] text-white shadow-xs font-bold'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: typeFilter === 'all' ? undefined : 'transparent', 
                    color: typeFilter === 'all' ? '#FFFFFF' : 'var(--text-main)' 
                  }}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('income')}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                    typeFilter === 'income'
                      ? 'bg-[#34C759] text-white shadow-xs font-bold'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: typeFilter === 'income' ? undefined : 'transparent', 
                    color: typeFilter === 'income' ? '#FFFFFF' : 'var(--text-main)' 
                  }}
                >
                  Ingresos
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('expense')}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                    typeFilter === 'expense'
                      ? 'bg-[#FF3B30] text-white shadow-xs font-bold'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: typeFilter === 'expense' ? undefined : 'transparent', 
                    color: typeFilter === 'expense' ? '#FFFFFF' : 'var(--text-main)' 
                  }}
                >
                  Gastos
                </button>
              </div>
            </div>

            {/* Quick Filter Horizontal Scroll by Account */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-0.5">
              <button
                type="button"
                onClick={() => setAccountFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                  accountFilter === 'all'
                    ? 'bg-[#007AFF] text-white shadow-xs font-bold'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{ 
                  backgroundColor: accountFilter === 'all' ? undefined : 'var(--bg-input)', 
                  color: accountFilter === 'all' ? '#FFFFFF' : 'var(--text-main)' 
                }}
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
                      ? 'bg-[#007AFF] text-white shadow-xs font-bold'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: accountFilter === acc.id ? undefined : 'var(--bg-input)', 
                    color: accountFilter === acc.id ? '#FFFFFF' : 'var(--text-main)' 
                  }}
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
          className="text-center py-8 px-4 border border-dashed rounded-2xl"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card-sub)' }}
        >
          <Inbox className="w-8 h-8 opacity-30 mx-auto mb-2" />
          <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Movimiento</span>
              </button>
            )}
            {selectedDay && onSelectDay && (
              <button
                onClick={() => onSelectDay(null)}
                className="px-3.5 py-2 bg-[#007AFF] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 cursor-pointer"
              >
                Mostrar todo el mes
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`space-y-2 pr-0.5 ${isCompact ? '' : 'lg:max-h-[640px] lg:overflow-y-auto'}`}>
          {displayTransactions.map((tx) => {
            const isExpense = tx.type === 'expense';
            const categoryObj = categories.find(c => c.id === tx.categoryId);
            const accountObj = accounts.find(a => a.id === tx.accountId);

            return (
              <div 
                key={tx.id} 
                onClick={() => setSelectedDetailTx(tx)}
                className="p-3 flex items-center justify-between rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-all select-none gap-2 sm:gap-3 cursor-pointer active:scale-[0.99]"
              >
                {/* Columna Izquierda: Icono de categoría con su cápsula de color */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-1.5 sm:pr-2">
                  <BrandIcon
                    name={tx.note || tx.categoryName || ''}
                    size={22}
                    wrapperClassName="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden"
                    fallback={
                      <CategoryIcon
                        category={categoryObj || tx.categoryName}
                        status={isExpense ? 'negative' : 'positive'}
                        size={20}
                        withBadge={true}
                      />
                    }
                  />

                  {/* Centro: Fila 1 Concepto/Nombre + Fila 2 Metadatos (Píldora cuenta + Subcategoría) */}
                  <div className="flex flex-col min-w-0 flex-1">
                    {/* Fila 1: Concepto/Nombre del movimiento */}
                    <span className="font-semibold text-slate-900 dark:text-white text-sm truncate block leading-snug">
                      {tx.note || tx.categoryName}
                    </span>

                    {/* Fila 2 (Metadatos limpios): Píldora de cuenta + Subcategoría */}
                    <div className="flex items-center gap-1.5 pt-0.5 min-w-0">
                      <span 
                        className="font-medium px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 leading-none shrink-0 text-[11px] bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 shadow-2xs"
                      >
                        <BrandIcon 
                          name={tx.accountName} 
                          type={accountObj?.type} 
                          size={13} 
                          className="shrink-0"
                          fallback={<span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accountObj?.color || '#10B981' }} />}
                        />
                        <span className="truncate max-w-[110px] sm:max-w-[150px]">{tx.accountName}</span>
                      </span>

                      {tx.subcategoryName && (
                        <>
                          <span className="opacity-40 shrink-0 text-xs text-slate-400">•</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                            {tx.subcategoryName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Recibo + Bloque vertical de Monto y Fecha + Botón de editar */}
                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                  {tx.receiptImage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingReceiptTx(tx);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full transition-colors shrink-0 cursor-pointer mr-0.5"
                      title="Ver recibo adjunto"
                    >
                      <Camera className="w-3 h-3" />
                      <span className="hidden xs:inline">Recibo</span>
                    </button>
                  )}

                  {/* Bloque vertical de Monto y Fecha */}
                  <div className="flex flex-col items-end text-right">
                    <span className={`text-base font-bold tracking-tight leading-tight tabular-nums whitespace-nowrap ${
                      isExpense ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isExpense ? '-' : '+'}{formatMoney(tx.amount)}
                    </span>
                    {tx.originalCurrency && tx.originalCurrency !== 'COP' && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tabular-nums whitespace-nowrap mt-0.5">
                        ({Number(tx.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tx.originalCurrency})
                      </span>
                    )}
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1 leading-none tabular-nums whitespace-nowrap">
                      {formatTxDateClean(tx)}
                    </span>
                  </div>

                  {/* Botón de acción / editar */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(tx);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg active:scale-95 transition-colors shrink-0 cursor-pointer"
                    title="Editar movimiento"
                    aria-label="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón 'Ver todos los movimientos' al final de la lista */}
      {onViewAll && (
        <div className="pt-2.5 border-t mt-2" style={{ borderColor: 'var(--border-color)' }}>
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
            className="w-full py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-[#29D691] hover:bg-emerald-500/10 active:scale-98 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card-sub)' }}
          >
            <span>Ver todos los movimientos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal para Editar Transacción */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-[#12141C] rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] shadow-2xl overflow-hidden animate-slide-up">
            {/* Header Fijo */}
            <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Editar Transacción</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Modifica los detalles y recalcula balances</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingTx(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Cuerpo del Formulario con scroll independiente */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
              {/* iOS Segmented Control: Gasto vs Ingreso */}
              <div className="flex justify-center">
                <div className="ios-segmented w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setEditType('expense');
                      const expCats = categories.filter(c => c.type === 'expense');
                      if (expCats.length > 0) setEditCategoryId(expCats[0].id);
                    }}
                    className={`ios-segmented-btn flex-1 sm:flex-initial flex items-center justify-center gap-1 ${
                      editType === 'expense' ? 'ios-segmented-btn-active text-[#FF3B30]' : 'text-slate-500'
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>Gasto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditType('income');
                      const incCats = categories.filter(c => c.type === 'income');
                      if (incCats.length > 0) setEditCategoryId(incCats[0].id);
                    }}
                    className={`ios-segmented-btn flex-1 sm:flex-initial flex items-center justify-center gap-1 ${
                      editType === 'income' ? 'ios-segmented-btn-active text-[#34C759]' : 'text-slate-500'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Ingreso</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Monto y Selector de Moneda */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">
                    Monto ({editOriginalCurrency === 'COP' ? '$ COP' : editOriginalCurrency}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 font-bold text-sm">
                      {editOriginalCurrency === 'EUR' ? '€' : '$'}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      required
                      value={editAmount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditAmount(formatCurrencyInput(e.target.value, enableDecimals))}
                      className="w-full text-base font-black pl-8 pr-3.5 py-2.5 border border-transparent rounded-xl focus:outline-none tabular-nums"
                      style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                    />
                  </div>

                  {/* Chips selector de Moneda */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[
                      { code: 'COP', label: 'COP' },
                      { code: 'USD', label: 'USD $' },
                      { code: 'EUR', label: 'EUR €' }
                    ].map((c) => {
                      const isSelected = editOriginalCurrency === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setEditOriginalCurrency(c.code);
                            if (c.code === 'USD') {
                              setEditExchangeRate(String(trm || 4000));
                            } else if (c.code === 'EUR') {
                              setEditExchangeRate('4400');
                            } else {
                              setEditExchangeRate('1');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-white shadow-xs font-bold scale-[1.02]'
                              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10'
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Lógica de Conversión y Tasa de Cambio (TRM en COP) en Edición */}
                  {editOriginalCurrency !== 'COP' && (
                    <div className="mt-2.5 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20 space-y-2 animate-fadeIn">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Tasa oficial de cambio</span>
                          </label>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            1 {editOriginalCurrency} = ${Number(editExchangeRate || trm || 4050).toLocaleString('es-CO')} COP
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            value={`TRM: $${Number(editExchangeRate || trm || 4050).toLocaleString('es-CO')} COP (Sincronizada automáticamente)`}
                            className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-200/80 dark:border-emerald-500/30 bg-emerald-100/50 dark:bg-white/5 text-emerald-900 dark:text-emerald-200 focus:outline-none cursor-default select-none tabular-nums"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 pt-1 border-t border-emerald-200/40 dark:border-emerald-500/20">
                        <span>Equivalente en balance:</span>
                        <span className="font-bold tabular-nums text-emerald-800 dark:text-emerald-200 text-xs">
                          $ {((parseFormattedAmount(editAmount) || 0) * (parseFloat(editExchangeRate) || 0)).toLocaleString('es-CO', { minimumFractionDigits: enableDecimals ? 2 : 0, maximumFractionDigits: 2 })} COP
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border border-transparent rounded-xl focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                  />
                </div>

                {/* Categoría Principal con CategoryCombobox */}
                <div>
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">Categoría Principal *</label>
                  <CategoryCombobox
                    categories={categories}
                    selectedCategoryId={editCategoryId}
                    onSelectCategory={(id) => {
                      setEditCategoryId(id);
                      const cat = categories.find(c => c.id === id);
                      if (cat?.subcategories?.length > 0) {
                        setEditSubcategoryId(cat.subcategories[0].id);
                      } else {
                        setEditSubcategoryId('');
                      }
                    }}
                    onAddCategory={onAddCategory}
                    type={editType}
                  />
                </div>

                {/* Subcategoría con SubcategoryCombobox */}
                <div>
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">Subcategoría</label>
                  <SubcategoryCombobox
                    subcategories={availableEditSubcategories}
                    selectedSubcategoryId={editSubcategoryId}
                    onSelectSubcategory={setEditSubcategoryId}
                    onAddSubcategory={onAddSubcategory}
                    onUpdateSubcategory={onUpdateSubcategory}
                    onDeleteSubcategory={onDeleteSubcategory}
                    parentCategoryId={editCategoryId}
                  />
                </div>

                {/* Cuenta con AccountCombobox */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">Cuenta *</label>
                  <AccountCombobox
                    accounts={accounts}
                    selectedAccountId={editAccountId}
                    onSelectAccount={setEditAccountId}
                    onAddAccount={onAddAccount}
                  />
                </div>

                {/* Nota */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">Nota / Descripción</label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Descripción del movimiento..."
                    className="w-full text-xs px-3.5 py-2.5 border border-transparent rounded-xl focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                  />
                </div>

                {/* Recibo / Factura en Edición */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold opacity-70">
                      Foto de Recibo o Factura
                    </label>
                    {editReceiptImage && (
                      <span className="text-[10px] text-[#34C759] font-bold">✓ Adjunto</span>
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={editFileInputRef}
                    onChange={handleEditImageUpload}
                    className="hidden"
                    id="edit-receipt-file-input"
                  />

                  {!editReceiptImage ? (
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="w-full py-2 px-3 border border-dashed rounded-xl flex items-center justify-center gap-2 hover:border-[#007AFF] hover:bg-blue-50/50 dark:hover:bg-blue-900/20 active:scale-98 transition-all group cursor-pointer"
                      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card-sub)' }}
                    >
                      <Camera className="w-4 h-4 text-[#007AFF]" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Adjuntar o cambiar foto de recibo
                      </span>
                    </button>
                  ) : (
                    <div 
                      className="p-2.5 rounded-xl border flex items-center gap-3 shadow-2xs"
                      style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-black/5 relative">
                        <img 
                          src={editReceiptImage} 
                          alt="Recibo adjunto" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>
                          Comprobante adjunto
                        </p>
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="text-[11px] font-bold text-[#007AFF] hover:underline mt-0.5 inline-block cursor-pointer"
                        >
                          Cambiar foto
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditReceiptImage(null);
                          if (editFileInputRef.current) editFileInputRef.current.value = '';
                        }}
                        className="w-8 h-8 rounded-lg text-[#FF3B30] hover:bg-red-500/10 flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              </div>

              {/* Footer Fijo / Sticky */}
              <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-[#181B26] border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Eliminar este movimiento?')) {
                      onDeleteTransaction(editingTx.id);
                      setEditingTx(null);
                    }
                  }}
                  className="px-3.5 py-2.5 text-xs font-bold text-[#FF3B30] hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTx(null)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl shadow-xs active:scale-95 cursor-pointer"
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Lightbox para Visualizar Comprobante de Recibo */}
      {viewingReceiptTx && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => setViewingReceiptTx(null)}
        >
          <div 
            className="rounded-3xl p-5 max-w-sm w-full shadow-2xl border space-y-3.5 animate-slide-up"
            style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
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
                className="w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card-sub)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden max-h-[55vh] bg-black/5 flex items-center justify-center border" style={{ borderColor: 'var(--border-color)' }}>
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
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--bg-card-sub)', color: 'var(--text-main)' }}
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
            className="rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 max-w-sm sm:max-w-md w-full shadow-2xl border space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* iOS Handle */}
            <div className="w-10 h-1 bg-slate-500/30 rounded-full mx-auto sm:hidden shrink-0" />

            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h4 className="text-base font-bold">Detalle del Movimiento</h4>
                <p className="text-[11px] opacity-60">Información completa registrada</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailTx(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer text-sm font-bold"
                style={{ backgroundColor: 'var(--bg-card-sub)' }}
              >
                ✕
              </button>
            </div>

            {/* Hero con Monto y Tipo */}
            <div className="text-center py-3.5 px-4 rounded-2xl border space-y-1" style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}>
              <BrandIcon 
                name={selectedDetailTx.note || selectedDetailTx.categoryName || ''} 
                size={30} 
                wrapperClassName="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-xs overflow-hidden mx-auto mb-2" 
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

              <div className="flex items-center justify-between p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}>
                <span className="opacity-60 font-medium">Categoría</span>
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categories.find(c => c.id === selectedDetailTx.categoryId)?.color || '#007AFF' }} />
                  {selectedDetailTx.categoryName || 'General'}
                </span>
              </div>

              {selectedDetailTx.subcategoryName && (
                <div className="flex items-center justify-between p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}>
                  <span className="opacity-60 font-medium">Subcategoría / Etiqueta</span>
                  <span className="font-bold">{selectedDetailTx.subcategoryName}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}>
                <span className="opacity-60 font-medium">Cuenta / Tarjeta</span>
                <span className="font-bold flex items-center gap-1.5">
                  <BrandIcon name={selectedDetailTx.accountName || 'Principal'} size={18} />
                  <span>{selectedDetailTx.accountName || 'Principal'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}>
                <span className="opacity-60 font-medium">Fecha y Hora</span>
                <span className="font-semibold tabular-nums">{formatTxDateTime(selectedDetailTx)}</span>
              </div>

              {selectedDetailTx.receiptImage && (
                <div className="p-2.5 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}>
                  <span className="opacity-60 font-medium block">Comprobante / Recibo</span>
                  <div 
                    onClick={() => {
                      const imgTx = selectedDetailTx;
                      setSelectedDetailTx(null);
                      setViewingReceiptTx(imgTx);
                    }}
                    className="relative rounded-lg overflow-hidden border max-h-36 cursor-pointer group flex items-center justify-center bg-black/10"
                    style={{ borderColor: 'var(--border-color)' }}
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
                className="py-2.5 px-3 bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
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
