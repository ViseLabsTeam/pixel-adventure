# Estado y verificación del MVP

Revisión: **19 de octubre de 2026**. Entrega: demo 0.1.0 en el árbol de trabajo, sin commit creado por el agente. Este registro distingue la demo solicitada de la aventura completa; ver [contrato](demo.md) y [brief](../rpg-cooperativo-brief-mvp.md).

## Estado actual

| Área | Estado observado |
| --- | --- |
| Arquitectura | Workspace pnpm con apps/web, apps/server, core, protocol y content. TypeScript estricto. |
| Inicio y lobby | Crear, unirse, recuperar, configuración local, cuatro clases seleccionables y hasta cuatro viajeros. Cada clase se reserva al elegirla y solo puede ocuparla un jugador. |
| Mesa y celular | Tablero Phaser compartido; ficha React móvil sin tablero, flechas/dados condicionados al turno, salud y ataques. |
| Inventario | Cuatro espacios de bolsa y cuatro de equipo: casco, guantes, pantalones y pechera. Bonos sin cambio de apariencia. |
| Encuentro | Mundo explorable de 58 × 70 casillas con cámara, tres enemigos de prueba incluido el goblin, cuatro cofres, fuente y salida de demo. |
| Servidor y base | Colyseus/HTTP autoritativo, PostgreSQL real, migraciones, recibos e IDs persistentes. |
| Recuperación | Recarga, reconexión con token durable, código privado de campaña y código de reemplazo de control. |
| Docker | PostgreSQL 18, backend Node 24 y web Nginx construidos y levantados; base y backend saludables. |
| Assets | 34 imágenes fuente centralizadas, retratos, dados y spritesheets derivados; guerrero W/S, arquera y goblin integrados. |
| Pruebas | Motor, PostgreSQL y navegador; resultados y límites de cada iteración abajo. |
| Pendientes | Colisiones detalladas del escenario, recursos ausentes, balance, habilidades, aventura, percepción, stages, altares, transferencias, CI y dispositivos físicos. |

## Aceptación y alcance de la evidencia

`PASÓ` se refiere a las comprobaciones indicadas, no al juego completo. `PARCIAL` identifica una parte todavía no demostrada.

| ID | Estado | Evidencia / límite |
| --- | --- | --- |
| A01 | PASÓ en Docker | Construcción desde imágenes base, instalación congelada, migraciones y arranque con Compose. El modo dev local tiene build/tipos comprobados; no se probó su arranque en una máquina nueva. |
| A02 | PASÓ | Edge incorporó cuatro controles distintos (paladín, guerrero, mago y arquera) en una mesa con rol separado. Recuperación comprobada anteriormente con mesa + dos controles. |
| A03 | PASÓ | Orden del lobby, turno inactivo deshabilitado y rechazo de otro actor/rol en PostgreSQL. |
| A04 | PASÓ | Seis caras del d6, totales 2/3/4 y segunda tirada rechazada. |
| A05 | PASÓ | Diagonal inválida en protocolo, aliado/muro/enemigo/borde y movimiento agotado rechazados. |
| A06 | PASÓ | Acción única, fallo consume acción y cierre de movimiento; equipo comprobado también en interfaz. |
| A07 | PASÓ | Multiplicadores, redondeo, defensa, mínimo cero y d20=20 sin efecto adicional. |
| A08 | PASÓ en fixture | Helper de daño desde sigilo usa ×1,50, consume solo d20 y no d6. No hay sigilo jugable. |
| A09 | PARCIAL | Posición y fase sincronizadas, salud inicial y presentación de barras verificadas. Falta una comprobación E2E dedicada de daño/curación en todas las pantallas. |
| A10 | PASÓ | Recarga después de tirar y gastar un paso: conserva tirada, personaje y movimiento. |
| A11 | PASÓ | Reenvío recupera recibo aun con revisión vieja; no aumenta revisión ni repite efectos. Payload diferente con igual ID rechazado. |
| A12 | PARCIAL | Reinicio real conserva control, posición, tirada y bolsa; identidad/equipo se verifican en integración SQL. Falta un reinicio con salud modificada y equipo cambiado dentro del mismo caso E2E. |
| A13 | PASÓ, un proceso | Cuatro conexiones concurrentes devuelven una misma sala; recuperación reutiliza campaña. No acredita exclusión entre réplicas. |
| A14 | PASÓ en fallos ensayados | Trigger SQL fuerza rollback sin recibo; parada real de db muestra error, conserva posición y permite conciliar el mismo comando tras volver. Corte exactamente durante COMMIT no ensayado. |
| A15 | PARCIAL | Edge con viewport móvil 390 × 844 y tacto; sin desborde horizontal. No se probaron teléfonos físicos ni Safari/WebKit. |

