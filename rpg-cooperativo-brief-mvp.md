# RPG cooperativo web — Brief de arranque y MVP v0.1

Actualizado: 16 de octubre de 2026.

Estado: alcance recomendado para la primera entrega del agente. Este documento convierte los requisitos existentes en trabajo verificable. Las políticas temporales y los datos de prueba indicados aquí no son nuevas reglas definitivas del juego.

## 1. Documentos que debe leer el agente

| Orden | Documento                                                                 | Función                                                                  |
| ----- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1     | [Reglas y guardado](rpg-cooperativo-reglas-v01.md), contenido v0.4        | Jugabilidad confirmada y pendientes.                                     |
| 2     | [Especificación técnica](rpg-cooperativo-especificacion-tecnica.md), v0.1 | Stack, módulos, contratos, persistencia y verificación.                  |
| 3     | Este brief                                                                | Alcance de la primera entrega, etapas posteriores y evidencia requerida. |

Las decisiones confirmadas del reglamento prevalecen sobre los ejemplos de prueba. La especificación técnica determina la arquitectura de referencia. Este brief acota la entrega, sin transformar un pendiente de diseño en una decisión definitiva. Las instrucciones posteriores del responsable del proyecto actualizan esa base.

## 2. Objetivo de la primera entrega

Entregar un prototipo técnico ejecutable con una pantalla compartida y entre dos y cuatro controles independientes. Debe permitir crear una sala, incorporarse desde los celulares, conservar el orden del lobby, recorrer un escenario por casillas, resolver turnos básicos y recuperar el estado persistido mediante código.

La entrega demuestra el circuito completo: intención del celular, validación y resolución del servidor, guardado en PostgreSQL, actualización de todas las pantallas y recuperación después de reiniciar el backend.

La instalación de paquetes o las pantallas estáticas por sí solas no cumplen este objetivo. La comprobación debe utilizar un backend real, clientes separados y una base de datos persistente.

## 3. Alcance concreto de la primera entrega

| Área         | Incluido                                                                                                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositorio  | Workspace TypeScript, frontend, backend, módulo de reglas, protocolo y contenido de prueba.                                                                                                                 |
| Lobby        | Crear partida, código de entrada/QR, nombre, cuatro posiciones como máximo y selección de paladín, guerrero y mago; arquera excluida por indicación del responsable. Inicio con dos a cuatro participantes. |
| Tablero      | Un mapa de prueba, personajes, un enemigo de prueba, salud, actor activo, ronda y fase.                                                                                                                     |
| Control      | Nombre, clase, salud, ficha simplificada, flechas, movimiento restante y selección de ataque básico.                                                                                                        |
| Turnos       | Movimiento antes de acción, orden del lobby y fase enemiga. Una sola acción y cierre del movimiento al actuar.                                                                                              |
| Movimiento   | Dos casillas más bonificación d6, desplazamiento cardinal y bloqueo por aliados/obstáculos.                                                                                                                 |
| Combate      | Probabilidad de impacto, d20 y multiplicadores del d6, defensa plana y consumo de acción. El crítico de sigilo se verifica en el motor con un escenario de prueba.                                          |
| Enemigo      | Comportamiento sencillo configurado para el encuentro de prueba; respetar turno, alcance y trayectoria. Su IA completa se entrega en una etapa posterior.                                                   |
| Guardado     | Persistir las operaciones confirmadas, tirada de movimiento, fase, salud e inventario de prueba.                                                                                                            |
| Recuperación | Código privado, restauración de partida y reasociación de controles a personajes existentes.                                                                                                                |
| Integridad   | Identificadores de comandos y objetos; un reintento recupera el mismo resultado.                                                                                                                            |
| Reconexión   | Recuperar el mismo personaje al recargar o perder conexión, y bloquear sus controles mientras esté offline.                                                                                                 |

El encuentro puede comenzar ya en combate mediante un preset de desarrollo. No es necesario cerrar el comportamiento de exploración y alarma para comprobar esta primera integración. El preset debe estar identificado como escena de prueba.

La solicitud posterior amplía el inventario a cuatro espacios de bolsa y ranuras de casco, pechera, arma y botas (actualización del responsable del 20/10/2026). Deben ser objetos looteables que solo modifican estadísticas. La primera entrega no necesita completar el catálogo ni habilitar transferencias cuyo costo de acción aún está pendiente.

