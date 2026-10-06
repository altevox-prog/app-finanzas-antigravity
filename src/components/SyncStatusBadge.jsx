import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function SyncStatusBadge({ className = '' }) {
  return (
    <div 
      className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 text-xs select-none ${className}`}
      title="Tus finanzas se guardan exclusivamente en la memoria de este dispositivo (100% privado y seguro)."
    >
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300 truncate">
        Modo Local (Privado)
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto shrink-0 animate-pulse" />
    </div>
  );
}
