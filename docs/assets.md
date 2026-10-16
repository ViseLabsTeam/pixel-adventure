# Inventario de assets y recursos pendientes

Revisión: **16 de octubre de 2026**. Alcance: archivos de imagen presentes en el repositorio, metadatos y revisión visual. El **paladín es el conjunto completo de referencia**, según la indicación del responsable. Completo describe su catálogo recibido, no una integración ya ejecutada en el juego.

## Resumen actual

| Conjunto | Imágenes recibidas | Dimensiones de origen | Inventario y estado |
| --- | ---: | --- | --- |
| Paladín | 7 GIF | 720 × 480 | [Completo como referencia](../assets/paladin/README.md). |
| Guerrero | 4 GIF | 720 × 486 | [Faltan las tres caminatas](../assets/guerrero/README.md). |
| Mago | 5 GIF | 720 × 486 | [Faltan reposo y caminatas W/S; acciones por asignar](../assets/mago/README.md). |
| Arquero | 0 | — | No se encontraron recursos de esta clase. |
| Escenario | 1 PNG | 1200 × 1200 | [Fondo recibido; grilla de demo implementada aparte](../assets/mapas/README.md). |
| Maestro | 3 PNG | 1920 × 1080 (2) y 75 × 111 | [Guía integrado en las pantallas](../assets/maestro/README.md). |

Total: **20 imágenes: 16 GIF y 4 PNG**, con **75.228.538 bytes, aproximadamente 71,74 MiB**, de archivos fuente. El tamaño corresponde a los originales, no a una descarga optimizada del juego.

## Catálogo de referencia del paladín

La comparación utiliza siete categorías visuales. No exige el mismo nombre de archivo en todas las clases ni define efectos de habilidades.

| Categoría | Archivo de referencia |
| --- | --- |
| Reposo / animación pasiva | `animascion_pasiva.gif` |
| Caminata general | `caminata.gif` |
| Caminata W, vista de espalda | `caminata_W.gif` |
| Caminata S, vista frontal | `caminata_s.gif` |
| Ataque básico | `ataque_basico_.gif` |
| Especial | `proteccion_.gif` |
| Ulti | `ulti.gif` |

Se conserva la correspondencia explícita **`S → −Y`**. La vista de espalda de W se observó en los fotogramas; su correspondencia exacta con un eje lógico no se da por confirmada. El mapeo de la caminata general y cualquier reutilización o reflejo para otras orientaciones se definirán al integrar. No se agrega una cuarta caminata como faltante del paladín: el responsable estableció este conjunto como referencia completa.

## Comparación por personaje

`Disponible` indica un archivo que cubre visualmente la categoría. `Por asignar` indica recursos existentes cuyo uso exacto en el juego todavía no está definido. `Falta` indica que no se encontró un recurso equivalente dedicado.

| Categoría | Paladín | Guerrero | Mago | Arquero |
| --- | --- | --- | --- | --- |
| Reposo / pasiva | Disponible | Disponible: `indie.gif` | Falta | Falta |
| Caminata general | Disponible | Falta | Disponible: `caminata.gif` | Falta |
| Caminata W | Disponible | Falta | Falta | Falta |
| Caminata S / −Y | Disponible | Falta | Falta | Falta |
| Ataque básico | Disponible | Disponible: `corte.gif` | Por asignar entre los lanzamientos recibidos | Falta |
| Especial | Disponible | Disponible: `especial_.gif` | Por asignar entre los lanzamientos recibidos | Falta |
| Ulti | Disponible | Disponible: `ultimate.gif` | Por asignar; no asumir que `ice_storm.gif` completa por sí solo la animación del personaje | Falta |

El mago dispone de `bola_de_fuego_.gif`, `ice.gif` y `zaaaaap.gif`, que muestran al personaje lanzando magia. `ice_storm.gif` contiene un efecto de tornado de hielo independiente. No se cuentan las tres acciones como archivos necesariamente ausentes: primero se debe asignar el material recibido a básico, especial y ulti y decidir si necesitan una composición de personaje y efecto.

## Recursos que faltan o requieren definición

