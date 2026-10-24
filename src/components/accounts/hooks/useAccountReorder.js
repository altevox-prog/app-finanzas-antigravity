import { useState, useRef, useCallback } from 'react';

export default function useAccountReorder({ localAccounts, setLocalAccounts, localAccountsRef, onReorderAccounts, readOnly }) {
  const [isReordering, setIsReordering] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const longPressTimerRef = useRef(null), draggedIndexRef = useRef(null), touchStartPosRef = useRef({ x: 0, y: 0 });

  const swapAccounts = useCallback((fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= localAccounts.length || fromIdx === toIdx) return;
    setLocalAccounts((prev) => {
      const updated = [...prev], [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      localAccountsRef.current = updated;
      return updated;
    });
    draggedIndexRef.current = toIdx;
    setDraggingIndex(toIdx);
  }, [localAccounts.length, setLocalAccounts, localAccountsRef]);

  const cancelPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePressStart = useCallback((e, idx) => {
    if (readOnly || e.target.closest('button')) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX, clientY = e.touches ? e.touches[0].clientY : e.clientY;
    touchStartPosRef.current = { x: clientX, y: clientY };
    draggedIndexRef.current = idx;
    cancelPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      setIsReordering(true);
      setDraggingIndex(idx);
      navigator?.vibrate?.(40);
    }, 400);
  }, [readOnly, cancelPressTimer]);

  const handlePressMove = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX, clientY = e.touches ? e.touches[0].clientY : e.clientY;
    if (!isReordering) {
      if (Math.hypot(clientX - touchStartPosRef.current.x, clientY - touchStartPosRef.current.y) > 10) cancelPressTimer();
      return;
    }
    if (e.cancelable && e.touches) e.preventDefault();
    if (draggedIndexRef.current === null) return;
    const targetIdx = Number(document.elementFromPoint(clientX, clientY)?.closest('[data-account-index]')?.dataset?.accountIndex);
    if (!isNaN(targetIdx) && targetIdx !== draggedIndexRef.current) swapAccounts(draggedIndexRef.current, targetIdx);
  }, [isReordering, cancelPressTimer, swapAccounts]);

  const handlePressEnd = useCallback(() => {
    cancelPressTimer();
    setDraggingIndex(null);
    draggedIndexRef.current = null;
  }, [cancelPressTimer]);

  const handleConfirmReorder = useCallback(() => {
    setIsReordering(false);
    if (onReorderAccounts) onReorderAccounts(localAccountsRef.current);
  }, [onReorderAccounts, localAccountsRef]);

  return {
    isReordering, setIsReordering, draggingIndex, draggedIndexRef,
    swapAccounts, handlePressStart, handlePressMove, handlePressEnd, handleConfirmReorder
  };
}
