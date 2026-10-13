import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Building2,
  ExternalLink,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import TaxCalendarAlerts from './taxes/TaxCalendarAlerts';
import TaxChecklistSection from './taxes/TaxChecklistSection';
import { usePrivacy } from '../context/PrivacyContext';
import {
  UVT_VALUES,
  TAX_THRESHOLDS_UVT,
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
      <TaxCalendarAlerts
        variant="calendar"
        cedulaDigits={cedulaDigits}
        setCedulaDigits={setCedulaDigits}
        fiscalYear={fiscalYear}
      />

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
      <TaxCalendarAlerts
        variant="alerts"
        alert15Days={alert15Days}
        setAlert15Days={setAlert15Days}
        alert3Days={alert3Days}
        setAlert3Days={setAlert3Days}
        alert1Day={alert1Day}
        setAlert1Day={setAlert1Day}
        enableWebNotifications={enableWebNotifications}
        setEnableWebNotifications={setEnableWebNotifications}
        onToggleWebNotifications={handleToggleWebNotifications}
      />

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
