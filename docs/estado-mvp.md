# Estado y verificación del MVP

Revisión: **28 de octubre de 2026**. Entrega: demo 0.1.0 en el árbol de trabajo, sin commit creado por el agente. Este registro distingue la demo solicitada de la aventura completa; ver [contrato](demo.md) y [brief](../rpg-cooperativo-brief-mvp.md).

## Estado actual

| Área            | Estado observado                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Arquitectura    | Workspace pnpm con apps/web, apps/server, core, protocol y content. TypeScript estricto.                                                                                 |
| Inicio y lobby  | Crear, unirse, recuperar, configuración local, cuatro clases seleccionables y hasta cuatro viajeros. Cada clase se reserva al elegirla y solo puede ocuparla un jugador. |
| Mesa y celular  | Tablero Phaser compartido; ficha React móvil sin tablero, flechas/dados condicionados al turno, salud y ataques.                                                         |
| Inventario      | Cuatro espacios de bolsa, cuatro casillas de pociones en fila y casco, pechera, arma/escudo y botas exclusivos de cada clase. Reparto y posesión validados por el servidor.                       |
| Encuentro       | Mundo explorable de 58 × 70 casillas con cámara, muros y troncos trazados, 30 enemigos de prueba y 11 cofres de collisionV2, fuente y salida de demo.                    |
| Servidor y base | Colyseus/HTTP autoritativo, PostgreSQL real, migraciones, recibos e IDs persistentes.                                                                                    |
| Recuperación    | Recarga, reconexión con token durable, código privado de campaña y código de reemplazo de control.                                                                       |
| Docker          | PostgreSQL 18, backend Node 24 y web Nginx construidos y levantados; base y backend saludables.                                                                          |
| Assets          | 37 imágenes fuente centralizadas, retratos, dados y spritesheets derivados; guerrero W/S, arquera y goblin integrados.                                                   |
| Pruebas         | Motor, PostgreSQL y navegador; resultados y límites de cada iteración abajo.                                                                                             |
| Pendientes      | Ajustar objetos menores del escenario, recursos ausentes, balance, habilidades, aventura, percepción, stages, altares, transferencias, CI y dispositivos físicos.        |

## Partículas y sonidos de la mesa — 27–28/10/2026

El tablero incorpora partículas para daño positivo, equipamiento y consumo de poción; equipar y consumir muestran además un brillo de un segundo. Cuatro WAV originales distinguen daño, equipar, desequipar y curarse. Los eventos confirmados identifican al personaje y diferencian poción de fuente sin publicar el ID del objeto.

Verificación realizada: pasaron TypeScript, formato, 77 pruebas unitarias y 47 pruebas de integración con PostgreSQL de prueba; `docs:check` validó 25 documentos y 197 enlaces. Docker reconstruyó web y servidor conservando el volumen de campañas: base y servidor quedaron saludables, web y `/health/ready` respondieron 200, y los cuatro WAV respondieron 200. Playwright cargó el tablero con dos personajes y sin recursos gráficos fallidos; se inspeccionó su captura inicial.

La prueba de equipamiento visual y reproducción en navegador no llegó a confirmar la acción: tanto la demo principal como una instancia Docker aislada registraron timeouts de conexión a PostgreSQL durante esos intentos. No se observó todavía el brillo ni se escucharon los WAV en un navegador real. La instancia y su volumen de prueba se retiraron; esta comprobación queda pendiente para un entorno sin esos timeouts.

## Colisiones y árboles — 19/10/2026

Se trazaron 513 casillas de muro o tronco desde [collision.json](../assets/mapas/collision.json) y siete capas transparentes de árboles, sin modificar el PNG fuente. El editor local de Vite abrió el mapa, mostró 501 casillas de muro y 14 de tronco antes de eliminar solapamientos, y descargó el JSON. La inspección visual del mapa completo detectó y corrigió trazos que tapaban un pozo, una escalera y una abertura. Se revisó la vista previa de un personaje detrás y delante del árbol occidental (coordenadas negativas) y debajo de la copa central. Se inspeccionaron recortes individuales; algunas siluetas conservan píxeles del suelo inmediato donde la copa se mezcla con el fondo plano.

