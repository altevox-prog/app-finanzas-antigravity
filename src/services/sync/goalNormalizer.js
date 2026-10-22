const safeNum = (v, fb = 0) => { const n = Number(v); return isNaN(n) ? fb : n; };

export function normalizeRemoteGoal(g) {
  if (!g || typeof g !== 'object') return null;
  const rawDate = g.deadline || g.target_date || g.dueDate || '';
  let safeDate = '';
  if (rawDate) { try { safeDate = new Date(rawDate).toISOString().split('T')[0]; } catch { safeDate = String(rawDate).split('T')[0]; } }
  const target = safeNum(g.target_amount ?? g.targetAmount), current = safeNum(g.current_amount ?? g.currentAmount);
  const targetAccId = g.target_account_id || g.targetAccountId || null, notifDay = safeNum(g.notification_day ?? g.notificationDay, 15);
  const notifyEnabled = Boolean(g.notify_enabled !== undefined ? g.notify_enabled : (g.notifyEnabled !== undefined ? g.notifyEnabled : true));

  return {
    ...g, id: String(g.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `goal-${Date.now()}`)),
    user_id: g.user_id, name: (g.name || 'Nueva Meta').trim(), target_amount: target, targetAmount: target, current_amount: current, currentAmount: current,
    deadline: safeDate, target_date: safeDate, dueDate: safeDate, icon: g.icon || 'Target', color: g.color || '#10B981',
    target_account_id: targetAccId, targetAccountId: targetAccId, months: safeNum(g.months, 6), notification_day: notifDay, notificationDay: notifDay,
    notify_enabled: notifyEnabled, notifyEnabled, created_at: g.created_at || new Date().toISOString(), updated_at: g.updated_at || new Date().toISOString()
  };
}