## Ejecuciones del 16/10/2026

Entorno: Windows, Node 22.14 local, pnpm 10.34.7, TypeScript 5.9.3, Vitest 5.0.5, Playwright 1.64.1 y Microsoft Edge instalado. Contenedores Linux con PostgreSQL 18, Node 24 y Nginx 1.28. Dependencias exactas en pnpm-lock.yaml. Fixtures de aplicación 0.1.0.

### Compilación y motor — PASÓ

- `npx.cmd --yes pnpm@10.34.7 build` y `docker compose up -d --build`: generan recursos, verifican tipos y construyen web/servidor.
- `npx.cmd --yes pnpm@10.34.7 check`: tipos, **17 pruebas** del motor/protocolo, validación de contenido y Prettier.
- Los tres servicios quedaron en ejecución. Backend y base muestran healthcheck saludable.
- Vite avisa que el fondo maestro2.PNG se resuelve al servir: Nginx copia esa ruta y se verificó en las capturas. El módulo opcional nativo msgpackr-extract no ejecutó su build; las pruebas usaron la implementación disponible y pasaron.

### Persistencia — PASÓ

`npx.cmd --yes pnpm@10.34.7 test:integration`: **8 pruebas** contra `umbral_test`, separada de la demo. Cubre recibos, rechazo de ID reutilizado, concurrencia, rol/turno, recuperación/revocación, equipo, rollback provocado y ausencia de credenciales en la proyección pública. Los casos limpian las campañas propias.

### Navegador — PASÓ después de correcciones

- `pnpm exec playwright test tests/e2e/demo.spec.ts`: mesa y cuatro controles, tres opciones de clase, inicio, dados, paso compartido, recarga, equipo y cambio de turno. Tablero completo dentro de 1366 × 768 y 1440 × 1000. Móvil 390 × 844, sin canvas ni desborde.
- `RUN_RECOVERY_TESTS=1 pnpm exec playwright test tests/e2e/recovery.spec.ts`: dos controles, sala única, reinicio real del backend, parada/arranque de PostgreSQL, error visible sin movimiento provisional, reintento de la misma operación y reemplazo de teléfono con revocación del anterior. Esta notación de variable requiere adaptación en PowerShell: `$env:RUN_RECOVERY_TESTS='1'` antes del comando.
- Se corrigió una colisión con el cierre 4001 reservado de Colyseus: la aplicación usa 4401 para reemplazo de control y reconstruye la conexión con su token durable tras reiniciar.
- La primera comprobación de tamaño detectó 30 píxeles de tablero fuera de pantalla; se ajustó la altura y el caso pasó.
- La última corrida de demo también pasó mediante la IP Wi-Fi de la computadora (HTTP, sin contexto seguro localhost), en 20,9 segundos. Incluyó persistencia de configuración tras recarga. Esto prueba acceso por la interfaz local desde el mismo equipo, no conectividad de un teléfono físico ni reglas de firewall remotas.
- Una corrida del test de recuperación capturó el texto del dado antes de recibir confirmación; se corrigió la espera del test. La repetición de recuperación pasó en 34,5 segundos.

