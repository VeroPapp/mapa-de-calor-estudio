'use strict';

/* ==========================================================================
   Diario de Estudio — lógica en JavaScript puro
   Persistencia: localStorage["diario-estudio-v1"]
   Fechas: siempre construidas en horario local (nunca con toISOString para
   obtener el día), para evitar corrimientos por UTC.
   ========================================================================== */
const { generateHeatmapGrid } = Heatmap;
const { uid, isRealDate, normalizeSubject, parseStoredState } = StudyState;

const STORAGE_KEY = 'diario-estudio-v1';
const MAX_MINUTES = 600;

const TRASH_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/>' +
  '<path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/>' +
  '<path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';

const els = {
  form: document.getElementById('session-form'),
  fecha: document.getElementById('fecha'),
  materia: document.getElementById('materia'),
  tema: document.getElementById('tema'),
  minutos: document.getElementById('minutos'),
  newSubject: document.getElementById('new-subject'),
  nuevaMateria: document.getElementById('nueva-materia'),
  addMateria: document.getElementById('add-materia'),
  streakCount: document.getElementById('streak-count'),
  streakUnit: document.getElementById('streak-unit'),
  streakHint: document.getElementById('streak-hint'),
  statSessions: document.getElementById('stat-sessions'),
  statMinutes: document.getElementById('stat-minutes'),
  bestCount: document.getElementById('best-count'),
  bestUnit: document.getElementById('best-unit'),
  bestRange: document.getElementById('best-range'),
  bestNote: document.getElementById('best-note'),
  history: document.getElementById('history'),
  historyCount: document.getElementById('history-count'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message'),
  toastAction: document.getElementById('toast-action'),
};

const numberFormat = new Intl.NumberFormat('es-AR');
const FIELDS = [els.fecha, els.materia, els.tema, els.minutos];
const NEW_SUBJECT = '__nueva__';

const initial = loadState();
let sessions = initial.sessions;
let subjects = initial.subjects;
let previousSubject = '';
let toastTimer = null;
let toastActionHandler = null;
let lastRenderedDay = null;

/* ==========================================================================
   Utilidades de fecha (hora local)
   ========================================================================== */

const pad2 = (value) => String(value).padStart(2, '0');

function toKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function fromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function todayKey() {
  return toKey(new Date());
}

function shiftKey(key, days) {
  const date = fromKey(key);
  return toKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

function formatLongDate(key) {
  const date = fromKey(key);
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = 'numeric';
  const label = new Intl.DateTimeFormat('es-AR', options).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatNumericDate(key) {
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
}

function formatDayMonth(key) {
  const date = fromKey(key);
  const options = { day: 'numeric', month: 'long' };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = 'numeric';
  return new Intl.DateTimeFormat('es-AR', options).format(date);
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/* ==========================================================================
   Persistencia
   ========================================================================== */

function loadState() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('No se pudo leer localStorage:', error);
    return { sessions: [], subjects: [] };
  }
  if (!raw) return { sessions: [], subjects: [] };

  return parseStoredState(raw);
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, sessions, subjects })
    );
    return true;
  } catch (error) {
    console.warn('No se pudo guardar en localStorage:', error);
    return false;
  }
}

/* ==========================================================================
   Racha
   ========================================================================== */

function calculateStreak(list) {
  const today = todayKey();
  const studiedDays = new Set();

  for (const session of list) {
    if (session.date <= today) studiedDays.add(session.date);
  }

  let current = 0;
  let cursor = studiedDays.has(today) ? today : shiftKey(today, -1);
  while (studiedDays.has(cursor)) {
    current += 1;
    cursor = shiftKey(cursor, -1);
  }


  let best = 0;
  let run = 0;
  let runStart = null;
  let previous = null;
  let bestStart = null;
  let bestEnd = null;
  const orderedDays = Array.from(studiedDays).sort();
  for (const day of orderedDays) {
    if (previous !== null && shiftKey(previous, 1) === day) {
      run += 1;
    } else {
      run = 1;
      runStart = day;
    }
    if (run >= best) {
      best = run;
      bestStart = runStart;
      bestEnd = day;
    }
    previous = day;
  }

  return {
    current,
    best,
    bestStart,
    bestEnd,
    studiedToday: studiedDays.has(today),
    daysCount: studiedDays.size,
  };
}

/* ==========================================================================
   Render
   ========================================================================== */

function render() {
  lastRenderedDay = todayKey();
  const streak = calculateStreak(sessions);
  renderStreak(streak);
  renderBestStreak(streak);
  renderHistory();
  renderSubjectSelect();
  renderHeatmap();
}

