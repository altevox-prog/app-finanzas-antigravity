export function exportInvoicePDF(elementId = 'invoice-printable-sheet') {
  if (typeof document === 'undefined') return;
  const element = document.getElementById(elementId);
  if (!element) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const headElements = Array.from(document.querySelectorAll('head style, head link[rel="stylesheet"]'));
  const stylesHtml = headElements.map((el) => el.outerHTML).join('\n');

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>Factura</title>${stylesHtml}<style>@page { size: auto; margin: 12mm; } body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; } #invoice-printable-sheet { width: 100% !important; max-width: 100% !important; box-shadow: none !important; border: none !important; padding: 0 !important; }</style></head><body>${element.outerHTML}</body></html>`);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1000);
    }
  };

  setTimeout(triggerPrint, 250);
}

export default exportInvoicePDF;
