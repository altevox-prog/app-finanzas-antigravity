import React from 'react';
import { MessageCircle, Mail, Share2 } from 'lucide-react';
import { formatCOP } from '../../../utils/currencyUtils';

export default function InvoiceShareActions({ invoice = {}, total = 0 }) {
  const clientName = invoice.client?.name?.trim() || 'Cliente';
  const clientEmail = invoice.client?.email?.trim() || '';
  const docName = invoice.docTitle || (invoice.template === 'servicios' ? 'Factura de Servicios' : 'Documento Soporte');
  const totalFormatted = formatCOP(total);
  const dueDate = invoice.meta?.dueDate || 'acordado';
  const issueDate = invoice.meta?.issueDate || '';

  const shareText = `Hola ${clientName}, adjunto el resumen de tu ${docName}: Total a pagar: ${totalFormatted}. Vence el: ${dueDate}.`;

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEmail = () => {
    const subject = `Factura - ${clientName}`;
    const body = `Hola ${clientName},\n\nAdjunto el resumen de tu ${docName}:\n- Total a pagar: ${totalFormatted}\n- Fecha de emisión: ${issueDate || '---'}\n- Fecha de vencimiento: ${dueDate}\n\nGracias por su confianza.`;
    window.location.href = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${docName} - ${clientName}`, text: shareText });
      } catch {}
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {hasNativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Compartir"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Compartir</span>
        </button>
      )}
      <button
        type="button"
        onClick={handleWhatsApp}
        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
        title="Enviar por WhatsApp"
      >
        <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
        <span className="hidden sm:inline">WhatsApp</span>
      </button>
      <button
        type="button"
        onClick={handleEmail}
        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
        title="Enviar por Correo"
      >
        <Mail className="w-3.5 h-3.5 text-blue-500" />
        <span className="hidden sm:inline">Correo</span>
      </button>
    </div>
  );
}