function renderStreak(streak) {
  els.streakCount.textContent = String(streak.current);
  els.streakUnit.textContent = streak.current === 1 ? 'día' : 'días';

  if (streak.daysCount === 0) {
    els.streakHint.textContent =
      sessions.length === 0
        ? 'Todavía no hay sesiones. Sumá la primera y empezá tu racha.'
        : 'Solo hay sesiones con fechas futuras: no cuentan para la racha.';
  } else if (streak.current === 0) {
    els.streakHint.textContent =
      'Tu última sesión quedó atrás. Sumá una hoy para arrancar una racha nueva.';
  } else if (!streak.studiedToday) {
    els.streakHint.textContent =
      'Estudiaste ayer. Sumá una sesión hoy para no cortar la racha.';
  } else if (streak.current === 1) {
    els.streakHint.textContent = 'Primer día de la racha. ¡A sostenerla!';
  } else {
    els.streakHint.textContent = 'Ya estudiaste hoy. La racha sigue viva.';
  }

  els.statSessions.textContent = numberFormat.format(sessions.length);
  els.statMinutes.textContent = numberFormat.format(
    sessions.reduce((total, session) => total + session.minutes, 0)
  );
}

function formatBestRange(start, end) {
  if (!start || !end) return 'Todavía no hay racha registrada.';
  if (start === end) return `Un solo día: ${formatDayMonth(start)}.`;

  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const from = sameMonth ? String(fromKey(start).getDate()) : formatDayMonth(start);
  return `Del ${from} al ${formatDayMonth(end)}.`;
}

function renderBestStreak(streak) {
  els.bestCount.textContent = String(streak.best);
  els.bestUnit.textContent = streak.best === 1 ? 'día' : 'días';
  els.bestRange.textContent = formatBestRange(streak.bestStart, streak.bestEnd);

  if (streak.best > 0 && streak.best === streak.current) {
    els.bestNote.textContent = 'Esta es tu racha actual.';
    els.bestNote.hidden = false;
  } else {
    els.bestNote.textContent = '';
    els.bestNote.hidden = true;
  }
}

function renderSubjectSelect() {
  const selected = els.materia.value;
  const fragment = document.createDocumentFragment();

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = subjects.length
    ? 'Elegí una materia…'
    : 'Todavía no hay materias';
  fragment.append(placeholder);

  for (const name of subjects) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    fragment.append(option);
  }

  const add = document.createElement('option');
  add.value = NEW_SUBJECT;
  add.textContent = '＋ Agregar materia…';
  fragment.append(add);

  els.materia.replaceChildren(fragment);

  if (selected && subjects.includes(selected)) {
    els.materia.value = selected;
  } else if (selected === NEW_SUBJECT) {
    els.materia.value = NEW_SUBJECT;
  } else {
    els.materia.value = '';
  }
}

function renderHistory() {
  els.history.replaceChildren();

  const total = sessions.length;
  els.historyCount.textContent =
    total === 0
      ? 'Sin sesiones todavía'
      : `${numberFormat.format(total)} ${total === 1 ? 'sesión' : 'sesiones'}`;

  if (total === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';

    const title = document.createElement('strong');
    title.textContent = 'Tu historial está vacío';

    const text = document.createElement('p');
    text.textContent = 'Registrá tu primera sesión de estudio y aparecerá acá.';

    empty.append(title, text);
    els.history.append(empty);
    return;
  }

  const ordered = [...sessions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.createdAt || '').localeCompare(a.createdAt || '')
  );

  const groups = new Map();
  for (const session of ordered) {
    if (!groups.has(session.date)) groups.set(session.date, []);
    groups.get(session.date).push(session);
  }

  const fragment = document.createDocumentFragment();
  for (const [date, items] of groups) {
    fragment.append(buildDayGroup(date, items));
  }
  els.history.append(fragment);
}

function buildDayGroup(date, items) {
  const section = document.createElement('section');
  section.className = 'day';

  const head = document.createElement('div');
  head.className = 'day__head';

  const heading = document.createElement('h3');
  heading.className = 'day__date';

  const today = todayKey();
  const relative =
    date === today ? 'Hoy' : date === shiftKey(today, -1) ? 'Ayer' : '';
  if (relative) heading.append(document.createTextNode(`${relative} · `));

  const longDate = document.createElement('span');
  longDate.textContent = formatLongDate(date);
  heading.append(longDate);

  const total = document.createElement('span');
  total.className = 'day__total';
  total.textContent = formatDuration(
    items.reduce((sum, item) => sum + item.minutes, 0)
  );

  head.append(heading, total);

  const list = document.createElement('ul');
  list.className = 'session-list';
  for (const item of items) list.append(buildSessionItem(item));

  section.append(head, list);
  return section;
}

