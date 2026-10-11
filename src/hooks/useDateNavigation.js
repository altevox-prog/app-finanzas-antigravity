import { useState, useMemo, useCallback } from 'react';
import { MONTH_NAMES } from '../data/initialData';

/**
 * useDateNavigation
 * Hook personalizado para la gestión y navegación de fechas de la aplicación:
 * - Fecha seleccionada (selectedDate), mes (selectedMonth) y año (selectedYear).
 * - Selección de día específico (selectedDay) o null para mes completo.
 * - Control de visibilidad del selector de mes (showMonthPicker).
 * - Acciones de avance/retroceso de mes (handlePrevMonth, handleNextMonth).
 * - Reseteo a la fecha actual (handleResetToToday).
 * - Cambio manual de mes (handleChangeMonth).
 * - Etiqueta de mes formateada (currentMonthLabel).
 */
export function useDateNavigation(initialDate = new Date()) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return initialDate instanceof Date ? initialDate : new Date();
  });
  const [selectedDay, setSelectedDay] = useState(null); // 'YYYY-MM-DD' or null for whole month
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Valores derivados de la fecha seleccionada
  const selectedYear = useMemo(() => {
    return selectedDate instanceof Date ? selectedDate.getFullYear() : new Date().getFullYear();
  }, [selectedDate]);

  const selectedMonth = useMemo(() => {
    return selectedDate instanceof Date ? selectedDate.getMonth() : new Date().getMonth();
  }, [selectedDate]);

  const filterMode = selectedDay ? 'day' : 'month';

  const currentMonthLabel = useMemo(() => {
    return `${MONTH_NAMES[selectedMonth] || ''} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  // Funciones de navegación de mes
  const handlePrevMonth = useCallback((e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    setSelectedDate((prev) => {
      const current = prev instanceof Date ? prev : new Date();
      return new Date(current.getFullYear(), current.getMonth() - 1, 1);
    });
    setSelectedDay(null);
  }, []);

  const handleNextMonth = useCallback((e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    setSelectedDate((prev) => {
      const current = prev instanceof Date ? prev : new Date();
      return new Date(current.getFullYear(), current.getMonth() + 1, 1);
    });
    setSelectedDay(null);
  }, []);

  const handleResetToToday = useCallback(() => {
    setSelectedDate(new Date());
    setSelectedDay(null);
  }, []);

  const handleChangeMonth = useCallback((newDate) => {
    if (newDate instanceof Date) {
      setSelectedDate(newDate);
    } else if (typeof newDate === 'string' || typeof newDate === 'number') {
      setSelectedDate(new Date(newDate));
    }
    setSelectedDay(null);
  }, []);

  const handleSelectDay = useCallback((day) => {
    setSelectedDay(day);
  }, []);

  const handleClearSelectedDay = useCallback(() => {
    setSelectedDay(null);
  }, []);

  return {
    selectedDate,
    setSelectedDate,
    selectedMonth,
    selectedYear,
    selectedDay,
    setSelectedDay,
    filterMode,
    showMonthPicker,
    setShowMonthPicker,
    currentMonthLabel,
    handlePrevMonth,
    handleNextMonth,
    handleResetToToday,
    handleChangeMonth,
    handleSelectDay,
    handleClearSelectedDay
  };
}

export default useDateNavigation;
