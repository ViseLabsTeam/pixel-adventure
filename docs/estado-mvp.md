# Estado y verificación del MVP

Revisión: **16 de octubre de 2026**. Entrega: demo 0.1.0 en el árbol de trabajo, sin commit creado por el agente. Este registro distingue la demo solicitada de la aventura completa; ver [contrato](demo.md) y [brief](../rpg-cooperativo-brief-mvp.md).

## Estado actual

| Área | Estado observado |
| --- | --- |
| Arquitectura | Workspace pnpm con apps/web, apps/server, core, protocol y content. TypeScript estricto. |
| Inicio y lobby | Crear, unirse, recuperar, configuración local, tres clases seleccionables y hasta cuatro viajeros. Arquera excluida. |
| Mesa y celular | Tablero Phaser compartido; ficha React móvil sin tablero, flechas/dados condicionados al turno, salud y ataques. |
| Inventario | Cuatro espacios de bolsa y cuatro de equipo: casco, guantes, pantalones y pechera. Bonos sin cambio de apariencia. |
| Encuentro | Grilla 10 × 10, dos enemigos de prueba, cuatro cofres, fuente y salida de demo. |
| Servidor y base | Colyseus/HTTP autoritativo, PostgreSQL real, migraciones, recibos e IDs persistentes. |
| Recuperación | Recarga, reconexión con token durable, código privado de campaña y código de reemplazo de control. |
| Docker | PostgreSQL 18, backend Node 24 y web Nginx construidos y levantados; base y backend saludables. |
| Assets | 20 fuentes centralizadas, hashes originales conservados; tres retratos derivados, fondo WebP y maestro integrados. |
| Pruebas | 17 unitarias, 8 de PostgreSQL y 2 escenarios E2E; resultados y límites abajo. |
| Pendientes | Animaciones completas, balance, habilidades, aventura, percepción, stages, altares, transferencias, CI y dispositivos físicos. |

## Aceptación y alcance de la evidencia

`PASÓ` se refiere a las comprobaciones indicadas, no al juego completo. `PARCIAL` identifica una parte todavía no demostrada.

| ID | Estado | Evidencia / límite |
| --- | --- | --- |
| A01 | PASÓ en Docker | Construcción desde imágenes base, instalación congelada, migraciones y arranque con Compose. El modo dev local tiene build/tipos comprobados; no se probó su arranque en una máquina nueva. |
| A02 | PASÓ | Navegador con mesa + cuatro contextos móviles; recuperación con mesa + dos controles. |
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

Los 20 originales suman **75.228.538 bytes**; sus hashes Git coinciden con los anteriores a la reorganización. El paladín sigue completo como referencia; guerrero necesita tres caminatas y mago reposo/W/S, además de asignación de acciones. Maestro recibido: tres PNG. Arquera sin recursos y fuera de selección.

Se comprobaron rutas de Markdown y se actualizaron reglas, brief, arquitectura, inventarios, instrucciones y arranque. El script `pnpm docs:check` permite repetir la verificación de enlaces locales.

## Próximos pasos identificados

- Probar Android/iOS físicos, Safari y el flujo de daño/curación sincronizado.
- Ampliar recuperación con salud/equipo modificados y fallo exactamente durante commit.
- Completar orientaciones y recursos ausentes manteniendo `caminata_s.gif → −Y`; cerrar el resto de orientaciones y las habilidades del mago.
- Definir estadísticas y habilidades definitivas antes de sustituir los fixtures.
- Continuar la aventura: percepción, botín de exploración, transferencias, stages, altares y revelación final del guía.
- Agregar CI, reglas automáticas de importaciones, limpieza de sesiones/salas y procedimiento de backup antes de operación pública.

## Segunda iteración: recursos y mesa ampliada

Implementados panel izquierdo, mapa a alto completo, barras por tercios, especiales y ultis de demo, spritesheets de acciones y migración de guardado 2. Balance y asignaciones definitivas siguen pendientes. Ver [contrato actualizado](demo.md). Verificación local: TypeScript y 32 pruebas de motor/PostgreSQL pasaron, incluyendo costos, recarga, límites, reintentos y respaldo/migración. Playwright/Edge: pasó la mesa con cuatro controles a 390 × 844, mapa a alto completo a 1366 × 768 y 1440 × 1000, recarga y especial de guerrero con Furia sincronizada. Capturas revisadas: artifacts/board-desktop.png, controller-mobile.png y attack-desktop.png. Docker reconstruido y servicios saludables en localhost:8088. No se probaron dispositivos físicos ni se repitió la prueba destructiva de interrupción de servicios en esta iteración.

## Corrección de carga del tablero

Se protegió la creación de escenas ante manifiestos o spritesheets ausentes y se agregó progreso/reintento de gráficos sin modificar la partida. Vite sirve también los manifiestos JSON. En localhost:8088 el fondo respondió HTTP 200; no se reprodujo la causa exacta reportada en el navegador del responsable. Pasaron TypeScript, compilación Docker y dos pruebas Playwright: flujo normal y fallo simulado del fondo más manifiesto de paladín ausente, seguido de recuperación del mapa sin errores de JavaScript. Captura: artifacts/map-recovered.png.
