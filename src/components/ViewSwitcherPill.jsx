import React, { useState } from 'react';
import { Smartphone, Monitor, Sparkles, Check, ChevronDown, ChevronUp, Copy, ExternalLink } from 'lucide-react';

export default function ViewSwitcherPill({
  currentMode = 'auto',
  onSelectMode
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);

  const handleCopy = (mode, e) => {
    e?.stopPropagation();
    try {
      const url = new URL(window.location.href);
      if (mode === 'auto') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', mode);
      }
      navigator.clipboard.writeText(url.toString());
      setCopiedLink(mode);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {}
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 select-none print:hidden">
      <div className="bg-slate-900/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-700/60 dark:border-white/[0.08] text-white rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 transition-all ring-1 ring-white/10">
        
        {/* Barra compacta cuando está colapsado */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-xs font-semibold cursor-pointer"
            title="Cambiar entre vista móvil y PC"
          >
            {currentMode === 'mobile' && (
              <>
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-emerald-400">Vista Móvil</span>
              </>
            )}
            {currentMode === 'desktop' && (
              <>
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-bold text-blue-400">Vista PC (SaaS)</span>
              </>
            )}
            {currentMode === 'auto' && (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-medium text-slate-200">Vista Auto</span>
              </>
            )}

            {isExpanded ? <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" /> : <ChevronUp className="w-3 h-3 opacity-60 ml-0.5" />}
          </button>
        </div>

        {/* Menú expandido con opciones directas y botón de copiar enlace */}
        {isExpanded && (
          <div className="pt-1 border-t border-white/10 flex flex-col gap-1 min-w-[210px] animate-fadeIn">
            {/* Opción 1: Vista Móvil */}
            <div className="flex items-center justify-between gap-1 p-1 rounded-xl hover:bg-white/5 transition-colors">
              <button
                type="button"
                onClick={() => {
                  onSelectMode('mobile');
                  setIsExpanded(false);
                }}
                className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  currentMode === 'mobile' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Vista Móvil</span>
                {currentMode === 'mobile' && <Check className="w-3 h-3 ml-auto text-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={(e) => handleCopy('mobile', e)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Copiar enlace directo a Vista Móvil (?view=mobile)"
              >
                {copiedLink === 'mobile' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* Opción 2: Vista PC / Escritorio */}
            <div className="flex items-center justify-between gap-1 p-1 rounded-xl hover:bg-white/5 transition-colors">
              <button
                type="button"
                onClick={() => {
                  onSelectMode('desktop');
                  setIsExpanded(false);
                }}
                className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  currentMode === 'desktop' ? 'bg-blue-500/20 text-blue-300 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Vista PC (Escritorio)</span>
                {currentMode === 'desktop' && <Check className="w-3 h-3 ml-auto text-blue-400" />}
              </button>

              <button
                type="button"
                onClick={(e) => handleCopy('desktop', e)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Copiar enlace directo a Vista PC (?view=desktop)"
              >
                {copiedLink === 'desktop' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* Opción 3: Auto (Responsivo según pantalla) */}
            <div className="flex items-center justify-between gap-1 p-1 rounded-xl hover:bg-white/5 transition-colors">
              <button
                type="button"
                onClick={() => {
                  onSelectMode('auto');
                  setIsExpanded(false);
                }}
                className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  currentMode === 'auto' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Automático (Responsivo)</span>
                {currentMode === 'auto' && <Check className="w-3 h-3 ml-auto text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={(e) => handleCopy('auto', e)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Copiar enlace estándar (/)"
              >
                {copiedLink === 'auto' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <div className="px-2 pt-1 pb-0.5 text-[10px] text-slate-400 text-center">
              {copiedLink ? (
                <span className="text-emerald-400 font-bold">¡Enlace copiado al portapapeles!</span>
              ) : (
                <span>Pulsa el icono de copiar para compartir el enlace</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
