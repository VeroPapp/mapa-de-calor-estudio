# Plan de Implementación: Mapa de Calor

## Archivos
- `js/heatmap.js`: Funciones puras (cálculo de intensidad y generación de matriz).
- `js/app.js`: Integración con el DOM (renderizado del heatmap).
- `styles.css`: Estilos para la grilla y colores.
- `tests/heatmap.test.js`: Pruebas unitarias.

## Algoritmo
1. Agrupar sesiones por fecha.
2. Calcular minutos totales por día.
3. Función pura `calculateIntensity(min)` que devuelve nivel 0-4.
4. Función pura `generateHeatmapGrid(sessions, today)` que devuelve un array de 365 días con su nivel.