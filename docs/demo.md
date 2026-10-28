# Demo implementada: contrato y políticas de prueba

Revisión: 22 de octubre de 2026. Versión de aplicación 0.1.0, reglas de demo `0.5-demo`, contenido `prototype-content-0.3.0`, formato de guardado `2`. Ver [arranque](../README.md) y [evidencia](estado-mvp.md).

## Flujo disponible

Inicio → crear mesa o unirse → lobby → encuentro → resultado. De dos a cuatro jugadores, con paladín, guerrero, mago o arquera; cada clase se elige una sola vez. Al seleccionarla, el servidor la reserva durante 30 segundos y el formulario renueva la reserva cada 10 segundos. El resto la ve bloqueada al actualizar disponibilidad; las solicitudes simultáneas se serializan y el servidor rechaza la clase ya reservada u ocupada. La reserva se consume al unirse, se libera al volver o cambiar el código y vence si se abandona la página. Las partidas anteriores con clases repetidas siguen pudiendo recuperarse. La pantalla compartida tiene rol de coordinador y no ocupa slot; cada teléfono recibe su propio personaje.

Al crear una mesa se elige `LOCAL` u `ONLINE`. `LOCAL` es el valor predeterminado y los guardados anteriores sin el campo `mode` se leen como locales. En online, el anfitrión comparte la mesa por videollamada y envía un enlace HTTPS para los controles remotos. El modo queda en el snapshot y se conserva al recuperar; no cambia las reglas, las identidades, los permisos ni el flujo de comandos. El enlace de invitación contiene solo el código público; los tokens y el código privado de recuperación no se incluyen.

El control móvil tiene dos vistas que caben en la pantalla sin desplazamiento: **Personaje** reúne retrato, salud, estadísticas, dados disponibles según turno, flechas, ataque básico, especial y ulti; **Inventario** reúne cuatro espacios de bolsa y las cuatro ranuras de equipo. Los cofres y zonas adyacentes muestran una acción contextual en Personaje, sin el bloque «A tu alrededor». Solo el tablero compartido muestra posiciones y desplazamientos. Los efectos de ataques son temporales y aprobados para la demo.

La composición móvil sigue `ui celular.jpeg` (referencia externa al repositorio): ficha y recurso arriba; Movimiento y Tu acción comparten una fila debajo. Las cuatro casillas de pociones ocupan un contenedor horizontal bajo esos paneles. La bolsa 2 × 2 y el equipo aparecen junto al personaje en la otra pestaña. Se retiró el botón de terminar movimiento de la vista; atacar, interactuar, usar un objeto o finalizar turno cierran el movimiento según la acción. La ficha muestra ocho atributos puntuados —precisión, esquive, agilidad, defensa física, resistencia mágica, alcance y potencias física/mágica— con símbolos en dos columnas. La barra de vida muestra HP actuales y máximos. Los atributos base se representan en escala 0–10; el equipo se suma después del límite y puede superar 10. Las potencias y crecimientos por clase son fixtures de demo; el sistema de experiencia aún no aplica nuevos niveles durante la partida. Paladín y guerrero muestran en la ficha derivados animados de reposo; mago y arquera usan el retrato estático disponible.

La lista de ataque del control muestra únicamente enemigos vivos a seis casillas o menos, contando pasos horizontales y verticales desde el personaje. Se ordenan por cercanía y se recalcula al moverse o cuando cambia su vida. Si no hay ninguno, el control indica que no percibe enemigos cercanos. Esta lista no altera el alcance de las armas ni las comprobaciones de trayectoria que decide el servidor.

La bolsa tiene cuatro referencias de equipo y las pociones tienen cuatro casillas independientes. El equipo nuevo tiene casco, pechera, arma y botas, con una referencia por ranura. El inventario coloca casco arriba de pechera, arma a su derecha y botas debajo. Las campañas anteriores conservan guantes y pantalones equipados y pueden desequiparlos. Equipar intercambia el ítem de bolsa por el de esa ranura; desequipar requiere un espacio libre. El propietario e ID se conservan. La apariencia depende de la clase, nunca del equipo.