function buildSessionItem(session) {
  const item = document.createElement('li');
  item.className = 'session';

  const body = document.createElement('div');
  body.className = 'session__body';

  const subject = document.createElement('p');
  subject.className = 'session__subject';
  subject.textContent = session.subject;

  const topic = document.createElement('p');
  topic.className = 'session__topic';
  topic.textContent = session.topic;

  body.append(subject, topic);

  const minutes = document.createElement('span');
  minutes.className = 'session__minutes';
  minutes.textContent = `${session.minutes} min`;

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'icon-btn';
  remove.dataset.id = session.id;
  remove.setAttribute(
    'aria-label',
    `Eliminar sesión de ${session.subject} del ${formatNumericDate(session.date)}`
  );
  remove.innerHTML = TRASH_ICON;

  item.append(body, minutes, remove);
  return item;
}

/* ==========================================================================
   Formulario
   ========================================================================== */

function setError(input, message) {
  const error = document.getElementById(`${input.id}-error`);
  if (!error) return;
  error.textContent = message;
  error.hidden = false;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', error.id);
}

function clearError(input) {
  const error = document.getElementById(`${input.id}-error`);
  if (error) {
    error.textContent = '';
    error.hidden = true;
  }
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
}

function clearErrors() {
  FIELDS.forEach(clearError);
}

function openNewSubject({ focus = true } = {}) {
  if (els.materia.value !== NEW_SUBJECT) previousSubject = els.materia.value;
  els.newSubject.hidden = false;
  els.nuevaMateria.value = '';
  clearError(els.nuevaMateria);
  if (focus) els.nuevaMateria.focus();
}

function closeNewSubject({ keepSelection = false } = {}) {
  els.newSubject.hidden = true;
  els.nuevaMateria.value = '';
  clearError(els.nuevaMateria);

  if (!keepSelection && els.materia.value === NEW_SUBJECT) {
    els.materia.value =
      previousSubject && subjects.includes(previousSubject) ? previousSubject : '';
  }
}

function handleSubjectChange() {
  if (els.materia.value === NEW_SUBJECT) {
    openNewSubject();
    return;
  }

  previousSubject = els.materia.value;
  closeNewSubject();
  clearError(els.materia);
}

function addSubject() {
  const name = normalizeSubject(els.nuevaMateria.value);

  if (name === '') {
    setError(els.nuevaMateria, 'Escribí el nombre de la materia.');
    els.nuevaMateria.focus();
    return;
  }

  const key = name.toLocaleLowerCase('es');
  const existing = subjects.find((item) => item.toLocaleLowerCase('es') === key);
  const chosen = existing || name;
  let saved = true;

  if (!existing) {
    subjects.push(name);
    subjects.sort((a, b) => a.localeCompare(b, 'es'));
    saved = persist();
  }

  closeNewSubject({ keepSelection: true });
  renderSubjectSelect();
  els.materia.value = chosen;
  previousSubject = chosen;
  clearError(els.materia);
  els.materia.focus();

  if (!saved) {
    showToast('La materia se agregó, pero el navegador no permitió guardarla.');
  } else if (existing) {
    showToast(`Ya tenías "${chosen}" en la lista.`);
  } else {
    showToast(`Materia agregada: ${chosen}.`);
  }
}

function validate(values) {
  const errors = {};

  if (!values.fecha) {
    errors.fecha = 'Elegí la fecha de la sesión.';
  } else if (!isRealDate(values.fecha)) {
    errors.fecha = 'La fecha no es válida.';
  } else if (values.fecha > todayKey()) {
    errors.fecha = 'La fecha no puede ser futura.';
  }

  if (!values.materia || values.materia === NEW_SUBJECT) {
    errors.materia = 'Elegí una materia de la lista o agregá una nueva.';
  }

  if (!values.tema) {
    errors.tema = 'Escribí el tema que estudiaste.';
  }

  if (!values.minutos) {
    errors.minutos = 'Ingresá cuántos minutos estudiaste.';
  } else {
    const minutes = Number(values.minutos);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) {
      errors.minutos = `Ingresá un número entero entre 1 y ${MAX_MINUTES}.`;
    }
  }

  return errors;
}

