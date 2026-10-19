# Assets del mago

Inventario revisado el **16 de octubre de 2026**. Siete GIFs disponibles. Se comparan con las siete categorías del [paladín](../paladin/README.md), usando la distinción entre recurso ausente y acción pendiente de asignar del [inventario general](../../docs/assets.md).

## Archivos disponibles

Todos tienen un lienzo de **720 × 486** y transparencia declarada. La duración corresponde a una pasada según los retardos del GIF.

| Archivo | Fotogramas | Duración | Contenido observado |
| --- | ---: | ---: | --- |
| [caminata.gif](caminata.gif) | 31 | 1,25 s | Caminata del mago de perfil; eje lógico pendiente. |
| [caminata_w.gif](caminata_w.gif) | 79 | 3,25 s | Vista de espalda, subida (W, −Y). |
| [caminata_s.gif](caminata_s.gif) | 36 | 1,45 s | Vista frontal, bajada (S, +Y). |
| [bola_de_fuego_.gif](bola_de_fuego_.gif) | 96 | 3,95 s | Personaje preparando y lanzando una bola de fuego. |
| [ice.gif](ice.gif) | 96 | 3,95 s | Personaje preparando y lanzando un efecto de hielo. |
| [zaaaaap.gif](zaaaaap.gif) | 96 | 3,95 s | Personaje preparando y lanzando un efecto eléctrico. |
| [ice_storm.gif](ice_storm.gif) | 96 | 3,95 s | Tornado de hielo independiente; las muestras no incluyen al personaje. |

## Recursos faltantes

Se identifica **una categoría sin un recurso dedicado**:

- Reposo / animación pasiva, equivalente a `animascion_pasiva.gif` del paladín.

Las poses de espera incluidas al principio de los lanzamientos no se consideran automáticamente una animación de reposo independiente. Los nuevos archivos `caminata_w.gif` y `caminata_s.gif` usan minúsculas; sus vistas se verificaron antes de asignar los ejes.

## Acciones por asignar

Todavía no está confirmada la correspondencia definitiva de `bola_de_fuego_.gif`, `ice.gif` y `zaaaaap.gif` con ataque básico, especial y ulti. `ice_storm.gif` aporta un efecto que puede requerir composición con la animación del personaje; no se clasifica automáticamente como ulti completa.

No registrar tres ataques como faltantes solo porque sus nombres difieran de los del paladín. Primero asignar los recursos recibidos y determinar si alguna acción elegida requiere otra animación. Esta asignación visual no aprueba reglas, costos, estados alterados ni estadísticas.

## Integración pendiente

Se revisaron muestras de las nuevas caminatas. Hay derivados, escala, punto de apoyo y mapeo temporal de acciones; falta confirmar la composición con efectos independientes. Conservar los efectos completos al recortar y validar en el tablero. La demo integra caminatas horizontal, W y S y tres lanzamientos; el tornado sigue pendiente.

## Integración de demo — 16/10/2026

Originales conservados en esta carpeta. El proceso `pnpm assets:prepare` genera [portrait.png](generated/portrait.png) desde el primer fotograma, con recorte transparente y escala proporcional. El retrato se usa en ficha, selección y tablero; el desplazamiento del tablero interpola posiciones. La segunda iteración añade secuencias animadas; las orientaciones completas quedan pendientes. Ver [contrato de demo](../../docs/demo.md).

### Integración de demo: segunda iteración

Spritesheets derivados y animations.json en generated, reproducibles con `pnpm assets:prepare`. Asignaciones, tiempos originales y fallbacks documentados en [inventario general](../../docs/assets.md#animaciones-de-demo). Originales conservados.

La integración actual conserva todos los fotogramas. El tamaño visual es 1,5 casillas (paladín 1,6) sin ampliar colisión. Las caminatas W, S y lateral derivadas duran 2 s por casilla; los retardos cero reciben 100 ms antes del ajuste proporcional. El guerrero conserva una caminata lateral provisional.