Al tocar una pieza de la bolsa o una poción de Personaje se abre una ventana con sus acciones y los botones **Cancelar** y **Confirmar**. Elegir **Descartar** cambia el aviso y exige **Confirmar descartar**: el objeto se elimina definitivamente de su casilla. Para desequipar se toca la ranura ocupada y se confirma; con bolsa llena la confirmación queda deshabilitada y se explica que hay que liberar espacio. Equipar una ranura ocupada muestra qué pieza volverá exactamente al espacio de la pieza nueva; funciona también con bolsa llena. Usar una poción también pide confirmación. Cancelar o presionar Escape no gasta la acción. Si cambia el estado o turno, se cierra la ventana para revisar la intención otra vez; la confirmación conserva la revisión revisada y no se envía contra un estado más reciente sin volver a revisar.

En esta demo, equipar, desequipar, consumir y descartar gastan la acción y cierran el movimiento al confirmarse. `DISCARD_ITEM` acepta un objeto propio presente en la bolsa o las casillas de pociones; una pieza equipada debe desequiparse primero. El servidor elimina la referencia y el objeto en la misma transacción que el recibo y el evento. Reintentar un descarte confirmado recupera su recibo; un fallo de guardado conserva el objeto y el espacio originales. Eliminar botín no reinicia el cofre ni el interactuable que lo generó.

Todo equipo del [catálogo](../packages/content/src/items.ts) pertenece a una sola clase mediante `allowedClasses`. El servidor valida la posesión, el equipo inicial, reparto de cofres, recolección, equipar y desequipar. Un cofre entrega su objeto al primer vivo compatible con espacio en las casillas correspondientes; si no hay espacio o destinatario compatible, conserva el objeto junto al cofre con el mismo ID. Intentar recoger equipo de otra clase devuelve `ITEM_WRONG_CLASS` sin gastar la acción ni modificar el botín. Las pociones de demo son consumibles comunes, compatibles con las cuatro clases. Una bolsa llena no impide recibir pociones si hay una casilla de poción libre.

Los guardados incorporan `itemClassRulesVersion: 1`. Al iniciar el servidor, la actualización transaccional respalda cada snapshot anterior en `campaign_save_backups` con la etiqueta `class-items-v1` y convierte el equipo genérico antiguo en la variante de su propietario. Conserva identidades de ítems, referencias de bolsa/equipo, turno, revisión y recibos. La espada genérica antigua de un mago pasa a bastón, con el mismo bono numérico aplicado al atributo mágico. La actualización es idempotente y revierte tanto el respaldo como los cambios si falla el guardado. Un snapshot moderno que contenga equipo de otra clase es rechazado.

Los guardados actuales incorporan `potionSlotsVersion: 1` y cuatro casillas `potions` por personaje. Al iniciar, una migración transaccional guarda el snapshot anterior como `potion-slots-v1` y mueve las pociones que estaban en la bolsa a las casillas nuevas, conservando ID, propietario, revisión y recibos. El cupo de pociones y el de equipo se validan por separado. Los futuros tipos de poción usarán estas casillas; sus efectos y valores todavía no están definidos.

El paladín equipa un escudo de prueba en la ranura `weapon` y el catálogo ya no le ofrece espada. El escudo conserva el bono físico temporal de +2 usado por el ataque con escudo. Los guardados anteriores incorporan `paladinShieldVersion: 1`: la migración `paladin-shield-v1` convierte la antigua definición `rusty-sword` del paladín en `paladin-shield`, con respaldo y sin cambiar el ID de instancia, las referencias, la revisión ni los recibos.

## Fixtures del encuentro

Fuente ejecutable: [prototype.ts](../packages/content/src/prototype.ts). No es balance definitivo.

| Clase    | Vida | Precisión | Esquive | Agilidad | Defensa | Resistencia | Alcance |
| -------- | ---: | --------: | ------: | -------: | ------: | ----------: | ------: |
| Paladín  |   60 |         7 |       3 |        3 |       6 |           2 |       1 |
| Guerrero |   48 |         8 |       4 |        5 |       3 |           1 |       1 |
| Mago     |   32 |         8 |       4 |        4 |       1 |           6 |       2 |
| Arquera  |   34 |         9 |       6 |        7 |       1 |           2 |       3 |

