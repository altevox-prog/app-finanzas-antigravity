export const WIDGETS_CONFIG_STORAGE_KEY = 'monety_widgets_config';
export const WIDGETS_ORDER_STORAGE_KEY_V2 = 'monety_widgets_order_v2';

export const DEFAULT_WIDGETS_CONFIG = [
  ['weekly_cashflow', 'Actividad de gastos', 'Evolución y comparación semanal de gastos', 'Activity'],
  ['expenses_category', 'Gastos y movimientos', 'Distribución de gastos y últimos movimientos', 'PieChart'],
  ['debts_loans', 'Préstamos y deudas', 'Montos por cobrar y compromisos por pagar', 'HandCoins'],
  ['investments', 'Inversiones', 'Portafolio por banco, capital aportado y rentabilidad neta', 'TrendingUp'],
  ['recent_movements', 'Movimientos recientes', 'Últimos movimientos con acceso rápido', 'Receipt'],
  ['recurring_payments', 'Pagos recurrentes', 'Suscripciones y gastos fijos al mes', 'CalendarSync'],
  ['savings_rate', 'Metas de ahorro', 'Progreso de metas de ahorro y alcancías', 'PiggyBank'],
  ['budget', 'Presupuesto mensual', 'Progreso y límites del presupuesto mensual y categorías', 'Target']
].map(([id, label, description, icon]) => ({ id, label, name: label, description, icon, visible: true }));

const WIDGET_ID_ALIASES = {
  inversiones: 'investments',
  prestamos: 'debts_loans', prestamos_deudas: 'debts_loans', debts: 'debts_loans',
  gastos_categoria: 'expenses_category', charts: 'expenses_category', expenses: 'expenses_category', tus_gastos: 'expenses_category', donut: 'expenses_category',
  expenses_and_movements: 'expenses_category', gastos_movimientos: 'expenses_category', gastos_y_movimientos: 'expenses_category',
  movimientos_recientes: 'recent_movements', recent_transactions: 'recent_movements', recent: 'recent_movements', transactions: 'recent_movements',
  pagos_recurrentes: 'recurring_payments', recurring: 'recurring_payments',
  tasa_ahorro: 'savings_rate', superavit: 'savings_rate', savings: 'savings_rate', savings_goals: 'savings_rate', metas_ahorro: 'savings_rate', metas: 'savings_rate',
  presupuesto: 'budget', presupuesto_metas: 'budget',
  pill_bar_chart: 'weekly_cashflow', weekly_cashflow_classic: 'weekly_cashflow'
};

export const normalizeWidgetId = (id) => WIDGET_ID_ALIASES[id] || id || '';

const EXCLUDED_IDS = new Set(['liquid_balance', 'accounts', 'my_accounts', 'monthly_net', 'hero_net']);

export const getStoredWidgetsConfig = () => {
  try {
    const saved = localStorage.getItem(WIDGETS_ORDER_STORAGE_KEY_V2) ||
      localStorage.getItem(WIDGETS_CONFIG_STORAGE_KEY) || 
      localStorage.getItem('presu_widget_order') || 
      localStorage.getItem('presu_dashboard_widgets_v1');
    if (!saved) return DEFAULT_WIDGETS_CONFIG;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_WIDGETS_CONFIG;

    const seen = new Set();
    const result = [];
    parsed.forEach((item) => {
      const nid = normalizeWidgetId(typeof item === 'string' ? item : item?.id);
      if (!nid || EXCLUDED_IDS.has(nid) || seen.has(nid)) return;
      const def = DEFAULT_WIDGETS_CONFIG.find((d) => d.id === nid || normalizeWidgetId(d.id) === nid);
      if (!def) return;
      seen.add(nid);
      result.push({
        ...def,
        visible: typeof item === 'string' ? true : item.visible !== undefined ? Boolean(item.visible) : def.visible
      });
    });

    DEFAULT_WIDGETS_CONFIG.forEach((def) => {
      if (!seen.has(def.id)) result.push(def);
    });
    return result;
  } catch (err) {
    console.error('[Monety] Error leyendo monety_widgets_config:', err);
    return DEFAULT_WIDGETS_CONFIG;
  }
};

export const saveStoredWidgetsConfig = async (config, userId = null) => {
  if (!Array.isArray(config)) return;
  let hasChanged = true;
  try {
    const str = JSON.stringify(config);
    if (localStorage.getItem(WIDGETS_CONFIG_STORAGE_KEY) === str) hasChanged = false;
    [WIDGETS_ORDER_STORAGE_KEY_V2, WIDGETS_CONFIG_STORAGE_KEY, 'presu_widget_order', 'presu_dashboard_widgets_v1'].forEach((k) =>
      localStorage.setItem(k, str)
    );

    const userSettingsRaw = localStorage.getItem('user_settings');
    if (userSettingsRaw) {
      try {
        const userSettings = JSON.parse(userSettingsRaw);
        userSettings.dashboard_widgets = config;
        userSettings.widgets_order = config.map((w) => w.id);
        localStorage.setItem('user_settings', JSON.stringify(userSettings));
      } catch {}
    }
  } catch (err) {
    console.error('[Monety] Error guardando monety_widgets_config localmente:', err);
  }

  if (hasChanged && typeof window !== 'undefined') {
    queueMicrotask(() => {
      ['monety_widgets_order_v2_updated', 'monety_widgets_config_updated', 'presu_widget_order_updated'].forEach((ev) =>
        window.dispatchEvent(new CustomEvent(ev, { detail: config }))
      );
    });
  }
};
