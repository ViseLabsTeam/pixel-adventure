# Assets del goblin

Inventario de demo revisado el 16 de octubre de 2026. Los originales se conservan junto a los recursos derivados en `generated/`.

| Archivo | Contenido | Fotogramas | Duración de una pasada |
| --- | --- | ---: | ---: |
| [Goblin_Enemy_32x32.gif](Goblin_Enemy_32x32.gif) | Reposo | 4 | 640 ms |
| [Goblin_Enemy_32x32_attack.gif](Goblin_Enemy_32x32_attack.gif) | Ataque básico visual | 4 | 440 ms |

El nombre `32x32` forma parte de los archivos recibidos; el lienzo GIF mide 160 × 160 px. `pnpm assets:prepare` genera un retrato, dos spritesheets y `animations.json`. El tablero reproduce el ataque completo, refleja horizontalmente el sprite cuando el objetivo queda a la izquierda y revela daño o fallo al terminar. El goblin es un enemigo de demo; sus estadísticas no son balance definitivo.