El escenario usa 58 × 70 casillas lógicas. La ventana inicial gana tres casillas visibles por eje respecto del encuadre efectivo anterior y se centra en el conjunto de jugadores presentes en sus apariciones. Al explorar, la cámara sigue desplazándose cuando el personaje activo se acerca al borde. Hay 30 enemigos ya alertados, 11 cofres, una fuente y una salida. La silueta transitable provisional se genera desde el PNG. [collision.json](../assets/mapas/collision.json) registra la base de los muros y los troncos: solo esas casillas bloquean movimiento y ataques; las piedras del piso y las escaleras quedan libres. Los cuadrados sólidos de prueba dejaron de dibujarse. Las copas se superponen a los personajes según la posición de sus pies. El eje vertical crece hacia abajo; las flechas envían pasos cardinales. `caminata_W.gif` muestra subida (−Y), `caminata_s.gif` bajada (+Y), y la caminata lateral se refleja a la izquierda.

El nuevo preset se aplica al crear una campaña. Las campañas ya guardadas mantienen su arreglo de bloqueos persistido. El editor local `/map-editor.html` de Vite permite corregir el JSON; agregar otro mapa al juego requiere conectarlo expresamente al contenido. El trazado de prueba actual procede de [collisionV2.json](../assets/mapas/collisionV2.json): conserva 1197 casillas bloqueadas y seis copas generadas; el árbol noroeste no tiene silueta y tres árboles todavía no tienen tronco marcado. V2 incluye 15 centinelas, un eco errante y 14 goblins; las cuatro apariciones conservan sus coordenadas anteriores.

El editor permite agregar y mover apariciones de enemigos del [catálogo compartido](../packages/content/enemy-recipes.json), por arrastre, coordenadas o lista de selección. `collision.json` guarda sus IDs, tipos y posiciones; el generador alimenta el preset de partidas nuevas con esa lista. Los JSON antiguos sin enemigos conservan los tres originales de demo; una lista vacía explícita los elimina. Las campañas guardadas conservan sus enemigos y estado persistido. El editor no agrega estadísticas ni habilidades al colocar una aparición.

El editor registra también cuatro apariciones, cofres con objeto de botín e interactuables. La demo incluye ocho plantas de prueba que entregan una poción al personaje adyacente: se usa una vez, exige espacio libre en las casillas de pociones y consume la acción. Pueden estar dibujadas sobre un obstáculo si se alcanzan desde una casilla vecina. `object-5` aún no tiene ninguna casilla accesible adyacente en collisionV2; queda pendiente corregirlo en el editor. Su estado y la identidad del objeto quedan guardados. Los guardados anteriores sin esta lista se recuperan con lista vacía. Esta política no define el comportamiento de palancas u otros mecanismos.

- Centinela: 24 de vida, alcance 1, movimiento 1. Eco: 18 de vida, alcance 2, movimiento 1. Ataques enemigos físicos; persiguen al vivo más cercano, desempate por slot, sin búsqueda de caminos completa.
- Cada personaje empieza con poción (+12 vida y +1/3 recurso), botas de su clase (+1 defensa), equipo de su ranura `weapon` (+2 al atributo de daño físico o mágico) y pechera de su clase (+2 defensa, +1 resistencia). Paladín recibe escudo, guerrero espada, mago bastón y arquera arco. Son valores provisionales de prueba.
- Los 11 cofres de collisionV2 entregan una poción cada uno. El catálogo mantiene casco y variantes de clase del equipo anterior para campañas guardadas. Tras limpiar, se asignan por orden al primer vivo compatible con espacio; si no hay espacio o destinatario compatible quedan asociados al cofre y pueden recogerse cerca por la clase correspondiente.
- La fuente cura 8 una vez por personaje en este encuentro.

### Políticas temporales

| Tema               | Implementación de esta demo                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Distancia          | Manhattan.                                                                                                                           |
| Trayectoria        | Muestreo de la línea entre centros; bloqueada por los muros lógicos. No hay cobertura parcial ni visión orientada.                   |
| Redondeo y defensa | Piso tras multiplicar, luego defensa plana, mínimo cero.                                                                             |
| Omisiones          | Se permite terminar movimiento o turno sin gastar todo.                                                                              |
| Acciones           | Atacar, equipar, desequipar, consumir e interactuar cierran movimiento y gastan la acción. Fallar un ataque también la consume.      |
| Cofres             | Sin apertura durante combate/exploración. Se abren al limpiar; no hay riesgo, mímicos ni tablas de un tercio en este preset.         |
| Salida             | Finaliza la demo al limpiar el patio. No representa cruce individual ni cambio de stage.                                             |
| Enemigos           | La fase enemiga completa se confirma atómicamente con el fin del último turno. No existe un estado intermedio de enemigo persistido. |
| Turno cronometrado | Cada jugador dispone de 20 segundos útiles. Las animaciones pausan la cuenta; su vencimiento avanza el turno en orden.             |
| Desconexión        | La cuenta continúa si se desconecta el control activo. El turno vence aunque no se reconecte.                                      |
| Resultado terminal | Se conserva en PostgreSQL; sus comandos de juego quedan bloqueados. Se puede crear otra mesa desde inicio.                           |

