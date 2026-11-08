# Spec 001: Mapa de Calor de Estudio

## Requisitos funcionales (EARS)
- RF-1 (ubicuo): EL SISTEMA mostrará una grilla con los últimos 365 días en 7 filas (días de la semana).
- RF-2 (evento): CUANDO el usuario registre una sesión, EL SISTEMA actualizará el color de la celda de ese día.
- RF-3 (estado): MIENTRAS los minutos de un día sean 0, EL SISTEMA pintará la celda en gris tenue (#E2E8F0).
- RF-4 (error): SI localStorage contiene un registro corrupto, ENTONCES EL SISTEMA lo ignorará y avisará por consola sin romper la pantalla.
- RF-5 (ubicuo): EL SISTEMA asignará el nivel 0 (0 min), 1 (1-30), 2 (31-60), 3 (61-120) o 4 (más de 120) según los minutos del día.