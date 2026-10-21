# Assets de escenario

Inventario revisado el **16 de octubre de 2026**. Ver el [inventario general](../../docs/assets.md) para el estado del resto del arte.

## Archivo disponible

| Archivo                                  | Formato | Dimensiones |        Tamaño |
| ---------------------------------------- | ------- | ----------- | ------------: |
| [Scene_Overview.png](Scene_Overview.png) | PNG     | 1200 × 1200 | 836.279 bytes |

La imagen muestra una vista general de un escenario de ruinas con vegetación, caminos, muros, escaleras, cofres y plataformas. Se revisó la imagen completa. Es una composición visual plana: la presencia de esos elementos no les asigna colisión, botín ni comportamiento de juego.

## Disponible y pendiente

- Disponible: imagen de referencia o posible fondo del escenario.
- Demo: mundo lógico de 58 × 70 casillas; ventana visible de unas 10 × 10, casilla visual de 70 píxeles y cámara que sigue al personaje activo.
- Demo: bloqueos, apariciones, cofres, fuente y salida definidos en el preset. Diseño definitivo pendiente.
- No recibidos: mapa editable de Tiled o exportación lógica, tileset separado y capas individuales. Una capa lógica propia permitiría usar la imagen como fondo; no se necesita inventar archivos de origen para hacerlo.
- No recibidos como recursos independientes: los cofres, árboles y otros elementos que aparecen integrados en la imagen. Para animarlos o permitir cambios visuales separados se necesitará material específico o un proceso de preparación definido.

## Integración

La demo usa la imagen como fondo con propiedades lógicas independientes y marcadores superpuestos. [collision.json](collision.json) es la fuente editable de muros, troncos y siluetas de los siete árboles grandes visibles. [collisionV2.json](collisionV2.json) es la fuente de prueba vigente desde el 20/10/2026: incluye 30 enemigos, 11 cofres, ocho plantas y cuatro apariciones. Conserva 1197 bloqueos y seis copas; la silueta noroeste sigue vacía y tres árboles no tienen tronco marcado. Los arbustos, rocas y objetos menores siguen fuera del trazado. [collision-pre-v2.json](collision-pre-v2.json) conserva el mapa anterior a esta incorporación; el archivo V2 original no se modifica.

## Integración de demo — 16/10/2026

[Escenario WebP](generated/courtyard.webp) derivado del original por `pnpm assets:prepare`. El [preset](../../packages/content/src/prototype.ts) define límites, bloqueos, apariciones, cofres y zonas de demo por separado. La [máscara provisional](../../packages/content/src/courtyard-terrain.ts) delimita la silueta visible de las ruinas; los objetos individuales dibujados no tienen colisiones propias. No se recibieron capas editables ni tileset.

### Recuperación de carga

El tablero muestra progreso de carga y permite «Reintentar gráficos» sin reiniciar la partida cuando el fondo no está disponible. Una animación o su manifiesto ausente no debe impedir dibujar el mapa; se conserva el retrato de la clase como alternativa.

### Escala del piso

El fondo se amplía con escala 70/16: las piedras repiten una celda de 16 píxeles del original y cada una corresponde a una casilla lógica. El origen lógico (0,0) corresponde a (494,366) del PNG; la cámara muestra una ventana y se desplaza por el escenario, incluidos ejes negativos. La silueta transitable se genera desde el PNG. El trazado manual de `collision.json` genera [casillas bloqueadas](../../packages/content/src/courtyard-collision.ts) y capas PNG transparentes en `generated/` mediante `node scripts/prepare-map.mjs`, también invocado por `assets:prepare`. La copa solo modifica el orden visual; la colisión corresponde al tronco. El PNG original permanece intacto.

Con Vite en desarrollo, abrir `http://localhost:5173/map-editor.html`. Permite cargar otro PNG, ajustar origen/casilla/zoom, pintar o borrar muros y troncos, delinear árboles, ver las capas con un personaje de prueba e importar/exportar el JSON. El archivo descargado debe revisarse e incorporarse al repositorio para usarlo; el editor no cambia campañas ni la base de datos. La página no se incluye en el bundle de producción.

El [tutorial](../../docs/tutorial-editor-mapas.md) explica cómo marcar también cuatro apariciones, cofres con `itemDefinition` e interactuables. El generador conecta estos puntos al preset de partidas nuevas. Un interactuable entrega una vez el objeto configurado mediante la acción `INTERACT`; otros efectos, como palancas, requieren reglas propias.

El editor también coloca, arrastra, selecciona y elimina enemigos desde el [catálogo](../../packages/content/enemy-recipes.json). `collision.json` guarda cada aparición con ID propio, tipo y coordenadas; `prepare-map.mjs` genera `courtyardEnemies` y el preset crea los enemigos desde esas ubicaciones. Los JSON anteriores sin esa sección conservan los tres enemigos originales definidos en [legacy-enemies.json](legacy-enemies.json); una lista vacía explícita elimina todos los enemigos para las partidas nuevas. No se modificaron los originales `collisionV1.json` ni `collision (1).json`.