El helper de daño contempla el multiplicador de sigilo sin d6 adicional y tiene una prueba controlada. La detección, exploración y activación de ese beneficio durante una aventura quedan pendientes.

## Contratos ejecutables

- [protocol](../packages/protocol/src/index.ts): comandos validados con Zod. Sobre `commandId + expectedRevision + action`. No acepta actor, daño, tirada ni posición elegidos por el cliente.
- Comandos: START, ROLL_MOVEMENT, MOVE_STEP, FINISH_MOVEMENT, ATTACK, INTERACT, EQUIP, UNEQUIP, USE_ITEM y END_TURN.
- Los eventos confirmados `EQUIP`, `UNEQUIP` y `HEAL` incluyen `actorId` para ubicar la presentación en la mesa. `HEAL` conserva su tipo y distingue `source: "POTION" | "FOUNTAIN"`; ambos orígenes comparten el sonido de curación, pero sólo la poción produce el efecto verde. El origen es opcional para leer eventos de guardados anteriores de formato 2. No se publica el ID privado del objeto consumido.
- HTTP: POST `/api/campaigns`, `/api/join`, `/api/recover`, `/api/connect`, `/api/reclaim` y `/api/claim`. La creación acepta `{ "mode": "LOCAL" | "ONLINE" }`; si falta, usa `LOCAL`. Las rutas de coordinación requieren token Bearer; los códigos privados van en el cuerpo, nunca en la URL.
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

Sin cuentas, alojamiento público permanente, TLS propio configurado, backups/restauración operativa, limpieza programada de campañas o salas inactivas, múltiples réplicas ni CI. El acceso online de prueba depende de un túnel HTTPS temporal hacia la misma web, API y WebSocket; deja de funcionar cuando se detiene el túnel. Sin pruebas físicas Android/iOS ni mediciones de latencia/FPS. Los iconos de enemigos, cofres y zonas son placeholders explícitos; falta la caminata lateral del guerrero, reposo de mago y arquera, orientaciones definitivas, audio narrativo y arte dedicado de otros enemigos.

El Anfitrión es el guía visible. La decisión narrativa de que sea el villano final queda documentada en las reglas, sin textos de revelación ni encuentro final en el cliente actual.

## Recursos y presentación de la segunda iteración

El mapa de la mesa ocupa toda la ventana. Una franja superpuesta arriba reúne las tarjetas de personajes con vida y recurso, el actor activo, la ronda, los segundos restantes y las casillas de movimiento. Las tarjetas se compactan al aumentar el grupo; si no caben con un tamaño legible, la franja permite desplazamiento horizontal. Abajo a la izquierda, la crónica deja visibles las dos acciones recientes en orden temporal, con texto ligeramente translúcido: omite avisos de incorporación, narración inicial y cambio de turno; el D20 pendiente aparece hasta que el ataque completo lo sustituye. Los pasos individuales no generan entradas. El menú compacto ofrece invitación, recuperación de controles, configuración, salida, revisión de guardado y leyenda. Las tiradas mantienen su tarjeta animada debajo de la franja superior. El móvil conserva la ficha sin tablero.

Valores temporales aceptados por el responsable: capacidad 300, inicio 100, básico +100 incluso al fallar, poción +100 (tope 300), especial cuesta 100 y ulti 300 incluso al fallar. Un comando inválido no consume ni tira dados. Todos los ataques gastan la acción y respetan alcance y obstáculos. Multiplicadores de daño: paladín 0,65; guerrero 1; mago 1,35; arquera 1,2. Especial multiplica por 1,5 y ulti por 2,5 antes del redondeo y defensa. Nombres y efectos no son habilidades definitivas.

Fe dorada, Furia roja, Maná celeste y Enfoque verde claro, divididos en tercios. La arquera es seleccionable con alcance 3, poca vida y multiplicador físico 1,2 en este fixture; no es balance definitivo.