Capturas locales revisadas visualmente: `artifacts/home-desktop.png`, `lobby-desktop.png`, `board-desktop.png` y `controller-mobile.png`. Son salidas locales ignoradas por Git. Las trazas pueden contener datos privados de las sesiones de prueba y no forman parte de una entrega pública.

### Assets y documentación

Los 20 originales iniciales sumaban **75.228.538 bytes**; sus hashes Git coincidían con los anteriores a la reorganización. En esa revisión, el guerrero necesitaba tres caminatas y el mago reposo/W/S. El estado actual de los recursos se mantiene en [el inventario](assets.md). Maestro recibido: tres PNG. Arquera sin recursos y fuera de selección.

Se comprobaron rutas de Markdown y se actualizaron reglas, brief, arquitectura, inventarios, instrucciones y arranque. El script `pnpm docs:check` permite repetir la verificación de enlaces locales.

## Próximos pasos identificados

- Probar Android/iOS físicos, Safari y el flujo de daño/curación sincronizado.
- Ampliar recuperación con salud/equipo modificados y fallo exactamente durante commit.
- Completar recursos ausentes manteniendo W → arriba y S → abajo para el paladín; cerrar orientaciones verticales del resto y las habilidades del mago.
- Definir estadísticas y habilidades definitivas antes de sustituir los fixtures.
- Continuar la aventura: percepción, botín de exploración, transferencias, stages, altares y revelación final del guía.
- Agregar CI, reglas automáticas de importaciones, limpieza de sesiones/salas y procedimiento de backup antes de operación pública.

## Segunda iteración: recursos y mesa ampliada

Implementados panel izquierdo, mapa a alto completo, barras por tercios, especiales y ultis de demo, spritesheets de acciones y migración de guardado 2. Balance y asignaciones definitivas siguen pendientes. Ver [contrato actualizado](demo.md). Verificación local: TypeScript y 32 pruebas de motor/PostgreSQL pasaron, incluyendo costos, recarga, límites, reintentos y respaldo/migración. Playwright/Edge: pasó la mesa con cuatro controles a 390 × 844, mapa a alto completo a 1366 × 768 y 1440 × 1000, recarga y especial de guerrero con Furia sincronizada. Capturas revisadas: artifacts/board-desktop.png, controller-mobile.png y attack-desktop.png. Docker reconstruido y servicios saludables en localhost:8088. No se probaron dispositivos físicos ni se repitió la prueba destructiva de interrupción de servicios en esta iteración.

## Corrección de carga del tablero

Se protegió la creación de escenas ante manifiestos o spritesheets ausentes y se agregó progreso/reintento de gráficos sin modificar la partida. Vite sirve también los manifiestos JSON. En localhost:8088 el fondo respondió HTTP 200; no se reprodujo la causa exacta reportada en el navegador del responsable. Pasaron TypeScript, compilación Docker y dos pruebas Playwright: flujo normal y fallo simulado del fondo más manifiesto de paladín ausente, seguido de recuperación del mapa sin errores de JavaScript. Captura: artifacts/map-recovered.png.

## Tiempos completos, sincronización y escala

Se verificaron los 14 GIF usados contra sus derivados: mismo número de fotogramas, retardos conservados y 100 ms para retardos cero. La mesa confirma el final efectivo de la reproducción; el servidor mantiene un mínimo temporal persistido y rechaza avances prematuros. TypeScript, formato y compilación Docker pasaron. Playwright: pasaron flujo con cuatro controles, espera de más de ocho segundos durante especial del guerrero, hover/foco y retorno de imagen del maestro, y recuperación de gráficos faltantes. Capturas de inicio, tablero y ataque revisadas. Pruebas del servidor cubren confirmación autorizada, revisión antigua, confirmación anticipada y reintento de comando durante la espera. El mapa mantiene 10 × 10 y muestra una zona ampliada, con piedras de 16 px alineadas a casillas de 70 px; colisión sin cambios.

