# Inventario de assets y recursos pendientes

La interfaz usa [Pixel Operator](../assets/fuentes/pixel-operator/README.md), una fuente bitmap con variantes regular y negrita y licencia CC0 incluida. Es un recurso de UI separado de las imágenes de personajes y escenario contabilizadas abajo. La mesa usa además [cuatro sonidos originales](../assets/audio/README.md) generados para este proyecto.

Revisión: **27 de octubre de 2026**. Alcance: archivos de imagen y audio presentes en el repositorio, metadatos e integración de demo. El **paladín es el conjunto completo de referencia**, según la indicación del responsable. Completo describe su catálogo recibido, no el balance definitivo.

## Resumen actual

| Conjunto  | Imágenes recibidas | Dimensiones de origen      | Inventario y estado                                                                          |
| --------- | -----------------: | -------------------------- | -------------------------------------------------------------------------------------------- |
| Paladín   |              7 GIF | 720 × 480                  | [Completo como referencia](../assets/paladin/README.md).                                     |
| Guerrero  |              7 GIF | 720 × 486                  | [Pasiva duplicada recibida; W/S integradas, lateral temporal](../assets/guerrero/README.md). |
| Mago      |              8 GIF | 720 × 486                  | [Reposo integrado; caminatas W/S y acciones por asignar](../assets/mago/README.md).          |
| Arquera   |              7 GIF | 720 px de ancho            | [Jugable; reposo integrado](../assets/arquera/README.md).                                    |
| Escenario |              1 PNG | 1200 × 1200                | [Fondo recibido; grilla de demo implementada aparte](../assets/mapas/README.md).             |
| Maestro   |              3 PNG | 1920 × 1080 (2) y 75 × 111 | [Guía integrado en las pantallas](../assets/maestro/README.md).                              |
| Goblin    |              2 GIF | 32 × 32                    | [Reposo y ataque integrados](../assets/enemigos/goblin/README.md).                           |
| Dados     |              2 GIF | 320 × 320                  | [D6 y D20 integrados en el control y la mesa](../assets/dados/README.md).                    |

Total: **37 imágenes: 33 GIF y 4 PNG**, con **111.720.227 bytes, aproximadamente 106,54 MiB**, de archivos fuente. El tamaño corresponde a los originales, no a una descarga optimizada del juego.

El [audio de la mesa](../assets/audio/README.md) consta de cuatro WAV mono de menos de un segundo: daño, equipar, desequipar y curarse. Proceden de un generador determinista propio, sin muestras de terceros; no forman parte del conteo de imágenes. Las partículas y los brillos de daño, equipo y poción se dibujan en Phaser y no requieren imágenes adicionales.

## Catálogo de referencia del paladín

La comparación utiliza siete categorías visuales. No exige el mismo nombre de archivo en todas las clases ni define efectos de habilidades.

| Categoría                    | Archivo de referencia   |
| ---------------------------- | ----------------------- |
| Reposo / animación pasiva    | `animascion_pasiva.gif` |
| Caminata general             | `caminata.gif`          |
| Caminata W, vista de espalda | `caminata_W.gif`        |
| Caminata S, vista frontal    | `caminata_s.gif`        |
| Ataque básico                | `ataque_basico_.gif`    |
| Especial                     | `proteccion_.gif`       |
| Ulti                         | `ulti.gif`              |

La corrección vigente asigna **`W → arriba (−Y)`** y **`S → abajo (+Y)`**. La caminata general se usa para derecha/izquierda y se refleja horizontalmente al mirar a la izquierda. No se agrega una cuarta caminata como faltante del paladín: el responsable estableció este conjunto como referencia completa.

## Comparación por personaje

`Disponible` indica un archivo que cubre visualmente la categoría. `Por asignar` indica recursos existentes cuyo uso exacto en el juego todavía no está definido. `Falta` indica que no se encontró un recurso equivalente dedicado.