`tsx scripts/validate-content.ts` comprobó apariciones, enemigos, cofres, zonas, escaleras y muestras de piedras del piso, más un recorrido desde las apariciones a las zonas. Las cuatro apariciones se ubicaron en `(3…6,7)` para conservar libre el paso hacia arriba. Las 23 pruebas de `core.test.ts` pasaron, incluidas barreras de movimiento y ataque por muro y tronco. También pasaron el chequeo de tipos, las 27 pruebas de paquetes, las 23 pruebas de servidor/integración, la compilación web y `docs:check` (22 documentos y 159 enlaces). La página del editor no figura en `apps/web/dist`. No se ejecutó una prueba de tablero multijugador con el nuevo mapa ni una verificación en dispositivos físicos. Las campañas persistidas mantienen sus bloqueos anteriores.

## Ubicaciones e interactuables — 19/10/2026

El [tutorial](tutorial-editor-mapas.md) describe el editor. Las apariciones y cofres proceden ahora del JSON editable. También se ubicó una planta de prueba en `(9,7)` que entrega una poción una vez, consume una acción y conserva su estado en PostgreSQL; el servidor proyecta su posición y estado, y el control ofrece la interacción adyacente. Las campañas anteriores sin interactuables cargan con una lista vacía. La acción de palancas y otros efectos distintos de recolectar un objeto siguen pendientes.

Verificación: Edge abrió el editor, seleccionó un cofre, cambió su objeto, añadió una planta y conservó los datos tras exportar e importar JSON. Pasaron TypeScript, validación de contenido, 29 pruebas de paquetes (incluidas distancia, bolsa llena y recolección única), 25 pruebas de servidor/integración (incluidas persistencia e idempotencia de la planta), compilación web y servidor, y `docs:check` con 23 documentos y 166 enlaces. No se comprobó una partida completa en dispositivo físico.

## Silueta noroeste — 20/10/2026

Se vació el contorno del árbol noroeste para volver a dibujarlo desde el editor. El tronco y su colisión permanecen; el generador produce seis capas de copa hasta que se complete la séptima. El editor ofrece **Reiniciar silueta** para cualquier árbol. La generación, validación de contenido, TypeScript y enlaces documentales pasaron. La copa noroeste pendiente no cubre personajes visualmente.

## Mapa V1 y equipo — 20/10/2026

La fuente de nuevas partidas pasa a ser [collisionV1](../assets/mapas/collisionV1.json), copiada a `collision.json` sin corregir sus trazos. Genera 1197 casillas bloqueadas, seis copas, cuatro apariciones, diez cofres y ocho plantas. Las apariciones, cofres y zonas conservan recorridos transitables. Siete plantas se alcanzan desde una casilla vecina; `object-5` permanece inaccesible. Tres árboles no tienen tronco marcado y el noroeste no tiene contorno visual. El estado de campañas existentes conserva el mapa con que fueron creadas.

## Carga de gráficos con collisionV1 — 20/10/2026

Se reprodujo el aviso de carga en una mesa nueva: Phaser pedía `tree-northwest.png` aunque la silueta noroeste vacía no genera ese archivo. El tablero ahora carga solo las capas enumeradas por el manifiesto generado. También ordena personajes y copas tomando como referencia el límite superior del mapa; así las apariciones con Y negativa quedan delante del fondo y la copa conserva su orden respecto a los pies. Se amplió el margen vertical de cámara para mostrar el personaje completo cerca del borde. La prueba Playwright `board-graphics.spec.ts` pasó en Docker con dos personajes en `(9,-18)` y `(12,-18)`, sin respuestas HTTP fallidas de assets; se revisó `artifacts/board-graphics.png` y ambos sprites aparecen en el tablero. No se comprobó en el navegador de la partida original del responsable.

## Invitación por red local — 20/10/2026

El QR del lobby usa la dirección configurada mediante `SHARE_ORIGIN` al construir Docker, o el origen de la página si no hay configuración. La dirección y el enlace quedan visibles y editables; una dirección localhost o inválida oculta el QR hasta corregirla. Se configuró la IP Wi-Fi actual en `.env` local, excluido de Git. Playwright abrió el enlace por la IP de red, incorporó un viajero y comprobó su estado «Listo» en la mesa, incluida la conexión de sala. Captura revisada: `artifacts/invitation-lan.png`. Tipos y build Docker pasaron. No se escaneó con una cámara física ni se comprobó el acceso desde un teléfono real; si cambia la IP, debe actualizarse la dirección.

## Enemigos en el editor — 20/10/2026

