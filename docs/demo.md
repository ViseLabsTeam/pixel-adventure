# Demo implementada: contrato y políticas de prueba

Revisión: 16 de octubre de 2026. Versión de aplicación 0.1.0, reglas de demo `0.5-demo`, contenido `prototype-content-0.2.0`, formato de guardado `2`. Ver [arranque](../README.md) y [evidencia](estado-mvp.md).

## Flujo disponible

Inicio → crear mesa o unirse → lobby → encuentro → resultado. De dos a cuatro jugadores, con paladín, guerrero o mago; se permite repetir clase. La arquera queda excluida de la selección y del validador del servidor. La pantalla compartida tiene rol de coordinador y no ocupa slot; cada teléfono recibe su propio personaje.

La ficha móvil incluye retrato, salud, estadísticas, ataque básico, dados disponibles según turno, flechas, bolsa y equipo. Solo el tablero muestra posiciones y desplazamientos. Incluye especial y ulti de daño aumentado, con efectos temporales aprobados para la demo.

La bolsa tiene cuatro referencias de ítem. El equipo tiene casco, guantes, pantalones y pechera, con una referencia por ranura. Equipar intercambia el ítem de bolsa por el de esa ranura; desequipar requiere un espacio libre. El propietario e ID se conservan. La apariencia depende de la clase, nunca del equipo.

## Fixtures del encuentro

Fuente ejecutable: [prototype.ts](../packages/content/src/prototype.ts). No es balance definitivo.

| Clase | Vida | Precisión | Esquive | Agilidad | Defensa | Resistencia | Alcance |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Paladín | 60 | 7 | 3 | 3 | 6 | 2 | 1 |
| Guerrero | 48 | 8 | 4 | 5 | 3 | 1 | 1 |
| Mago | 32 | 8 | 4 | 4 | 1 | 6 | 2 |

El escenario es una grilla 10 × 10 con cuatro bloqueos sólidos, dos enemigos ya alertados, cuatro cofres, una fuente y una salida. El PNG se usa como fondo: sus objetos dibujados no definen colisiones. Los marcadores superpuestos son las entidades y obstáculos efectivos. El eje vertical de la grilla crece hacia abajo; las flechas envían pasos cardinales. La animación `caminata_s.gif` conserva la asignación **−Y**, sin inferir las demás orientaciones.

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
- Las sesiones son tokens opacos; la base conserva hashes SHA-256. El código público solo permite crear slots mientras el lobby está abierto. El privado permite recuperar coordinación. Los códigos de reemplazo duran diez minutos y se canjean una vez.

## Guardado y concurrencia

Las [migraciones](../apps/server/migrations/0001-campaigns.sql) crean campañas, slots, sesiones, recibos y eventos; la [segunda migración](../apps/server/migrations/0002-player-claims.sql) agrega códigos de reemplazo. `schema_migrations` se administra al arrancar.

Cada campaña se bloquea con `SELECT … FOR UPDATE`. Se consulta el recibo autorizado antes de rechazar una revisión vieja. La resolución usa una copia del estado; snapshot, eventos y recibo se confirman juntos. Solo después se responde y sincroniza. La revisión SQL evita sobrescrituras obsoletas. Un sobre ya confirmado con otro payload se rechaza.

El registro de salas y la promesa de creación por campaña mantienen una sala por proceso. La creación pública directa está bloqueada; solo el endpoint autenticado puede crearla. **El despliegue soportado es un único backend**; no escalar réplicas sin diseñar exclusión distribuida. La base es la autoridad durable; las salas solo mantienen presencia y selección visual. El guardado se valida con Zod antes de cargar y se rechaza si las versiones no coinciden.

Los comandos pendientes se conservan en sessionStorage para conciliar tras recarga. La última sesión se guarda localmente para volver desde el dispositivo. Los códigos de recuperación no forman parte del estado público. Reasociar conserva personaje e inventario y revoca el token anterior al canjear el código.

## Límites de esta entrega

Sin cuentas, despliegue público, TLS configurado, backups/restauración operativa, limpieza programada de campañas o salas inactivas, múltiples réplicas ni CI. Sin pruebas físicas Android/iOS ni mediciones de latencia/FPS. Los iconos de enemigos, cofres y zonas son placeholders explícitos; faltan caminatas del guerrero, orientaciones confirmadas, audio narrativo y arte dedicado de enemigos.

El Anfitrión es el guía visible. La decisión narrativa de que sea el villano final queda documentada en las reglas, sin textos de revelación ni encuentro final en el cliente actual.

## Recursos y presentación de la segunda iteración

La mesa ocupa el alto de la ventana: mapa a la derecha y panel desplazable a la izquierda con personajes, vida, recursos, crónica compacta y recuperación. El móvil conserva la ficha sin tablero.

Valores temporales aceptados por el responsable: capacidad 300, inicio 100, básico +100 incluso al fallar, poción +100 (tope 300), especial cuesta 100 y ulti 300 incluso al fallar. Un comando inválido no consume ni tira dados. Todos los ataques gastan la acción y respetan alcance y obstáculos. Multiplicadores de daño: paladín 0,65; guerrero 1; mago 1,35. Especial multiplica por 1,5 y ulti por 2,5 antes del redondeo y defensa. Nombres y efectos no son habilidades definitivas.

Fe dorada, Furia roja y Maná celeste, divididos en tercios. Enfoque verde claro y arquera de alcance 3, poca vida y alto daño quedan como decisión futura; no hay opción seleccionable ni estadísticas numéricas de arquera.

La [migración 0003](../apps/server/migrations/0003-class-resources.sql) guarda el snapshot anterior en campaign_save_backups, actualiza las estadísticas de clase y añade recursos/consumibles. Conserva IDs, revisión, turnos, tiradas, recibos y equipo. Conserva vida absoluta limitada al nuevo máximo; no cura al aumentar máximos. Solo procesa guardados versión 1 una vez; recargar nunca reinicia la barra. El respaldo de migración no sustituye backups operativos.