La restricción de clase también está confirmada: bolsa, equipo inicial, botín y recolección solo admiten objetos compatibles con la clase del destinatario. El servidor debe rechazar objetos de otra clase sin consumir la acción ni confirmar cambios; recargar o recuperar un guardado no debe permitir eludirla. El catálogo de equipo continúa siendo provisional.

Las pociones ocupan cuatro casillas independientes de la bolsa, visibles en una fila debajo de Movimiento y Tu acción en Personaje. Recibir o recolectar una poción requiere lugar allí, pero no en la bolsa. La migración de campañas anteriores conserva las identidades y recibos. Los tipos adicionales de poción se definirán más adelante. El paladín usa escudos en su ranura de arma.

El inventario permite descartar y solicita confirmación para equipar, desequipar, consumir o descartar. Cancelar conserva el estado y la acción. Desequipar exige espacio libre; equipar sobre una pieza existente la devuelve al mismo espacio de bolsa que ocupaba la nueva, incluso con bolsa llena. Reintentos y fallos de guardado deben conservar la unicidad de objetos y la acción consumida una sola vez.

## 4. Pantallas mínimas y comportamiento

| Pantalla                     | Elementos y resultado esperado                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| Inicio                       | Crear, unirse y continuar con código privado.                                                   |
| Lobby de pantalla compartida | Código/QR de entrada, lista ordenada de jugadores y comienzo de la partida.                     |
| Lobby móvil                  | Nombre, clase y posición asignada.                                                              |
| Tablero                      | Mapa, personajes/enemigo, vida, ronda, fase, jugador activo y resultado de la última operación. |
| Control móvil                | Ficha, estado de conexión, flechas y botones válidos para la fase actual.                       |
| Recuperación                 | Código privado, personajes existentes y asociación autorizada de cada dispositivo.              |

La pantalla compartida no consume una posición de jugador. El teléfono del coordinador puede ocupar una posición normal. Los controles del jugador inactivo permanecen deshabilitados para las acciones de turno; la ficha puede consultarse.

El objetivo seleccionado en el teléfono se resalta en el tablero. Antes de confirmar un ataque, el control muestra su probabilidad calculada sobre el estado vigente; el servidor vuelve a validarla al ejecutarlo.

Al resolver un movimiento, todos ven la misma casilla. Al ejecutar una acción, el control deja de ofrecer movimiento. Al recargar, se conserva el turno y una tirada ya realizada no se repite.

## 5. Datos y políticas temporales de prueba

Las estadísticas y habilidades definitivas siguen en standby. Usar un catálogo identificado como `prototype-content`, con versión propia y valores en archivos de datos separados del motor.

El agente puede elegir salud, precisión, esquive, agilidad, defensas y salud del enemigo que permitan observar varios turnos. Debe registrar los valores y explicar que son fixtures, no balance aprobado. Conservar los alcances confirmados: paladín/guerrero 1, mago 2 y arquero 3.

Para que el prototipo sea verificable, se proponen estas políticas temporales explícitas:

| Pendiente                 | Política para el preset de prueba                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| Distancia                 | Contar pasos horizontales y verticales; parámetro intercambiable.                            |
| Redondeo                  | Redondear hacia abajo después de aplicar el multiplicador; parámetro intercambiable.         |
| Mínimo de daño            | Cero después de restar la defensa; parámetro intercambiable.                                 |
| Omisión de movimiento     | Permitir terminarlo sin gastar todas las casillas.                                           |
| Ataque fallido            | Consumir la acción, manteniendo un único intento por turno.                                  |
| Cobertura parcial         | Desactivada en el mapa inicial; el contrato conserva la capacidad de incorporarla.           |
| Exploración y alarma      | Fuera del flujo inicial, que comienza como encuentro de prueba ya activo.                    |
| Caída del jugador activo  | Pausar y permitir recuperación; no avanzar por el solo hecho de perder conexión.             |
| Recuperación de personaje | El coordinador recupera la campaña y autoriza una nueva asociación de dispositivo a su slot. |

Estas políticas solo habilitan una escena de desarrollo. Se documentan en el README y en configuración; no se etiquetan como reglas confirmadas ni se introducen silenciosamente en una aventura definitiva. Un cambio posterior no debe obligar a reescribir el transporte o el guardado.