El editor local permite agregar varias apariciones del mismo tipo, seleccionar desde una lista, arrastrar, cambiar tipo, editar coordenadas y eliminar enemigos. El selector lee [enemy-recipes.json](../packages/content/enemy-recipes.json), compartido con el preset. El JSON exportado conserva ID, tipo y coordenadas; el generador produce `courtyardEnemies`, que reemplaza las posiciones fijas del preset para campañas nuevas. Los guardados existentes conservan sus enemigos. Un JSON antiguo sin `enemies` recupera las ubicaciones originales desde `legacy-enemies.json`; una lista vacía explícita permanece vacía. Se conservaron los tres enemigos y sus posiciones actuales al incorporar el nuevo campo a `collision.json`.

Verificación: 41 pruebas de paquetes, 26 de servidor/PostgreSQL, tipos y compilaciones web/servidor pasaron. Playwright comprobó creación de dos goblins con IDs diferentes, arrastre, edición de tipo y coordenadas negativas, exportación/importación, eliminación y compatibilidad de JSON antiguos; no registró errores de página. Se revisó `artifacts/map-editor-enemies.png`. El parser rechaza tipos desconocidos, IDs repetidos, posiciones no enteras y enemigos superpuestos; generación y validación comprueban obstáculos, ocupación y recorridos. La validación del mapa actual pasó con la advertencia ya existente de la planta inaccesible `object-5`. El editor está disponible en Vite; no se incluye en la web publicada.

## Mapa collisionV2 — 20/10/2026

Se copió [collisionV2.json](../assets/mapas/collisionV2.json) a `collision.json` sin modificar el exportado original; los SHA-256 de ambos archivos coinciden. [collision-pre-v2.json](../assets/mapas/collision-pre-v2.json) conserva la fuente anterior. El contenido generado mantiene 1197 bloqueos y seis copas; incorpora 30 enemigos (15 centinelas, un eco errante y 14 goblins), 11 cofres y ocho plantas, con las cuatro apariciones anteriores. La validación comprobó terreno, obstáculos, superposiciones y recorridos hasta los enemigos y zonas. Persiste la advertencia de la planta `object-5` inaccesible, sin corregir las ubicaciones del responsable.

Pasaron 67 pruebas de paquetes y servidor/PostgreSQL, TypeScript y la compilación Docker. Se actualizó la prueba de limpieza de combate para preparar todos los enemigos y comprobar tantos objetos de botín como cofres haya, sin fijar las cantidades de V1. Playwright comprobó la edición/exportación/importación con V2 y el inicio del tablero con dos controles, sin errores HTTP de assets. Se revisó `artifacts/board-graphics.png`: aparecen ambos personajes y enemigos de V2. Una campaña nueva de la demo Docker persistió 30 enemigos, 11 cofres, ocho plantas y 1197 bloqueos. Las campañas previas conservan su snapshot.

## Objetos compatibles con la clase — 20/10/2026

El [catálogo de ítems](../packages/content/src/items.ts) asigna cada equipo a una clase; las pociones admiten las cuatro. El inicio entrega escudo al paladín, espada al guerrero, bastón al mago y arco a la arquera, con botas y pechera de su clase. El motor valida todas las referencias de bolsa/equipo, el reparto automático, la recolección y las acciones de inventario. Los objetos sin destinatario compatible con espacio permanecen en el cofre. Un rechazo por clase no modifica el estado ni confirma recibo. El editor muestra los objetos y clases desde ese mismo catálogo.

La actualización de guardados `class-items-v1` respalda y convierte el equipo genérico anterior a la variante del propietario, sin cambiar los IDs de instancia, referencias, revisión, turno ni recibos. Se persiste `itemClassRulesVersion: 1` y se rechazan snapshots modernos incompatibles. La conversión del arma de mago conserva el bono numérico y lo aplica al atributo mágico. Se verificaron idempotencia y rollback de respaldo/cambio mediante un trigger de fallo; los guardados de la demo local fueron actualizados al iniciar Docker.

Pasaron 80 pruebas de paquetes y servidor/PostgreSQL y TypeScript. La prueba PostgreSQL de migración también comprobó que los recibos originales se conservan. Docker compiló y arrancó; Playwright incorporó las cuatro clases y verificó que cada bolsa muestra únicamente su equipo. Se revisaron las capturas del mago y la arquera `artifacts/class-items-2.png` y `artifacts/class-items-3.png`. La comprobación móvil detectó que la lista de 30 enemigos de V2 ocultaba los ataques; se limitó la lista con desplazamiento interno. La prueba móvil volvió a pasar a 390 × 844, 375 × 720 y 360 × 640, con ataques visibles y selección del último enemigo mediante el desplazamiento de la lista. Se revisó la captura compacta de Personaje.

