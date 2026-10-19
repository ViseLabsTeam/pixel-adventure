# Demo implementada: contrato y políticas de prueba

Revisión: 19 de octubre de 2026. Versión de aplicación 0.1.0, reglas de demo `0.5-demo`, contenido `prototype-content-0.3.0`, formato de guardado `2`. Ver [arranque](../README.md) y [evidencia](estado-mvp.md).

## Flujo disponible

Inicio → crear mesa o unirse → lobby → encuentro → resultado. De dos a cuatro jugadores, con paladín, guerrero, mago o arquera; cada clase se elige una sola vez. Al seleccionarla, el servidor la reserva durante 30 segundos y el formulario renueva la reserva cada 10 segundos. El resto la ve bloqueada al actualizar disponibilidad; las solicitudes simultáneas se serializan y el servidor rechaza la clase ya reservada u ocupada. La reserva se consume al unirse, se libera al volver o cambiar el código y vence si se abandona la página. Las partidas anteriores con clases repetidas siguen pudiendo recuperarse. La pantalla compartida tiene rol de coordinador y no ocupa slot; cada teléfono recibe su propio personaje.

El control móvil tiene dos vistas que caben en la pantalla sin desplazamiento: **Personaje** reúne retrato, salud, estadísticas, dados disponibles según turno, flechas, ataque básico, especial y ulti; **Inventario** reúne cuatro espacios de bolsa y las cuatro ranuras de equipo. Los cofres y zonas adyacentes muestran una acción contextual en Personaje, sin el bloque «A tu alrededor». Solo el tablero compartido muestra posiciones y desplazamientos. Los efectos de ataques son temporales y aprobados para la demo.

La bolsa tiene cuatro referencias de ítem. El equipo tiene casco, guantes, pantalones y pechera, con una referencia por ranura. Equipar intercambia el ítem de bolsa por el de esa ranura; desequipar requiere un espacio libre. El propietario e ID se conservan. La apariencia depende de la clase, nunca del equipo.

## Fixtures del encuentro

Fuente ejecutable: [prototype.ts](../packages/content/src/prototype.ts). No es balance definitivo.

| Clase | Vida | Precisión | Esquive | Agilidad | Defensa | Resistencia | Alcance |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Paladín | 60 | 7 | 3 | 3 | 6 | 2 | 1 |
| Guerrero | 48 | 8 | 4 | 5 | 3 | 1 | 1 |
| Mago | 32 | 8 | 4 | 4 | 1 | 6 | 2 |
| Arquera | 34 | 9 | 6 | 7 | 1 | 2 | 3 |

El escenario usa 58 × 70 casillas lógicas, con una ventana inicial de unas 10 × 10, cámara que sigue al personaje activo, cuatro bloqueos sólidos, tres enemigos ya alertados, cuatro cofres, una fuente y una salida. La silueta transitable provisional se genera desde el PNG; sus objetos individuales no definen colisiones. El eje vertical crece hacia abajo; las flechas envían pasos cardinales. `caminata_W.gif` muestra subida (−Y), `caminata_s.gif` bajada (+Y), y la caminata lateral se refleja a la izquierda.

- Centinela: 24 de vida, alcance 1, movimiento 1. Eco: 18 de vida, alcance 2, movimiento 1. Ataques enemigos físicos; persiguen al vivo más cercano, desempate por slot, sin búsqueda de caminos completa.
- Cada personaje empieza con poción (+12 vida y +1/3 recurso), pantalones (+1 defensa) y pechera (+2 defensa, +1 resistencia) para probar equipo desde el inicio.
- Los cofres entregan casco (+2 defensa), guantes (+2 resistencia), pantalones o pechera. Tras limpiar, se asignan por orden al primer vivo con espacio; si no hay espacio quedan asociados al cofre y pueden recogerse cerca.
- La fuente cura 8 una vez por personaje en este encuentro.

### Políticas temporales

