import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  X, 
  Camera, 
  Trash2 
} from 'lucide-react';
import SegmentedControl from '../../common/SegmentedControl';
import TransactionAccountCategoryFields from '../TransactionAccountCategoryFields';
import { usePrivacy } from '../../../context/PrivacyContext';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { 
  formatCurrencyInput, 
  parseFormattedAmount, 
  getEnableDecimals 
} from '../../../utils/currencyFormatter';

/**
 * EditTransactionModal
 * Modal flotante para editar los atributos de una transacción
 * (tipo, monto, divisa extranjera, tasa de cambio, categoría, subcategoría, cuenta, fecha, nota, comprobante).
 */
export default function EditTransactionModal({
  transaction,
  accounts = [],
  categories = [],
  onClose,
  onSave,
  onDelete,
  onAddCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  onAddAccount,
  trm = 4000
}) {
  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [originalCurrency, setOriginalCurrency] = useState('COP');
  const [exchangeRate, setExchangeRate] = useState('4000');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type || 'expense');
      const curr = transaction.originalCurrency || 'COP';
      setOriginalCurrency(curr);
      const origAmt = (curr !== 'COP' && transaction.originalAmount != null) ? transaction.originalAmount : transaction.amount;
      setAmount(origAmt != null ? formatCurrencyInput(origAmt, enableDecimals) : '');
      const rate = transaction.exchangeRate != null ? String(transaction.exchangeRate) : (curr === 'EUR' ? '4400' : String(trm || 4000));
      setExchangeRate(rate);
      setCategoryId(transaction.categoryId || '');
      setSubcategoryId(transaction.subcategoryId || '');
      setAccountId(transaction.accountId || '');
      setDate(transaction.date || '');
      setNote(transaction.note || '');
      setReceiptImage(transaction.receiptImage || null);
    }
  }, [transaction, enableDecimals, trm]);

  useBackHandler(Boolean(transaction), onClose);

  if (!transaction) return null;

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

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        setReceiptImage(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!transaction) return;

    const numAmount = parseFormattedAmount(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const rateNum = originalCurrency === 'COP' ? 1 : (parseFloat(exchangeRate) || 1);
    const calculatedAmount = originalCurrency === 'COP' ? numAmount : (numAmount * rateNum);
    const finalAmount = enableDecimals 
      ? Number(calculatedAmount.toFixed(2)) 
      : Math.round(calculatedAmount);

    const selectedCat = categories.find(c => c.id === categoryId);
    const selectedSub = selectedCat?.subcategories?.find(s => s.id === subcategoryId);
    const selectedAcc = accounts.find(a => a.id === accountId);

    const updated = {
      ...transaction,
      type,
      amount: finalAmount,
      originalCurrency,
      originalAmount: numAmount,
      exchangeRate: originalCurrency === 'COP' ? 1 : rateNum,
      categoryId,
      categoryName: selectedCat ? selectedCat.name : transaction.categoryName,
      subcategoryId: selectedSub ? selectedSub.id : null,
      subcategoryName: selectedSub ? selectedSub.name : null,
      accountId,
      accountName: selectedAcc ? selectedAcc.name : transaction.accountName,
      date,
      note: note.trim(),
      receiptImage: receiptImage || null
    };

    if (onSave) {
      onSave(updated);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleDelete = () => {
    if (window.confirm('¿Eliminar este movimiento?')) {
      if (onDelete) {
        onDelete(transaction.id);
      }
      if (onClose) {
        onClose();
      }
    }
  };



  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Fijo */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Editar transacción</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Modifica los detalles y recalcula balances</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Cuerpo del Formulario con scroll independiente */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
            {/* Segmented Control: Gasto vs Ingreso */}
            <div className="flex justify-center">
              <SegmentedControl
                options={[
                  { id: 'expense', label: 'Gasto', icon: ArrowDownRight },
                  { id: 'income', label: 'Ingreso', icon: ArrowUpRight }
                ]}
                value={type}
                onChange={(newType) => {
                  setType(newType);
                  const cats = categories.filter(c => c.type === newType);
                  if (cats.length > 0) setCategoryId(cats[0].id);
                }}
                size="md"
                fullWidth={false}
                className="w-full sm:w-64"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Monto y Selector de Moneda */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Monto ({originalCurrency === 'COP' ? '$ COP' : originalCurrency}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 font-black text-lg text-slate-900 dark:text-zinc-100">
                    {originalCurrency === 'EUR' ? '€' : '$'}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    required
                    value={amount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setAmount(formatCurrencyInput(e.target.value, enableDecimals))}
                    className="w-full pl-8 pr-3.5 h-12 text-2xl font-bold font-mono tracking-tight bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all tabular-nums"
                  />
                </div>

                {/* Chips selector de Moneda */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[
                    { code: 'COP', label: 'COP' },
                    { code: 'USD', label: 'USD $' },
                    { code: 'EUR', label: 'EUR €' }
                  ].map((c) => {
                    const isSelected = originalCurrency === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setOriginalCurrency(c.code);
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
                            ? 'bg-emerald-500 text-white shadow-sm font-bold scale-[1.02]'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10'
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                {/* Lógica de Conversión y Tasa de Cambio (TRM en COP) en Edición */}
                {originalCurrency !== 'COP' && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1 mt-0.5">
                    <span>
                      TRM: 1 {originalCurrency} = ${Number(exchangeRate || trm || 4050).toLocaleString('es-CO')} COP
                    </span>
                    <span>
                      ≈ ${(((parseFormattedAmount(amount) || 0) * (parseFloat(exchangeRate) || 0))).toLocaleString('es-CO', { minimumFractionDigits: enableDecimals ? 2 : 0, maximumFractionDigits: 2 })} COP
                    </span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 space-y-3">
                <TransactionAccountCategoryFields
                  accountId={accountId}
                  setAccountId={setAccountId}
                  accounts={accounts}
                  categoryId={categoryId}
                  setCategoryId={setCategoryId}
                  categories={categories}
                  subcategoryId={subcategoryId}
                  setSubcategoryId={setSubcategoryId}
                  date={date}
                  setDate={setDate}
                  type={type}
                  onAddCategory={onAddCategory}
                  onAddSubcategory={onAddSubcategory}
                  onUpdateSubcategory={onUpdateSubcategory}
                  onDeleteSubcategory={onDeleteSubcategory}
                  onAddAccount={onAddAccount}
                />
              </div>

              {/* Nota */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">Nota / Descripción</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Descripción del movimiento..."
                  className="w-full h-11 px-3.5 text-sm bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
                />
              </div>

              {/* Recibo / Factura en Edición */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold opacity-70">
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
                  id="edit-receipt-file-input"
                />

                {!receiptImage ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 px-3 border border-dashed border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800/60 rounded-xl flex items-center justify-center gap-2 hover:border-[#007AFF] hover:bg-blue-50/50 dark:hover:bg-blue-900/20 active:scale-98 transition-all group cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-[#007AFF]" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Adjuntar o cambiar foto de recibo
                    </span>
                  </button>
                ) : (
                  <div 
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800/80 flex items-center gap-3 shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-zinc-800 relative">
                      <img 
                        src={receiptImage} 
                        alt="Recibo adjunto" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                        Comprobante adjunto
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
                      onClick={() => {
                        setReceiptImage(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
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
          <div className="shrink-0 px-6 py-4 bg-slate-50/50 dark:bg-zinc-900/90 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="h-11 px-3.5 text-sm font-medium text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-4 rounded-lg font-medium text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-11 px-5 rounded-lg font-medium text-sm transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