Las ranuras nuevas de equipo se muestran como casco arriba de pechera, arma o escudo a su derecha y botas debajo. El bono provisional del escudo de paladín es +2 al daño físico y el de las botas +1 a defensa. Los guardados anteriores conservan sus guantes y pantalones equipados; aparecen como equipo anterior y se pueden desequipar.

Verificación: generación del mapa, validación de contenido con aviso de `object-5`, TypeScript, 30 pruebas de paquetes, 26 de servidor/integración, compilaciones web y servidor, reconstrucción local de Docker y prueba móvil de Playwright a 390 × 844, 375 × 720 y 360 × 640. La vista de inventario a 360 × 640 mostró las cuatro ranuras en las posiciones solicitadas sin desplazamiento.

## Aceptación y alcance de la evidencia

`PASÓ` se refiere a las comprobaciones indicadas, no al juego completo. `PARCIAL` identifica una parte todavía no demostrada.

| ID  | Estado                   | Evidencia / límite                                                                                                                                                                              |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | PASÓ en Docker           | Construcción desde imágenes base, instalación congelada, migraciones y arranque con Compose. El modo dev local tiene build/tipos comprobados; no se probó su arranque en una máquina nueva.     |
| A02 | PASÓ                     | Edge incorporó cuatro controles distintos (paladín, guerrero, mago y arquera) en una mesa con rol separado. Recuperación comprobada anteriormente con mesa + dos controles.                     |
| A03 | PASÓ                     | Orden del lobby, turno inactivo deshabilitado y rechazo de otro actor/rol en PostgreSQL.                                                                                                        |
| A04 | PASÓ                     | Seis caras del d6, totales 2/3/4 y segunda tirada rechazada.                                                                                                                                    |
| A05 | PASÓ                     | Diagonal inválida en protocolo, aliado/muro/enemigo/borde y movimiento agotado rechazados.                                                                                                      |
| A06 | PASÓ                     | Acción única, fallo consume acción y cierre de movimiento; equipo comprobado también en interfaz.                                                                                               |
| A07 | PASÓ                     | Multiplicadores, redondeo, defensa, mínimo cero y d20=20 sin efecto adicional.                                                                                                                  |
| A08 | PASÓ en fixture          | Helper de daño desde sigilo usa ×1,50, consume solo d20 y no d6. No hay sigilo jugable.                                                                                                         |
| A09 | PARCIAL                  | Posición y fase sincronizadas, salud inicial y presentación de barras verificadas. Falta una comprobación E2E dedicada de daño/curación en todas las pantallas.                                 |
| A10 | PASÓ                     | Recarga después de tirar y gastar un paso: conserva tirada, personaje y movimiento.                                                                                                             |
| A11 | PASÓ                     | Reenvío recupera recibo aun con revisión vieja; no aumenta revisión ni repite efectos. Payload diferente con igual ID rechazado.                                                                |
| A12 | PARCIAL                  | Reinicio real conserva control, posición, tirada y bolsa; identidad/equipo se verifican en integración SQL. Falta un reinicio con salud modificada y equipo cambiado dentro del mismo caso E2E. |
| A13 | PASÓ, un proceso         | Cuatro conexiones concurrentes devuelven una misma sala; recuperación reutiliza campaña. No acredita exclusión entre réplicas.                                                                  |
| A14 | PASÓ en fallos ensayados | Trigger SQL fuerza rollback sin recibo; parada real de db muestra error, conserva posición y permite conciliar el mismo comando tras volver. Corte exactamente durante COMMIT no ensayado.      |
| A15 | PARCIAL                  | Edge con viewport móvil 390 × 844 y tacto; sin desborde horizontal. No se probaron teléfonos físicos ni Safari/WebKit.                                                                          |

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

La arquera se puede elegir una vez por mesa con alcance 3, vida 34, defensa 1 y multiplicador físico 1,2 como valores de demo. En esta revisión inicial, sus seis GIF generaban retrato y clips de caminata/ataque; el reposo dedicado todavía faltaba. El guerrero recibió W y S; sigue faltando la caminata lateral. Todas las caminatas disponibles duran 2 s por casilla en cliente y servidor. El tablero ajusta su lienzo y cámara al tamaño del contenedor. Las recetas de arte y las plantillas de estadísticas de enemigos permiten reutilizar un tipo en varias apariciones con IDs distintos; los guardados anteriores sin `archetypeId` conservan su ID como referencia visual.

