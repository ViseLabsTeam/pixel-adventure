# Assets de la arquera

Inventario revisado el **19 de octubre de 2026**. Se recibieron siete GIF originales de 720 px de ancho. El [paladín](../paladin/README.md) sirve de referencia para las siete categorías visuales y el [inventario general](../../docs/assets.md) distingue lo disponible de lo pendiente.

| Archivo | Fotogramas | Pasada original | Uso provisional de demo |
| --- | ---: | ---: | --- |
| [animacion_pasiva.gif](animacion_pasiva.gif) | 99 | 4,10 s | Reposo/pasiva; fuente del retrato animado. |
| [caminata_.gif](caminata_.gif) | 60 | 2,45 s | Caminata lateral; espejo hacia la izquierda. |
| [caminata_w.gif](caminata_w.gif) | 60 | 2,45 s | Subida (−Y). |
| [caminata_s.gif](caminata_s.gif) | 35 | 1,41 s | Bajada (+Y). |
| [basico_.gif](basico_.gif) | 96 | 3,95 s | Ataque básico visual y fuente del retrato. |
| [especial.gif](especial.gif) | 96 | 3,95 s | Especial visual. |
| [ulti.gif](ulti.gif) | 192 | 7,95 s | Ulti visual. |

La pasiva `animacion_pasiva.gif` se usa para el retrato animado de la ficha y del tablero; el retrato estático de selección se deriva de su primer fotograma. Las caminatas conservan todos sus fotogramas con retardos redistribuidos para durar **2 s por casilla**; las acciones mantienen sus retardos. Los originales no se modifican. El alcance 3, la poca vida y el daño alto de la arquera se implementan con valores de prueba, no como balance definitivo.