La aleatoriedad controlada se usa en pruebas automatizadas. En la partida normal, las tiradas las genera el servidor. Los controles no envían daño, posición arbitraria ni resultados de dados.

## 6. Arte y escenario inicial

Inspeccionar los recursos disponibles en el proyecto antes de integrarlos. Actualización de arte al 16 de octubre de 2026: se recibieron GIFs de paladín, guerrero y mago, una imagen de escenario y tres imágenes del maestro. El [inventario de assets y faltantes](docs/assets.md) usa al paladín como conjunto completo de referencia, por indicación del responsable. Los originales están en assets por categoría; la demo usa retratos derivados y fondo WebP. La segunda iteración incorpora spritesheets muestreados de acciones; faltantes y asignaciones temporales en el inventario.

El sprite del maestro se recibió y se usa en inicio, lobby y tablero; ver [inventario](assets/maestro/README.md). Su identidad de villano final es una sorpresa narrativa y no se revela en las pantallas actuales.

Si faltan recursos, usar placeholders claramente identificados para que la primera entrega siga siendo comprobable. Su reemplazo se realiza mediante un manifiesto de assets, manteniendo coordenadas lógicas y contratos del motor.

El mapa de prueba contiene espacio para cuatro personajes, un encuentro básico y al menos un obstáculo sólido. Preparar además fixtures de pared, hierba alta y pozo para verificar sus propiedades cuando se incorpore percepción. Tamaño de tiles, escala, animaciones y capas del arte definitivo siguen pendientes.

El inventario general enlaza el detalle de cada carpeta y distingue recursos ausentes de acciones pendientes de asignar. El escenario `Scene_Overview.png` es una imagen plana; la demo incorpora una grilla lógica independiente, sin convertir automáticamente los objetos del fondo en entidades. Los pendientes de arte no impiden construir servidor, controles, tablero y guardado usando placeholders identificados.

## 7. Orden de trabajo del agente

### Etapa A — Base y persistencia

- Leer los documentos y las instrucciones del repositorio disponible.
- Revisar la estructura y recursos existentes, si los hay.
- Preparar el workspace de referencia sin borrar trabajo ajeno.
- Fijar una combinación compatible de dependencias y conservar el lockfile.
- Iniciar PostgreSQL local, aplicar migraciones y crear una campaña persistida.
- Conectar una pantalla y dos controles a la misma sala.

Salida verificable: todos reciben el mismo identificador persistente, sus roles y las posiciones del lobby.

### Etapa B — Turno y representación

- Mostrar el escenario de prueba y los personajes.
- Implementar las fases de movimiento/acción y el orden del lobby.
- Resolver tirada de movimiento y pasos cardinales desde el servidor.
- Incorporar ataque básico, daño, salud y fase del enemigo de prueba.
- Publicar resultados y guardar cada operación confirmada.

Salida verificable: una ronda completa se sigue desde el tablero y cada teléfono controla únicamente su personaje.

### Etapa C — Recuperación e integridad

- Recuperar una partida con código privado y asociar los celulares a sus slots.
- Restaurar fase, tirada, casillas restantes, salud y objetos de prueba.
- Comprobar doble toque y reintento después de guardar sin recibir confirmación.
- Reiniciar el backend y reconstruir la campaña desde PostgreSQL.
- Completar documentación de arranque y evidencia de pruebas.

Salida verificable: se continúa el mismo estado confirmado sin volver a sortear ni duplicar acciones u objetos.

Después de estas etapas se evalúa el primer prototipo y se continúa con las funcionalidades restantes. El agente debe implementar esta entrega, no limitarse a devolver un nuevo plan.

## 8. Criterios de aceptación de la primera entrega

