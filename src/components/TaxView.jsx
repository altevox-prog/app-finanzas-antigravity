import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Building2,
  ExternalLink,
  ChevronRight,
  Bell,
  CalendarSync,
  AlertTriangle
} from 'lucide-react';
import TaxChecklistSection from './taxes/TaxChecklistSection';
import { usePrivacy } from '../context/PrivacyContext';
import {
  UVT_VALUES,
  TAX_THRESHOLDS_UVT,
  getDueDateForDigits,
  calculateTaxMetrics
} from '../utils/taxUtils';

const STORAGE_KEY = 'tax_profile_settings';

export default function TaxView({
  transactions = [],
  accounts = [],
  investments = [],
  onBack,
  onClose,
  fromSettings = false,
  previousView
}) {
  const { formatMoney } = usePrivacy();

  const handleBackAction = () => {
    if (onBack) {
      onBack();
    } else if (onClose) {
      onClose();
    } else if (fromSettings || previousView === 'settings') {
      if (typeof window !== 'undefined' && window.history.length > 2) {
        window.history.back();
      }
    } else if (typeof window !== 'undefined' && window.history.length > 2) {
      window.history.back();
    }
  };

  // Carga de configuración inicial persistida en localStorage
  const [savedSettings, setSavedSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error cargando tax_profile_settings:', e);
    }
    return {
      cedulaDigits: '',
      fiscalYear: new Date().getFullYear() - 1, // Año gravable anterior por defecto
      alert15Days: true,
      alert3Days: true,
      alert1Day: true,
      enableWebNotifications: false,
      showDashboardBanner: true,
      checklist: {}
    };
  });

  const [cedulaDigits, setCedulaDigits] = useState(savedSettings.cedulaDigits || '');
  const [fiscalYear, setFiscalYear] = useState(savedSettings.fiscalYear || (new Date().getFullYear() - 1));
  const [alert15Days, setAlert15Days] = useState(savedSettings.alert15Days ?? true);
  const [alert3Days, setAlert3Days] = useState(savedSettings.alert3Days ?? true);
  const [alert1Day, setAlert1Day] = useState(savedSettings.alert1Day ?? true);
  const [enableWebNotifications, setEnableWebNotifications] = useState(savedSettings.enableWebNotifications ?? false);
  const [checklist, setChecklist] = useState(savedSettings.checklist || {});

  // Persistir cambios en localStorage cada vez que cambien los estados clave
  useEffect(() => {
    const updated = {
      cedulaDigits,
      fiscalYear,
      alert15Days,
      alert3Days,
      alert1Day,
      enableWebNotifications,
      checklist
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error guardando tax_profile_settings:', e);
    }
  }, [cedulaDigits, fiscalYear, alert15Days, alert3Days, alert1Day, enableWebNotifications, checklist]);

  // Manejador del input de 2 dígitos de cédula
  const handleDigitsChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setCedulaDigits(val);
  };

  // Cálculo de vencimiento DIAN según los dígitos
  const dueDateInfo = useMemo(() => {
    if (!cedulaDigits || cedulaDigits.length === 0) return null;
    return getDueDateForDigits(cedulaDigits, fiscalYear + 1);
  }, [cedulaDigits, fiscalYear]);

  // Valor UVT para el año fiscal
  const uvtValue = UVT_VALUES[fiscalYear] || UVT_VALUES[2024] || 47065;

  // Cálculo de topes con transacciones reales
  const taxMetrics = useMemo(() => {
    return calculateTaxMetrics({
      transactions,
      accounts,
      investments,
      fiscalYear,
      uvtValue
    });
  }, [transactions, accounts, investments, fiscalYear, uvtValue]);

  // Toggle de pasos del checklist
  const toggleChecklistStep = (stepId) => {
    setChecklist(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  // Permisos para notificaciones web push
  const handleToggleWebNotifications = async () => {
    if (!enableWebNotifications) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            setEnableWebNotifications(true);
          } else {
            alert('Debes habilitar los permisos de notificación en tu navegador.');
          }
        } catch {
          setEnableWebNotifications(false);
        }
      } else {
        alert('Este dispositivo no soporta notificaciones web push.');
      }
    } else {
      setEnableWebNotifications(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn pb-16">
      {/* ============================================================== */}
      {/* 0. BARRA SUPERIOR DE ACCIONES */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between gap-3">
        {(onBack || onClose || fromSettings) ? (
          <button
            type="button"
            onClick={handleBackAction}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 border border-slate-200 dark:border-white/[0.08] shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-500" />
            <span>Volver</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-500" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Impuestos y Declaración de Renta
            </h1>
          </div>
        )}

        {/* Selector de Año Gravable */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 ml-auto">
          <span className="hidden sm:inline">Año gravable:</span>
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none cursor-pointer shadow-sm focus:ring-1 focus:ring-emerald-500"
          >
            <option value={2025}>2025 (Declarar en 2026)</option>
            <option value={2024}>2024 (Declarar en 2025)</option>
            <option value={2023}>2023</option>
          </select>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. CALCULADORA DE VENCIMIENTO DIAN (CABECERA) */}
      {/* ============================================================== */}
      <div className="rounded-2xl p-5 sm:p-7 bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-md transition-all">
        {/* Cabecera de la tarjeta */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CalendarSync className="w-3 h-3" />
              <span>Calendario Tributario DIAN · Personas Naturales</span>
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
              ¿Cuándo vence tu declaración de renta?
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Ingresa los dos últimos dígitos de tu cédula o NIT (sin dígito de verificación):
            </p>
          </div>
        </div>

        {/* Selector Integrado */}
        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={cedulaDigits}
                onChange={handleDigitsChange}
                placeholder="00"
                className="w-24 text-center font-black text-2xl h-12 rounded-xl border-2 border-emerald-500/40 focus:border-emerald-500 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white outline-none transition-all shadow-inner tabular-nums"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200 block">Dígitos finales</span>
              <span>Rango oficial: 00 al 99</span>
            </div>
          </div>

          {/* Accesos rápidos a dígitos de prueba o frecuentes */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-[11px] text-slate-400 font-medium mr-1 hidden sm:inline">Ejemplos:</span>
            {['01', '14', '45', '78', '83', '99'].map((dig) => (
              <button
                key={dig}
                type="button"
                onClick={() => setCedulaDigits(dig)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  cedulaDigits === dig
                    ? 'bg-emerald-600 text-white shadow-sm scale-105'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {dig}
              </button>
            ))}
          </div>
        </div>

        {/* Resultado del cálculo destacado */}
        <div className="mt-5">
          {dueDateInfo ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block">
                  Fecha límite oficial para dígitos {dueDateInfo.digitsFormatted}:
                </span>
                <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white capitalize block">
                  {dueDateInfo.fullDateFormatted}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm ${
                  dueDateInfo.status === 'today'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : dueDateInfo.status === 'passed'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    : 'bg-emerald-600 text-white'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{dueDateInfo.statusText}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
              👆 Ingresa los 2 dígitos finales de tu documento para calcular tu fecha exacta de vencimiento DIAN.
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. BOTÓN DE CONSULTA OFICIAL DIAN */}
      {/* ============================================================== */}
      <a
        href="https://consultarenta.dian.gov.co/consultarenta/"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl transition-all group active:scale-[0.99] shadow-sm dark:shadow-md cursor-pointer"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#007AFF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-blue-500/20">
            <ExternalLink className="w-5 h-5" />
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                Consultar en el portal oficial de la DIAN
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Oficial
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
              Accede a la herramienta '¿Debo declarar renta?' con tu cédula en consultarenta.dian.gov.co
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
      </a>

      {/* ============================================================== */}
      {/* 3. MONITOR DE TOPES DIAN (GRILLA DE 2 COLUMNAS) */}
      {/* ============================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Monitor de Topes DIAN ({fiscalYear})
            </h3>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
            1 UVT = {formatMoney(uvtValue)}
          </span>
        </div>

        {/* Resumen Global / Semáforo Principal */}
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          taxMetrics.mustDeclare
            ? 'bg-rose-500/10 border-rose-500/30'
            : taxMetrics.warningCount > 0
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-emerald-500/10 border-emerald-500/30'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              taxMetrics.mustDeclare
                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                : taxMetrics.warningCount > 0
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
            }`}>
              {taxMetrics.mustDeclare ? (
                <ShieldAlert className="w-6 h-6" />
              ) : taxMetrics.warningCount > 0 ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1 flex-1">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {taxMetrics.mustDeclare
                  ? '🔴 Superaste el tope (Te corresponde declarar renta)'
                  : taxMetrics.warningCount > 0
                  ? '🟡 Cerca del límite en algunos rubros'
                  : '🟢 Dentro del límite legal de los topes DIAN'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {taxMetrics.mustDeclare
                  ? `Has superado ${taxMetrics.exceededCount} de los topes legales de la DIAN con los movimientos registrados en ${fiscalYear}. Debes preparar y presentar tu declaración.`
                  : taxMetrics.warningCount > 0
                  ? `Estás cerca del 75% o más en ${taxMetrics.warningCount} rubros. Supervisa tus próximos movimientos para evitar sobrepasar los límites de forma imprevista.`
                  : `Tus ingresos, consumos y consignaciones registradas para el año ${fiscalYear} están dentro de los márgenes exentos.`}
              </p>
            </div>
          </div>
        </div>

        {/* Cuadrícula de 2 Columnas para los Topes DIAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {taxMetrics.items.map((item, idx) => {
            const isDanger = item.percentage >= 100;
            const isWarning = item.percentage >= 75 && !isDanger;

            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-md flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-white/20 transition-all"
              >
                {/* Cabecera de la tarjeta del tope */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {item.title}
                    </h5>
                    {isDanger ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 shrink-0">
                        🔴 Tope superado
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
                        🟡 Cerca del límite
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                        🟢 Dentro del límite
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
                    {item.description}
                  </p>
                </div>

                {/* Monto registrado vs Tope oficial */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-baseline justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Monto registrado:</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {formatMoney(item.amount)}
                      </span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                        Tope ({item.thresholdUVT.toLocaleString('es-CO')} UVT):
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                        {formatMoney(item.limitAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>Progreso acumulado</span>
                      <span className={`font-bold ${isDanger ? 'text-rose-600 dark:text-rose-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. PLAN DE RECORDATORIOS Y ALERTAS */}
      {/* ============================================================== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Bell className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Plan de Recordatorios y Alertas
          </h3>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] space-y-3.5 shadow-sm dark:shadow-md">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Recibe avisos antes de tu fecha límite para evitar sanciones por extemporaneidad de la DIAN:
          </p>

          <div className="space-y-2.5">
            {/* 15 días antes */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs font-mono border border-emerald-500/20">
                  15d
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Alerta 15 días antes</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Tiempo ideal para recopilar extractos y soportes</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={alert15Days}
                  onChange={(e) => setAlert15Days(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {/* 3 días antes */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs font-mono border border-amber-500/20">
                  3d
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Alerta 3 días antes</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Confirmación de borrador y firma digital</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={alert3Days}
                  onChange={(e) => setAlert3Days(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {/* 1 día antes */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs font-mono border border-rose-500/20">
                  1d
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Alerta urgente 1 día antes</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Última oportunidad para presentar a tiempo</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={alert1Day}
                  onChange={(e) => setAlert1Day(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {/* Switch Notificaciones Web */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Notificaciones Web Push / PWA</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Recibir avisos directos en el celular o navegador</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableWebNotifications}
                  onChange={handleToggleWebNotifications}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. RUTA Y CHECKLIST DE LA RENTA */}
      {/* ============================================================== */}
      <TaxChecklistSection
        checklist={checklist}
        toggleChecklistStep={toggleChecklistStep}
      />
    </div>
  );
}