function handleSubmit(event) {
  event.preventDefault();

  const values = {
    fecha: els.fecha.value,
    materia: els.materia.value.trim(),
    tema: els.tema.value.trim(),
    minutos: els.minutos.value.trim(),
  };

  const errors = validate(values);
  clearErrors();

  const invalid = Object.keys(errors);
  if (invalid.length > 0) {
    for (const key of invalid) setError(els[key], errors[key]);
    els[invalid[0]].focus();
    return;
  }

  const session = {
    id: uid(),
    date: values.fecha,
    subject: values.materia,
    topic: values.tema,
    minutes: Number(values.minutos),
    createdAt: new Date().toISOString(),
  };

  sessions.push(session);
  const saved = persist();
  render();

  els.tema.value = '';
  els.minutos.value = '';
  els.tema.focus();

  showToast(
    saved
      ? `Sesión guardada: ${session.minutes} min de ${session.subject}.`
      : 'La sesión se agregó, pero el navegador no permitió guardarla.'
  );
}

/* ==========================================================================
   Eliminar / deshacer
   ========================================================================== */

function handleHistoryClick(event) {
  const button = event.target.closest('.icon-btn[data-id]');
  if (!button || !els.history.contains(button)) return;

  const buttons = Array.from(els.history.querySelectorAll('.icon-btn[data-id]'));
  removeSession(button.dataset.id, buttons.indexOf(button));
}

function removeSession(id, index) {
  const position = sessions.findIndex((session) => session.id === id);
  if (position === -1) return;

  const [removed] = sessions.splice(position, 1);
  const saved = persist();
  render();

  const remaining = Array.from(els.history.querySelectorAll('.icon-btn[data-id]'));
  if (remaining.length > 0) {
    remaining[Math.min(index, remaining.length - 1)].focus();
  } else {
    els.materia.focus();
  }

  showToast(
    saved
      ? 'Sesión eliminada.'
      : 'Sesión eliminada, pero no se pudo guardar el cambio.',
    {
      actionLabel: 'Deshacer',
      onAction: () => {
        sessions.splice(Math.min(position, sessions.length), 0, removed);
        const restored = persist();
        render();
        showToast(
          restored
            ? 'Sesión restaurada.'
            : 'Sesión restaurada, pero no se pudo guardar el cambio.'
        );
      },
    }
  );
}

/* ==========================================================================
   Notificación (toast)
   ========================================================================== */

function showToast(message, options = {}) {
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  els.toastMessage.textContent = message;

  if (typeof options.onAction === 'function') {
    toastActionHandler = options.onAction;
    els.toastAction.textContent = options.actionLabel || 'Deshacer';
    els.toastAction.hidden = false;
  } else {
    toastActionHandler = null;
    els.toastAction.hidden = true;
  }

  els.toast.classList.add('is-visible');
  toastTimer = window.setTimeout(hideToast, options.duration || 6000);
}

function hideToast() {
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  els.toast.classList.remove('is-visible');
  toastActionHandler = null;
}

function handleToastAction() {
  const action = toastActionHandler;
  hideToast();
  if (typeof action === 'function') action();
}

/* ==========================================================================
   Inicialización
   ========================================================================== */

function syncDateBounds() {
  const today = todayKey();
  els.fecha.max = today;
  if (els.fecha.value && els.fecha.value > today) els.fecha.value = today;
}

function init() {
  els.fecha.value = todayKey();
  syncDateBounds();
  render();

  if (subjects.length === 0) openNewSubject({ focus: false });

  els.form.addEventListener('submit', handleSubmit);
  FIELDS.forEach((input) => {
    input.addEventListener('input', () => clearError(input));
  });

  els.materia.addEventListener('change', handleSubjectChange);
  els.addMateria.addEventListener('click', addSubject);
  els.nuevaMateria.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addSubject();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeNewSubject();
      els.materia.focus();
    }
  });

  els.history.addEventListener('click', handleHistoryClick);
  els.toastAction.addEventListener('click', handleToastAction);

  els.fecha.addEventListener('focus', syncDateBounds);
  els.fecha.addEventListener('click', syncDateBounds);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    syncDateBounds();
    if (todayKey() !== lastRenderedDay) render();
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    const next = loadState();
    sessions = next.sessions;
    subjects = next.subjects;
    render();
  });
}

function renderHeatmap() {
  const container = document.getElementById('heatmap');
  if (!container) return;

  const gridData = generateHeatmapGrid(sessions, todayKey());
  const fragment = document.createDocumentFragment();

  // Huecos antes del primer día para que la fila 1 sea siempre lunes.
  const leadingBlanks = gridData.length > 0 ? gridData[0].row : 0;
  for (let i = 0; i < leadingBlanks; i++) {
    const blank = document.createElement('div');
    blank.className = 'heatmap-cell heatmap-cell--empty';
    blank.setAttribute('aria-hidden', 'true');
    fragment.append(blank);
  }

  for (const day of gridData) {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.dataset.level = day.level;
    cell.title = `${formatLongDate(day.date)}: ${formatDuration(day.minutes)}`;
    fragment.append(cell);
  }

  container.replaceChildren(fragment);
}

init();
