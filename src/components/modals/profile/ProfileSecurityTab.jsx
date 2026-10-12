import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Check, 
  KeyRound, 
  Fingerprint 
} from 'lucide-react';

/**
 * ProfileSecurityTab
 * Subcomponente independiente para la pestaña "Seguridad & Acceso" del Centro de Control / Perfil.
 * Incluye las opciones de credenciales del dispositivo:
 * - Bloqueo con PIN / Contraseña (toggle, status y botón para cambiar PIN)
 * - Bloqueo biométrico con Huella WebAuthn (toggle y status)
 */
export default function ProfileSecurityTab({
  securitySettings,
  handleTogglePin,
  handleToggleBiometrics,
  onChangePinClick
}) {
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Bloque de Contraseña y Huella */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Credenciales del Dispositivo
          </h3>
        </div>

        <div 
          className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 space-y-3.5"
        >
          {/* Toggle PIN - Fila táctil completa */}
          <div 
            onClick={handleTogglePin}
            className="min-h-[48px] p-2.5 sm:p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors gap-3 select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">Bloqueo con Contraseña / PIN</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">Solicitar PIN al iniciar o reanudar sesión</p>
              </div>
            </div>

            <div className="relative inline-flex items-center shrink-0 pointer-events-none">
              <input 
                type="checkbox" 
                checked={Boolean(securitySettings?.pinEnabled)} 
                readOnly
                className="sr-only peer" 
              />
              <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </div>
          </div>

          {/* Si el PIN está activo, permitir cambiarlo */}
          {securitySettings?.pinEnabled && (
            <div className="pt-2 px-2 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> PIN Activo
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangePinClick?.();
                }}
                className="text-[12px] font-bold text-[#007AFF] hover:underline cursor-pointer flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Cambiar PIN</span>
              </button>
            </div>
          )}

          {/* Toggle Biometría WebAuthn - Fila táctil completa */}
          <div 
            onClick={handleToggleBiometrics}
            className="pt-3 border-t border-slate-200/80 dark:border-white/[0.08] min-h-[48px] p-2.5 sm:p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors gap-3 select-none" 
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                <Fingerprint className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">Bloqueo con Huella / Biometría</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">Autenticación biométrica mediante WebAuthn</p>
              </div>
            </div>

            <div className="relative inline-flex items-center shrink-0 pointer-events-none">
              <input 
                type="checkbox" 
                checked={Boolean(securitySettings?.biometricsEnabled)} 
                readOnly
                className="sr-only peer" 
              />
              <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