| Categoría        | Paladín    | Guerrero                                                     | Mago                                                                           | Arquero                            |
| ---------------- | ---------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------- |
| Reposo / pasiva  | Disponible | Disponible: `animacion_pasiva.gif` (`indie.gif` es idéntico) | Disponible: `animacion_pasiva.gif`                                             | Disponible: `animacion_pasiva.gif` |
| Caminata general | Disponible | Falta                                                        | Disponible: `caminata.gif`                                                     | Disponible: `caminata_.gif`        |
| Caminata W       | Disponible | Disponible: `caminata_w.gif`                                 | Disponible: `caminata_w.gif`                                                   | Disponible: `caminata_w.gif`       |
| Caminata S / +Y  | Disponible | Disponible: `caminata_s.gif`                                 | Disponible: `caminata_s.gif`                                                   | Disponible: `caminata_s.gif`       |
| Ataque básico    | Disponible | Disponible: `corte.gif`                                      | Mapeo temporal: `bola_de_fuego_.gif`                                           | Disponible: `basico_.gif`          |
| Especial         | Disponible | Disponible: `especial_.gif`                                  | Mapeo temporal: `ice.gif`                                                      | Disponible: `especial.gif`         |
| Ulti             | Disponible | Disponible: `ultimate.gif`                                   | Mapeo temporal: `zaaaaap.gif`; `ice_storm.gif` sigue como efecto independiente | Disponible: `ulti.gif`             |

El mago dispone de `bola_de_fuego_.gif`, `ice.gif` y `zaaaaap.gif`, que muestran al personaje lanzando magia. `ice_storm.gif` contiene un efecto de tornado de hielo independiente. No se cuentan las tres acciones como archivos necesariamente ausentes: primero se debe asignar el material recibido a básico, especial y ulti y decidir si necesitan una composición de personaje y efecto.

## Recursos que faltan o requieren definición

| Conjunto                 | Pendiente concreto                                                                                                                                                                                         | Tipo                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Paladín                  | Ningún archivo de las siete categorías de referencia. Retrato, spritesheets y reproducción de acciones integrados en la demo.                                                                              | Integración.                                                                        |
| Guerrero                 | Caminata general/lateral, equivalente a la del paladín.                                                                                                                                                    | 1 recurso ausente.                                                                  |
| Mago                     | Caminatas W/S recibidas; reposo integrado desde `animacion_pasiva.gif`.                                                                                                                                    | Integración.                                                                        |
| Mago                     | Asignar los lanzamientos y el tornado a las acciones visuales; identificar si hace falta otra animación tras esa asignación.                                                                               | Decisión de mapeo, no ausencia confirmada de todos los ataques.                     |
| Arquera                  | Reposo integrado desde `animacion_pasiva.gif`.                                                                                                                                                             | Integración.                                                                        |
| Escenario                | Mundo 58 × 70 con silueta transitable provisional, trazado manual de muros/troncos y seis copas separadas; la silueta noroeste quedó vacía para redibujarla. Falta revisar objetos menores y diseño final. | Demo implementada; una copa y el diseño final pendientes.                           |
| Escenario                | Capas, tileset o fuente editable si se necesita animar, separar o reutilizar elementos de la imagen.                                                                                                       | Material separado no recibido; no es imprescindible para usar la imagen como fondo. |
| Maestro                  | Sprite e ilustraciones recibidos; falta animación dedicada.                                                                                                                                                | Sprite estático integrado.                                                          |
| Enemigos, cofres y zonas | Goblin: reposo y ataque recibidos e integrados. Otros enemigos, cofres y zonas siguen con marcadores Phaser.                                                                                               | Integración parcial de demo.                                                        |

El [inventario del goblin](../assets/enemigos/goblin/README.md) registra los dos GIF recibidos y los derivados. Los [dados D6/D20](../assets/dados/README.md) están integrados en las tiradas móviles y en la presentación compartida de la mesa, con una pasada de 1,6 s y vistas estáticas derivadas para los botones.

El editor de mapas permite colocar y mover apariciones del [catálogo de enemigos](../packages/content/enemy-recipes.json), incluidos tipos con marcador provisional. Las ubicaciones se guardan en `collision.json` y se generan para las partidas nuevas; colocar un enemigo no agrega archivos de arte ni aprueba habilidades. El [tutorial](tutorial-editor-mapas.md) describe la edición y la incorporación al juego.

Los cofres, árboles, escaleras y otros elementos visibles en el PNG llegaron integrados en una sola imagen. Siete árboles grandes tienen ahora recortes transparentes derivados del PNG para ordenar su copa frente a los personajes; no son objetos interactivos. Cofres y zonas mantienen marcadores de demo. No se encontraron archivos separados de iconos de inventario o interfaz; su necesidad y alcance se evalúan en la iteración correspondiente. Los cuatro sonidos de acción fueron creados en este proyecto y no provienen de los recursos gráficos recibidos.

## Preparación para integrar