| Tema | Implementación de esta demo |
| --- | --- |
| Distancia | Manhattan. |
| Trayectoria | Muestreo de la línea entre centros; bloqueada por los muros lógicos. No hay cobertura parcial ni visión orientada. |
| Redondeo y defensa | Piso tras multiplicar, luego defensa plana, mínimo cero. |
| Omisiones | Se permite terminar movimiento o turno sin gastar todo. |
| Acciones | Atacar, equipar, desequipar, consumir e interactuar cierran movimiento y gastan la acción. Fallar un ataque también la consume. |
| Cofres | Sin apertura durante combate/exploración. Se abren al limpiar; no hay riesgo, mímicos ni tablas de un tercio en este preset. |
| Salida | Finaliza la demo al limpiar el patio. No representa cruce individual ni cambio de stage. |
| Enemigos | La fase enemiga completa se confirma atómicamente con el fin del último turno. No existe un estado intermedio de enemigo persistido. |
| Desconexión | La ausencia del actor activo pausa los controles; no se salta su turno. |
| Resultado terminal | Se conserva en PostgreSQL; sus comandos de juego quedan bloqueados. Se puede crear otra mesa desde inicio. |

El helper de daño contempla el multiplicador de sigilo sin d6 adicional y tiene una prueba controlada. La detección, exploración y activación de ese beneficio durante una aventura quedan pendientes.

## Contratos ejecutables

- [protocol](../packages/protocol/src/index.ts): comandos validados con Zod. Sobre `commandId + expectedRevision + action`. No acepta actor, daño, tirada ni posición elegidos por el cliente.
- Comandos: START, ROLL_MOVEMENT, MOVE_STEP, FINISH_MOVEMENT, ATTACK, INTERACT, EQUIP, UNEQUIP, USE_ITEM y END_TURN.
- HTTP: POST `/api/campaigns`, `/api/join`, `/api/recover`, `/api/connect`, `/api/reclaim` y `/api/claim`. Las rutas de coordinación requieren token Bearer; los códigos privados van en el cuerpo, nunca en la URL.
- Salud: `/health/live` y `/health/ready`. El segundo consulta PostgreSQL.
- Colyseus envía mensajes `state`, `receipt`, `failure` y `storage-error`. El cliente envía `sync`, `select` y `command`. Se usan snapshots públicos dirigidos, sin clases Schema ni parches automáticos en esta versión.
- La web valida sesiones guardadas, comandos pendientes, respuestas HTTP y mensajes de sala con esquemas de `protocol` antes de adoptarlos. Una respuesta inválida no reemplaza el estado confirmado ni borra un comando pendiente.
- Las sesiones son tokens opacos; la base conserva hashes SHA-256. El código público solo permite crear slots mientras el lobby está abierto. El privado permite recuperar coordinación. Los códigos de reemplazo duran diez minutos y se canjean una vez.

## Guardado y concurrencia

Las [migraciones](../apps/server/migrations/0001-campaigns.sql) crean campañas, slots, sesiones, recibos y eventos; la [segunda migración](../apps/server/migrations/0002-player-claims.sql) agrega códigos de reemplazo. `schema_migrations` se administra al arrancar.

Cada campaña se bloquea con `SELECT … FOR UPDATE`. Se consulta el recibo autorizado antes de rechazar una revisión vieja. La resolución usa una copia del estado; snapshot, eventos y recibo se confirman juntos. Solo después se responde y sincroniza. La revisión SQL evita sobrescrituras obsoletas. Un sobre ya confirmado con otro payload se rechaza.

Después del commit, el aviso de actualización de campaña dispara una sola difusión de la sala para cada comando. La escena conserva la grilla y decoración hasta que cambien sus datos; las posiciones, objetivos y barras se actualizan con el estado confirmado.

El registro de salas y la promesa de creación por campaña mantienen una sala por proceso. La creación pública directa está bloqueada; solo el endpoint autenticado puede crearla. **El despliegue soportado es un único backend**; no escalar réplicas sin diseñar exclusión distribuida. La base es la autoridad durable; las salas solo mantienen presencia y selección visual. El guardado se valida con Zod antes de cargar y se rechaza si las versiones no coinciden.

