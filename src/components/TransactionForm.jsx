import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  CheckCircle,
  Camera,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import CategoryCombobox from './CategoryCombobox';
import SubcategoryCombobox from './SubcategoryCombobox';
import AccountCombobox from './AccountCombobox';
import { useBackHandler } from '../hooks/useBackHandler';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../utils/currencyFormatter';

export default function TransactionForm({ 
  accounts: propAccounts, 
  categories: propCategories, 
  onAddTransaction,
  onAddCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  onAddAccount,
  defaultDate,
  defaultType = 'expense',
  defaultAmount,
  transactionToEdit,
  initialData,
  movement,
  isModal = false,
  onClose = null,
  trm = 4000
}) {
  // Blindaje defensivo — nunca llamar .map/.filter/.find sobre undefined ni elementos nulos
  const accounts = Array.isArray(propAccounts) ? propAccounts.filter(Boolean) : [];
  const categories = Array.isArray(propCategories) ? propCategories.filter(Boolean) : [];

  useBackHandler(Boolean(isModal && onClose), onClose);

  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();

  const editingMovement = transactionToEdit || initialData || movement;

  const [type, setType] = useState(editingMovement?.type || defaultType || 'expense'); // 'income' | 'expense'

  useEffect(() => {
    if (defaultType && !editingMovement) {
      setType(defaultType);
    }
  }, [defaultType, editingMovement]);

  const [currency, setCurrency] = useState(editingMovement?.originalCurrency || 'COP'); // 'COP' | 'USD' | 'EUR'
  const [exchangeRate, setExchangeRate] = useState(editingMovement?.exchangeRate ? String(editingMovement.exchangeRate) : String(trm || 4050));
  const [amount, setAmount] = useState(() => {
    if (editingMovement?.amount !== undefined) {
      return formatCurrencyInput(editingMovement.originalAmount ?? editingMovement.amount, enableDecimals);
    }
    if (defaultAmount) {
      return formatCurrencyInput(defaultAmount, enableDecimals);
    }
    return '';
  });
  const [categoryId, setCategoryId] = useState(editingMovement?.categoryId || categories[0]?.id || '');
  const [subcategoryId, setSubcategoryId] = useState(editingMovement?.subcategoryId || '');
  const [accountId, setAccountId] = useState(editingMovement?.accountId || accounts[0]?.id || '');
  const [date, setDate] = useState(editingMovement?.date || defaultDate || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(editingMovement?.note || '');
  const [receiptImage, setReceiptImage] = useState(editingMovement?.receiptImage || null);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Sincronizar campos cuando se provee un movimiento a editar
  useEffect(() => {
    if (editingMovement) {
      if (editingMovement.type) setType(editingMovement.type);
      if (editingMovement.amount !== undefined) {
        setAmount(formatCurrencyInput(editingMovement.originalAmount ?? editingMovement.amount, enableDecimals));
      }
      if (editingMovement.originalCurrency) setCurrency(editingMovement.originalCurrency);
      if (editingMovement.exchangeRate) setExchangeRate(String(editingMovement.exchangeRate));
      if (editingMovement.date) setDate(editingMovement.date);
      if (editingMovement.categoryId) setCategoryId(editingMovement.categoryId);
      if (editingMovement.subcategoryId) setSubcategoryId(editingMovement.subcategoryId);
      if (editingMovement.accountId) setAccountId(editingMovement.accountId);
      if (editingMovement.note) setNote(editingMovement.note);
      if (editingMovement.receiptImage) setReceiptImage(editingMovement.receiptImage);
    }
  }, [editingMovement, enableDecimals]);

  // Sincronizar automáticamente la divisa cuando cambia la cuenta seleccionada
  useEffect(() => {
    if (accountId && accounts?.length > 0) {
      const acc = accounts.find(a => a?.id === accountId);
      if (acc && acc.currency) {
        setCurrency(acc.currency);
      }
    }
  }, [accountId, accounts]);

  // Sincronizar automáticamente la tasa cuando cambia la TRM o la moneda (solo lectura / automático)
  useEffect(() => {
    if (currency === 'USD') {
      setExchangeRate(String(trm || 4050));
    } else if (currency === 'EUR') {
      const eurRate = Math.round((Number(trm) || 4050) * 1.08);
      setExchangeRate(String(eurRate));
    } else {
      setExchangeRate('1');
    }
  }, [currency, trm]);

  // File processing with client-side canvas compression for safe localStorage quota
  const handleImageUpload = (e) => {
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

        // Compress to JPEG 0.75 (~40-70KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        setReceiptImage(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setReceiptImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter categories by selected type (tolerante a categorías sin tipo explícito)
  const availableCategories = categories.filter(c => c && (c.type === type || !c.type));

  // Current selected category object and its subcategories
  const selectedCategory = categories.find(c => c && c.id === categoryId) || availableCategories[0] || null;
  const availableSubcategories = (Array.isArray(selectedCategory?.subcategories) ? selectedCategory.subcategories : []).filter(Boolean);

  // Update default category when type changes
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.some(c => c && c.id === categoryId)) {
      setCategoryId(availableCategories[0]?.id || '');
    }
  }, [type, availableCategories, categoryId]);

  // Update default subcategory when category changes
  useEffect(() => {
    if (availableSubcategories.length > 0) {
      if (!availableSubcategories.some(s => s && s.id === subcategoryId)) {
        setSubcategoryId(availableSubcategories[0]?.id || '');
      }
    } else {
      setSubcategoryId('');
    }
  }, [categoryId, availableSubcategories, subcategoryId]);

  // Update default account if not selected
  useEffect(() => {
    if (accounts.length > 0 && !accounts.some(a => a && a.id === accountId)) {
      setAccountId(accounts[0]?.id || '');
    }
  }, [accounts, accountId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFormattedAmount(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const rateNum = currency === 'COP' ? 1 : (parseFloat(exchangeRate) || 1);
    const calculatedAmount = currency === 'COP' ? numAmount : (numAmount * rateNum);
    const finalAmount = enableDecimals 
      ? Number(calculatedAmount.toFixed(2)) 
      : Math.round(calculatedAmount);

    const cat = categories.find(c => c && c.id === categoryId);
    const subcat = Array.isArray(cat?.subcategories) ? cat.subcategories.find(s => s && s.id === subcategoryId) : null;
    const acc = accounts.find(a => a && a.id === accountId);

    const newTx = {
      id: editingMovement?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-' + Date.now())),
      date,
      type,
      amount: finalAmount,
      originalCurrency: currency,
      originalAmount: numAmount,
      exchangeRate: currency === 'COP' ? 1 : rateNum,
      categoryId: categoryId || cat?.id || '',
      categoryName: cat ? cat.name : 'General',
      subcategoryId: subcat ? subcat.id : null,
      subcategoryName: subcat ? subcat.name : null,
      accountId: accountId || acc?.id || '',
      accountName: acc ? acc.name : 'Principal',
      note: note.trim(),
      receiptImage: receiptImage || null
    };

    onAddTransaction(newTx);
    setAmount('');
    setCurrency('COP');
    setExchangeRate(String(trm || 4000));
    setNote('');
    setReceiptImage(null);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      if (onClose) onClose();
    }, 700);
  };

  const renderFormFields = () => (
    <>
      {/* iOS Segmented Control para Gasto / Ingreso */}
      <div className="ios-segmented w-full flex justify-center p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`ios-segmented-btn flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            type === 'expense' 
              ? 'ios-segmented-btn-active text-[#FF3B30] shadow-xs scale-[1.02]' 
              : 'opacity-60'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" />
          <span>Gasto</span>
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`ios-segmented-btn flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            type === 'income' 
              ? 'ios-segmented-btn-active text-[#34C759] shadow-xs scale-[1.02]' 
              : 'opacity-60'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Ingreso</span>
        </button>
      </div>

      {/* Monto Prominente estilo iOS y Selector de Moneda */}
      <div>
        <label className="block text-[11px] font-bold opacity-60 uppercase tracking-wider mb-1">
          Monto ({currency === 'COP' ? '$ COP' : currency}) *
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 font-black text-lg">
            {currency === 'EUR' ? '€' : '$'}
          </span>
          <input
            type="text"
            inputMode="decimal"
            required
            placeholder="0"
            value={amount}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setAmount(formatCurrencyInput(e.target.value, enableDecimals))}
            className="w-full pl-8 pr-3 py-3 border border-transparent rounded-2xl text-[24px] font-bold focus:outline-none focus:ring-2 transition-all tabular-nums"
            style={{ 
              backgroundColor: 'var(--bg-input)', 
              color: 'var(--text-main)',
              caretColor: type === 'expense' ? '#FF3B30' : '#34C759'
            }}
          />
        </div>

        {/* Selector horizontal compacto con chips: COP, USD, EUR */}
        <div className="flex items-center gap-1.5 mt-2.5">
          {[
            { code: 'COP', label: 'COP' },
            { code: 'USD', label: 'USD $' },
            { code: 'EUR', label: 'EUR €' }
          ].map((c) => {
            const isSelected = currency === c.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setCurrency(c.code);
                  if (c.code === 'USD') {
                    setExchangeRate(String(trm || 4000));
                  } else if (c.code === 'EUR') {
                    setExchangeRate('4400');
                  } else {
                    setExchangeRate('1');
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

        {/* Lógica de Conversión y Tasa de Cambio (TRM) Oficial Automática */}
        {currency !== 'COP' && (
          <div className="mt-2.5 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20 space-y-2 animate-fadeIn">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Tasa oficial de cambio</span>
                </label>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  1 {currency} = ${Number(exchangeRate || 0).toLocaleString('es-CO')} COP
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={`TRM del día: $${Number(exchangeRate || trm || 4050).toLocaleString('es-CO')} COP (Sincronizada automáticamente)`}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-200/80 dark:border-emerald-500/30 bg-emerald-100/50 dark:bg-white/5 text-emerald-900 dark:text-emerald-200 focus:outline-none cursor-default select-none tabular-nums"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 pt-1 border-t border-emerald-200/40 dark:border-emerald-500/20">
              <span>Equivalente en balance:</span>
              <span className="font-bold tabular-nums text-emerald-800 dark:text-emerald-200 text-xs">
                $ {(parseFormattedAmount(amount) * (parseFloat(exchangeRate) || 0)).toLocaleString('es-CO', { minimumFractionDigits: enableDecimals ? 2 : 0, maximumFractionDigits: 2 })} COP
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Categoría y Subcategoría */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold opacity-60 mb-1">
            Categoría Principal *
          </label>
          <CategoryCombobox
            categories={categories}
            selectedCategoryId={categoryId}
            onSelectCategory={setCategoryId}
            onAddCategory={onAddCategory}
            type={type}
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold opacity-60 mb-1">
            Subcategoría
          </label>
          <SubcategoryCombobox
            subcategories={availableSubcategories}
            selectedSubcategoryId={subcategoryId}
            onSelectSubcategory={setSubcategoryId}
            onAddSubcategory={onAddSubcategory}
            onUpdateSubcategory={onUpdateSubcategory}
            onDeleteSubcategory={onDeleteSubcategory}
            parentCategoryId={categoryId}
            placeholder={categoryId ? "Selecciona o escribe..." : "Elige categoría"}
          />
        </div>
      </div>

      {/* Cuenta y Fecha */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold opacity-60 mb-1">
            Cuenta / Método *
          </label>
          <AccountCombobox
            accounts={accounts}
            selectedAccountId={accountId}
            onSelectAccount={setAccountId}
            onAddAccount={onAddAccount}
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold opacity-60 mb-1">
            Fecha *
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-transparent rounded-xl text-xs font-semibold focus:outline-none"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
          />
        </div>
      </div>

      {/* Nota Opcional */}
      <div>
        <label className="block text-[11px] font-semibold opacity-60 mb-1">
          Nota o Detalle Opcional
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="ej: Almuerzo de trabajo, Mercado del mes..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 border border-transparent rounded-xl text-xs font-medium focus:outline-none transition-all"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
          />
          <FileText className="w-3.5 h-3.5 opacity-40 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Adjuntar Foto del Recibo / Factura */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[11px] font-semibold opacity-60">
            Foto de Recibo o Factura
          </label>
          {receiptImage && (
            <span className="text-[10px] text-[#34C759] font-bold">✓ Adjunto</span>
          )}
        </div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
          id="receipt-file-input"
        />

        {!receiptImage ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-3 border border-dashed rounded-xl flex items-center justify-center gap-2 hover:border-[#007AFF] hover:bg-blue-50/50 dark:hover:bg-blue-900/20 active:scale-98 transition-all group cursor-pointer"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card-sub)' }}
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-[#007AFF] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Tomar foto o subir comprobante
            </span>
          </button>
        ) : (
          <div 
            className="p-2.5 rounded-xl border flex items-center gap-3 shadow-2xs"
            style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
          >
            <div className="w-13 h-13 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-black/5 relative">
              <img 
                src={receiptImage} 
                alt="Recibo adjunto" 
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>
                Comprobante adjunto
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Listo para guardar
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-[#007AFF] hover:underline mt-0.5 inline-block cursor-pointer"
              >
                Cambiar foto
              </button>
            </div>

            <button
              type="button"
              onClick={handleRemoveImage}
              className="w-8 h-8 rounded-lg text-[#FF3B30] hover:bg-red-500/10 flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer"
              title="Eliminar foto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-lg lg:max-w-xl mx-auto my-auto bg-white dark:bg-[#12141C] rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[85vh] sm:max-h-[90vh] shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden animate-slide-up">
          {/* Cabecera FIJA */}
          <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Nuevo Movimiento</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ingresa tus finanzas al instante</p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Formulario envolviendo cuerpo y footer */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Cuerpo con SCROLL interno automático */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
              {renderFormFields()}

              {showSuccess && (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#34C759] bg-emerald-500/15 border border-[#34C759]/30 px-3 py-2.5 rounded-xl animate-slide-up">
                  <CheckCircle className="w-4 h-4 text-[#34C759]" />
                  <span>¡Movimiento guardado exitosamente!</span>
                </div>
              )}
            </div>

            {/* Pie de página FIJO SIEMPRE VISIBLE */}
            <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-[#181B26] border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95 text-white cursor-pointer ${
                  type === 'expense'
                    ? 'bg-[#FF3B30] hover:bg-red-600 shadow-red-500/25'
                    : 'bg-[#34C759] hover:bg-emerald-600 shadow-emerald-500/25'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar {type === 'expense' ? 'Gasto' : 'Ingreso'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="ios-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <span>Registro Rápido</span>
          </h2>
          <p className="text-[11px] opacity-60">Ingresa transacciones detalladas</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {renderFormFields()}
        <div className="pt-2">
          <button
            type="submit"
            className={`w-full py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98 text-white cursor-pointer ${
              type === 'expense'
                ? 'bg-[#FF3B30] hover:bg-red-600 shadow-red-500/25'
                : 'bg-[#34C759] hover:bg-emerald-600 shadow-emerald-500/25'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar {type === 'expense' ? 'Gasto' : 'Ingreso'}</span>
          </button>
        </div>
        {showSuccess && (
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#34C759] bg-emerald-500/15 border border-[#34C759]/30 px-3 py-2.5 rounded-xl animate-slide-up">
            <CheckCircle className="w-4 h-4 text-[#34C759]" />
            <span>¡Movimiento guardado exitosamente!</span>
          </div>
        )}
      </form>
    </div>
  );
}
