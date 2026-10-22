import React, { useRef } from 'react';
import { Camera, Trash2 } from 'lucide-react';

export default function EditTransactionReceipt({ receiptImage, setReceiptImage }) {
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 800 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setReceiptImage(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setReceiptImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[11px] font-semibold opacity-70">Foto de Recibo</label>
        {receiptImage && <span className="text-[10px] text-[#34C759] font-bold">✓ Adjunto</span>}
      </div>
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
      {!receiptImage ? (
        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-2 px-3 border border-dashed border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800/60 rounded-xl flex items-center justify-center gap-2 hover:border-[#007AFF] active:scale-98 cursor-pointer">
          <Camera className="w-4 h-4 text-[#007AFF]" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Adjuntar o cambiar foto de recibo</span>
        </button>
      ) : (
        <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800/80 flex items-center gap-3 shadow-sm">
          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 relative">
            <img src={receiptImage} alt="Recibo adjunto" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-slate-900 dark:text-white">Comprobante adjunto</p>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[11px] font-bold text-[#007AFF] hover:underline cursor-pointer">Cambiar foto</button>
          </div>
          <button type="button" onClick={handleClear} className="w-8 h-8 rounded-lg text-[#FF3B30] hover:bg-red-500/10 flex items-center justify-center shrink-0 cursor-pointer" title="Eliminar foto">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
