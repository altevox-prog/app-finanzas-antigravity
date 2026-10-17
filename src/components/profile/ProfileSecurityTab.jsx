import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Check, 
  KeyRound, 
  Fingerprint,
  Clock
} from 'lucide-react';

/**
 * ProfileSecurityTab
 * Subcomponente para la pestaña "Seguridad & Acceso" del Centro de Control / Perfil.
 * Incluye:
 * - Bloqueo con PIN / Contraseña (toggle, status y botón para cambiar PIN)
 * - Bloqueo biométrico con Huella WebAuthn (toggle y status)
 * - Tiempo de bloqueo automático por inactividad ("Inmediato", "1 minuto", "5 minutos")
 * - Tarjeta informativa de privacidad y autenticación local
 */
export default function ProfileSecurityTab({
  securitySettings,
  handleTogglePin,
  handleToggleBiometrics,
  onChangePinClick
}) {
  // 1. Estado persistido para tiempo de bloqueo automático
  const [autoLockTime, setAutoLockTime] = useState(() => {
    try {
      return localStorage.getItem('security_autolock_time') || 'Inmediato';
    } catch {
      return 'Inmediato';
    }
  });

  const handleAutolockChange = (option) => {
    setAutoLockTime(option);
    try {
      localStorage.setItem('security_autolock_time', option);
      window.dispatchEvent(new CustomEvent('security_autolock_changed', { detail: { time: option } }));
    } catch (e) {
      console.error('Error guardando tiempo de bloqueo:', e);
    }
  };

  return (
    <div className="space-y-3.5 animate-fadeIn">
      {/* 1. Bloque de Credenciales del Dispositivo */}
      <div>
        <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2 px-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
          <span>Credenciales del dispositivo</span>
        </h3>

        <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          {/* Toggle PIN - Fila compacta */}
          <div 
            onClick={handleTogglePin}
            className="py-2 sm:py-2.5 px-2 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors gap-3 select-none"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">Bloqueo con contraseña / PIN</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Solicitar PIN al iniciar o reanudar sesión</p>
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
            <div className="pt-2 px-2 flex items-center justify-between">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> PIN activo
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangePinClick?.();
                }}
                className="text-xs font-semibold text-[#007AFF] hover:underline cursor-pointer flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Cambiar PIN</span>
              </button>
            </div>
          )}

          {/* Divisor tenue */}
          <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

          {/* Toggle Biometría WebAuthn - Fila compacta */}
          <div 
            onClick={handleToggleBiometrics}
            className="py-2 sm:py-2.5 px-2 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors gap-3 select-none" 
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                <Fingerprint className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">Bloqueo con huella / biometría</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Autenticación biométrica mediante WebAuthn</p>
              </div>
            </div>

            <div className="relative inline-flex items-center shrink-0 pointer-events-none">
              <input 
                type="checkbox" 
                checked={Boolean(securitySettings?.biometricsEnabled)} 
                readOnly
                className="sr-only peer" 
              />
              <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
            </div>
          </div>

          {/* Divisor tenue */}
          <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

          {/* Tiempo de Bloqueo Automático por Inactividad */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tiempo de bloqueo automático
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
              {['Inmediato', '1 minuto', '5 minutos'].map((option) => {
                const isSelected = autoLockTime === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleAutolockChange(option)}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none text-center truncate ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/70 dark:border-white/10'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tarjeta Informativa de Seguridad y Cifrado */}
      <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            Privacidad y autenticación local
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            El acceso por PIN y biometría se procesa localmente mediante WebAuthn. Tus credenciales nunca salen de este dispositivo.
          </p>
        </div>
      </div>
    </div>
  );
}