Verificación de esta iteración: TypeScript, validación de contenido, 30 pruebas de módulos y 18 de PostgreSQL pasaron, incluida la reserva y carga persistente de la arquera. Docker reconstruido con backend y base saludables; el retrato de la arquera respondió 200 desde Nginx. Playwright incorporó cuatro controles, comprobó la ficha de la arquera y que el lienzo ocupa todo el contenedor; el recorrido principal y la recuperación del mapa también pasaron. No se ha medido FPS en un teléfono físico.

## Control móvil compacto — 19/10/2026

El celular separa Personaje e Inventario en pestañas. La primera contiene ficha, estadísticas, dados, movimiento y ataques; la segunda, bolsa y equipo. Se retiró el bloque «A tu alrededor» y las acciones de cofres o zonas adyacentes aparecen junto a los ataques mientras puedan usarse. La tirada animada se superpone a la ficha durante su reproducción; en la vista compacta, el resultado del movimiento permanece en el botón de d6 sin ocupar una fila adicional.

Verificación: TypeScript y build Docker pasaron. Playwright comprobó ausencia de desplazamiento de página y controles dentro de sus paneles en 390 × 844 y 360 × 640, incluido el botón contextual al quedar junto a un cofre; el recorrido de juego con dados, movimiento, equipo y ataque siguió pasando. Se revisaron capturas locales de ambas pestañas y del cofre a 360 × 640. No se probó un teléfono físico.

## Retratos móviles y dados compartidos — 19/10/2026

La ficha Personaje aumenta el retrato en pantallas altas y mantiene los controles en una sola vista; Inventario aprovecha el espacio inferior para mostrar el mismo retrato. La mesa presenta sobre el mapa el nombre de quien tira, D6 en movimiento y D20+D6 en combate, y revela el resultado o fallo al finalizar la presentación. El evento de movimiento conserva ahora `actorId` para atribuir la tirada sin leer el nombre desde su texto; no altera la aleatoriedad ni el guardado existente.

Verificación: TypeScript, 23 pruebas del motor, compilación Docker y tres recorridos Playwright pasaron. El flujo completo observó D6 de movimiento y D20+D6 de ataque en la mesa, con el nombre del lanzador y el resultado posterior; otro recorrido comprobó la presentación del Centinela. El control mantuvo sus dos vistas sin scroll en 390 × 844, 375 × 720 y 360 × 640, incluidas las interacciones junto a un cofre. Se revisaron capturas del tablero y de ambos retratos móviles. No se probaron teléfonos físicos.

## Ficha móvil según referencia y estadísticas de demo — 19/10/2026

La referencia `ui celular.jpeg` se consultó en Descargas; no forma parte del repositorio. Personaje presenta ficha con imagen y estadísticas arriba, movimiento con D6 y cuatro accesos a consumibles en el centro, y objetivos/ataques abajo. Inventario muestra cuatro espacios de bolsa arriba y el retrato junto a casco, guantes, pantalones y pechera debajo. La acción contextual se coloca en el encabezado de acciones para conservar todo visible a 360 × 640. La decisión posterior separó los cuatro accesos rápidos en casillas de pociones independientes.

La ficha muestra ocho atributos con iconos y valores en dos columnas: precisión, esquive, agilidad, defensa física, resistencia mágica, alcance, daño físico y daño mágico. La barra de vida conserva los HP actuales y máximos. Las estadísticas base tienen límite 10 en la receta provisional por nivel; el equipo se suma después del límite. Los nuevos índices de daño describen el fixture actual y su crecimiento futuro modifica el multiplicador de daño, pero aún no se ganan niveles durante la partida. Las cifras y ritmos de crecimiento no son balance definitivo.

Las cuatro clases muestran derivados WebP animados de sus GIF de reposo en la ficha y clips `idle` en el tablero. El mago y la arquera usan sus nuevos `animacion_pasiva.gif`; `pnpm assets:prepare` genera retratos PNG estáticos para selección y WebP animados para reposo. El tablero ya no excluye al mago del bucle `idle`; sus URLs de metadatos y sprites se versionaron de nuevo para evitar JSON anterior en caché. El guerrero usa temporalmente los fotogramas de `caminata_s.gif` para X y los refleja para −X; sigue pendiente un GIF lateral propio. El `animacion_pasiva.gif` del guerrero es binariamente idéntico a `indie.gif` y se usa como fuente nominal de reposo.

