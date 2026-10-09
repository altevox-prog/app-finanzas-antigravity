import React from 'react';
import { ShieldCheck, Cloud, RefreshCw, AlertCircle } from 'lucide-react';

export default function SyncStatusBadge({ 
  syncStatus = 'idle', 
  isCloudEnabled = false, 
  user = null,
  onOpenAuth = null,
  className = '' 
}) {
  const isSyncing = syncStatus === 'syncing';
  const isError = syncStatus === 'error';
  const isSynced = syncStatus === 'synced' && isCloudEnabled;

  return (
    <div 
      onClick={typeof onOpenAuth === 'function' ? onOpenAuth : undefined}
      className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 text-xs select-none transition-all ${
        typeof onOpenAuth === 'function' ? 'cursor-pointer hover:border-slate-300 dark:hover:border-white/10 active:scale-95' : ''
      } ${className}`}
      title={
        isSynced
          ? `Sincronizado con Supabase Cloud (${user?.email || 'Sesión activa'}).`
          : isSyncing
          ? 'Sincronizando cambios con la nube en segundo plano...'
          : isError
          ? 'Error de sincronización con la nube. Los datos locales están seguros.'
          : 'Tus finanzas se guardan exclusivamente en la memoria de este dispositivo (100% privado y seguro).'
      }
    >
      {isSyncing ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
          <span className="font-semibold text-[11px] text-blue-600 dark:text-blue-400 truncate">
            Sincronizando...
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-auto shrink-0 animate-ping" />
        </>
      ) : isSynced ? (
        <>
          <Cloud className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
            Nube Sincronizada
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto shrink-0" />
        </>
      ) : isError ? (
        <>
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="font-semibold text-[11px] text-amber-600 dark:text-amber-400 truncate">
            Error de Sync (Local OK)
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-auto shrink-0" />
        </>
      ) : (
        <>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300 truncate">
            Modo Local (Privado)
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto shrink-0 animate-pulse" />
        </>
      )}
    </div>
  );
}
