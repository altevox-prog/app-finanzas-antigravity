import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Check, 
  KeyRound, 
  Fingerprint,
  Clock,
  EyeOff
} from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';

/**
 * ProfileSecurityTab
 * Subcomponente para la pestaña "Seguridad & Acceso" del Centro de Control / Perfil.
 * Incluye:
 * - Bloqueo con PIN / Contraseña (toggle, status y botón para cambiar PIN)
 * - Bloqueo biométrico con Huella WebAuthn (toggle y status)
 * - Tiempo de bloqueo automático por inactividad ("Inmediato", "1 minuto", "5 minutos")
 * - Privacidad en pantalla ("Ocultar saldos al iniciar")
 * - Tarjeta informativa de privacidad y autenticación local
 */
export default function ProfileSecurityTab({
  securitySettings,
  handleTogglePin,
  handleToggleBiometrics,
  onChangePinClick
}) {
  const { isPrivacyMode, isPrivate, setIsPrivate, setIsPrivacyMode, togglePrivacyMode } = usePrivacy();

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

  // 2. Estado persistido para ocultar saldos al iniciar
  const [hideBalancesOnStart, setHideBalancesOnStart] = useState(() => {
    try {
      return localStorage.getItem('security_hide_balances_on_start') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleHideBalances = () => {
    const next = !hideBalancesOnStart;
    setHideBalancesOnStart(next);
    try {
      localStorage.setItem('security_hide_balances_on_start', String(next));
      window.dispatchEvent(new CustomEvent('security_hide_balances_changed', { detail: { hide: next } }));
    } catch (e) {
      console.error('Error guardando preferencia de ocultar saldos:', e);
    }

    // Actualización inmediata del estado de privacidad en toda la aplicación
    if (typeof setIsPrivate === 'function') {
      setIsPrivate(next);
    } else if (typeof setIsPrivacyMode === 'function') {
      setIsPrivacyMode(next);
    } else if (typeof togglePrivacyMode === 'function') {
      togglePrivacyMode();
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Bloque de Credenciales del Dispositivo */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Credenciales del Dispositivo
          </h3>
        </div>

        <div 
          className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 space-y-3.5 shadow-xs"
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
              <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
            </div>
          </div>

          {/* Tiempo de Bloqueo Automático por Inactividad */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                <span className="text-[12px] font-semibold text-slate-800 dark:text-zinc-200">
                  Tiempo de bloqueo automático
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/60 rounded-xl border border-slate-200/60 dark:border-white/[0.05]">
              {['Inmediato', '1 minuto', '5 minutos'].map((option) => {
                const isSelected = autoLockTime === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleAutolockChange(option)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none text-center truncate ${
                      isSelected
                        ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/70 dark:border-white/10'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
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

      {/* 2. Bloque: Privacidad en Pantalla */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <EyeOff className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Privacidad en Pantalla
          </h3>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 shadow-xs">
          <div 
            onClick={handleToggleHideBalances}
            className="min-h-[48px] p-2.5 sm:p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors gap-3 select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                <EyeOff className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">
                  Ocultar saldos al iniciar
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Muestra los balances en modo privado (••••) al abrir la app
                </p>
              </div>
            </div>

            <div className="relative inline-flex items-center shrink-0 pointer-events-none">
              <input 
                type="checkbox" 
                checked={hideBalancesOnStart} 
                readOnly
                className="sr-only peer" 
              />
              <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tarjeta Informativa de Seguridad y Cifrado */}
      <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02] flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Privacidad y Autenticación Local
          </h4>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            El acceso por PIN y biometría se procesa localmente mediante WebAuthn. Tus credenciales nunca salen de este dispositivo.
          </p>
        </div>
      </div>
    </div>
  );
}
