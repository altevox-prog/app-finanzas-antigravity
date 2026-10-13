import React, { useState } from 'react';
import { 
  CreditCard, 
  Zap, 
  Bell, 
  ChevronLeft, 
  ArrowRight, 
  Sparkles 
} from 'lucide-react';

const SLIDES = [
  {
    id: 'accounts',
    title: 'Centraliza tus Cuentas',
    description: 'Registra tu efectivo, cuentas de ahorros y tarjetas de crédito con fechas de corte y cupos en tiempo real.',
    icon: CreditCard,
    iconGradient: 'from-blue-600 to-indigo-500 shadow-blue-500/25',
    tags: ['Bancos y Billeteras', 'Tarjetas de Crédito', 'Saldos en Vivo']
  },
  {
    id: 'transactions',
    title: 'Registros en Segundos',
    description: 'Usa el botón central para registrar compras, ingresos o transferencias al instante con categorías claras.',
    icon: Zap,
    iconGradient: 'from-emerald-500 to-teal-400 shadow-emerald-500/25',
    tags: ['Botón Central +', 'Auto-categorías', 'Control Diario']
  },
  {
    id: 'subscriptions',
    title: 'Fechas de Corte y Presupuestos',
    description: 'Recibe avisos antes de que venzan tus tarjetas o suscripciones recurrentes para no pagar intereses.',
    icon: Bell,
    iconGradient: 'from-amber-500 to-rose-500 shadow-amber-500/25',
    tags: ['Alertas Preventivas', 'Suscripciones Fijas', 'Límites Mensuales']
  }
];

/**
 * StepTutorial
 * Componente modular para el carrusel interactivo del tutorial (Fase 2 de Onboarding).
 * Incluye navegación por diapositivas, indicadores de puntos y llamada de finalización.
 */
export default function StepTutorial({
  tutorialOnly = false,
  onBack,
  onFinish
}) {
  const [activeSlide, setActiveSlide] = useState(0);

  const current = SLIDES[activeSlide];
  const IconComponent = current.icon;

  return (
    <div className="flex-1 flex flex-col justify-between relative z-10 space-y-6">
      {/* Cabecera del Tutorial con Volver (si no es tutorialOnly) */}
      <div className="flex items-center justify-between">
        {!tutorialOnly ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Atrás</span>
          </button>
        ) : (
          <div />
        )}

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#007AFF] text-[11px] font-bold uppercase tracking-wider">
          <span>Tutorial</span>
          <span className="opacity-50">·</span>
          <span>{activeSlide + 1} de {SLIDES.length}</span>
        </div>

        <div className="w-10" />
      </div>

      {/* Contenido de la Diapositiva Activa */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-4">
        <div key={current.id} className="animate-fadeIn space-y-4 max-w-sm">
          {/* Icono animado */}
          <div className={`w-20 h-20 rounded-3xl bg-gradient-to-tr ${current.iconGradient} flex items-center justify-center text-white shadow-xl mx-auto transition-transform hover:scale-105 duration-300`}>
            <IconComponent className="w-10 h-10" />
          </div>

          {/* Título y Descripción */}
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {current.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Píldoras / Tags de características */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {current.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Navegación y Acciones del Tutorial en flujo natural */}
      <div className="mt-8 space-y-4">
        {/* Indicadores de Puntos (Dots) */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSlide(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                activeSlide === idx
                  ? 'w-7 bg-emerald-500'
                  : 'w-2 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40'
              }`}
              title={`Ir a diapositiva ${idx + 1}`}
            />
          ))}
        </div>

        {/* Botón Principal */}
        {activeSlide < SLIDES.length - 1 ? (
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => Math.min(SLIDES.length - 1, prev + 1))}
            className="w-full py-3.5 px-4 bg-[#007AFF] hover:bg-blue-600 active:scale-95 text-white font-semibold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Siguiente</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onFinish}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 active:scale-95 text-white font-semibold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              Finalizar tutorial
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
