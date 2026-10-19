# Assets del guerrero

Inventario revisado el **17 de octubre de 2026**. Seis GIFs disponibles. Referencia de completitud: las siete categorías del [paladín](../paladin/README.md). Ver también el [inventario general](../../docs/assets.md).

## Archivos disponibles

Todos tienen un lienzo de **720 × 486** y transparencia declarada. La duración corresponde a una pasada según los retardos del GIF.

| Archivo | Fotogramas | Duración | Contenido observado |
| --- | ---: | ---: | --- |
| [indie.gif](indie.gif) | 29 | 1,16 s | Reposo del personaje con espada; equivalente visual de pasiva/idle. Se conserva el nombre `indie`. |
| [corte.gif](corte.gif) | 192 | 7,95 s | Corte de espada con estela clara; equivalente visual del ataque básico. |
| [especial_.gif](especial_.gif) | 192 | 7,95 s | Corte y efecto de fuego; categoría visual de especial. |
| [ultimate.gif](ultimate.gif) | 185 | 7,66 s | Secuencia con salto/impacto y efectos de energía, fuego y humo; categoría visual de ulti. |
| [caminata_w.gif](caminata_w.gif) | 53 | 2,16 s | Caminata W, asignada a subida (−Y) en la demo. |
| [caminata_s.gif](caminata_s.gif) | 40 | 1,62 s | Caminata S, asignada a bajada (+Y) en la demo. |

Las equivalencias organizan los recursos observados. No fijan daño, costos, alcance ni efectos mecánicos de habilidades.

## Recursos faltantes

Falta **la caminata lateral general**, equivalente a la del paladín:

- Caminata general, referencia `caminata.gif`.

Ese es un nombre de referencia, no un archivo existente en esta carpeta. No falta una animación de reposo: `indie.gif` cubre visualmente esa categoría.

## Integración pendiente

Se revisaron metadatos y cinco muestras de cada GIF. El generador prepara manifiesto, recursos derivados, punto de apoyo y escala respecto del paladín. Se comprobó el especial del guerrero en el tablero. La clasificación visual de corte/especial/ulti no sustituye la definición de habilidades del reglamento.

## Integración de demo — 16/10/2026

Originales conservados en esta carpeta. El proceso `pnpm assets:prepare` genera [portrait.png](generated/portrait.png) desde el primer fotograma, con recorte transparente y escala proporcional. El retrato se usa en ficha, selección y tablero; el desplazamiento del tablero interpola posiciones. La segunda iteración añade secuencias animadas; las orientaciones completas quedan pendientes. Ver [contrato de demo](../../docs/demo.md).

### Integración de demo: segunda iteración

Spritesheets derivados y animations.json en generated, reproducibles con `pnpm assets:prepare`. Asignaciones, tiempos originales y fallbacks documentados en [inventario general](../../docs/assets.md#animaciones-de-demo). Originales conservados.

La integración actual conserva todos los fotogramas de las acciones recibidas. El tamaño visual es 1,5 casillas (paladín 1,6) sin ampliar colisión. W y S se reproducen durante 2 s por casilla. Por falta de GIF lateral, el guerrero usa reposo animado, traslación y balanceo horizontal durante 2 s.