Resultado final de esta iteración: 35 pruebas de motor/PostgreSQL y 2 pruebas Playwright aprobadas. El fallo simulado al persistir el final visual conservó la espera, posición, eventos y recibo; el reintento liberó presentación sin ejecutar la acción otra vez.

## Exploración, direcciones y goblin — 16/10/2026

El contenido `prototype-content-0.3.0` amplía el mundo lógico a 58 × 70 casillas. La cámara de la mesa se desplaza al acercarse el personaje activo al borde; el origen visual conserva la alineación de 16 px del PNG con casillas de 70 px. Una máscara reproducible separa la silueta de las ruinas del vacío oscuro. La prueba de motor movió al personaje de x=9 a x=10 y rechazó un paso hacia el vacío. Falta una comprobación visual automatizada de un recorrido largo y el diseño manual de colisiones para árboles y arquitectura.

Paladín: W sube y S baja, ambos derivados duran 2,30 s. Personajes y goblin reflejan sprites hacia la izquierda; los enemigos con marcador provisional indican derecha/izquierda. El tablero revela daño, fallo y barra de vida tras la animación de ataque; crónica y vida en la ficha esperan la confirmación visual. El goblin usa los dos GIF recibidos, aparece en (12,6) y tiene estadísticas provisionales.

La migración 0004 respaldó y amplió campañas anteriores sin reiniciar revisiones ni recibos; no agrega goblin a campañas terminadas. TypeScript, validación de contenido, 23 pruebas del motor, 14 pruebas de PostgreSQL (con tiempo máximo de 15 s por caso), comprobación de enlaces y dos pruebas Playwright pasaron. La prueba de recuperación del mapa requirió 120 s de límite por lentitud del equipo durante la primera reconstrucción; el escenario terminó en 38 s y el flujo de cuatro controles en 1,4 min. No se realizó recorrido completo del mapa ni prueba física de teléfonos.

## Corrección de anclaje al reflejar — 16/10/2026

El lienzo de los GIF del guerrero tiene márgenes desiguales: su origen horizontal de reposo es 0,385 y el reflejo sin corregir desplazaba visualmente el cuerpo unos 49 px a la derecha. El tablero calcula el origen reflejado para cada clip; el contenedor y la casilla lógica no se mueven al cambiar de orientación o animación. La misma corrección cubre paladín, mago y goblin. Una prueba sobre todos los metadatos de clips verifica que el centro visual siga anclado. Se revisó una mesa de cuatro jugadores en navegador con el guerrero mirando a la izquierda; la captura local `artifacts/facing-warrior.png` lo muestra en su casilla y no hubo errores de página.

La interfaz adoptó Pixel Operator, fuente bitmap local con licencia CC0, en regular y negrita. Los textos pequeños de React usan una escala ajustada para legibilidad; las etiquetas del tablero conservan su escala propia. La carga real de la fuente se comprobó en la web dockerizada junto a capturas de inicio y mesa (`artifacts/home-bitmap.png` y `artifacts/board-bitmap.png`). TypeScript, la prueba de anclaje, los enlaces de documentación y la compilación Docker pasaron.

## Vida, dados y caminatas del mago — 16/10/2026

El panel de mesa y el celular mantienen la vida previa hasta el final del clip de ataque; en ese momento coinciden con el cambio de barra y el texto de daño/fallo del tablero. El objetivo del celular conserva su vida anterior durante el ataque. Las tiradas de movimiento reproducen D6 durante 1,6 s antes de habilitar pasos; los ataques presentan D20 y D6 sin exponer el resultado antes del golpe. Los números de daño y tirada siguen procediendo del servidor, incluidos los reintentos. Las vistas estáticas de los botones y los tiempos se generan desde los GIF originales.

