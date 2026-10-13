import React, { useRef } from 'react';
import { Camera, Trash2 } from 'lucide-react';

export default function ReceiptUploader({
  receiptImage,
  setReceiptImage,
  onImageChange
}) {
  const fileInputRef = useRef(null);

  // Procesamiento de imagen con compresión Canvas en cliente
  const handleImageUpload = (e) => {
    if (onImageChange) {
      onImageChange(e);
      return;
    }

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

        // Comprimir a JPEG 0.75 (~40-70KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        if (setReceiptImage) {
          setReceiptImage(compressedDataUrl);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    if (setReceiptImage) {
      setReceiptImage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
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
          className="p-2.5 rounded-xl border flex items-center gap-3 shadow-sm"
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
  );
}