La [migración 0003](../apps/server/migrations/0003-class-resources.sql) guarda el snapshot anterior en campaign_save_backups, actualiza las estadísticas de clase y añade recursos/consumibles. Conserva IDs, revisión, turnos, tiradas, recibos y equipo. Conserva vida absoluta limitada al nuevo máximo; no cura al aumentar máximos. Solo procesa guardados versión 1 una vez; recargar nunca reinicia la barra. El respaldo de migración no sustituye backups operativos.

## Presentación y avance entre fases

Los comandos de tirada de movimiento, movimiento y ataque guardan animationUntil y animationPending dentro del mismo snapshot y transacción del resultado. El servidor rechaza nuevos comandos durante la espera mínima de animación; acepta la confirmación autorizada de la mesa o libera la espera al alcanzar `animationUntil`. El recibo original se recupera antes de estas comprobaciones: un reintento no repite animaciones ni gastos. La mesa envía animation-complete con la revisión al terminar todos los desplazamientos, ataques y efectos; solo coordinador/display autorizado puede confirmar la revisión vigente. La confirmación se persiste sin avanzar la revisión jugable ni duplicar eventos. Hay un margen de sincronización de 300 ms sobre el tiempo del GIF.

Son campos opcionales compatibles con los guardados anteriores versión 2. Al recargar/reconectar la mesa se reconstruye el último estado sin repetir eventos históricos, se confirma esa reconstrucción y se respeta el tiempo mínimo restante. Si la mesa queda cerrada, el servidor libera la espera al alcanzar `animationUntil` y reanuda el reloj del turno; el control desconectado no lo pausa. Con movimiento reducido, se omite reproducción pero se mantiene la espera común. La fase enemiga sigue resolviéndose atómicamente; sus desplazamientos duran 2 s y los ataques se presentan después, uno por uno. El próximo jugador espera la duración mínima de esa presentación.

El servidor administra 20 segundos útiles por turno de jugador y pausa su consumo durante las animaciones. La desconexión del control no detiene la cuenta. Solo la mesa muestra los segundos restantes; el teléfono conserva sus controles según actor y fase. El vencimiento se guarda antes de difundir el siguiente turno y, cuando corresponde, la fase enemiga. Si un D20 acertado dejó el D6 de daño pendiente, el servidor lo resuelve automáticamente una sola vez antes de avanzar. Recuperar la partida no reinicia los 20 segundos ni repite la tirada.

La grilla se alinea con piedras de 16 px mediante el mapa ampliado; cuerpos de 1,5 casillas, paladín 1,6, colisión de una casilla. Inicio muestra maestro2.PNG y cambia a maestro.PNG con hover/foco en Crear o Unirse.

## Exploración y goblin de demo

La ventana compartida sigue al personaje activo cuando se acerca al borde; los pasos siguen siendo de una casilla y el servidor valida límites, silueta transitable, muros y ocupantes. El origen (0,0) corresponde al píxel (494,366) del PNG. La máscara de 58 × 70 es provisional: separa las ruinas del vacío exterior, pero árboles, escaleras y objetos pintados necesitan colisiones diseñadas a mano antes de una aventura definitiva. El goblin aparece inicialmente fuera de la vista, en (12,6), con reposo y ataque derivados de sus GIFs. Los otros enemigos conservan marcadores provisionales.

La animación lateral, el reposo y el ataque miran a izquierda/derecha mediante reflejo horizontal. Las caminatas W suben y S bajan. Cada paso cardinal de las cuatro clases dura 2 s. El guerrero usa sus nuevas caminatas W/S; lateralmente conserva reposo y traslación porque falta ese GIF. Al atacar, primero termina el clip; entonces aparecen el daño o «Fallo» y la crónica. Tras 650 ms comienza a cambiar la barra de vida durante 450 ms, en el tablero y en las fichas. Un fallo conserva la vida. El servidor ya guarda el resultado autoritativo, pero espera estas fases visuales antes del próximo comando.

Al mostrarse un impacto confirmado que inflige daño positivo, el objetivo —personaje o enemigo— se tiñe completamente de rojo durante 1 s, se desplaza unos píxeles en dirección opuesta al atacante y emite un breve estallido de partículas rojas, sin salir de su casilla visual. El movimiento vuelve a su punto de apoyo al terminar; no modifica la posición lógica, la colisión ni el daño confirmado. Fallos y ataques con daño final cero no producen estos efectos ni el sonido de daño. La opción de movimiento reducido omite la presentación visual. Los eventos históricos no se reproducen al reconstruir la mesa.