Verificación de esta iteración: compilación y despliegue Docker, TypeScript, validación de contenido, 27 pruebas de contenido/motor, 23 de servidor, formato y 153 enlaces Markdown pasaron. Playwright comprobó ambas pestañas sin scroll y con sus controles visibles en 390 × 844, 375 × 720 y 360 × 640; se revisó también una captura a 360 × 640 con cofre adyacente. El recorrido general E2E se repitió y no se cuenta como aprobado: sus aserciones temporales del D6 fallaron una vez al leer el ancho de la imagen y otra al buscar el nodo después de la tirada. Un recorrido móvil con movimiento registró además un fallo intermitente al confirmar el fin de la animación desde la mesa. Quedan para investigar por separado; no se probó un teléfono físico.

## Acciones de inventario con confirmación — 20/10/2026

La bolsa permite equipar o descartar una pieza mediante una ventana de confirmación; las casillas de pociones permiten usar o descartar una poción. El equipo ocupado permite desequipar únicamente si hay un espacio libre. Al reemplazar equipo, la pieza anterior vuelve al mismo espacio de bolsa de la nueva, incluso con la bolsa llena. Cancelar o Escape conserva el estado; el descarte elimina definitivamente el objeto y consume la acción del turno, como las otras operaciones de inventario. El servidor valida la propiedad y confirma estado, evento y recibo en una transacción; los reintentos recuperan el recibo original.

Verificación: 56 pruebas de paquetes y 33 de servidor aprobadas, incluidos intercambio con bolsa llena, rechazo al desequipar sin espacio, descarte ajeno/equipado, recuperación de recibos y reversión ante fallo de guardado. Compilación Docker y validación de contenido aprobadas; persiste el aviso previo sobre la planta `object-5`. Playwright pasó el recorrido de confirmar/cancelar equipar, desequipar, usar y descartar, incluida recarga posterior al descarte. Se revisó la captura de confirmación a 360 × 640. Este recorrido aisló el módulo gráfico del tablero y usó un coordinador del protocolo para las animaciones; no acredita otra revisión de gráficos ni un teléfono físico. Los intentos iniciales con tablero completo fallaron por falta de actualización visible y registraron tiempos de espera de PostgreSQL; no se consideran aprobados.

## Movimiento y objetivos cercanos — 21/10/2026

La vista Personaje coloca Movimiento y Tu acción lado a lado en celular. La lista de objetivos muestra únicamente enemigos vivos a seis pasos horizontales y verticales o menos, ordenados por distancia al personaje. La selección se actualiza al desplazarse y el botón de ataque queda deshabilitado si el objetivo sale del radio; el servidor conserva la validación del alcance y de la trayectoria del ataque. La percepción de enemigos y la alarma siguen pendientes para la aventura completa.

Verificación: TypeScript, prueba de límites de percepción, documentación y build Docker aprobados. Playwright comprobó paneles contiguos, ausencia de objetivos lejanos y controles dentro de la pantalla a 390 × 844, 375 × 720 y 360 × 640. Se revisaron capturas de 390 × 844 y 360 × 640; no se probó un teléfono físico.

## Casillas de pociones — 21/10/2026

En esa iteración, Personaje mostraba cuatro casillas de pociones en una matriz 2 × 2; la revisión posterior las dispuso en una fila propia. La bolsa mantiene cuatro espacios de equipo independientes. El servidor entrega pociones iniciales, de cofres y plantas a esas casillas; valida cupo, propiedad y clase, y permite usarlas o descartarlas con confirmación. Las campañas anteriores se migran una vez con respaldo `potion-slots-v1`, conservando ID de cada poción, revisión y recibos. Los tipos futuros de poción siguen pendientes de diseño.

Verificación: 93 pruebas de paquetes y servidor/PostgreSQL, TypeScript, validación de contenido, build Docker y `docs:check` aprobados. Playwright verificó las cuatro clases, confirmación de uso y descarte, y la matriz sin desplazamiento a 390 × 844, 375 × 720 y 360 × 640. Se revisaron capturas de 390 × 844 y 360 × 640. Permanece el aviso de contenido anterior sobre `object-5`; no se probó un teléfono físico.

## Presentación de dados, pociones y escudo del paladín — 21/10/2026

