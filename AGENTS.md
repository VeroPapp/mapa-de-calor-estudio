# [AGENTS.md](http://AGENTS.md)

# Reglas del Proyecto: Diario de Estudio

## Stack Técnico

- HTML5 semántico, CSS3 moderno (Flexbox/Grid) y JavaScript ES6+ puro.

- Prohibido instalar paquetes npm o usar bundlers (Vite, Webpack).

## Manejo Crítico de Fechas

- NUNCA uses new Date(&#39;AAAA-MM-DD&#39;) ni toISOString() para fechas de entrada:

interpretan UTC y desfasan un día en ART (UTC-3).

- Trabajá siempre con año, mes y día locales.

## Lógica de Racha Diaria

- Hay racha si existe al menos una sesión hoy o ayer.

- Ignorá las fechas futuras.

- Quitá fechas repetidas y ordená antes de contar.

## Mejor Racha Histórica

- Se calcula con los mismos días válidos que la racha actual: sin fechas futuras, sin repetidos y ordenados.

- Se guarda el tramo (inicio y fin) y se muestra el rango de fechas en la interfaz.

- Ante un empate entre rachas de igual longitud, gana la más reciente.

- No la calcules con toISOString() ni con new Date('AAAA-MM-DD'); usá las utilidades de fecha locales.

## Materias

- Las materias se eligen de una lista guardada; no se escriben a mano en cada sesión.

- La lista vive en el mismo objeto de localStorage, en la propiedad subjects, y se ordena alfabéticamente.

- Agregar una materia que ya existe no debe duplicarla (comparación sin distinguir mayúsculas).

- Eliminar sesiones no borra materias de la lista.

## Límites

- No borres datos del usuario ni cambies la clave de localStorage.

- No instales dependencias.

## Memoria

- Leé [MEMORY.md](http://MEMORY.md) al empezar y actualizalo al terminar cada tarea.

## Verificación

- Probar la app abriendo index.html en el navegador.

## Verificación
- Hay tests automáticos (`node --test`). Después de cada cambio visual, verificá con el MCP de Chrome DevTools: abrí la app, probá la funcionalidad, revisá que la consola no tenga errores y comprobá la vista móvil.

- Ejecutar tests con `node --test`.

- Leer `docs/constitution.md` y la spec activa antes de tocar código.