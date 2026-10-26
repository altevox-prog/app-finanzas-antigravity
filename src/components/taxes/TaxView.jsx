import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Landmark, ShieldAlert, ShieldCheck, ExternalLink, ChevronRight, AlertTriangle, ChevronDown, CalendarSync, CheckCircle2 } from 'lucide-react';
import TaxCalendarAlerts from './TaxCalendarAlerts';
import TaxChecklistSection from './TaxChecklistSection';
import { usePrivacy } from '../../context/PrivacyContext';
import { UVT_VALUES, calculateTaxMetrics } from '../../utils/taxUtils';

const STORAGE_KEY = 'tax_profile_settings';
const DEFAULT_SETTINGS = { cedulaDigits: '', fiscalYear: new Date().getFullYear() - 1, alert15Days: true, alert3Days: true, alert1Day: true, enableWebNotifications: false, showDashboardBanner: true, checklist: {} };

export default function TaxView({ transactions = [], accounts = [], investments = [], onBack, onClose }) {
  const { formatMoney } = usePrivacy();
  const handleBackAction = () => (onBack ? onBack() : onClose ? onClose() : typeof window !== 'undefined' && window.history.length > 2 && window.history.back());

  const [settings, setSettings] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch (_) {}
    return DEFAULT_SETTINGS;
  });

  const [openSections, setOpenSections] = useState({ topes: true, alerts: false, checklist: false });
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={handleBackAction} className="hidden lg:flex w-10 h-10 rounded-xl items-center justify-center text-slate-700 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-white bg-white/60 dark:bg-zinc-800/60 border border-white/80 dark:border-white/[0.08] backdrop-blur-md hover:bg-white/80 active:scale-95 transition-all cursor-pointer shadow-xs shrink-0" aria-label="Volver"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 min-w-0"><Landmark className="w-5 h-5 text-emerald-500 shrink-0" /><h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">Impuestos y Declaración de Renta</h1></div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 w-full sm:w-auto sm:ml-auto">
          <span className="hidden sm:inline">Año gravable:</span>
          <select value={fiscalYear} onChange={(e) => updateSetting('fiscalYear', Number(e.target.value))} className="bg-white/60 dark:bg-zinc-800/60 border border-white/80 dark:border-white/[0.08] backdrop-blur-md rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 outline-none cursor-pointer shadow-xs focus:ring-1 focus:ring-emerald-500">
            <option value={2025}>2025 (Declarar en 2026)</option>
            <option value={2024}>2024 (Declarar en 2025)</option>
            <option value={2023}>2023</option>
          </select>
        </div>
      </div>

      {/* ENLACE PORTAL OFICIAL DIAN */}
      <a href="https://consultarenta.dian.gov.co/consultarenta/" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-zinc-900/50 hover:bg-white/70 dark:hover:bg-zinc-800/60 backdrop-blur-md border border-white/70 dark:border-white/[0.08] rounded-2xl transition-all group active:scale-[0.99] shadow-xs cursor-pointer">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#007AFF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-blue-500/20"><ExternalLink className="w-5 h-5" /></div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">Consultar en el portal oficial de la DIAN</span><span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Oficial</span></div>
            <p className="text-[11px] text-slate-700 dark:text-zinc-300 font-medium truncate mt-0.5">Accede a la herramienta '¿Debo declarar renta?' con tu cédula</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
      </a>

      {/* 1. SECCIÓN COLAPSABLE: MONITOR DE TOPES DIAN */}
      <div className="space-y-3">
        <button type="button" onClick={() => toggleSection('topes')} className="w-full p-3.5 sm:p-4 rounded-2xl border border-white/70 dark:border-white/[0.08] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:bg-white/70 dark:hover:bg-zinc-800/60 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group shadow-xs select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"><Landmark className="w-5 h-5 stroke-[2.2]" /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><span className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Monitor de Topes DIAN ({fiscalYear})</span><span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${taxMetrics.mustDeclare ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'}`}>{taxMetrics.mustDeclare ? 'Declarar' : 'Exento'}</span></div>
              <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium">1 UVT = {formatMoney(uvtValue)}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 ml-2 shrink-0 text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white transition-transform duration-200 ${openSections.topes ? 'rotate-180' : ''}`} />
        </button>

        {openSections.topes && (
          <div className="space-y-4 pt-1 animate-fadeIn">
            <div className={`p-4 sm:p-5 rounded-3xl border transition-all flex items-start gap-3.5 ${statusTheme.bg}`}>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${statusTheme.badgeBg}`}><StatusIcon className="w-6 h-6" /></div>
              <div className="space-y-1 flex-1">
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">{statusTheme.title}</h4>
                <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">{statusTheme.desc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(taxMetrics.thresholds || taxMetrics.items || []).map((item, idx) => {
                const isDanger = item.percentage >= 100, isWarning = item.percentage >= 75 && !isDanger;
                const badge = isDanger ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25' : isWarning ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
                const bar = isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <div key={idx} className="p-5 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-white/70 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-4 hover:bg-white/70 dark:hover:bg-zinc-800/60 transition-all">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{item.title}</h5>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${badge}`}>{isDanger ? '🔴 Tope superado' : isWarning ? '🟡 Cerca del límite' : '🟢 Dentro del límite'}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium leading-normal">{item.description}</p>
                    </div>
                    <div className="space-y-2.5 pt-2 border-t border-white/40 dark:border-white/[0.08]">
                      <div className="flex items-baseline justify-between text-xs">
                        <div><span className="text-[11px] text-slate-700 dark:text-zinc-300 block font-semibold">Monto registrado:</span><span className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">{formatMoney(item.amount)}</span></div>
                        <div className="text-right"><span className="text-[11px] text-slate-700 dark:text-zinc-300 block font-semibold">Tope ({item.thresholdUVT.toLocaleString('es-CO')} UVT):</span><span className="text-xs font-bold text-slate-800 dark:text-zinc-200 tabular-nums">{formatMoney(item.limitAmount)}</span></div>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden bg-white/60 dark:bg-white/10"><div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }} /></div>
                      <div className="flex justify-between items-center text-[11px] text-slate-700 dark:text-zinc-300 font-semibold"><span>Progreso acumulado</span><span className="font-mono tabular-nums font-bold">{item.percentage.toFixed(1)}%</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. SECCIÓN COLAPSABLE: VENCIMIENTO Y ALERTAS */}
      <div className="space-y-3">
        <button type="button" onClick={() => toggleSection('alerts')} className="w-full p-3.5 sm:p-4 rounded-2xl border border-white/70 dark:border-white/[0.08] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:bg-white/70 dark:hover:bg-zinc-800/60 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group shadow-xs select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0"><CalendarSync className="w-5 h-5 stroke-[2.2]" /></div>
            <div className="min-w-0">
              <span className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors block">Vencimiento DIAN y Alertas</span>
              <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium">{cedulaDigits ? `Cédula terminada en ${cedulaDigits}` : 'Configura tus 2 dígitos para ver la fecha límite'}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 ml-2 shrink-0 text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white transition-transform duration-200 ${openSections.alerts ? 'rotate-180' : ''}`} />
        </button>

        {openSections.alerts && (
          <div className="space-y-4 pt-1 animate-fadeIn">
            <TaxCalendarAlerts variant="calendar" cedulaDigits={cedulaDigits} setCedulaDigits={(v) => updateSetting('cedulaDigits', v)} fiscalYear={fiscalYear} />
            <TaxCalendarAlerts variant="alerts" alert15Days={alert15Days} setAlert15Days={(v) => updateSetting('alert15Days', v)} alert3Days={alert3Days} setAlert3Days={(v) => updateSetting('alert3Days', v)} alert1Day={alert1Day} setAlert1Day={(v) => updateSetting('alert1Day', v)} enableWebNotifications={enableWebNotifications} setEnableWebNotifications={(v) => updateSetting('enableWebNotifications', v)} onToggleWebNotifications={handleToggleWebNotifications} />
          </div>
        )}
      </div>

      {/* 3. SECCIÓN COLAPSABLE: RUTA Y CHECKLIST DE LA RENTA */}
      <div className="space-y-3">
        <button type="button" onClick={() => toggleSection('checklist')} className="w-full p-3.5 sm:p-4 rounded-2xl border border-white/70 dark:border-white/[0.08] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:bg-white/70 dark:hover:bg-zinc-800/60 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group shadow-xs select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5 stroke-[2.2]" /></div>
            <div className="min-w-0">
              <span className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors block">Ruta y Checklist de la Renta</span>
              <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium">Paso a paso para preparar y presentar tu declaración</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 ml-2 shrink-0 text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white transition-transform duration-200 ${openSections.checklist ? 'rotate-180' : ''}`} />
        </button>

        {openSections.checklist && (
          <div className="pt-1 animate-fadeIn"><TaxChecklistSection checklist={checklist} toggleChecklistStep={toggleChecklistStep} /></div>
        )}
      </div>
    </div>
  );
}
