# Sonidos de la mesa

Los cuatro WAV de `generated/` son originales de este proyecto. Se generan con
[`scripts/generate-sfx.mjs`](../../scripts/generate-sfx.mjs), sin muestras ni
archivos de terceros, mediante `pnpm assets:prepare`. El procedimiento es
determinista y deja los resultados versionados para el build de Docker.

| Archivo | Acción | Duración |
| --- | --- | ---: |
| `generated/damage.wav` | Daño positivo a jugador o enemigo | 0,28 s |
| `generated/equip.wav` | Equipar una pieza | 0,48 s |
| `generated/unequip.wav` | Desequipar una pieza | 0,34 s |
| `generated/heal.wav` | Consumir poción o beber de la fuente | 0,72 s |

Formato: WAVE PCM lineal, 16 bits, mono, 22.050 Hz. No se incorporaron recursos
externos y no se asigna aquí una licencia distinta de la del proyecto.