Personaje muestra la animación y el resultado de la tirada en una capa sobre la vista; la capa se cierra después de mostrar el resultado. El D6 revela la cifra al terminar su GIF local aunque la mesa aún esté confirmando su animación; el servidor mantiene bloqueado el siguiente paso hasta la confirmación. El botón de terminar movimiento salió de la interfaz. Las cuatro pociones ocupan un contenedor horizontal bajo Movimiento y Tu acción; las flechas son más grandes. El paladín empieza con un escudo y solo puede equipar equipo de su clase; la antigua espada de sus guardados se convierte con respaldo `paladin-shield-v1`, conservando el ID de instancia, las referencias, revisión y recibos.

Verificación: 94 pruebas de paquetes y servidor/PostgreSQL, TypeScript, validación de contenido, documentación y build Docker aprobados. Playwright verificó la distribución sin desplazamiento en 390 × 844, 375 × 720 y 360 × 640, la capa D6 con resultado y cierre, y el escudo inicial de las cuatro clases. Se revisaron capturas móviles a 390 × 844 y 360 × 640. El recorrido E2E general sigue pendiente de actualizar para las coordenadas de aparición de collisionV2: avanzó hasta el primer paso y esperaba la casilla antigua `(2,7)` cuando Ada estaba en `(9,-19)`. La mesa en segundo plano también puede pausar la animación de Phaser en esa prueba. No se probó un teléfono físico.

## Dados de ataque en secuencia — 21/10/2026

Los botones de dados muestran directamente las vistas estáticas D6/D20, sin fondo rectangular. El D6 de movimiento está centrado sobre las flechas; D20 y D6 de ataque quedan uno al lado del otro, bajo las habilidades. Especial y ulti seleccionan la habilidad antes de tirar. `ATTACK` valida y consume la acción, guarda la comprobación de impacto y el D20, y deja `pendingAttack` si acierta. El control habilita `ROLL_ATTACK_D6` solo después de presentar el D20 y recibir la confirmación de la mesa. El segundo comando usa el D20 guardado, calcula el daño y persiste el resultado. El tablero espera a mostrar el resultado final del D6 antes del clip de ataque, el daño y la transición de vida. Un fallo se muestra tras el D20 y no habilita D6. Los guardados anteriores admiten el nuevo campo opcional; los reintentos recuperan los recibos sin repetir dados, recurso ni daño.

Verificación: 62 pruebas de paquetes y duración, 31 pruebas de PostgreSQL, TypeScript, validación de contenido, formato, 185 enlaces documentales y build Docker aprobados. Playwright comprobó los dados y la capa de tirada sin desborde en 390 × 844, 375 × 720 y 360 × 640; se revisó la captura de 360 × 640. La prueba E2E general de combate sigue pendiente de actualizar para las posiciones de collisionV2 y la nueva secuencia. No se probó un teléfono físico.

## Mesa con mapa a pantalla completa — 23/10/2026

El canvas de la mesa ocupa todo el viewport. Una única franja superpuesta muestra los personajes, vida y recursos junto con el turno, la cuenta atrás y las casillas de movimiento. La crónica abajo a la izquierda muestra hasta dos acciones recientes con texto translúcido; oculta avisos de turno e incorporación y agrupa el D20/D6 con el ataque final. Invitación, recuperación, ajustes, salida y leyenda están en un menú compacto. La tarjeta animada de los dados conserva su tamaño y aparece debajo de la franja. El máximo jugable actual sigue siendo cuatro personajes; la franja admite tarjetas compactas y desplazamiento horizontal como respaldo para más jugadores futuros.

Verificación: TypeScript, formato, dos pruebas unitarias de la crónica, build web en Docker y enlaces Markdown (23 documentos, 185 enlaces) pasaron. Playwright/Edge comprobó dos jugadores con menú, reloj, crónica, cámara y dos pasos, y cuatro jugadores en una sola franja a 1440 × 900 y 720 × 300; ambas pruebas pasaron. Se revisaron las capturas locales `artifacts/turn-camera.png` y `artifacts/table-chronicle.png`. El contenedor web se reconstruyó y `http://127.0.0.1:8088/` respondió 200; PostgreSQL y servidor muestran estado saludable. El centrado sobre las apariciones cercanas al borde norte deja una zona oscura por encima del mapa; se mantiene para conservar el encuadre confirmado. No se probó un dispositivo físico.

## Temporizador de turno y cámara inicial — 22/10/2026

El turno de cada jugador dispone de 20 segundos útiles administrados por el servidor. La cuenta se pausa durante las animaciones, continúa si se desconecta el control y aparece solo en la mesa. Al vencer, avanza el turno; si quedó un D20 acertado con D6 pendiente, el servidor completa una única tirada de daño antes de avanzar. La cámara empieza centrada en los jugadores presentes en sus apariciones, muestra tres casillas más por eje respecto del encuadre efectivo anterior y mantiene el seguimiento durante la exploración.

