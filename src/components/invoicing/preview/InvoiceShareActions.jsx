import React, { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { toBlob } from 'html-to-image';

const EMAIL_BODY_TEXT = 'Cordial saludo, a continuacion envio la factura correspondiente, cualquier duda o inquietud estaremos atentos.';

export default function InvoiceShareActions({ invoice = {} }) {
  const [isCapturing, setIsCapturing] = useState(false);

  const getInvoiceFile = async () => {
    const element = document.getElementById('invoice-printable-sheet');
    if (!element) return null;
    const blob = await toBlob(element, { quality: 0.95, backgroundColor: '#ffffff', pixelRatio: 2 });
    if (!blob) return null;
    const safeName = (invoice.docTitle || 'Factura').replace(/[^a-zA-Z0-9]/g, '_');
    return new File([blob], `${safeName}.png`, { type: 'image/png' });
  };

  const handleShare = async () => {
    setIsCapturing(true);
    const title = invoice.docTitle || 'Factura';
    try {
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        const file = await getInvoiceFile();
        if (file && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title,
            text: EMAIL_BODY_TEXT,
            files: [file]
          });
          return;
        }
      }
      const mailtoUrl = `mailto:${encodeURIComponent(invoice.client?.email || '')}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(EMAIL_BODY_TEXT)}`;
      window.location.href = mailtoUrl;
    } catch (err) {
      if (err.name !== 'AbortError') {
        const mailtoUrl = `mailto:${encodeURIComponent(invoice.client?.email || '')}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(EMAIL_BODY_TEXT)}`;
        window.location.href = mailtoUrl;
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <button
      type="button"
      disabled={isCapturing}
      onClick={handleShare}
      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/60 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
      title="Compartir factura"
    >
      {isCapturing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600 dark:text-zinc-300" />
      ) : (
        <Share2 className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-300" />
      )}
      <span>Compartir</span>
    </button>
  );
}