export const WIDGETS_CONFIG_STORAGE_KEY = 'monety_widgets_config';
export const WIDGETS_ORDER_STORAGE_KEY_V2 = 'monety_widgets_order_v2';

/**
 * Arreglo centralizado y fuente única de verdad para el orden y visibilidad de los widgets
 */
export const DEFAULT_WIDGETS_CONFIG = [
  { 
    id: 'expenses_category', 
    label: 'Tus gastos', 
    name: 'Tus gastos', 
    description: 'Distribución y desglose de gastos por categoría', 
    icon: 'PieChart', 
    visible: true 
  },
  { 
    id: 'weekly_cashflow', 
    label: 'Actividad de gastos', 
    name: 'Actividad de gastos', 
    description: 'Evolución y comparación semanal de gastos', 
    icon: 'Activity', 
    visible: true 
  },
  { 
    id: 'recent_movements', 
    label: 'Últimos movimientos', 
    name: 'Últimos movimientos', 
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
    id: 'investments', 
    label: 'Inversiones', 
    name: 'Inversiones', 
    description: 'Portafolio por banco, capital aportado y rentabilidad neta', 
    icon: 'TrendingUp', 
    visible: false 
  },
  { 
    id: 'debts', 
    label: 'Préstamos y deudas', 
    name: 'Préstamos y deudas', 
    description: 'Montos por cobrar y compromisos por pagar', 
    icon: 'HandCoins', 
    visible: false 
  },
  { 
    id: 'savings_rate', 
    label: 'Tasa de ahorro / Superávit', 
    name: 'Tasa de ahorro / Superávit', 
    description: 'Porcentaje de ahorro y excedente de liquidez libre', 
    icon: 'PiggyBank', 
    visible: false 
  }
];

export const normalizeWidgetId = (id) => {
  if (!id) return '';
  if (id === 'patrimonio' || id === 'patrimonio_total') return 'net_worth';
  if (id === 'inversiones') return 'investments';
  if (id === 'prestamos' || id === 'prestamos_deudas') return 'debts';
  if (id === 'balance') return 'balance_general';
  if (id === 'mis_cuentas' || id === 'accounts') return 'my_accounts';
  if (id === 'saldo_disponible' || id === 'available_balance' || id === 'liquid_balance' || id === 'balance_summary') return 'liquid_balance';
  if (id === 'gastos_categoria' || id === 'charts' || id === 'expenses') return 'expenses_category';
  if (id === 'movimientos_recientes' || id === 'recent_transactions' || id === 'recent') return 'recent_movements';
  if (id === 'pagos_recurrentes' || id === 'recurring') return 'recurring_payments';
  if (id === 'presupuesto_metas') return 'budget';
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
        // Descartar widgets ahora anclados estáticamente o depurados
        if (
          normalizedId === 'liquid_balance' || 
          normalizedId === 'my_accounts' || 
          normalizedId === 'budget' || 
          normalizedId === 'presupuesto_metas'
        ) return null;
        const def = DEFAULT_WIDGETS_CONFIG.find((d) => d.id === normalizedId);
        if (!def) return null;

        const isVisible = typeof item === 'string' 
          ? true 
          : item.visible !== undefined 
            ? Boolean(item.visible) 
            : def.visible;

        return {
          ...def,
          id: normalizedId,
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

    // Garantizar que el bloque analítico de 2 columnas preceda a Movimientos Recientes
    const expIdx = fullConfig.findIndex(w => w.id === 'expenses_category');
    const cashIdx = fullConfig.findIndex(w => w.id === 'weekly_cashflow');
    const recIdx = fullConfig.findIndex(w => w.id === 'recent_movements');
    if (recIdx !== -1 && (recIdx < expIdx || recIdx < cashIdx)) {
      const [recItem] = fullConfig.splice(recIdx, 1);
      const targetIdx = Math.max(
        fullConfig.findIndex(w => w.id === 'weekly_cashflow'),
        fullConfig.findIndex(w => w.id === 'expenses_category')
      );
      if (targetIdx !== -1) {
        fullConfig.splice(targetIdx + 1, 0, recItem);
      } else {
        fullConfig.push(recItem);
      }
    }

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