| Conjunto | Pendiente concreto | Tipo |
| --- | --- | --- |
| Paladín | Ningún archivo de las siete categorías de referencia. Retrato, spritesheets y reproducción de acciones integrados en la demo. | Integración. |
| Guerrero | Caminata general, W y S/−Y, equivalentes a las del paladín. | 3 recursos ausentes. |
| Mago | Reposo/pasiva, caminata W y caminata S/−Y. | 3 recursos ausentes. |
| Mago | Asignar los lanzamientos y el tornado a las acciones visuales; identificar si hace falta otra animación tras esa asignación. | Decisión de mapeo, no ausencia confirmada de todos los ataques. |
| Arquero | Reposo, tres caminatas, ataque básico, especial y ulti. | Conjunto de 7 categorías ausente. |
| Escenario | Grilla 10 × 10, bloqueos y entidades de demo en packages/content. Falta mapa definitivo. | Demo implementada; diseño final pendiente. |
| Escenario | Capas, tileset o fuente editable si se necesita animar, separar o reutilizar elementos de la imagen. | Material separado no recibido; no es imprescindible para usar la imagen como fondo. |
| Maestro | Sprite e ilustraciones recibidos; falta animación dedicada. | Sprite estático integrado. |
| Enemigos, cofres y zonas | No se recibieron sprites independientes. Marcadores dibujados en Phaser. | Placeholders explícitos de demo. |

Los cofres, árboles, escaleras y otros elementos visibles en el PNG están integrados en una sola imagen. No se registran como sprites independientes ni como objetos interactivos ya implementados. Tampoco se encontraron archivos separados de iconos de inventario, interfaz o audio; su necesidad y alcance se evalúan en la iteración correspondiente.

## Preparación para integrar

- Mantener los originales y los nombres exactos, incluidos `indie.gif`, `animascion_pasiva.gif`, la W mayúscula y la s minúscula de las caminatas del paladín.
- Convertir a un formato de animación utilizable por el tablero con un proceso reproducible y un manifiesto; hay retratos estáticos derivados, fondo WebP y manifiesto; hay spritesheets animados derivados y metadatos por clase.
- Normalizar punto de apoyo, escala y posición entre archivos de 720 × 480 y 720 × 486 sin deformar al personaje. El tamaño del lienzo no equivale al tamaño del sprite o de una casilla.
- Conservar los tiempos originales como referencia. Las duraciones listadas en cada inventario son una pasada del GIF; no aprueban una velocidad final de reproducción ni la duración de una acción de juego.
- Revisar los límites de los efectos antes de recortar márgenes, especialmente proyectiles, fuego y tornado. Los GIFs declaran transparencia, pero la validación final sobre el tablero sigue pendiente.
- Medir el tamaño de los recursos derivados y cargar por pantalla/escenario; no usar los aproximadamente 71,74 MiB de originales como presupuesto de descarga del controlador móvil.
- Mantener separadas la disponibilidad de arte y las reglas de habilidades, que siguen pendientes en el reglamento.

## Comprobaciones realizadas

Se inspeccionaron las dimensiones y los fotogramas de los 16 GIF, se decodificaron sus secuencias y se revisaron cinco muestras por animación: inicio, aproximadamente 25 %, 50 %, 75 % y final. Se revisó también el PNG completo del escenario. Los GIFs tienen entre 20 y 240 fotogramas; sus tiempos se obtuvieron de los retardos codificados.

El 16/10 se inspeccionaron también las tres imágenes del maestro. Tras centralizar assets, los hashes Git de los 20 originales coinciden con los del índice anterior: la reorganización no modificó sus bytes.

La demo usa el primer fotograma de pasiva del paladín, indie del guerrero y bola_de_fuego_ del mago como retratos. Esa selección es visual y no aprueba habilidades. El proceso scripts/prepare-assets.mjs genera assets/{paladin,guerrero,mago}/generated/portrait.png, assets/mapas/generated/courtyard.webp y assets/manifest.json. Los originales no se descargan en los controles móviles.

Se comprobó la presentación estática y el desplazamiento entre casillas en Phaser. La segunda iteración añade secuencias muestreadas para acciones de demo; no acredita el balance ni las orientaciones definitivas. La evidencia está en [estado del MVP](estado-mvp.md).

## Animaciones de demo

[Generador](../scripts/prepare-animations.mjs): hasta 24 fotogramas muestreados por GIF, lienzos de 256 px, sin modificar originales. Metadatos animations.json indican fuente, índices, origen y escala. El tablero reproduce acciones aceleradas (~850 ms) y movimiento (~380 ms); las duraciones no representan los tiempos originales. Reduced motion conserva el estado sin reproducción. Eventos ya vistos no se reproducen al reconectar.

Paladín: reposo, caminata genérica, caminata_s hacia −Y, básico, protección como especial visual y ulti. Guerrero: reposo y tres ataques; caminata provisional mediante traslación y pequeño balanceo, sin inventar un asset ausente. Mago: caminata genérica sin orientación confirmada y retrato en reposo. Mapeo temporal: bola_de_fuego_ básico, ice especial, zaaaaap ulti; ice_storm sigue como efecto independiente pendiente. La aprobación de valores de demo no confirma este mapeo como diseño final.
