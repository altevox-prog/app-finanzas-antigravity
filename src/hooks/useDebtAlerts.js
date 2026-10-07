import { useState, useMemo, useEffect } from 'react';
import { getTomorrowDebtAlerts } from '../utils/debtAlerts';

/**
 * useDebtAlerts
 * Hook para gestión de alertas preventivas de deudas y recordatorios PWA (1 día antes).
 */
export function useDebtAlerts({ debtsAndLoans = [], accounts = [], onNavigateToDebts } = {}) {
  // Sistema de Alertas y Recordatorios Preventivos (1 día antes)
  const [managedAlerts, setManagedAlerts] = useState(() => {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
      const today = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`managed_alerts_${today}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const tomorrowDebtAlerts = useMemo(() => {
    try {
      const all = getTomorrowDebtAlerts(debtsAndLoans || [], accounts || []);
      const managed = Array.isArray(managedAlerts) ? managedAlerts : [];
      return all.filter((a) => a && a.id && !managed.includes(a.id));
    } catch (err) {
      console.warn('Error calculando alertas preventivas:', err);
      return [];
    }
  }, [debtsAndLoans, accounts, managedAlerts]);

  const handleDismissAlert = (alertId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      setManagedAlerts((prev) => {
        const currentList = Array.isArray(prev) ? prev : [];
        const next = [...currentList, alertId];
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`managed_alerts_${today}`, JSON.stringify(next));
          }
        } catch {
          // ignore
        }
        return next;
      });
    } catch (e) {
      console.warn('Error al descartar alerta:', e);
    }
  };

  const handleReviewDebtAlert = (alert) => {
    if (onNavigateToDebts) {
      onNavigateToDebts(alert);
    }
  };

  // Notificaciones del Sistema PWA (1 día antes)
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (!Array.isArray(tomorrowDebtAlerts) || tomorrowDebtAlerts.length === 0) return;

      const todayStr = new Date().toISOString().split('T')[0];

      const dispatchNotifications = async () => {
        try {
          if (typeof Notification === 'undefined') return;

          let permission = Notification.permission;
          if (permission === 'default' && typeof Notification.requestPermission === 'function') {
            try {
              permission = await Notification.requestPermission();
            } catch (permErr) {
              console.warn('No se pudo solicitar permiso de notificación:', permErr);
            }
          }

          if (permission === 'granted') {
            tomorrowDebtAlerts.forEach((alert) => {
              try {
                if (!alert || !alert.id) return;
                const sentKey = `pwa_notif_sent_${todayStr}_${alert.id}`;
                
                let alreadySent = false;
                try {
                  if (typeof localStorage !== 'undefined') {
                    alreadySent = !!localStorage.getItem(sentKey);
                  }
                } catch {
                  alreadySent = false;
                }

                if (alreadySent) return;

                let sentViaSW = false;
                if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker && navigator.serviceWorker.controller) {
                  try {
                    navigator.serviceWorker.controller.postMessage({
                      type: 'SHOW_NOTIFICATION',
                      title: alert.title || 'Recordatorio',
                      options: {
                        body: alert.message || '',
                        icon: '/icon-192x192.png',
                        badge: '/icon-192x192.png',
                        tag: alert.id
                      }
                    });
                    sentViaSW = true;
                  } catch (swErr) {
                    console.warn('No se pudo enviar notificación vía Service Worker:', swErr);
                  }
                }

                if (!sentViaSW && typeof Notification === 'function') {
                  try {
                    new Notification(alert.title || 'Recordatorio', {
                      body: alert.message || '',
                      icon: '/icon-192x192.png'
                    });
                  } catch (directErr) {
                    console.warn('Constructor Notification no disponible directamente:', directErr);
                  }
                }

                try {
                  if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(sentKey, 'true');
                  }
                } catch {
                  // ignore
                }
              } catch (alertErr) {
                console.warn('Error al procesar notificación individual:', alertErr);
              }
            });
          }
        } catch (dispatchErr) {
          console.warn('Error en dispatchNotifications:', dispatchErr);
        }
      };

      dispatchNotifications();
    } catch (effectErr) {
      console.warn('Error en efecto de alertas de deuda:', effectErr);
    }
  }, [tomorrowDebtAlerts]);

  return {
    tomorrowDebtAlerts,
    handleDismissAlert,
    handleReviewDebtAlert
  };
}

export default useDebtAlerts;
