# Assets de escenario

Inventario revisado el **16 de octubre de 2026**. Ver el [inventario general](../../docs/assets.md) para el estado del resto del arte.

## Archivo disponible

| Archivo | Formato | Dimensiones | Tamaño |
| --- | --- | --- | ---: |
| [Scene_Overview.png](Scene_Overview.png) | PNG | 1200 × 1200 | 836.279 bytes |

La imagen muestra una vista general de un escenario de ruinas con vegetación, caminos, muros, escaleras, cofres y plataformas. Se revisó la imagen completa. Es una composición visual plana: la presencia de esos elementos no les asigna colisión, botín ni comportamiento de juego.

## Disponible y pendiente

- Disponible: imagen de referencia o posible fondo del escenario.
- Demo: mundo lógico de 58 × 70 casillas; ventana visible de unas 10 × 10, casilla visual de 70 píxeles y cámara que sigue al personaje activo.
- Demo: bloqueos, apariciones, cofres, fuente y salida definidos en el preset. Diseño definitivo pendiente.
- No recibidos: mapa editable de Tiled o exportación lógica, tileset separado y capas individuales. Una capa lógica propia permitiría usar la imagen como fondo; no se necesita inventar archivos de origen para hacerlo.
- No recibidos como recursos independientes: los cofres, árboles y otros elementos que aparecen integrados en la imagen. Para animarlos o permitir cambios visuales separados se necesitará material específico o un proceso de preparación definido.

## Integración

La demo usa la imagen como fondo con propiedades lógicas independientes y marcadores superpuestos. La geometría y los obstáculos dibujados dentro del PNG no sustituyen esos marcadores. Las capas editables y el mapa definitivo siguen pendientes.

## Integración de demo — 16/10/2026

[Escenario WebP](generated/courtyard.webp) derivado del original por `pnpm assets:prepare`. El [preset](../../packages/content/src/prototype.ts) define límites, bloqueos, apariciones, cofres y zonas de demo por separado. La [máscara provisional](../../packages/content/src/courtyard-terrain.ts) delimita la silueta visible de las ruinas; los objetos individuales dibujados no tienen colisiones propias. No se recibieron capas editables ni tileset.

### Recuperación de carga

El tablero muestra progreso de carga y permite «Reintentar gráficos» sin reiniciar la partida cuando el fondo no está disponible. Una animación o su manifiesto ausente no debe impedir dibujar el mapa; se conserva el retrato de la clase como alternativa.

### Escala del piso

El fondo se amplía con escala 70/16: las piedras repiten una celda de 16 píxeles del original y cada una corresponde a una casilla lógica. El origen lógico (0,0) corresponde a (494,366) del PNG; la cámara muestra una ventana y se desplaza por el escenario, incluidos ejes negativos. La silueta transitable se genera desde el PNG; muros, árboles y escaleras aún requieren una capa de colisiones diseñada a mano.