El mago recibió caminatas W y S, observadas de espalda y frente, integradas para −Y y +Y. Se generan todos sus fotogramas con tiempos efectivos de 3,35 s y 1,55 s; el servidor espera la misma duración antes del próximo comando. Sigue faltando un recurso de reposo dedicado. Se revisaron capturas locales del D6 móvil y ambas caminatas en `artifacts/`.

Verificación: TypeScript, validación de contenido, 24 pruebas unitarias (incluido el anclaje de los clips nuevos), 14 pruebas de PostgreSQL, enlaces Markdown, build Docker y dos recorridos Playwright pasaron. El recorrido completo incluyó cuatro controles, una tirada D6 y el especial del guerrero; el segundo comprobó W/S del mago. No se repitió una prueba de curación y daño en dispositivos físicos; A09 continúa parcial. El primer intento del recorrido completo agotó su límite de 60 s después de las aserciones; con límite de 120 s pasó en 58,4 s.

## Clases únicas por mesa — 17/10/2026

La selección reserva una clase en PostgreSQL durante 30 segundos y se renueva cada 10 segundos mientras el formulario está abierto. La disponibilidad se consulta periódicamente; los demás celulares ven «Reservado» y luego «Ocupado» al incorporarse el jugador. La reserva se libera al volver o cambiar el código y vence si se abandona la página. El servidor serializa la reserva y la incorporación con el bloqueo de la campaña; el motor rechaza una clase repetida. Por ahora la demo admite tres jugadores de clases distintas. Las campañas anteriores con cuatro jugadores siguen cargando sus cuatro fichas en el lobby.

Verificación de esta iteración: TypeScript, formato y 136 enlaces locales; 23 pruebas del motor y 17 de PostgreSQL, incluidas reserva simultánea y expiración. Docker reconstruido con servicios saludables en `localhost:8088`. Playwright aprobó bloqueo/liberación en dos navegadores, flujo completo con tres controles y recuperación del mapa. El primer recorrido completo falló por leer la vida antes del fin de la animación; la aserción corregida pasó al esperar que se habilitara el turno. No se probaron teléfonos físicos.

## Secuencia de combate y caminatas uniformes — 17/10/2026

Los derivados de las caminatas W, S y lateral del paladín y el mago conservan todos los fotogramas y duran 3,5 s por casilla; el guerrero mantiene traslación y balanceo provisionales durante el mismo tiempo. El servidor guarda esa duración como espera mínima. En combate, el clip termina antes de revelar el daño o fallo; 650 ms después comienza la transición de vida, que dura 450 ms. Los fallos no cambian la barra. En fase enemiga, los movimientos terminan antes del ataque y cada ataque se presenta sucesivamente. Los clientes ocultan la crónica y el resultado del dado hasta finalizar el clip, y mantienen la vida anterior hasta el momento de la transición.

Verificación: TypeScript y contenido válidos; 26 pruebas unitarias (incluidas tres de tiempos de presentación) y 17 de PostgreSQL; tres recorridos Playwright pasaron. El recorrido completo registró que el resultado de ataque del jugador precedió al cambio de vida; otro comprobó el mismo orden para el Centinela, y el tercero reprodujo W/S del mago. Docker reconstruido y servicios saludables en `localhost:8088`. No se probaron teléfonos físicos ni todos los ataques contra todos los enemigos.

## Revisión de estructura y transporte — 17/10/2026

Git dejó de seguir 9.457 archivos de `node_modules` anidados; siguen instalados localmente y `.gitignore` los excluye de forma recursiva. La web valida sesiones guardadas, comandos pendientes, respuestas HTTP y mensajes de sala con los esquemas compartidos antes de adoptar estado o confirmar un recibo. El servidor publica una sola actualización por comando confirmado y espera esa difusión antes de enviar el recibo, para que el control no habilite otro toque con la revisión anterior. Phaser conserva grilla y decoración si sus datos no cambiaron y reutiliza los gráficos de salud.

