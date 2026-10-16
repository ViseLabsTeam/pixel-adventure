# Assets del guerrero

Inventario revisado el **15 de octubre de 2026**. Cuatro GIFs disponibles. Referencia de completitud: las siete categorías del [paladín](../paladin/README.md). Ver también el [inventario general](../../docs/assets.md).

## Archivos disponibles

Todos tienen un lienzo de **720 × 486** y transparencia declarada. La duración corresponde a una pasada según los retardos del GIF.

| Archivo | Fotogramas | Duración | Contenido observado |
| --- | ---: | ---: | --- |
| [indie.gif](indie.gif) | 29 | 1,16 s | Reposo del personaje con espada; equivalente visual de pasiva/idle. Se conserva el nombre `indie`. |
| [corte.gif](corte.gif) | 192 | 7,95 s | Corte de espada con estela clara; equivalente visual del ataque básico. |
| [especial_.gif](especial_.gif) | 192 | 7,95 s | Corte y efecto de fuego; categoría visual de especial. |
| [ultimate.gif](ultimate.gif) | 185 | 7,66 s | Secuencia con salto/impacto y efectos de energía, fuego y humo; categoría visual de ulti. |

Las equivalencias organizan los recursos observados. No fijan daño, costos, alcance ni efectos mecánicos de habilidades.

## Recursos faltantes

Faltan **tres animaciones de caminata**, equivalentes a las del paladín:

- Caminata general, referencia `caminata.gif`.
- Caminata W, referencia `caminata_W.gif`, vista de espalda.
- Caminata S hacia −Y, referencia `caminata_s.gif`.

Esos son nombres de referencia, no archivos que existan actualmente en esta carpeta. No falta una animación de reposo: `indie.gif` cubre visualmente esa categoría.

## Integración pendiente

Se revisaron metadatos y cinco muestras de cada GIF. El generador prepara manifiesto, recursos derivados, punto de apoyo y escala respecto del paladín. Se comprobó el especial del guerrero en el tablero. La clasificación visual de corte/especial/ulti no sustituye la definición de habilidades del reglamento.

## Integración de demo — 16/10/2026

Originales conservados en esta carpeta. El proceso `pnpm assets:prepare` genera [portrait.png](generated/portrait.png) desde el primer fotograma, con recorte transparente y escala proporcional. El retrato se usa en ficha, selección y tablero; el desplazamiento del tablero interpola posiciones. La segunda iteración añade secuencias animadas; las orientaciones completas quedan pendientes. Ver [contrato de demo](../../docs/demo.md).

### Integración de demo: segunda iteración

Spritesheets derivados y animations.json en generated, reproducibles con `pnpm assets:prepare`. Asignaciones, tiempos abreviados y fallbacks documentados en [inventario general](../../docs/assets.md#animaciones-de-demo). Originales conservados.
