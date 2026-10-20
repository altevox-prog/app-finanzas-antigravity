import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Landmark, ShieldAlert, ShieldCheck, ExternalLink, ChevronRight, AlertTriangle } from 'lucide-react';
import TaxCalendarAlerts from './TaxCalendarAlerts';
import TaxChecklistSection from './TaxChecklistSection';
import { usePrivacy } from '../../context/PrivacyContext';
import { UVT_VALUES, calculateTaxMetrics } from '../../utils/taxUtils';

const STORAGE_KEY = 'tax_profile_settings';
const DEFAULT_SETTINGS = {
  cedulaDigits: '', fiscalYear: new Date().getFullYear() - 1,
  alert15Days: true, alert3Days: true, alert1Day: true,
  enableWebNotifications: false, showDashboardBanner: true, checklist: {}
};

export default function TaxView({ transactions = [], accounts = [], investments = [], onBack, onClose, fromSettings = false, previousView }) {
  const { formatMoney } = usePrivacy();
  const handleBackAction = () => (onBack ? onBack() : onClose ? onClose() : typeof window !== 'undefined' && window.history.length > 2 && window.history.back());

  const [settings, setSettings] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch (_) {}
    return DEFAULT_SETTINGS;
  });

  const { cedulaDigits, fiscalYear, alert15Days, alert3Days, alert1Day, enableWebNotifications, checklist } = settings;
  const updateSetting = (key, val) => setSettings(prev => ({ ...prev, [key]: typeof val === 'function' ? val(prev[key]) : val }));

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) {} }, [settings]);

  const uvtValue = UVT_VALUES[fiscalYear] || UVT_VALUES[2024] || 47065;
  const taxMetrics = useMemo(() => calculateTaxMetrics({ transactions, accounts, investments, fiscalYear, uvtValue }), [transactions, accounts, investments, fiscalYear, uvtValue]);
  const toggleChecklistStep = (stepId) => updateSetting('checklist', (prev = {}) => ({ ...prev, [stepId]: !prev[stepId] }));

  const handleToggleWebNotifications = async () => {
    if (enableWebNotifications) return updateSetting('enableWebNotifications', false);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        updateSetting('enableWebNotifications', perm === 'granted');
        if (perm !== 'granted') alert('Debes habilitar los permisos de notificación en tu navegador.');
      } catch { updateSetting('enableWebNotifications', false); }
    } else alert('Este dispositivo no soporta notificaciones web push.');
  };

  const statusTheme = taxMetrics.mustDeclare
    ? { bg: 'bg-rose-500/10 border-rose-500/30', badgeBg: 'bg-rose-500/20 text-rose-500 border-rose-500/30', Icon: ShieldAlert, title: '🔴 Superaste el tope (Te corresponde declarar renta)', desc: `Has superado ${taxMetrics.exceededCount} de los topes legales de la DIAN en ${fiscalYear}. Debes preparar y presentar tu declaración.` }
    : taxMetrics.warningCount > 0
    ? { bg: 'bg-amber-500/10 border-amber-500/30', badgeBg: 'bg-amber-500/20 text-amber-500 border-amber-500/30', Icon: AlertTriangle, title: '🟡 Cerca del límite en algunos rubros', desc: `Estás cerca del 75% o más en ${taxMetrics.warningCount} rubros. Supervisa tus próximos movimientos para evitar sobrepasar los límites.` }
    : { bg: 'bg-emerald-500/10 border-emerald-500/30', badgeBg: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30', Icon: ShieldCheck, title: '🟢 Dentro del límite legal de los topes DIAN', desc: `Tus ingresos, consumos y consignaciones registradas para ${fiscalYear} están dentro de los márgenes exentos.` };
  const StatusIcon = statusTheme.Icon;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn pb-16">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={handleBackAction} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 active:scale-95 transition-colors cursor-pointer border border-slate-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm shrink-0" aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Landmark className="w-5 h-5 text-emerald-500 shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">Impuestos y Declaración de Renta</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 ml-auto">
          <span className="hidden sm:inline">Año gravable:</span>
          <select value={fiscalYear} onChange={(e) => updateSetting('fiscalYear', Number(e.target.value))} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none cursor-pointer shadow-sm focus:ring-1 focus:ring-emerald-500">
            <option value={2025}>2025 (Declarar en 2026)</option>
            <option value={2024}>2024 (Declarar en 2025)</option>
            <option value={2023}>2023</option>
          </select>
        </div>
      </div>

      <TaxCalendarAlerts variant="calendar" cedulaDigits={cedulaDigits} setCedulaDigits={(v) => updateSetting('cedulaDigits', v)} fiscalYear={fiscalYear} />

      <a href="https://consultarenta.dian.gov.co/consultarenta/" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl transition-all group active:scale-[0.99] shadow-sm cursor-pointer">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#007AFF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-blue-500/20"><ExternalLink className="w-5 h-5" /></div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">Consultar en el portal oficial de la DIAN</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Oficial</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">Accede a la herramienta '¿Debo declarar renta?' con tu cédula</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
      </a>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2"><Landmark className="w-4 h-4 text-emerald-500" /><h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Monitor de Topes DIAN ({fiscalYear})</h3></div>
          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">1 UVT = {formatMoney(uvtValue)}</span>
        </div>

        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${statusTheme.bg}`}>
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${statusTheme.badgeBg}`}><StatusIcon className="w-6 h-6" /></div>
            <div className="space-y-1 flex-1">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">{statusTheme.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{statusTheme.desc}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {taxMetrics.items.map((item, idx) => {
            const isDanger = item.percentage >= 100, isWarning = item.percentage >= 75 && !isDanger;
            const badgeClass = isDanger ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25' : isWarning ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
            const barClass = isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';
            return (
              <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-white/20 transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{item.title}</h5>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${badgeClass}`}>
                      {isDanger ? '🔴 Tope superado' : isWarning ? '🟡 Cerca del límite' : '🟢 Dentro del límite'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">{item.description}</p>
                </div>
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-baseline justify-between text-xs">
                    <div><span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Monto registrado:</span><span className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">{formatMoney(item.amount)}</span></div>
                    <div className="text-right"><span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Tope ({item.thresholdUVT.toLocaleString('es-CO')} UVT):</span><span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">{formatMoney(item.limitAmount)}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10"><div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }} /></div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>Progreso acumulado</span>
                      <span className={`font-bold ${isDanger ? 'text-rose-600 dark:text-rose-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{item.percentage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TaxCalendarAlerts
        variant="alerts" alert15Days={alert15Days} setAlert15Days={(v) => updateSetting('alert15Days', v)}
        alert3Days={alert3Days} setAlert3Days={(v) => updateSetting('alert3Days', v)} alert1Day={alert1Day} setAlert1Day={(v) => updateSetting('alert1Day', v)}
        enableWebNotifications={enableWebNotifications} setEnableWebNotifications={(v) => updateSetting('enableWebNotifications', v)} onToggleWebNotifications={handleToggleWebNotifications}
      />
      <TaxChecklistSection checklist={checklist} toggleChecklistStep={toggleChecklistStep} />
    </div>
  );
}
