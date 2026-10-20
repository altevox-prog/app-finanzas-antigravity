import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  getStoredWidgetsConfig, 
  saveStoredWidgetsConfig,
  normalizeWidgetId,
  DEFAULT_WIDGETS_CONFIG 
} from '../utils/widgetsConfig';

const VETOED_IDS = new Set([
  'accounts', 'my_accounts', 'liquid_balance', 'available_balance', 
  'monthly_net', 'hero_net', 'neto_mes', 'net_month', 'trm', 'trm_oficial'
]);

export function useWidgetReorder({
  widgetsConfig = null,
  widgetsProp = null,
  allowedWidgetIds = null,
  onSaveWidgets = null,
  getWidget = null
} = {}) {
  const [widgets, setWidgets] = useState(() => {
    const stored = getStoredWidgetsConfig();
    if (Array.isArray(stored) && stored.length > 0) return stored;
    const candidate = widgetsConfig || widgetsProp;
    return (Array.isArray(candidate) && candidate.length > 0) ? candidate : DEFAULT_WIDGETS_CONFIG;
  });

  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const longPressTimerRef = useRef(null);
  const pressedIndexRef = useRef(null);
  const draggedIndexRef = useRef(null);
  const widgetsRef = useRef(widgets);
  const isReorderingRef = useRef(isReordering);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => { widgetsRef.current = widgets; }, [widgets]);
  useEffect(() => { isReorderingRef.current = isReordering; }, [isReordering]);

  const persistOrder = useCallback((updated) => {
    widgetsRef.current = updated;
    setWidgets(updated);
    try { localStorage.setItem('monety_widgets_order_v2', JSON.stringify(updated)); } catch (_) {}
    saveStoredWidgetsConfig(updated, null);
    onSaveWidgets?.(updated);
  }, [onSaveWidgets]);

  const handlePressStart = useCallback((index = null) => {
    if (isReorderingRef.current) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    pressedIndexRef.current = index;
    longPressTimerRef.current = setTimeout(() => {
      setIsReordering(true);
      if (pressedIndexRef.current !== null && pressedIndexRef.current !== undefined) {
        draggedIndexRef.current = pressedIndexRef.current;
        setDraggedIndex(pressedIndexRef.current);
      }
    }, 500);
  }, []);

  const handlePressEnd = useCallback(() => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    pressedIndexRef.current = null;
  }, []);

  const handleSwapWidgets = useCallback((targetIndex) => {
    const fromIdx = draggedIndexRef.current;
    if (fromIdx === null || fromIdx === undefined || fromIdx === targetIndex) return;

    const visibleList = widgetsRef.current.filter(w => (!w.visible || w.hidden) ? false : (!VETOED_IDS.has(normalizeWidgetId(w.id)) && !VETOED_IDS.has(w.id) && (getWidget ? Boolean(getWidget(w.id)) : true)));
    const source = visibleList[fromIdx];
    const target = visibleList[targetIndex];
    if (!source || !target || source.id === target.id) return;

    const fromReal = widgetsRef.current.findIndex(w => w.id === source.id);
    const toReal = widgetsRef.current.findIndex(w => w.id === target.id);
    if (fromReal === -1 || toReal === -1) return;

    const updated = [...widgetsRef.current];
    const [moved] = updated.splice(fromReal, 1);
    updated.splice(toReal, 0, moved);

    draggedIndexRef.current = targetIndex;
    setDraggedIndex(targetIndex);
    persistOrder(updated);
  }, [getWidget, persistOrder]);

  const handleDragStart = useCallback((e, index) => {
    if (!isReorderingRef.current) return;
    draggedIndexRef.current = index;
    setDraggedIndex(index);
    if (e?.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, targetIndex) => {
    if (!isReorderingRef.current) return;
    if (e) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }
    handleSwapWidgets(targetIndex);
  }, [handleSwapWidgets]);

  const handleDrop = useCallback((e) => {
    if (e) e.preventDefault();
    draggedIndexRef.current = null;
    setDraggedIndex(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    draggedIndexRef.current = null;
    setDraggedIndex(null);
  }, []);

  const handleTouchStart = useCallback((e, index) => {
    if (e?.target?.closest?.('button, a, input, select, textarea, [data-no-drag]')) return;
    if (e?.touches?.[0]) touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (isReorderingRef.current) {
      draggedIndexRef.current = index;
      setDraggedIndex(index);
    } else {
      handlePressStart(index);
    }
  }, [handlePressStart]);

  const handleTouchMove = useCallback((e) => {
    if (!isReorderingRef.current) {
      if (touchStartPosRef.current && e?.touches?.[0]) {
        if (Math.hypot(e.touches[0].clientX - touchStartPosRef.current.x, e.touches[0].clientY - touchStartPosRef.current.y) > 10) handlePressEnd();
      }
      return;
    }
    const touch = e?.touches?.[0];
    if (!touch || draggedIndexRef.current === null) return;
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-widget-index]');
    if (!targetEl) return;
    const targetIdx = Number(targetEl.getAttribute('data-widget-index'));
    if (!isNaN(targetIdx) && targetIdx !== draggedIndexRef.current) handleSwapWidgets(targetIdx);
  }, [handlePressEnd, handleSwapWidgets]);

  const handleTouchEnd = useCallback(() => {
    handlePressEnd();
    if (isReorderingRef.current) {
      draggedIndexRef.current = null;
      setDraggedIndex(null);
    }
  }, [handlePressEnd]);

  const handleFinishReordering = useCallback(() => {
    setIsReordering(false);
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    pressedIndexRef.current = null;
  }, []);

  const handleToggleVisibility = useCallback((e, widgetId, newVisible) => {
    e?.stopPropagation?.();
    const normTarget = normalizeWidgetId(widgetId);
    let updated = widgetsRef.current.map(w => (w.id === widgetId || normalizeWidgetId(w.id) === normTarget) ? { ...w, visible: Boolean(newVisible), hidden: !newVisible } : w);

    if (newVisible && !updated.some(w => w.id === widgetId || normalizeWidgetId(w.id) === normTarget)) {
      const def = DEFAULT_WIDGETS_CONFIG.find(dw => dw.id === widgetId || normalizeWidgetId(dw.id) === normTarget);
      if (def) updated.push({ ...def, visible: true, hidden: false });
    }
    persistOrder(updated);
  }, [persistOrder]);

  const visibleWidgets = useMemo(() => {
    return widgets.filter(w => {
      if (!w.visible || w.hidden) return false;
      const norm = normalizeWidgetId(w.id);
      if (VETOED_IDS.has(norm) || VETOED_IDS.has(w.id)) return false;
      if (allowedWidgetIds && !allowedWidgetIds.includes(norm) && !allowedWidgetIds.includes(w.id)) return false;
      return getWidget ? Boolean(getWidget(w.id)) : true;
    });
  }, [widgets, allowedWidgetIds, getWidget]);

  const hiddenWidgets = useMemo(() => {
    const visibleNormIds = new Set(visibleWidgets.map(w => normalizeWidgetId(w.id)));
    const allDefs = (Array.isArray(widgets) && widgets.length > 0) ? widgets : DEFAULT_WIDGETS_CONFIG;
    const result = [];
    const seen = new Set();

    [...allDefs, ...DEFAULT_WIDGETS_CONFIG].forEach(w => {
      const norm = normalizeWidgetId(w.id);
      if (VETOED_IDS.has(norm) || VETOED_IDS.has(w.id) || seen.has(norm)) return;
      if (allowedWidgetIds && !allowedWidgetIds.includes(norm)) return;
      if (!w.visible || w.hidden || !visibleNormIds.has(norm)) {
        seen.add(norm);
        result.push({ ...w, visible: false, hidden: true });
      }
    });
    return result;
  }, [widgets, visibleWidgets, allowedWidgetIds]);

  return {
    widgets,
    orderedWidgets: widgets,
    setWidgets,
    visibleWidgets,
    hiddenWidgets,
    isReordering,
    setIsReordering,
    draggedIndex,
    setDraggedIndex,
    isDragging: draggedIndex !== null && draggedIndex !== undefined,
    handlePressStart,
    handlePressEnd,
    handleSwapWidgets,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleFinishReordering,
    handleToggleVisibility,
    longPressTimerRef,
    pressedIndexRef,
    draggedIndexRef,
    widgetsRef,
    isReorderingRef,
    touchStartPosRef
  };
}

export default useWidgetReorder;
