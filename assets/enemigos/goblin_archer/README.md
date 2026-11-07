# Assets del goblin arquero

Inventario del 6 de noviembre de 2026. Se conservan los 16 GIF originales (225.690 bytes). Aunque sus nombres indican `64x64`, los lienzos recibidos miden **320 × 320 px** y tienen transparencia.

| Familia de archivos | Direcciones recibidas | Fotogramas | Duración original |
| --- | --- | ---: | ---: |
| `64x64 Goblin Archer Bow_idle_*.gif` | east, north, south, west | 4 | 480 ms |
| `64x64 Goblin Archer Bow_move_*.gif` | east, north, south, west | 6 | 600 ms |
| `64x64 Goblin Archer Bow_attack_*.gif` | east, north, south, west | 7 | 750 ms |
| `64x64 Goblin Archer Bow_arrow_*.gif` | east, north, south, west | 6 | 510 ms |

## Integración de demo

La [receta de actor](../../../packages/content/actor-recipes.json) asigna reposo y ataque `east`; la horizontal se refleja hacia la izquierda. Movimiento usa `east` para X, `north` para −Y y `south` para +Y. Las caminatas derivadas duran 2 segundos por casilla, conservando todos los fotogramas. La altura visual es 84 px; la ocupación lógica sigue siendo una casilla. `pnpm assets:prepare` genera `generated/portrait.png`, cinco spritesheets y `generated/animations.json`, registrados en el manifiesto general. Los originales quedan intactos.

Los reposos y ataques north/south/west, el movimiento west y los cuatro proyectiles están **disponibles, pendientes de asignación**. El ataque básico reproduce el disparo del arquero; no hay un proyectil independiente animado todavía. No faltan estos archivos ni se infieren habilidades a partir de sus nombres. Especial y ulti no son acciones definidas para este enemigo.

El catálogo compartido por servidor y editor incluye `goblin-archer` («Goblin arquero»), con alcance 3, movimiento 1 y vida 18 como **valores provisionales de prueba**. El editor permite colocarlo sin modificar las ubicaciones existentes del mapa. También contiene una serpiente provisional para los cofres, sin recursos gráficos propios: usa el marcador del tablero.

Se inspeccionaron metadatos de los 16 originales y el primer fotograma del reposo east. La inspección de metadatos y la generación no acreditan por sí solas una prueba visual completa del combate. Referencia de categorías: [paladín](../../paladin/README.md) e [inventario general](../../../docs/assets.md).