Equipar una pieza confirmada emite partículas claras e ilumina al personaje con un desvanecimiento de 1 s; consumir una poción usa partículas y brillo verdes con la misma duración. Desequipar y beber de la fuente no producen ese brillo. La mesa usa cuatro WAV originales y distintos para daño, equipar, desequipar y curarse; la fuente y la poción comparten el de curación. Los archivos y el generador están en el [inventario de audio](../assets/audio/README.md). Los sonidos se disparan sólo desde eventos confirmados y no al tocar un botón o recibir un recibo repetido. La presentación no modifica el turno, la vida ni la posición persistida.

El ajuste local `tableSound` controla esos sonidos sólo en la mesa y comienza activado, aunque el ajuste previo `sound` de clics de los controles estuviera desactivado. Ambos usan el volumen local; `tableSound: false` persistido se conserva. Reducir movimiento omite partículas y brillos, pero no silencia el audio. Si el navegador bloquea la reproducción hasta un gesto, el anfitrión puede usar **Activar sonido de la mesa**; un fallo de audio no impide una acción confirmada.

Los GIF originales D6 y D20 aparecen en una capa sobre Personaje durante cada tirada y en la mesa junto al actor. El botón D6 de movimiento se ubica sobre las flechas. Debajo de las habilidades hay dos botones con la forma visual de los dados: D20 y D6. El jugador selecciona objetivo y habilidad, tira D20 y ve el resultado; la comprobación porcentual de impacto sigue siendo independiente. Si falla, se muestra «Falló el ataque» y termina la acción. Si acierta, el servidor guarda el D20 como base, habilita D6 tras la presentación de la primera tirada y calcula el daño con el segundo comando. Se muestra el resultado final del D6, luego se reproduce el clip de ataque y finalmente aparecen daño y cambio de vida. La capa móvil se cierra tras mostrar cada resultado. El estado `pendingAttack` conserva actor, objetivo, habilidad y D20 entre los comandos; el recibo impide repetir tiradas o gastos al reintentar. Las partidas anteriores sin este campo siguen siendo válidas. Los ataques enemigos continúan con su presentación anterior. Cada GIF se reproduce al menos una pasada de 1,6 s; reducir movimiento omite la reproducción visual, pero el servidor mantiene el tiempo mínimo antes de habilitar la siguiente acción.

En teléfonos altos, el retrato crece en la vista Personaje hasta aprovechar el espacio que dejan los controles; Inventario coloca un retrato grande debajo del equipo. En teléfonos bajos conserva el tamaño necesario para que los botones y ranuras sigan en una sola pantalla.

El mago usa `caminata_w.gif` al subir (−Y) y `caminata_s.gif` al bajar (+Y), según las vistas de espalda y frente observadas. Los GIF de caminata de paladín, mago, guerrero y arquera conservan todos los fotogramas y distribuyen sus retardos a 2 s por casilla. Los originales no se modifican. Mago y arquera aún no tienen GIF de reposo dedicado.

El reflejo horizontal también invierte el origen visual de cada clip (`1 − originX`), porque los GIF conservan márgenes transparentes asimétricos. El contenedor del actor, su casilla y su hitbox permanecen en la misma coordenada al mirar a la izquierda o cambiar entre reposo, desplazamiento y ataque.

La interfaz y los textos de Phaser usan la fuente bitmap local Pixel Operator (regular y negrita), distribuida bajo CC0; desarrollo y Docker sirven los mismos TTF desde `assets/fuentes`.

Las [recetas de actores](../packages/content/actor-recipes.json) asignan carpeta, retrato, altura visual y clips a cada clase o tipo de enemigo. El generador y Phaser consumen la misma receta. Las estadísticas de clase y las plantillas de enemigo están en [prototype.ts](../packages/content/src/prototype.ts); cada aparición de enemigo conserva identidad y posición propias. `archetypeId` permite reutilizar una plantilla visual en varias apariciones y los guardados anteriores usan el ID como valor implícito. El lienzo Phaser adopta el tamaño del contenedor y la cámara usa su ancho y alto reales para llenarlo sin bandas vacías.

La [migración 0004](../apps/server/migrations/0004-explorable-courtyard.sql) respalda los snapshots 0.2, amplía sus límites y agrega el goblin únicamente en campañas no terminadas que aún no lo tienen. Conserva revisión, identidad, posición, turnos, recibos e ítems. La máscara de terreno pertenece al contenido versionado, no se duplica en cada guardado.
