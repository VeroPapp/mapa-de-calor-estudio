const test = require('node:test');
const assert = require('node:assert');
const { calculateIntensity, generateHeatmapGrid } = require('../js/heatmap.js');

const pad2 = (value) => String(value).padStart(2, '0');
const toKey = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const fromKey = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const shiftKey = (key, days) => {
  const date = fromKey(key);
  return toKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
};

/* ------------------------------ RF-5 ------------------------------ */

test('0 minutos es nivel 0', () => {
  assert.strictEqual(calculateIntensity(0), 0);
});

test('minutos negativos son nivel 0', () => {
  assert.strictEqual(calculateIntensity(-15), 0);
});

test('1 a 30 minutos es nivel 1 (bordes incluidos)', () => {
  assert.strictEqual(calculateIntensity(1), 1);
  assert.strictEqual(calculateIntensity(30), 1);
});

test('31 a 60 minutos es nivel 2 (bordes incluidos)', () => {
  assert.strictEqual(calculateIntensity(31), 2);
  assert.strictEqual(calculateIntensity(60), 2);
});

test('61 a 120 minutos es nivel 3 (bordes incluidos)', () => {
  assert.strictEqual(calculateIntensity(61), 3);
  assert.strictEqual(calculateIntensity(90), 3);
  assert.strictEqual(calculateIntensity(120), 3);
});

test('más de 120 minutos es nivel 4', () => {
  assert.strictEqual(calculateIntensity(121), 4);
  assert.strictEqual(calculateIntensity(600), 4);
});

/* ------------------------------ RF-1 ------------------------------ */

const TODAY = '2026-11-08';

test('la grilla tiene 365 días', () => {
  const grid = generateHeatmapGrid([], TODAY);
  assert.strictEqual(grid.length, 365);
});

test('la grilla va desde hace 364 días hasta hoy', () => {
  const grid = generateHeatmapGrid([], TODAY);
  assert.strictEqual(grid[0].date, '2025-11-09');
  assert.strictEqual(grid[grid.length - 1].date, TODAY);
  assert.strictEqual(shiftKey(TODAY, -364), grid[0].date);
});

test('los 365 días son consecutivos y sin repetidos', () => {
  const grid = generateHeatmapGrid([], TODAY);
  const dates = grid.map((day) => day.date);
  assert.strictEqual(new Set(dates).size, 365);
  for (let i = 1; i < dates.length; i++) {
    assert.strictEqual(dates[i], shiftKey(dates[i - 1], 1));
  }
});

test('la grilla ocupa exactamente 7 filas de días de la semana', () => {
  const grid = generateHeatmapGrid([], TODAY);
  const rows = new Set(grid.map((day) => day.row));
  assert.deepStrictEqual([...rows].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
});

test('cada fila corresponde a su día de la semana (lunes = 0)', () => {
  const grid = generateHeatmapGrid([], TODAY);
  for (const day of grid) {
    const weekday = (fromKey(day.date).getDay() + 6) % 7;
    assert.strictEqual(day.row, weekday, `fila incorrecta para ${day.date}`);
  }
  assert.strictEqual(grid[0].row, 6, 'el primer día es domingo');
  assert.strictEqual(grid[grid.length - 1].row, 6, 'hoy es domingo');
  assert.strictEqual(grid.find((day) => day.date === '2026-11-02').row, 0);
});

/* ------------------------------ RF-2 / RF-5 ------------------------------ */

test('suma los minutos de varias sesiones del mismo día', () => {
  const sessions = [
    { date: TODAY, minutes: 20 },
    { date: TODAY, minutes: 25 },
  ];
  const grid = generateHeatmapGrid(sessions, TODAY);
  const today = grid[grid.length - 1];
  assert.strictEqual(today.minutes, 45);
  assert.strictEqual(today.level, 2);
});

test('asigna el nivel de cada día según sus minutos', () => {
  const sessions = [
    { date: TODAY, minutes: 45 },
    { date: shiftKey(TODAY, -1), minutes: 15 },
    { date: shiftKey(TODAY, -2), minutes: 90 },
    { date: shiftKey(TODAY, -3), minutes: 180 },
    { date: shiftKey(TODAY, -4), minutes: 60 },
    { date: shiftKey(TODAY, -5), minutes: 61 },
    { date: shiftKey(TODAY, -6), minutes: 120 },
    { date: shiftKey(TODAY, -7), minutes: 121 },
  ];
  const grid = generateHeatmapGrid(sessions, TODAY);
  const byDate = new Map(grid.map((day) => [day.date, day]));

  assert.strictEqual(byDate.get(TODAY).level, 2);
  assert.strictEqual(byDate.get(shiftKey(TODAY, -1)).level, 1);
  assert.strictEqual(byDate.get(shiftKey(TODAY, -2)).level, 3);
  assert.strictEqual(byDate.get(shiftKey(TODAY, -3)).level, 4);
  assert.strictEqual(byDate.get(shiftKey(TODAY, -4)).level, 2);
  assert.strictEqual(byDate.get(shiftKey(TODAY, -5)).level, 3);
  assert.strictEqual(byDate.get(shiftKey(TODAY, -6)).level, 3);
  assert.strictEqual(byDate.get(shiftKey(TODAY, -7)).level, 4);
  assert.strictEqual(byDate.get(shiftKey(TODAY, -8)).level, 0);
});

test('un día sin sesiones queda en nivel 0 con 0 minutos', () => {
  const grid = generateHeatmapGrid([], TODAY);
  assert.ok(grid.every((day) => day.minutes === 0 && day.level === 0));
});

test('ignora sesiones fuera de la ventana y registros inválidos', () => {
  const sessions = [
    { date: shiftKey(TODAY, 1), minutes: 90 }, // futuro
    { date: shiftKey(TODAY, -400), minutes: 90 }, // demasiado viejo
    null,
    { date: TODAY, minutes: 30 },
  ];
  const grid = generateHeatmapGrid(sessions, TODAY);
  const total = grid.reduce((sum, day) => sum + day.minutes, 0);
  assert.strictEqual(total, 30);
  assert.strictEqual(grid[grid.length - 1].level, 1);
});
