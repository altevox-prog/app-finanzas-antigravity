import React from 'react';
import { Plus, CalendarSync, Music, Cloud, Tv, Trash2 } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';

const inputClass = "w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium transition-colors";
const labelClass = "text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1";

export default function ProfileSubscriptionsView({
  subscriptions = [], totalMonthlySubscriptions, formatMoney, showAddSubForm = false,
  setShowAddSubForm, handleCreateSubscription, newSubName = '', setNewSubName,
  newSubAmount = '', setNewSubAmount, newSubBillingDay = 1, setNewSubBillingDay,
  newSubFrequency = 'monthly', setNewSubFrequency, onDeleteSubscription
}) {
  const computedTotalMonthly = totalMonthlySubscriptions !== undefined
    ? totalMonthlySubscriptions
    : subscriptions.reduce((sum, s) => sum + (s.frequency === 'yearly' ? (Number(s.amount) || 0) / 12 : (Number(s.amount) || 0)), 0);

  const getSubFallback = (name, icon, cat) => {
    if (icon === 'Music' || cat === 'Música' || /spotify|apple music|deezer|tidal|music/i.test(name)) return <Music className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    if (icon === 'Cloud' || cat === 'Nube y Datos' || /icloud|google one|drive|dropbox|onedrive/i.test(name)) return <Cloud className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
    if (/netflix|disney|hbo|max|prime|star|paramount|crunchyroll|youtube|tv/i.test(name)) return <Tv className="w-5 h-5 text-purple-500 dark:text-purple-400" />;
    return <CalendarSync className="w-5 h-5 text-slate-600 dark:text-slate-300" />;
  };

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl bg-white dark:bg-[#12141C] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">TOTAL MENSUAL RECURRENTE</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {formatMoney ? formatMoney(computedTotalMonthly) : `$${computedTotalMonthly.toLocaleString()}`}
            </span>
            <span className="text-sm font-normal text-slate-400 dark:text-slate-500">/ mes</span>
          </div>
        </div>
        <button type="button" onClick={() => setShowAddSubForm?.((prev) => !prev)} className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer shrink-0" title={showAddSubForm ? 'Cerrar formulario' : 'Nueva Suscripción'}>
          <Plus className={`w-5 h-5 stroke-[2.5] transition-transform duration-200 ${showAddSubForm ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {showAddSubForm && (
        <form onSubmit={handleCreateSubscription} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 space-y-3.5 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-white/10">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Añadir Pago Recurrente</h4>
            <button type="button" onClick={() => setShowAddSubForm?.(false)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-bold">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Nombre del Servicio *</label>
              <input type="text" placeholder="Ej. Netflix, Spotify, Gimnasio, iCloud..." value={newSubName} onChange={(e) => setNewSubName?.(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Monto ($ COP) *</label>
              <input type="number" placeholder="0" value={newSubAmount} onFocus={(e) => e.target.select()} onChange={(e) => setNewSubAmount?.(e.target.value)} required className={`${inputClass} font-bold tabular-nums`} />
            </div>
            <div>
              <label className={labelClass}>Día de Cobro (1-31) *</label>
              <input type="number" min={1} max={31} value={newSubBillingDay} onChange={(e) => setNewSubBillingDay?.(e.target.value)} required className={`${inputClass} font-bold tabular-nums`} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Frecuencia</label>
              <div className="grid grid-cols-2 gap-2">
                {['monthly', 'yearly'].map((freq) => (
                  <button key={freq} type="button" onClick={() => setNewSubFrequency?.(freq)} className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${newSubFrequency === freq ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                    {freq === 'monthly' ? 'Mensual' : 'Anual'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={() => setShowAddSubForm?.(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer">Guardar Suscripción</button>
          </div>
        </form>
      )}

      {subscriptions.length === 0 ? (
        <div className="py-12 px-4 rounded-2xl bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
            <CalendarSync className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">No tienes suscripciones activas</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto mt-1">Registra tus servicios recurrentes (Netflix, Spotify, gimnasio, software) para monitorear tu gasto mensual automático.</p>
          </div>
          <button type="button" onClick={() => setShowAddSubForm?.(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer">
            <Plus className="w-4 h-4" /><span>Añadir primera suscripción</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 transition-all hover:border-emerald-500/40 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                  <BrandIcon name={sub.name} size={22} fallback={getSubFallback(sub.name, sub.icon, sub.category)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base text-slate-900 dark:text-white truncate">{sub.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Día {sub.billingDay} de cada mes · {sub.frequency === 'yearly' ? 'Cobro Anual' : 'Cobro Mensual'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="font-bold text-base tabular-nums text-slate-900 dark:text-white">{formatMoney ? formatMoney(sub.amount) : `$${Number(sub.amount).toLocaleString()}`}</span>
                <button type="button" onClick={() => onDeleteSubscription?.(sub.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer" title="Eliminar suscripción" aria-label={`Eliminar suscripción ${sub.name}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
