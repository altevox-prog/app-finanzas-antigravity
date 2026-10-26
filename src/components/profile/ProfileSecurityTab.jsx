import React, { useState } from 'react';
import { ShieldCheck, Lock, Check, KeyRound, Fingerprint, Clock } from 'lucide-react';

/**
 * ProfileSecurityTab - Pestaña "Seguridad & Acceso" del Centro de Control / Perfil.
 */
export default function ProfileSecurityTab({
  securitySettings,
  handleTogglePin,
  handleToggleBiometrics,
  onChangePinClick
}) {
  const [autoLockTime, setAutoLockTime] = useState(() => {
    try { return localStorage.getItem('security_autolock_time') || 'Inmediato'; } catch { return 'Inmediato'; }
  });

  const handleAutolockChange = (option) => {
    setAutoLockTime(option);
    try {
      localStorage.setItem('security_autolock_time', option);
      window.dispatchEvent(new CustomEvent('security_autolock_changed', { detail: { time: option } }));
    } catch (e) { console.error('Error guardando tiempo de bloqueo:', e); }
  };

  return (
    <div className="space-y-3.5 animate-fadeIn">
      <div>
        <h3 className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5 mb-2 px-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
          <span>Credenciales del dispositivo</span>
        </h3>

        <div className="p-4 rounded-2xl border border-white/70 dark:border-white/[0.08] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-xs">
          {/* Toggle PIN */}
          <div onClick={handleTogglePin} className="py-2 sm:py-2.5 px-2 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/60 dark:hover:bg-white/[0.06] transition-colors gap-3 select-none">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">Bloqueo con contraseña / PIN</p>
                <p className="text-[11px] text-slate-700 dark:text-zinc-300 font-medium">Solicitar PIN al iniciar o reanudar sesión</p>
              </div>
            </div>
            <div className="relative inline-flex items-center shrink-0 pointer-events-none">
              <input type="checkbox" checked={Boolean(securitySettings?.pinEnabled)} readOnly className="sr-only peer" />
              <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </div>
          </div>

          {securitySettings?.pinEnabled && (
            <div className="pt-2 px-2 flex items-center justify-between">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> PIN activo
              </span>
              <button type="button" onClick={(e) => { e.stopPropagation(); onChangePinClick?.(); }} className="text-xs font-semibold text-[#007AFF] hover:underline cursor-pointer flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" /><span>Cambiar PIN</span>
              </button>
            </div>
          )}

          <div className="my-3 border-t border-white/40 dark:border-white/[0.08]" />

          {/* Toggle Biometría WebAuthn */}
          <div onClick={handleToggleBiometrics} className="py-2 sm:py-2.5 px-2 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/60 dark:hover:bg-white/[0.06] transition-colors gap-3 select-none">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                <Fingerprint className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">Bloqueo con huella / biometría</p>
                <p className="text-[11px] text-slate-700 dark:text-zinc-300 font-medium">Autenticación biométrica mediante WebAuthn</p>
              </div>
            </div>
            <div className="relative inline-flex items-center shrink-0 pointer-events-none">
              <input type="checkbox" checked={Boolean(securitySettings?.biometricsEnabled)} readOnly className="sr-only peer" />
              <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500" />
            </div>
          </div>

          <div className="my-3 border-t border-white/40 dark:border-white/[0.08]" />

          {/* Tiempo de Bloqueo Automático */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Tiempo de bloqueo automático</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/30 dark:bg-white/[0.03] backdrop-blur-md border border-white/60 dark:border-white/[0.08] shadow-xs">
              {['Inmediato', '1 minuto', '5 minutos'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleAutolockChange(option)}
                  className={`py-1.5 px-2 text-xs transition-all cursor-pointer rounded-lg truncate ${
                    autoLockTime === option
                      ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30 shadow-xs backdrop-blur-sm'
                      : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-semibold hover:bg-white/40 dark:hover:bg-white/[0.06] border border-transparent'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta Informativa de Seguridad */}
      <div className="p-3.5 sm:p-4 rounded-2xl border border-white/60 dark:border-white/[0.08] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md flex items-start gap-3 shadow-xs">
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Privacidad y autenticación local</h4>
          <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">El acceso por PIN y biometría se procesa localmente mediante WebAuthn. Tus credenciales nunca salen de este dispositivo.</p>
        </div>
      </div>
    </div>
  );
}