Los comandos pendientes se conservan en sessionStorage para conciliar tras recarga. La última sesión se guarda localmente para volver desde el dispositivo. Los códigos de recuperación no forman parte del estado público. Reasociar conserva personaje e inventario y revoca el token anterior al canjear el código.

## Límites de esta entrega

Sin cuentas, despliegue público, TLS configurado, backups/restauración operativa, limpieza programada de campañas o salas inactivas, múltiples réplicas ni CI. Sin pruebas físicas Android/iOS ni mediciones de latencia/FPS. Los iconos de enemigos, cofres y zonas son placeholders explícitos; falta la caminata lateral del guerrero, reposo de mago y arquera, orientaciones definitivas, audio narrativo y arte dedicado de otros enemigos.

El Anfitrión es el guía visible. La decisión narrativa de que sea el villano final queda documentada en las reglas, sin textos de revelación ni encuentro final en el cliente actual.

## Recursos y presentación de la segunda iteración

La mesa ocupa el alto de la ventana: mapa a la derecha y panel desplazable a la izquierda con personajes, vida, recursos, crónica compacta y recuperación. El móvil conserva la ficha sin tablero.

Valores temporales aceptados por el responsable: capacidad 300, inicio 100, básico +100 incluso al fallar, poción +100 (tope 300), especial cuesta 100 y ulti 300 incluso al fallar. Un comando inválido no consume ni tira dados. Todos los ataques gastan la acción y respetan alcance y obstáculos. Multiplicadores de daño: paladín 0,65; guerrero 1; mago 1,35; arquera 1,2. Especial multiplica por 1,5 y ulti por 2,5 antes del redondeo y defensa. Nombres y efectos no son habilidades definitivas.

Fe dorada, Furia roja, Maná celeste y Enfoque verde claro, divididos en tercios. La arquera es seleccionable con alcance 3, poca vida y multiplicador físico 1,2 en este fixture; no es balance definitivo.

La [migración 0003](../apps/server/migrations/0003-class-resources.sql) guarda el snapshot anterior en campaign_save_backups, actualiza las estadísticas de clase y añade recursos/consumibles. Conserva IDs, revisión, turnos, tiradas, recibos y equipo. Conserva vida absoluta limitada al nuevo máximo; no cura al aumentar máximos. Solo procesa guardados versión 1 una vez; recargar nunca reinicia la barra. El respaldo de migración no sustituye backups operativos.

## Presentación y avance entre fases

Los comandos de tirada de movimiento, movimiento y ataque guardan animationUntil y animationPending dentro del mismo snapshot y transacción del resultado. El servidor rechaza nuevos comandos mientras quede tiempo o falte confirmación de la pantalla compartida. El recibo original se recupera antes de estas comprobaciones: un reintento no repite animaciones ni gastos. La mesa envía animation-complete con la revisión al terminar todos los desplazamientos, ataques y efectos; solo coordinador/display autorizado puede confirmar la revisión vigente. La confirmación se persiste sin avanzar la revisión jugable ni duplicar eventos. Hay un margen de sincronización de 300 ms sobre el tiempo del GIF.

Son campos opcionales compatibles con los guardados anteriores versión 2. Al recargar/reconectar la mesa se reconstruye el último estado sin repetir eventos históricos, se confirma esa reconstrucción y se respeta el tiempo mínimo restante. Si la mesa queda cerrada, los controles esperan su regreso. Con movimiento reducido, se omite reproducción pero se mantiene la espera común. La fase enemiga sigue resolviéndose atómicamente; sus desplazamientos duran 2 s y los ataques se presentan después, uno por uno. El próximo jugador espera toda la presentación.

La grilla se alinea con piedras de 16 px mediante el mapa ampliado; cuerpos de 1,5 casillas, paladín 1,6, colisión de una casilla. Inicio muestra maestro2.PNG y cambia a maestro.PNG con hover/foco en Crear o Unirse.

## Exploración y goblin de demo