Verificación en árbol de trabajo sin commit: `tsc --noEmit`, 69/69 pruebas unitarias puras, 38/38 pruebas de integración con PostgreSQL `umbral_test`, formato, build Vite, build del servidor y enlaces Markdown (23 documentos, 185 enlaces) pasaron. El nuevo `tests/e2e/turn-camera.spec.ts` pasó 1/1 en Edge contra servidor y Vite locales (`2567`/`5173`, base `umbral_test`, `APP_ORIGINS=http://127.0.0.1:5173` y `DEMO_URL=http://127.0.0.1:5173`): comprobó centro inicial de dos apariciones, ampliación de tres casillas por eje, seguimiento tras dos pasos, cambio de tamaño y contador solo en la mesa. El primer intento falló por origen no permitido; se corrigió el entorno y pasó. Se revisó `artifacts/turn-camera.png`: los personajes aparecen completos; el centrado cerca del borde deja una banda vacía al norte de unos 250 px que admite una revisión estética posterior. Después, `docker compose up -d --build` reconstruyó servidor y web; `docker compose ps` mostró los tres servicios saludables y `http://localhost:8088/` respondió 200. Las 122 campañas activas recibieron los campos del temporizador; ninguna estaba vencida al comprobarlo. No se probaron teléfonos físicos.

## Reacción visual al recibir daño — 26/10/2026

Un golpe confirmado con daño positivo tiñe de rojo durante un segundo la figura del objetivo y la desplaza 14 px en dirección opuesta al atacante antes de devolverla a su posición visual. La casilla lógica, la vida y el resultado del servidor no cambian por esta presentación. Fallos, daño cero y la opción de movimiento reducido omiten la reacción.

Verificación: pasaron las tres pruebas unitarias de activación y geometría, TypeScript, Prettier, build web y comprobación de enlaces (24 documentos, 193 enlaces). Se reconstruyó y arrancó solo el contenedor web; la demo respondió HTTP 200 y la prueba Playwright de mesa a pantalla completa pasó. La prueba E2E de combate existente no ejercitó un impacto: en la demo encontró un error de guardado mientras 151 campañas competían por bloqueos de PostgreSQL; contra `umbral_test` llegó al tablero, pero el centinela ya no ataca desde las posiciones actuales de aparición. Queda pendiente una comprobación visual de un golpe positivo en navegador. La revisión de seguridad y estructura no encontró cambios en reglas, autorización, persistencia ni posición lógica.

## Partidas online con mesa compartida — 26/10/2026

La creación ofrece `LOCAL` como modo predeterminado y `ONLINE` como opción explícita. En online, el anfitrión comparte la mesa por videollamada y los jugadores abren sus controles mediante una invitación HTTPS; el origen seleccionado se conserva entre lobby y mesa. El modo queda en el guardado y los snapshots anteriores sin ese dato se leen como locales. Las sesiones, reglas, permisos y confirmación de animaciones siguen usando el mismo servidor. Los orígenes HTTP/WebSocket inválidos se rechazan y los mensajes de sala tienen un límite de frecuencia; un rechazo temporal conserva el identificador del comando pendiente para reintentar.

Verificación: TypeScript, 59 pruebas de paquetes, 39 pruebas de integración PostgreSQL en `umbral_test`, 7 pruebas unitarias dirigidas, validación de contenido y enlaces Markdown (24 documentos, 193 enlaces) pasaron. Playwright/Edge comprobó 1/1 flujo online con mesa y dos controles aislados, enlace conservado al iniciar y recarga de un control; el flujo local de cuatro personajes pasó 1/1. Se reconstruyeron servidor y web en Docker sin eliminar `campaign_data`; PostgreSQL y servidor quedaron saludables, y web y `/health/ready` respondieron 200. Un Quick Tunnel de Cloudflare sirvió la página por HTTPS desde fuera de la red de Compose y una prueba de navegador por esa URL creó una campaña online, unió dos controles por WebSocket e inició el tablero. Para la prueba pública se usó DNS alternativo porque el resolvedor predeterminado de Windows no resolvía el subdominio temporal. El enlace dura mientras corre el túnel y cambia al reiniciarlo. La revisión de seguridad y estructura no encontró hallazgos abiertos después de corregir el reintento limitado. No se probó un teléfono físico ni una videollamada real.
