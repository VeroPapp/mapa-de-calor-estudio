# Constitución del Proyecto

1. Simplicidad primero: HTML, CSS y JS puros. Sin dependencias ni build.
2. La spec manda: nada se implementa si no está en la spec activa.
3. Lógica separada: funciones puras, sin DOM ni localStorage; reciben «hoy».
4. Tests como puerta: node --test; prohibido avanzar con tests en rojo.
5. Datos sagrados: compatibilidad hacia atrás y hora local. Nunca se pierde una sesión.
6. Idioma: código en inglés; interfaz y documentación en español.