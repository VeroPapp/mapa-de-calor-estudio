const test = require('node:test');
const assert = require('node:assert');
const {
  normalizeSession,
  mergeSubjects,
  parseStoredState,
} = require('../js/state.js');

const validSession = (overrides = {}) => ({
  id: 'abc',
  date: '2026-11-08',
  subject: '  Matemática  ',
  topic: '  Derivadas  ',
  minutes: 45,
  createdAt: '2026-11-08T12:00:00.000Z',
  ...overrides,
});

/* ------------------------ normalizeSession ------------------------ */

test('normaliza una sesión válida', () => {
  const session = normalizeSession(validSession());
  assert.deepStrictEqual(session, {
    id: 'abc',
    date: '2026-11-08',
    subject: 'Matemática',
    topic: 'Derivadas',
    minutes: 45,
    createdAt: '2026-11-08T12:00:00.000Z',
  });
});

test('recorta subject a 60 y topic a 120 caracteres', () => {
  const session = normalizeSession(
    validSession({ subject: 'a'.repeat(80), topic: 'b'.repeat(200) })
  );
  assert.strictEqual(session.subject.length, 60);
  assert.strictEqual(session.topic.length, 120);
});

test('completa id y createdAt cuando faltan', () => {
  const session = normalizeSession(validSession({ id: undefined, createdAt: undefined }));
  assert.ok(typeof session.id === 'string' && session.id.length > 0);
  assert.ok(typeof session.createdAt === 'string' && session.createdAt.length > 0);
});

test('rechaza fechas inexistentes', () => {
  assert.strictEqual(normalizeSession(validSession({ date: '2026-02-30' })), null);
  assert.strictEqual(normalizeSession(validSession({ date: '08/11/2026' })), null);
  assert.strictEqual(normalizeSession(validSession({ date: '' })), null);
});

test('rechaza minutos inválidos', () => {
  assert.strictEqual(normalizeSession(validSession({ minutes: 0 })), null);
  assert.strictEqual(normalizeSession(validSession({ minutes: -5 })), null);
  assert.strictEqual(normalizeSession(validSession({ minutes: 1.5 })), null);
  assert.strictEqual(normalizeSession(validSession({ minutes: 'muchos' })), null);
});

test('rechaza materia o tema vacíos', () => {
  assert.strictEqual(normalizeSession(validSession({ subject: '   ' })), null);
  assert.strictEqual(normalizeSession(validSession({ topic: '' })), null);
  assert.strictEqual(normalizeSession(null), null);
  assert.strictEqual(normalizeSession('texto'), null);
});

/* ------------------------- mergeSubjects ------------------------- */

test('ordena materias alfabéticamente y no distingue mayúsculas', () => {
  const merged = mergeSubjects(['Zootecnia', 'álgebra', 'Álgebra'], []);
  assert.deepStrictEqual(merged, ['álgebra', 'Zootecnia']);
});

test('suma las materias de las sesiones sin duplicarlas', () => {
  const sessions = [{ subject: 'Historia' }, { subject: 'historia' }, { subject: 'Física' }];
  assert.deepStrictEqual(mergeSubjects(['Historia'], sessions), ['Física', 'Historia']);
});

test('conservar materias sin sesiones (borrar sesiones no borra materias)', () => {
  assert.deepStrictEqual(mergeSubjects(['Química'], []), ['Química']);
});

/* ------------------------ parseStoredState (RF-4) ------------------------ */

test('lee un estado válido sin avisar por consola', () => {
  const warnings = [];
  const state = parseStoredState(
    JSON.stringify({ version: 1, sessions: [validSession()], subjects: ['Matemática'] }),
    (...args) => warnings.push(args)
  );
  assert.strictEqual(state.sessions.length, 1);
  assert.deepStrictEqual(state.subjects, ['Matemática']);
  assert.strictEqual(warnings.length, 0);
});

test('descarta un registro corrupto y avisa por consola', () => {
  const warnings = [];
  const raw = JSON.stringify({
    version: 1,
    sessions: [validSession(), { date: '2026-99-99', subject: 'X', topic: 'Y', minutes: 30 }],
    subjects: [],
  });
  const state = parseStoredState(raw, (...args) => warnings.push(args));

  assert.strictEqual(state.sessions.length, 1);
  assert.strictEqual(state.sessions[0].date, '2026-11-08');
  assert.strictEqual(warnings.length, 1);
  assert.match(String(warnings[0][0]), /posición 1/);
});

test('avisa una vez por cada registro corrupto', () => {
  const warnings = [];
  const raw = JSON.stringify({
    version: 1,
    sessions: [{}, null, validSession({ minutes: 0 }), validSession()],
    subjects: [],
  });
  const state = parseStoredState(raw, (...args) => warnings.push(args));
  assert.strictEqual(state.sessions.length, 1);
  assert.strictEqual(warnings.length, 3);
});

test('un JSON inválido avisa y devuelve un estado vacío sin romper', () => {
  const warnings = [];
  const state = parseStoredState('{esto no es json', (...args) => warnings.push(args));
  assert.deepStrictEqual(state, { sessions: [], subjects: [] });
  assert.strictEqual(warnings.length, 1);
});

test('un listado de sesiones corrupto avisa y devuelve un estado vacío', () => {
  const warnings = [];
  const state = parseStoredState(
    JSON.stringify({ version: 1, sessions: 'no soy un array', subjects: ['Física'] }),
    (...args) => warnings.push(args)
  );
  assert.deepStrictEqual(state.sessions, []);
  assert.deepStrictEqual(state.subjects, ['Física']);
  assert.strictEqual(warnings.length, 1);
});

test('un valor que no es objeto avisa y no rompe', () => {
  const warnings = [];
  const state = parseStoredState(JSON.stringify('solo texto'), (...args) => warnings.push(args));
  assert.deepStrictEqual(state, { sessions: [], subjects: [] });
  assert.strictEqual(warnings.length, 1);
});

test('acepta el formato viejo (array plano de sesiones)', () => {
  const state = parseStoredState(JSON.stringify([validSession()]), () => {});
  assert.strictEqual(state.sessions.length, 1);
  assert.deepStrictEqual(state.subjects, ['Matemática']);
});

test('sin datos guardados devuelve un estado vacío', () => {
  assert.deepStrictEqual(parseStoredState(null, () => {}), { sessions: [], subjects: [] });
  assert.deepStrictEqual(parseStoredState('', () => {}), { sessions: [], subjects: [] });
});
