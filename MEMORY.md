# Estado del Proyecto

## Estado Actual

- Versión: v1.3 funcional.
- Archivos: index.html, styles.css, app.js, js/state.js, js/heatmap.js,
  test/heatmap.test.js, test/state.test.js, seed.js, AGENTS.md, MEMORY.md.
- Sin dependencias ni bundlers. Abrir `index.html` con doble clic funciona:
  los scripts son clásicos (no módulos ES) y se cargan en orden.
- La "Mejor racha histórica" tiene tarjeta propia con número y rango de fechas.
- La materia se elige de una lista desplegable, con alta de materias nuevas.
- El mapa de calor muestra 365 días en 7 filas fijas (lunes a domingo), con
  etiquetas de días y scroll horizontal en pantallas chicas.

## Decisiones Tomadas

- Clave de localStorage: 'diario-estudio-v1'; se guarda
  `{ version: 1, sessions: [...], subjects: [...] }`.
- Las fechas se guardan como 'AAAA-MM-DD' en hora local.
- Todo es local: no hay backend ni cuentas; los datos quedan en el navegador.
- Cada sesión: id (crypto.randomUUID con fallback), date, subject (máx. 60),
  topic (máx. 120), minutes y createdAt.
- Datos inválidos o viejos se descartan al cargar (normalizeSession) en vez de romper la app.
- Racha actual: cuenta si hay al menos una sesión hoy o ayer, y sigue hacia atrás.
- Mejor racha: se calcula en la misma pasada que la racha actual y devuelve
  bestStart / bestEnd con el tramo de fechas.
- Ante empate entre rachas de igual longitud gana la más reciente (comparación >=).
- Las fechas futuras se ignoran para la racha y el formulario no las acepta (max = hoy).
- Días repetidos se deduplican (Set) y se ordenan antes de calcular la mejor racha.
- Minutos: entero entre 1 y 600 (MAX_MINUTES).
- Eliminar sesión muestra un toast con "Deshacer" (6 s).
- Validación por campo con mensajes y aria-invalid / aria-describedby.
- Materias: se eligen de un `<select>` con la lista guardada, más la opción
  "＋ Agregar materia…" que abre un campo para darla de alta.
- La lista de materias se guarda en `subjects` dentro del mismo objeto de
  localStorage, se ordena alfabéticamente y no se duplica (sin distinguir mayúsculas).
- Borrar sesiones no borra materias: la lista es independiente y persistente.
- Si no hay materias, el panel de alta se muestra abierto al cargar la página.
- La racha se recalcula al volver a la pestaña si cambió el día, y se sincroniza
  entre pestañas con el evento storage.
- Layout de escritorio: racha actual y mejor racha en la columna izquierda,
  formulario ocupando las dos filas de la derecha, historial a todo el ancho.
- Interfaz en español rioplatense, con tema claro/oscuro según prefers-color-scheme.
- Módulos puros en `js/` con patrón UMD: se usan como global en el navegador
  (`StudyState`, `Heatmap`) y con `require` en los tests de Node. La app no usa
  módulos ES para poder abrirse directo desde `file://`.
- El mapa de calor arranca la semana en lunes: la fila 1 es siempre lunes y se
  agregan celdas vacías al inicio para alinear. El nivel 0 usa `#E2E8F0` en
  ambos temas, como pide la spec.
- `parseStoredState` avisa por consola por cada registro corrupto descartado,
  además de tolerar JSON inválido y formatos viejos.

## Errores Resueltos

- toISOString() hacía que una sesión de las 22 hs figure al día siguiente.
  Se reemplazó por construcción de fechas locales (toKey / fromKey / shiftKey).
- La mejor racha histórica figuraba como pendiente aunque ya estaba calculada;
  ahora también se muestra en su propia tarjeta con el rango de fechas.
- Abrir `index.html` directo fallaba por CORS de módulos ES: se pasó a scripts
  clásicos con módulos UMD.
- RF-3: el nivel 0 usaba `#ebedf0`; ahora usa `#E2E8F0` como pide la spec.
- RF-4: los registros corruptos se descartaban en silencio; ahora se avisa por
  consola indicando la posición del registro.

## Auditoría de la spec 001 (2026-11-08)

- Tests: `node --test` → 32/32 en verde. Cubren niveles y bordes (RF-5), la
  grilla de 365 días y sus 7 filas (RF-1), la suma de minutos por día (RF-2) y
  el descarte con aviso de registros corruptos (RF-4).
- RF-1: 365 días, filas fijas lunes a domingo con etiquetas, verificado en
  navegador en escritorio y en 375 px.
- RF-2: verificado en navegador; al guardar una sesión cambia la celda sin
  recargar.
- RF-3: nivel 0 en `#E2E8F0` (rgb 226, 232, 240), verificado en ambos temas.
- RF-4: JSON inválido y registros corruptos avisan por consola sin romper.
- `task.md` con T1–T5 marcadas.
- El color `#E2E8F0` en modo oscuro se ve muy claro, pero es el que exige la
  spec.

## Seed de datos de prueba

- `seed.js` se carga desde `index.html` y se ejecuta solo, durante la carga y
  antes de `app.js`, así que los datos ya están cuando la app renderiza.
- Carga 38 sesiones relativas a hoy: racha actual de 7 días, mejor racha de
  14 días (del -30 al -17) y actividad dispersa en los últimos 365 días, con
  los 5 niveles del mapa de calor.
- Borra las sesiones anteriores y conserva las materias existentes; agrega
  "Prácticas profesionalizantes III", "Bases de datos" y "Sistemas operativos".
- Se ejecuta una sola vez por navegador: deja la marca
  `diario-estudio-seed-version` en localStorage para no borrar las sesiones
  que se agreguen después.
- Para volver a generarlo: abrir `index.html?seed=1` o ejecutar
  `runStudySeed({ force: true })` en la consola.

## Pendiente

- Probar la app abriendo `index.html` después de cada cambio.