Verificación: TypeScript, formato, contenido y 136 enlaces locales válidos; 29 pruebas de módulos (incluidas dos nuevas de contrato) y 17 de PostgreSQL. Docker reconstruido en `localhost:8088`, con backend y base saludables. Pasaron Playwright para reserva de clases, impacto enemigo y mapa; el recorrido completo falló inicialmente por la carrera entre recibo y estado, se corrigió el orden y su repetición pasó. Una prueba adicional confirmó que una sesión local corrupta no bloquea el inicio. El costo de dibujo todavía no se midió en dispositivos físicos.

## Arquera, caminatas del guerrero y tablero adaptable — 17/10/2026

La arquera se puede elegir una vez por mesa con alcance 3, vida 34, defensa 1 y multiplicador físico 1,2 como valores de demo. Sus seis GIF generan retrato y clips de caminata/ataque; falta reposo dedicado. El guerrero recibió W y S; sigue faltando la caminata lateral. Todas las caminatas disponibles duran 2 s por casilla en cliente y servidor. El tablero ajusta su lienzo y cámara al tamaño del contenedor. Las recetas de arte y las plantillas de estadísticas de enemigos permiten reutilizar un tipo en varias apariciones con IDs distintos; los guardados anteriores sin `archetypeId` conservan su ID como referencia visual.

Verificación de esta iteración: TypeScript, validación de contenido, 30 pruebas de módulos y 18 de PostgreSQL pasaron, incluida la reserva y carga persistente de la arquera. Docker reconstruido con backend y base saludables; el retrato de la arquera respondió 200 desde Nginx. Playwright incorporó cuatro controles, comprobó la ficha de la arquera y que el lienzo ocupa todo el contenedor; el recorrido principal y la recuperación del mapa también pasaron. No se ha medido FPS en un teléfono físico.

## Control móvil compacto — 19/10/2026

El celular separa Personaje e Inventario en pestañas. La primera contiene ficha, estadísticas, dados, movimiento y ataques; la segunda, bolsa y equipo. Se retiró el bloque «A tu alrededor» y las acciones de cofres o zonas adyacentes aparecen junto a los ataques mientras puedan usarse. La tirada animada se superpone a la ficha durante su reproducción; en la vista compacta, el resultado del movimiento permanece en el botón de d6 sin ocupar una fila adicional.

Verificación: TypeScript y build Docker pasaron. Playwright comprobó ausencia de desplazamiento de página y controles dentro de sus paneles en 390 × 844 y 360 × 640, incluido el botón contextual al quedar junto a un cofre; el recorrido de juego con dados, movimiento, equipo y ataque siguió pasando. Se revisaron capturas locales de ambas pestañas y del cofre a 360 × 640. No se probó un teléfono físico.

## Retratos móviles y dados compartidos — 19/10/2026

La ficha Personaje aumenta el retrato en pantallas altas y mantiene los controles en una sola vista; Inventario aprovecha el espacio inferior para mostrar el mismo retrato. La mesa presenta sobre el mapa el nombre de quien tira, D6 en movimiento y D20+D6 en combate, y revela el resultado o fallo al finalizar la presentación. El evento de movimiento conserva ahora `actorId` para atribuir la tirada sin leer el nombre desde su texto; no altera la aleatoriedad ni el guardado existente.

Verificación: TypeScript, 23 pruebas del motor, compilación Docker y tres recorridos Playwright pasaron. El flujo completo observó D6 de movimiento y D20+D6 de ataque en la mesa, con el nombre del lanzador y el resultado posterior; otro recorrido comprobó la presentación del Centinela. El control mantuvo sus dos vistas sin scroll en 390 × 844, 375 × 720 y 360 × 640, incluidas las interacciones junto a un cofre. Se revisaron capturas del tablero y de ambos retratos móviles. No se probaron teléfonos físicos.
