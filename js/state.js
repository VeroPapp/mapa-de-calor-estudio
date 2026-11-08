/* ==========================================================================
   Diario de Estudio — normalización de datos guardados
   Funciones puras: no tocan el DOM ni localStorage.
   Se pueden usar desde el navegador (window.StudyState) y desde Node (require).
   ========================================================================== */
(function (root) {
  'use strict';

  function uid() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function isRealDate(key) {
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  function normalizeSubject(value) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, 60);
  }

  function normalizeSession(value) {
    if (!value || typeof value !== 'object') return null;

    const date = typeof value.date === 'string' ? value.date : '';
    const subject = typeof value.subject === 'string' ? value.subject.trim() : '';
    const topic = typeof value.topic === 'string' ? value.topic.trim() : '';
    const minutes = Number(value.minutes);

    if (!isRealDate(date) || subject === '' || topic === '') return null;
    if (!Number.isInteger(minutes) || minutes < 1) return null;

    return {
      id: typeof value.id === 'string' && value.id !== '' ? value.id : uid(),
      date,
      subject: subject.slice(0, 60),
      topic: topic.slice(0, 120),
      minutes,
      createdAt:
        typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    };
  }

  function mergeSubjects(stored, list) {
    const byKey = new Map();

    const add = (raw) => {
      const name = normalizeSubject(raw);
      if (name === '') return;
      const key = name.toLocaleLowerCase('es');
      if (!byKey.has(key)) byKey.set(key, name);
    };

    stored.forEach(add);
    for (const session of list) add(session.subject);

    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, 'es'));
  }

  function emptyState() {
    return { sessions: [], subjects: [] };
  }

  /**
   * Lee el texto crudo de localStorage y devuelve un estado siempre válido.
   * Los registros corruptos se descartan y se avisan por `warn`.
   */
  function parseStoredState(raw, warn) {
    const notify = typeof warn === 'function' ? warn : console.warn;

    if (typeof raw !== 'string' || raw === '') return emptyState();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      notify('Los datos guardados no se pudieron leer:', error);
      return emptyState();
    }

    if (!parsed || typeof parsed !== 'object') {
      notify('Los datos guardados tienen un formato inválido:', parsed);
      return emptyState();
    }

    let list = [];
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (Array.isArray(parsed.sessions)) {
      list = parsed.sessions;
    } else if ('sessions' in parsed) {
      notify('El listado de sesiones está corrupto y se ignoró:', parsed.sessions);
    }

    const sessions = [];
    list.forEach((item, index) => {
      const session = normalizeSession(item);
      if (session) {
        sessions.push(session);
      } else {
        notify(
          `Se ignoró una sesión corrupta en la posición ${index} de localStorage:`,
          item
        );
      }
    });

    const stored =
      !Array.isArray(parsed) && Array.isArray(parsed.subjects) ? parsed.subjects : [];

    return { sessions, subjects: mergeSubjects(stored, sessions) };
  }

  const api = {
    uid,
    isRealDate,
    normalizeSubject,
    normalizeSession,
    mergeSubjects,
    parseStoredState,
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StudyState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