| ID  | Comprobación                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | Desde una instalación limpia se pueden instalar dependencias, iniciar servicios, aplicar migraciones y abrir la web siguiendo el README. |
| A02 | Dos y cuatro controles distintos pueden incorporarse a una misma partida; el tablero mantiene su rol separado.                           |
| A03 | Los turnos siguen el orden de los slots iniciales. Un controlador no puede actuar por otro jugador.                                      |
| A04 | La tirada de movimiento ocurre una vez por turno y produce los totales 2, 3 o 4 según el d6.                                             |
| A05 | Se rechazan movimientos diagonales, pasos bloqueados, cruce de aliados y movimiento sin casillas restantes.                              |
| A06 | Ejecutar una acción cierra el movimiento y consume la única acción del turno.                                                            |
| A07 | El motor aplica los multiplicadores 1, 1,25 y 1,50; sacar 20 no activa un efecto adicional.                                              |
| A08 | En el fixture de ataque desde sigilo, se usa ×1,50 y no se tira un d6 de daño.                                                           |
| A09 | El tablero y los celulares muestran salud, fase y posición coherentes después de cada confirmación.                                      |
| A10 | Recargar tras tirar movimiento conserva su resultado y las casillas restantes.                                                           |
| A11 | Duplicar un comando confirmado devuelve el mismo resultado y no ejecuta una segunda acción.                                              |
| A12 | Recuperar después de reiniciar el backend conserva personajes, slots, fase, salud e identidad del ítem de prueba.                        |
| A13 | Recuperar el mismo código no crea dos ejecuciones simultáneas de una misma campaña.                                                      |
| A14 | Un fallo de guardado no se anuncia como operación confirmada; la interfaz comunica la situación.                                         |
| A15 | La interfaz móvil permite probar el flujo en Android e iOS; se identifica qué pruebas se hicieron en dispositivos físicos.               |

La evidencia debe indicar qué criterios pasaron, cuáles fallaron y cuáles todavía no se comprobaron. Una captura de interfaz no prueba por sí sola guardado, reconexión o control de turnos.

## 9. Iteraciones posteriores

Estas funcionalidades forman parte del juego completo, pero no son necesarias para demostrar la primera entrega técnica:

| Iteración                                 | Contenido                                                                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Percepción y exploración                  | Campo de visión, obstáculos de visión, alarma entre enemigos, pérdida de detección y sigilo completo.                                          |
| Botín y acciones adicionales del catálogo | Cofres seguros al limpiar, riesgo de un tercio antes de limpiar, objetos transferibles, habilidades e ítems utilizables, con costos definidos. |
| Stages y muerte                           | Dos o más escenarios conectados, espera individual, avance de todos los vivos, persistencia de muertos y derrota del grupo.                    |
| Altares y progreso                        | Altares desde stage 3, reglas de resurrección, niveles, experiencia y recuperación de recursos.                                                |
| Aventura y presentación                   | Narrativa del DM, recursos pixel art definitivos, audio, balance y despliegue compartible.                                                     |

Al implementar cada iteración se aplican los criterios correspondientes de la especificación técnica y las decisiones actualizadas del reglamento. Los valores definitivos de clases y tablas de botín se incorporan cuando el responsable los cierre; la capacidad del inventario ya está confirmada.

## 10. Entregables y comunicación del agente

La primera entrega debe incluir:

- Código ejecutable del frontend y backend, módulos compartidos y contenido de prueba.
- Lockfile, configuración de entorno de ejemplo y Compose.
- Migraciones y procedimiento de arranque reproducible.
- README con comandos, flujo para tablero/celulares y recuperación por código.
- Pruebas relevantes de reglas, integridad y recuperación, con sus resultados.
- Lista de políticas temporales, pendientes y recursos de arte faltantes.
- Un resumen de lo entregado y la forma exacta de comprobarlo.

Las credenciales reales quedan fuera del código y de la documentación compartible. La primera entrega prepara el despliegue; no requiere contratar alojamiento ni publicar una versión pública para demostrar el flujo local de desarrollo. La arquitectura mantiene la comunicación por servidor, igual que el despliegue online previsto.

Cuando un pendiente afecta una etapa posterior, registrar la dependencia y continuar con el trabajo independiente de la primera entrega. Un fixture temporal debe declararse como tal. Si un bloqueo afecta una regla confirmada o la integridad del guardado, explicarlo y delimitar el resultado comprobable.

## 11. Instrucción de arranque para copiar al agente

> Leé los tres documentos del RPG cooperativo: reglas, especificación técnica y brief de MVP. Revisá también las instrucciones y recursos del repositorio. Implementá la primera entrega descrita en el brief, comenzando por la integración de tablero, controles, servidor y PostgreSQL, y continuando hasta el flujo de turno y recuperación por código. Respetá las reglas confirmadas y mantené separados los fixtures y las políticas temporales; las estadísticas y habilidades definitivas siguen pendientes. Entregá código ejecutable, instrucciones de arranque y evidencia de los criterios A01–A15. Identificá los casos no comprobados y los pendientes para las próximas iteraciones.
