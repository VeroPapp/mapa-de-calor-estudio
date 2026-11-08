/* ==========================================================================
   Diario de Estudio — mapa de calor
   Funciones puras: no tocan el DOM ni localStorage.
   Se pueden usar desde el navegador (window.Heatmap) y desde Node (require).
   ========================================================================== */
(function (root) {
  'use strict';

  const DAYS_IN_GRID = 365;
  const MONDAY_FIRST = 6; // JS: domingo = 0 → lunes = 0 con (getDay() + 6) % 7

  function calculateIntensity(min) {
    if (min <= 0) return 0;
    if (min <= 30) return 1;
    if (min <= 60) return 2;
    if (min <= 120) return 3;
    return 4;
  }

  const pad2 = (value) => String(value).padStart(2, '0');

  function toKey(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function fromKey(key) {
    const [year, month, day] = String(key).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Devuelve los últimos 365 días, del más viejo al más nuevo.
   * Cada día incluye `row` (0 = lunes … 6 = domingo) para que la grilla
   * tenga siempre 7 filas fijas por día de la semana.
   */
  function generateHeatmapGrid(sessions, todayStr) {
    const minutesByDate = Object.create(null);
    for (const session of sessions) {
      if (!session || typeof session.date !== 'string' || !Number.isFinite(session.minutes)) {
        continue;
      }
      minutesByDate[session.date] = (minutesByDate[session.date] || 0) + session.minutes;
    }

    const today = fromKey(todayStr);
    const grid = [];

    for (let i = DAYS_IN_GRID - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const dateStr = toKey(date);
      const minutes = minutesByDate[dateStr] || 0;

      grid.push({
        date: dateStr,
        minutes,
        level: calculateIntensity(minutes),
        row: (date.getDay() + MONDAY_FIRST) % 7,
      });
    }

    return grid;
  }

  const api = { calculateIntensity, generateHeatmapGrid };

  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Heatmap = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
