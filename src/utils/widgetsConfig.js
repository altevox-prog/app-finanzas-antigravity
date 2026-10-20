export const WIDGETS_CONFIG_STORAGE_KEY = 'monety_widgets_config';
export const WIDGETS_ORDER_STORAGE_KEY_V2 = 'monety_widgets_order_v2';

/**
 * Arreglo centralizado y fuente única de verdad para el orden y visibilidad de los widgets
 */
export const DEFAULT_WIDGETS_CONFIG = [
  { 
    id: 'weekly_cashflow', 
    label: 'Actividad de gastos', 
    name: 'Actividad de gastos', 
    description: 'Evolución y comparación semanal de gastos', 
    icon: 'Activity', 
    visible: true 
  },
  { 
    id: 'expenses_category', 
    label: 'Tus gastos', 
    name: 'Tus gastos', 
    description: 'Distribución y desglose de gastos por categoría', 
    icon: 'PieChart', 
    visible: true 
  },
  { 
    id: 'debts_loans', 
    label: 'Préstamos y deudas', 
    name: 'Préstamos y deudas', 
    description: 'Montos por cobrar y compromisos por pagar', 
    icon: 'HandCoins', 
    visible: true 
  },
  { 
    id: 'investments', 
    label: 'Inversiones', 
    name: 'Inversiones', 
    description: 'Portafolio por banco, capital aportado y rentabilidad neta', 
    icon: 'TrendingUp', 
    visible: true 
  },
  { 
    id: 'recent_movements', 
    label: 'Movimientos recientes', 
    name: 'Movimientos recientes', 
    description: 'Últimos movimientos con acceso rápido', 
    icon: 'Receipt', 
    visible: true 
  },
  { 
    id: 'recurring_payments', 
    label: 'Pagos recurrentes', 
    name: 'Pagos recurrentes', 
    description: 'Suscripciones y gastos fijos al mes', 
    icon: 'CalendarSync', 
    visible: false 
  },
  { 
    id: 'savings_rate', 
    label: 'Tasa de ahorro / Superávit', 
    name: 'Tasa de ahorro / Superávit', 
    description: 'Porcentaje de ahorro y excedente de liquidez libre', 
    icon: 'PiggyBank', 
    visible: false 
  },
  { 
    id: 'budget', 
    label: 'Presupuesto mensual', 
    name: 'Presupuesto mensual', 
    description: 'Progreso y límites del presupuesto mensual y categorías', 
    icon: 'Target', 
    visible: false 
  }
];

export const normalizeWidgetId = (id) => {
  if (!id) return '';
  if (id === 'patrimonio' || id === 'patrimonio_total') return 'net_worth';
  if (id === 'inversiones') return 'investments';
  if (id === 'prestamos' || id === 'prestamos_deudas' || id === 'debts') return 'debts_loans';
  if (id === 'balance') return 'balance_general';
  if (id === 'mis_cuentas' || id === 'my_accounts') return 'accounts';
  if (id === 'saldo_disponible' || id === 'available_balance' || id === 'liquid_balance' || id === 'balance_summary') return 'liquid_balance';
  if (id === 'gastos_categoria' || id === 'charts' || id === 'expenses') return 'expenses_category';
  if (id === 'movimientos_recientes' || id === 'recent_transactions' || id === 'recent') return 'recent_movements';
  if (id === 'pagos_recurrentes' || id === 'recurring') return 'recurring_payments';
  if (id === 'presupuesto_metas') return 'budget';
  if (id === 'hero_net' || id === 'net_month') return 'monthly_net';
  if (id === 'bento') return 'bento_metrics';
  if (id === 'pill_bar_chart') return 'weekly_cashflow';
  return id;
};

/**
 * Obtiene la configuración de widgets desde localStorage asegurando consistencia con DEFAULT_WIDGETS_CONFIG
 */
export const getStoredWidgetsConfig = () => {
  try {
    const saved = 
      localStorage.getItem(WIDGETS_ORDER_STORAGE_KEY_V2) ||
      localStorage.getItem(WIDGETS_CONFIG_STORAGE_KEY) || 
      localStorage.getItem('presu_widget_order') || 
      localStorage.getItem('presu_dashboard_widgets_v1');

    if (!saved) return DEFAULT_WIDGETS_CONFIG;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_WIDGETS_CONFIG;

    const validSaved = parsed
      .map((item) => {
        const rawId = typeof item === 'string' ? item : item.id;
        const normalizedId = normalizeWidgetId(rawId);
        // Descartar widgets anclados permanentemente en cabecera o de balance
        if (
          normalizedId === 'liquid_balance' ||
          normalizedId === 'accounts' ||
          normalizedId === 'my_accounts' ||
          normalizedId === 'monthly_net' ||
          normalizedId === 'hero_net'
        ) return null;
        const def = DEFAULT_WIDGETS_CONFIG.find((d) => d.id === normalizedId || normalizeWidgetId(d.id) === normalizedId);
        if (!def) return null;

        const isVisible = typeof item === 'string' 
          ? true 
          : item.visible !== undefined 
            ? Boolean(item.visible) 
            : def.visible;

        return {
          ...def,
          id: def.id,
          label: def.label,
          name: def.name,
          description: def.description,
          icon: def.icon,
          visible: isVisible
        };
      })
      .filter(Boolean);

    // Deduplicate in case normalizeWidgetId mapped to same id
    const seen = new Set();
    const dedupedSaved = [];
    for (const item of validSaved) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        dedupedSaved.push(item);
      }
    }

    // Agregar widgets faltantes del default que no estuvieran en el guardado previo
    const missing = DEFAULT_WIDGETS_CONFIG.filter(
      (def) => !seen.has(def.id)
    );

    const fullConfig = [...dedupedSaved, ...missing];
    return fullConfig;
  } catch (err) {
    console.error('[Monety] Error leyendo monety_widgets_config:', err);
    return DEFAULT_WIDGETS_CONFIG;
  }
};

/**
 * Guarda y sincroniza la configuración de widgets en localStorage y Supabase profiles
 */
export const saveStoredWidgetsConfig = async (config, userId = null) => {
  if (!Array.isArray(config)) return;

  let hasChanged = true;
  try {
    const str = JSON.stringify(config);
    const existing = localStorage.getItem(WIDGETS_CONFIG_STORAGE_KEY);
    if (existing === str) {
      hasChanged = false;
    }
    localStorage.setItem(WIDGETS_ORDER_STORAGE_KEY_V2, str);
    localStorage.setItem(WIDGETS_CONFIG_STORAGE_KEY, str);
    localStorage.setItem('presu_widget_order', str);
    localStorage.setItem('presu_dashboard_widgets_v1', str);

    // Sincronizar dentro del objeto consolidado user_settings si existe
    const userSettingsRaw = localStorage.getItem('user_settings');
    if (userSettingsRaw) {
      try {
        const userSettings = JSON.parse(userSettingsRaw);
        userSettings.dashboard_widgets = config;
        userSettings.widgets_order = config.map(w => w.id);
        localStorage.setItem('user_settings', JSON.stringify(userSettings));
      } catch (_) {}
    }
  } catch (err) {
    console.error('[Monety] Error guardando monety_widgets_config localmente:', err);
  }

  // Notificar al Dashboard y componentes en vivo solo si hubo cambios reales (desacoplado del ciclo de render sincrónico)
  if (hasChanged && typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('monety_widgets_order_v2_updated', { detail: config }));
      window.dispatchEvent(new CustomEvent('monety_widgets_config_updated', { detail: config }));
      window.dispatchEvent(new CustomEvent('presu_widget_order_updated', { detail: config }));
    });
  }
};
