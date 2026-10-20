import React, { useMemo } from 'react';
import { CalendarSync, Clock, Bell } from 'lucide-react';
import { getDueDateForDigits } from '../../utils/taxUtils';

const DIGIT_EXAMPLES = ['01', '14', '45', '78', '83', '99'];

const ToggleSwitch = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
  </label>
);

/**
 * TaxCalendarAlerts
 * Calendario tributario DIAN y configuración de alertas preventivas.
 */
export default function TaxCalendarAlerts({
  cedulaDigits,
  setCedulaDigits,
  dueDate,
  dueDateInfo: propDueDateInfo,
  alert15Days,
  setAlert15Days,
  alert3Days,
  setAlert3Days,
  alert1Day,
  setAlert1Day,
  enableWebNotifications,
  setEnableWebNotifications,
  onToggleWebNotifications,
  fiscalYear = 2024,
  variant = 'full'
}) {
  const calculatedDueDateInfo = useMemo(() => {
    if (propDueDateInfo !== undefined) return propDueDateInfo;
    if (dueDate !== undefined) return dueDate;
    if (!cedulaDigits) return null;
    return getDueDateForDigits(cedulaDigits, fiscalYear + 1);
  }, [propDueDateInfo, dueDate, cedulaDigits, fiscalYear]);

  const handleWebNotifications = async () => {
    if (onToggleWebNotifications) return onToggleWebNotifications();
    if (!enableWebNotifications) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') setEnableWebNotifications(true);
          else alert('Debes habilitar los permisos de notificación en tu navegador.');
        } catch {
          setEnableWebNotifications(false);
        }
      } else alert('Este dispositivo no soporta notificaciones web push.');
    } else setEnableWebNotifications(false);
  };

  const ALERT_ITEMS = [
    { id: '15d', title: 'Alerta 15 días antes', desc: 'Tiempo ideal para recopilar extractos y soportes', badge: '15d', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono', checked: alert15Days, onChange: (e) => setAlert15Days(e.target.checked) },
    { id: '3d', title: 'Alerta 3 días antes', desc: 'Confirmación de borrador y firma digital', badge: '3d', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-mono', checked: alert3Days, onChange: (e) => setAlert3Days(e.target.checked) },
    { id: '1d', title: 'Alerta urgente 1 día antes', desc: 'Última oportunidad para presentar a tiempo', badge: '1d', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-mono', checked: alert1Day, onChange: (e) => setAlert1Day(e.target.checked) },
    { id: 'web', title: 'Notificaciones Web Push / PWA', desc: 'Recibir avisos directos en el celular o navegador', icon: Bell, badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20', checked: enableWebNotifications, onChange: handleWebNotifications }
  ];

  const renderCalendarCard = () => (
    <div className="rounded-2xl p-5 sm:p-7 bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CalendarSync className="w-3 h-3" />
            <span>Calendario Tributario DIAN · Personas Naturales</span>
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">¿Cuándo vence tu declaración de renta?</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">Ingresa los dos últimos dígitos de tu cédula o NIT (sin dígito de verificación):</p>
        </div>
      </div>

      <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={cedulaDigits}
            onChange={(e) => setCedulaDigits(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="00"
            className="w-24 text-center font-black text-2xl h-12 rounded-xl border-2 border-emerald-500/40 focus:border-emerald-500 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white outline-none transition-all shadow-inner tabular-nums"
          />
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200 block">Dígitos finales</span>
            <span>Rango oficial: 00 al 99</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-[11px] text-slate-400 font-medium mr-1 hidden sm:inline">Ejemplos:</span>
          {DIGIT_EXAMPLES.map((dig) => (
            <button
              key={dig}
              type="button"
              onClick={() => setCedulaDigits(dig)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                cedulaDigits === dig ? 'bg-emerald-600 text-white shadow-sm scale-105' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {dig}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {calculatedDueDateInfo ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block">Fecha límite oficial para dígitos {calculatedDueDateInfo.digitsFormatted}:</span>
              <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white capitalize block">{calculatedDueDateInfo.fullDateFormatted}</span>
            </div>
            <div className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0 ${
              calculatedDueDateInfo.status === 'today' ? 'bg-rose-500 text-white animate-pulse' : calculatedDueDateInfo.status === 'passed' ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'bg-emerald-600 text-white'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{calculatedDueDateInfo.statusText}</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
            👆 Ingresa los 2 dígitos finales de tu documento para calcular tu fecha exacta de vencimiento DIAN.
          </div>
        )}
      </div>
    </div>
  );

  const renderAlertsCard = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Bell className="w-4 h-4 text-emerald-500" />
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Plan de Recordatorios y Alertas</h3>
      </div>
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] space-y-3.5 shadow-sm dark:shadow-md">
        <p className="text-xs text-slate-600 dark:text-slate-300">Recibe avisos antes de tu fecha límite para evitar sanciones por extemporaneidad de la DIAN:</p>
        <div className="space-y-2.5">
          {ALERT_ITEMS.map(({ id, title, desc, badge, icon: Icon, badgeClass, checked, onChange }) => (
            <div key={id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border ${badgeClass}`}>
                  {badge || <Icon className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</p>
                </div>
              </div>
              <ToggleSwitch checked={checked} onChange={onChange} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (variant === 'calendar') return renderCalendarCard();
  if (variant === 'alerts') return renderAlertsCard();
  return (
    <>
      {renderCalendarCard()}
      {renderAlertsCard()}
    </>
  );
}