- Mantener los originales y los nombres exactos, incluidos `indie.gif`, `animascion_pasiva.gif`, la W mayúscula y la s minúscula de las caminatas del paladín.
- Convertir a un formato de animación utilizable por el tablero con un proceso reproducible y un manifiesto; hay retratos estáticos derivados, fondo WebP y manifiesto; hay spritesheets animados derivados y metadatos por clase.
- Normalizar punto de apoyo, escala y posición entre archivos de 720 × 480 y 720 × 486 sin deformar al personaje. El tamaño del lienzo no equivale al tamaño del sprite o de una casilla.
- Conservar los tiempos originales como referencia. Las duraciones listadas en cada inventario son una pasada del GIF; no aprueban una velocidad final de reproducción ni la duración de una acción de juego.
- Revisar los límites de los efectos antes de recortar márgenes, especialmente proyectiles, fuego y tornado. Los GIFs declaran transparencia, pero la validación final sobre el tablero sigue pendiente.
- Medir el tamaño de los recursos derivados y cargar por pantalla/escenario; no usar los aproximadamente 71,74 MiB de originales como presupuesto de descarga del controlador móvil.
- Mantener separadas la disponibilidad de arte y las reglas de habilidades, que siguen pendientes en el reglamento.

## Comprobaciones realizadas

En la primera revisión se inspeccionaron las dimensiones y los fotogramas de los 16 GIF iniciales, se decodificaron sus secuencias y se revisaron cinco muestras por animación: inicio, aproximadamente 25 %, 50 %, 75 % y final. Se revisó también el PNG completo del escenario. En esta iteración se leyeron metadatos y retardos de las ocho incorporaciones del guerrero y la arquera, se generaron sus hojas completas y se comprobó el retrato de la arquera y su carga en el tablero. Los tiempos se obtuvieron de los retardos codificados.

El 16/10 se inspeccionaron también las tres imágenes del maestro. Tras centralizar assets, los hashes Git de los 20 originales coinciden con los del índice anterior: la reorganización no modificó sus bytes.

La demo deriva retratos PNG estáticos del primer fotograma de la fuente de receta y `idle-portrait.webp` animados de los GIF pasivos disponibles para las cuatro clases. Esa selección es visual y no aprueba habilidades. `scripts/prepare-assets.mjs` genera los derivados, el escenario WebP y `assets/manifest.json`. Los originales no se descargan en los controles móviles.

Se comprobó la presentación estática y el desplazamiento entre casillas en Phaser. La segunda iteración añade secuencias completas para acciones de demo; no acredita el balance ni las orientaciones definitivas. La evidencia está en [estado del MVP](estado-mvp.md).

## Animaciones de demo

[Generador](../scripts/prepare-animations.mjs): todos los fotogramas de cada GIF, lienzos de 256 px, sin modificar originales. Las [recetas de actores](../packages/content/actor-recipes.json) describen carpeta, fuente de retrato, altura y clips de cada clase/tipo de enemigo; generador y tablero comparten el catálogo. Metadatos animations.json indican fuente, índices, retardos por fotograma, duración, origen y escala. Los retardos de ataque y reposo respetan el GIF; un retardo cero se presenta durante 100 ms. Los retardos de las caminatas se distribuyen proporcionalmente para que una pasada dure 2 s en cualquier dirección. El catálogo generado animation-timings.ts proporciona las mismas duraciones al servidor. Los bucles de reposo no bloquean turnos. Reducir movimiento conserva el estado sin reproducción; respeta el tiempo mínimo común. Eventos ya vistos no se reproducen al reconectar.

Paladín: reposo, caminata genérica horizontal, W hacia −Y y S hacia +Y, básico, protección como especial visual y ulti. Guerrero: reposo, tres ataques, W y S; para X usa temporalmente los fotogramas de `caminata_s.gif` durante 2 s y para −X el mismo clip reflejado. Falta el recurso lateral propio. Mago y arquera: reposo animado desde `animacion_pasiva.gif`, caminata horizontal, W hacia −Y y S hacia +Y, y tres ataques visuales. Todas las caminatas disponibles reproducen todos sus fotogramas en 2 s. Goblin: reposo y ataque. Los sprites se reflejan horizontalmente para mirar a izquierda/derecha. Mapeo temporal del mago: bola*de_fuego* básico, ice especial, zaaaaap ulti; ice_storm sigue como efecto independiente pendiente. La aprobación de valores de demo no confirma estos mapeos como diseño final.

El generador produce `idle-portrait.webp` animado y recortado para las cuatro clases a partir de sus GIF de reposo. Sus retratos de selección siguen siendo PNG estáticos.

El cuerpo visual mide 105 px (1,5 casillas de 70 px); el paladín 112 px (1,6 casillas). El punto de apoyo y las colisiones siguen usando una sola casilla. Los efectos de ataque pueden extenderse fuera del cuerpo.
