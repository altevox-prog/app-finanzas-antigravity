export const WIDGETS_CONFIG_STORAGE_KEY = 'monety_widgets_config';
export const WIDGETS_ORDER_STORAGE_KEY_V2 = 'monety_widgets_order_v5';

export const DEFAULT_WIDGETS_CONFIG = [
  ['expenses_category', 'Gastos y movimientos', 'Distribución de gastos y últimos movimientos', 'PieChart'],
  ['weekly_cashflow', 'Actividad de gastos', 'Evolución y comparación semanal de gastos', 'Activity'],
  ['savings_goals', 'Metas de ahorro', 'Progreso de metas de ahorro y alcancías', 'PiggyBank'],
  ['recurring_payments', 'Pagos recurrentes', 'Suscripciones y gastos fijos al mes', 'CalendarSync'],
  ['debts_and_budget', 'Préstamos y presupuesto', 'Compromisos financieros y límites de presupuesto', 'HandCoins'],
  ['investments', 'Inversiones', 'Portafolio por banco, capital aportado y rentabilidad neta', 'TrendingUp']
].map(([id, label, description, icon, visible = true]) => ({ id, label, name: label, description, icon, visible }));

const WIDGET_ID_ALIASES = {
  inversiones: 'investments',
  prestamos: 'debts_and_budget', prestamos_deudas: 'debts_and_budget', debts: 'debts_and_budget', debts_loans: 'debts_and_budget',
  presupuesto: 'debts_and_budget', presupuesto_metas: 'debts_and_budget', budget: 'debts_and_budget', debts_budget: 'debts_and_budget',
  gastos_categoria: 'expenses_category', charts: 'expenses_category', expenses: 'expenses_category', tus_gastos: 'expenses_category', donut: 'expenses_category',
  expenses_and_movements: 'expenses_category', gastos_movimientos: 'expenses_category', gastos_y_movimientos: 'expenses_category',
  pagos_recurrentes: 'recurring_payments', recurring: 'recurring_payments',
  tasa_ahorro: 'savings_goals', superavit: 'savings_goals', savings: 'savings_goals', savings_rate: 'savings_goals', metas_ahorro: 'savings_goals', metas: 'savings_goals',
  pill_bar_chart: 'weekly_cashflow', weekly_cashflow_classic: 'weekly_cashflow'
};

export const normalizeWidgetId = (id) => WIDGET_ID_ALIASES[id] || id || '';

const EXCLUDED_IDS = new Set(['liquid_balance', 'accounts', 'my_accounts', 'monthly_net', 'hero_net', 'recent_movements']);

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
    [WIDGETS_ORDER_STORAGE_KEY_V2, 'monety_widgets_order_v2', WIDGETS_CONFIG_STORAGE_KEY, 'presu_widget_order', 'presu_dashboard_widgets_v1'].forEach((k) =>
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
