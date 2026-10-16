# Assets del paladín

Inventario revisado el 15 de octubre de 2026. **Conjunto completo de referencia**, según la indicación del responsable: siete GIFs. Comparación con las demás clases y faltantes en el [inventario general](../../docs/assets.md).

## Archivos disponibles

Todos los archivos tienen un lienzo de **720 × 480** y transparencia declarada. Duración: suma de los retardos de una pasada del GIF, sin contar repeticiones.

| Archivo | Fotogramas | Duración | Contenido observado / referencia |
| --- | ---: | ---: | --- |
| [animascion_pasiva.gif](animascion_pasiva.gif) | 27 | 1,08 s | Reposo con escudo; se conserva el nombre original. |
| [caminata.gif](caminata.gif) | 20 | 0,79 s | Caminata general; correspondencia con los ejes pendiente. |
| [caminata_W.gif](caminata_W.gif) | 54 | 2,20 s | Caminata vista de espalda; eje lógico pendiente. |
| [caminata_s.gif](caminata_s.gif) | 96 | 3,95 s | Caminata frontal; S hacia −Y según la convención indicada. |
| [ataque_basico_.gif](ataque_basico_.gif) | 57 | 2,33 s | Ataque con escudo. |
| [proteccion_.gif](proteccion_.gif) | 179 | 7,41 s | Especial con efecto luminoso alrededor del personaje. |
| [ulti.gif](ulti.gif) | 240 | 9,95 s | Ulti con escudo y efecto luminoso amplio. |

Los nombres de las animaciones no definen por sí mismos efectos, costos ni estadísticas de habilidades; esos datos siguen pendientes según el reglamento.

## Direcciones y disponibilidad

- La caminata antes pendiente como `caminata_S` ya está disponible en `caminata_s.gif`.
- Conservar la correspondencia explícita **`S → −Y`** al preparar el manifiesto de animaciones.
- Respetar el nombre real `caminata_s.gif`, con `s` minúscula, en las rutas. La correspondencia de las demás caminatas con los ejes sigue pendiente.
- No falta ningún archivo respecto del conjunto de referencia indicado. El mapeo de ejes y la preparación para el motor son tareas de integración.

## Estado de integración

Los GIFs están disponibles como recursos fuente. Se revisaron metadatos y cinco muestras de cada animación; se integraron secuencias muestreadas en el tablero de demo. Los originales conservan todos los fotogramas y tiempos; el manifiesto de demo registra los índices muestreados y debe evolucionar para conservar tiempos detallados y definir escala, punto de apoyo, reproducción y correspondencia de las otras caminatas con los ejes. Ver los pendientes comunes en el inventario general.

## Integración de demo — 16/10/2026

Originales conservados en esta carpeta. El proceso `pnpm assets:prepare` genera [portrait.png](generated/portrait.png) desde el primer fotograma, con recorte transparente y escala proporcional. El retrato se usa en ficha, selección y tablero; el desplazamiento del tablero interpola posiciones. La segunda iteración añade secuencias animadas; las orientaciones completas quedan pendientes. Ver [contrato de demo](../../docs/demo.md).

### Integración de demo: segunda iteración

Spritesheets derivados y animations.json en generated, reproducibles con `pnpm assets:prepare`. Asignaciones, tiempos abreviados y fallbacks documentados en [inventario general](../../docs/assets.md#animaciones-de-demo). Originales conservados.