La ventana compartida sigue al personaje activo cuando se acerca al borde; los pasos siguen siendo de una casilla y el servidor valida límites, silueta transitable, muros y ocupantes. El origen (0,0) corresponde al píxel (494,366) del PNG. La máscara de 58 × 70 es provisional: separa las ruinas del vacío exterior, pero árboles, escaleras y objetos pintados necesitan colisiones diseñadas a mano antes de una aventura definitiva. El goblin aparece inicialmente fuera de la vista, en (12,6), con reposo y ataque derivados de sus GIFs. Los otros enemigos conservan marcadores provisionales.

La animación lateral, el reposo y el ataque miran a izquierda/derecha mediante reflejo horizontal. Las caminatas W suben y S bajan. Cada paso cardinal de las cuatro clases dura 2 s. El guerrero usa sus nuevas caminatas W/S; lateralmente conserva reposo y traslación porque falta ese GIF. Al atacar, primero termina el clip; entonces aparecen el daño o «Fallo» y la crónica. Tras 650 ms comienza a cambiar la barra de vida durante 450 ms, en el tablero y en las fichas. Un fallo conserva la vida. El servidor ya guarda el resultado autoritativo, pero espera estas fases visuales antes del próximo comando.

Los GIF originales D6 y D20 aparecen arriba de la ficha del control móvil durante la tirada: D6 para movimiento y D20 más D6 para ataques. Se espera a que carguen y se reproducen al menos una pasada de 1,6 s. La mesa presenta los mismos dados sobre el mapa junto al nombre y clase del actor, incluidos los enemigos cuando atacan. Muestra el resultado o fallo después de la tirada y, en combate, del ataque; no inventa cifras para los fallos. Cada evento nuevo se presenta una vez, y los varios ataques enemigos de una fase pasan en secuencia. El resultado confirmado permanece en el control hasta terminar el turno y queda en la crónica de la mesa. Los botones usan derivados estáticos; reducir movimiento omite la reproducción visual. La pantalla compartida confirma el tiempo de la tirada de movimiento y el servidor mantiene el mínimo antes de permitir el siguiente paso.

En teléfonos altos, el retrato crece en la vista Personaje hasta aprovechar el espacio que dejan los controles; Inventario coloca un retrato grande debajo del equipo. En teléfonos bajos conserva el tamaño necesario para que los botones y ranuras sigan en una sola pantalla.

El mago usa `caminata_w.gif` al subir (−Y) y `caminata_s.gif` al bajar (+Y), según las vistas de espalda y frente observadas. Los GIF de caminata de paladín, mago, guerrero y arquera conservan todos los fotogramas y distribuyen sus retardos a 2 s por casilla. Los originales no se modifican. Mago y arquera aún no tienen GIF de reposo dedicado.

El reflejo horizontal también invierte el origen visual de cada clip (`1 − originX`), porque los GIF conservan márgenes transparentes asimétricos. El contenedor del actor, su casilla y su hitbox permanecen en la misma coordenada al mirar a la izquierda o cambiar entre reposo, desplazamiento y ataque.

La interfaz y los textos de Phaser usan la fuente bitmap local Pixel Operator (regular y negrita), distribuida bajo CC0; desarrollo y Docker sirven los mismos TTF desde `assets/fuentes`.

Las [recetas de actores](../packages/content/actor-recipes.json) asignan carpeta, retrato, altura visual y clips a cada clase o tipo de enemigo. El generador y Phaser consumen la misma receta. Las estadísticas de clase y las plantillas de enemigo están en [prototype.ts](../packages/content/src/prototype.ts); cada aparición de enemigo conserva identidad y posición propias. `archetypeId` permite reutilizar una plantilla visual en varias apariciones y los guardados anteriores usan el ID como valor implícito. El lienzo Phaser adopta el tamaño del contenedor y la cámara usa su ancho y alto reales para llenarlo sin bandas vacías.

La [migración 0004](../apps/server/migrations/0004-explorable-courtyard.sql) respalda los snapshots 0.2, amplía sus límites y agrega el goblin únicamente en campañas no terminadas que aún no lo tienen. Conserva revisión, identidad, posición, turnos, recibos e ítems. La máscara de terreno pertenece al contenido versionado, no se duplica en cada guardado.
