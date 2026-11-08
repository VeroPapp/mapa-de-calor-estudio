/* ==========================================================================
   Seed de datos de prueba — Diario de Estudio
   --------------------------------------------------------------------------
   Borra las sesiones anteriores y carga un set de prueba para ver el mapa de
   calor, la racha actual y la mejor racha. También agrega las materias
   "Prácticas profesionalizantes III", "Bases de datos" y "Sistemas operativos"
   sin borrar las que ya existan.

   Se ejecuta solo al cargar index.html (antes de que arranque la app) una vez
   por versión de seed. Para volver a generarlo:
     - abrir index.html?seed=1, o
     - ejecutar runStudySeed({ force: true }) en la consola.
   Las fechas se calculan en hora local a partir de hoy.
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'diario-estudio-v1';
  const SEED_FLAG_KEY = 'diario-estudio-seed-version';
  const SEED_VERSION = '1';

  const NEW_SUBJECTS = [
    'Prácticas profesionalizantes III',
    'Bases de datos',
    'Sistemas operativos',
  ];

  const pad2 = (value) => String(value).padStart(2, '0');

  const toKey = (date) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

  const shiftKey = (key, days) => {
    const [year, month, day] = key.split('-').map(Number);
    return toKey(new Date(year, month - 1, day + days));
  };

  const makeId = () => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `seed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  };

  function buildSessions(today) {
    const plan = {
      // Racha actual: 7 días seguidos (hoy incluido).
      0: [
        ['Bases de datos', 'Consultas SQL con JOIN', 45],
        ['Sistemas operativos', 'Planificación de CPU', 30],
      ],
      '-1': [['Prácticas profesionalizantes III', 'Avance del proyecto', 90]],
      '-2': [['Bases de datos', 'Normalización hasta 3FN', 25]],
      '-3': [['Sistemas operativos', 'Memoria virtual y paginación', 150]],
      '-4': [
        ['Prácticas profesionalizantes III', 'Relevamiento de requerimientos', 60],
        ['Bases de datos', 'Repaso de álgebra relacional', 20],
      ],
      '-5': [['Bases de datos', 'Índices y planes de ejecución', 40]],
      '-6': [['Sistemas operativos', 'Procesos e hilos', 30]],

      // Sesiones sueltas de las últimas semanas.
      '-9': [['Prácticas profesionalizantes III', 'Documentación del proyecto', 45]],
      '-10': [['Bases de datos', 'Transacciones y ACID', 90]],
      '-12': [['Sistemas operativos', 'Sincronización y semáforos', 60]],
      '-14': [['Bases de datos', 'Modelo entidad-relación', 30]],
      '-15': [['Prácticas profesionalizantes III', 'Entrevista con el cliente', 120]],

      // Mejor racha histórica: 14 días seguidos (del -30 al -17).
      '-30': [['Bases de datos', 'Consultas de agregación', 30]],
      '-29': [['Sistemas operativos', 'Deadlocks', 45]],
      '-28': [['Prácticas profesionalizantes III', 'Plan de trabajo', 20]],
      '-27': [['Bases de datos', 'Subconsultas', 60]],
      '-26': [['Sistemas operativos', 'Shell scripting', 90]],
      '-25': [['Prácticas profesionalizantes III', 'Presentación del avance', 35]],
      '-24': [['Bases de datos', 'Vistas y procedimientos', 50]],
      '-23': [['Sistemas operativos', 'Gestión de memoria', 75]],
      '-22': [['Prácticas profesionalizantes III', 'Revisión de entregables', 120]],
      '-21': [['Bases de datos', 'Optimización de consultas', 40]],
      '-20': [['Sistemas operativos', 'Llamadas al sistema', 25]],
      '-19': [['Prácticas profesionalizantes III', 'Correcciones del cliente', 80]],
      '-18': [['Bases de datos', 'TP integrador', 55]],
      '-17': [['Sistemas operativos', 'Sistemas de archivos', 45]],

      // Historial más viejo para poblar el mapa de calor.
      '-45': [['Bases de datos', 'Repaso general', 60]],
      '-52': [['Sistemas operativos', 'Repaso de parcial', 90]],
      '-60': [['Prácticas profesionalizantes III', 'Bitácora del proyecto', 45]],
      '-75': [['Bases de datos', 'Diseño de esquemas', 120]],
      '-90': [['Sistemas operativos', 'Práctica de laboratorio', 30]],
      '-120': [['Prácticas profesionalizantes III', 'Informe de avance', 75]],
      '-150': [['Bases de datos', 'Ejercicios de SQL', 45]],
      '-200': [['Sistemas operativos', 'Lectura de material', 100]],
      '-250': [['Prácticas profesionalizantes III', 'Reunión de equipo', 60]],
      '-300': [['Bases de datos', 'Modelo relacional', 30]],
    };

    const sessions = [];
    for (const offset of Object.keys(plan)) {
      const date = shiftKey(today, Number(offset));
      for (const [subject, topic, minutes] of plan[offset]) {
        sessions.push({
          id: makeId(),
          date,
          subject,
          topic,
          minutes,
          createdAt: new Date().toISOString(),
        });
      }
    }
    return sessions;
  }

  function runStudySeed(options) {
    const force = Boolean(options && options.force);

    if (!force) {
      try {
        if (localStorage.getItem(SEED_FLAG_KEY) === SEED_VERSION) {
          return { skipped: true, reason: 'already-seeded' };
        }
      } catch (error) {
        console.warn('No se pudo verificar el seed anterior:', error);
      }
    }

    let previous = 0;
    let storedSubjects = [];

    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (current && Array.isArray(current.sessions)) previous = current.sessions.length;
      if (current && Array.isArray(current.subjects)) storedSubjects = current.subjects;
    } catch (error) {
      console.warn('No se pudieron leer los datos anteriores:', error);
    }

    const byKey = new Map();
    const addSubject = (raw) => {
      if (typeof raw !== 'string') return;
      const name = raw.trim().slice(0, 60);
      if (name === '') return;
      const key = name.toLocaleLowerCase('es');
      if (!byKey.has(key)) byKey.set(key, name);
    };

    storedSubjects.forEach(addSubject);
    NEW_SUBJECTS.forEach(addSubject);

    const subjects = Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, 'es'));
    const sessions = buildSessions(toKey(new Date()));

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, sessions, subjects })
      );
      localStorage.setItem(SEED_FLAG_KEY, SEED_VERSION);
    } catch (error) {
      console.warn('No se pudo guardar el seed:', error);
      return { skipped: false, saved: false, sessions: sessions.length };
    }

    console.log(
      `Seed listo: ${previous} sesión(es) anterior(es) borrada(s), ` +
        `${sessions.length} sesiones de prueba y ${subjects.length} materias.`
    );

    return { skipped: false, saved: true, sessions: sessions.length, subjects: subjects.length };
  }

  if (typeof window !== 'undefined') {
    window.runStudySeed = runStudySeed;

    let forceByUrl = false;
    try {
      forceByUrl = new URLSearchParams(window.location.search).get('seed') === '1';
    } catch (error) {
      forceByUrl = false;
    }

    runStudySeed({ force: forceByUrl });
  }
})();
