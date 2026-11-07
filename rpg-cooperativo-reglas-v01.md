# RPG cooperativo web — Reglas y guardado v0.4

Actualizado: 16 de octubre de 2026.

Este documento consolida las decisiones de la conversación. Las reglas marcadas como confirmadas proceden de decisiones explícitas del usuario. Las interpretaciones, recomendaciones y pendientes no se consideran reglas aprobadas. Las clases, las cifras de estadísticas y el catálogo de ítems permanecen en desarrollo.

## 1. Experiencia y alcance confirmados

- Juego web cooperativo para entre dos y cuatro jugadores.
- Diseñado principalmente para jugar presencialmente, todos en la misma habitación, con Internet.
- Una notebook conectada al televisor muestra el tablero, personajes, enemigos, barras de vida y fases de la partida.
- Al iniciar el encuentro, la cámara de la pantalla compartida se centra en los jugadores presentes en sus apariciones. Añade seis casillas visibles por eje respecto del encuadre sin zoom y sigue el centro de los compañeros cercanos al jugador activo.
- Cada celular presenta una tarjeta de personaje con estadísticas, ataques, dados habilitados cuando corresponde por turno, flechas e inventario. El personaje se desplaza solo en la pantalla compartida.
- La salud aparece con una barra en el celular y junto al retrato del personaje en la pantalla compartida.
- La demo debe incluir inicio, lobby, configuración y entrada a partida; las cifras actuales son valores de prueba.
- Aventura automática. El maestro de mesa es un personaje inventado que guía al grupo y resulta ser el villano final sorpresa: pretende causar la muerte de quienes conduce. Esta revelación es información de diseño, no texto del lobby ni del control móvil. En la demo se presenta como El Anfitrión.
- Estética pixel art.
- Clases previstas: mago, paladín, arquera y guerrero/caballero. La arquera ya es seleccionable en la demo por indicación posterior del responsable. Nombres definitivos, estadísticas y habilidades pendientes; sus valores actuales son de prueba.
- El juego contiene varias salas distribuidas en varias stages. Falta definir la relación exacta entre sala y stage.
- La partida debe poder guardarse y retomarse con sus datos completos.

## 2. Rondas y turnos

### Confirmado

1. Actúan todos los jugadores, en el orden de sus posiciones en el lobby: jugador 1, jugador 2, jugador 3 y jugador 4.
2. Actúan los enemigos.
3. Comienza la siguiente ronda.

El turno de un jugador tiene dos fases consecutivas:

1. Movimiento.
2. Una sola acción: ataque, habilidad o consumo de un ítem.

Después de realizar la acción no se puede volver a mover durante ese turno. Una habilidad utilizada consume su uso o recurso aunque falle el impacto.

Cada jugador dispone de 20 segundos útiles para su turno. La cuenta se pausa durante las animaciones y continúa aunque se desconecte su control. Solo la pantalla compartida muestra la cuenta atrás. Al agotarse, el servidor cierra el turno y avanza al siguiente jugador que corresponda en el orden de la ronda, o a los enemigos si era el último. Si el D20 de un ataque ya acertó y falta su D6, el servidor realiza ese D6 una sola vez, completa el ataque y luego avanza el turno.

### Interpretación operativa propuesta

- Es posible finalizar el movimiento sin gastar todas las casillas y pasar a la acción.
- Es posible omitir el movimiento y/o finalizar el turno sin actuar.
- Al entrar en la fase de acción, el movimiento queda cerrado.
- Cada ataque y cada habilidad ofensiva consume la acción aunque falle.
- Las acciones y el movimiento no utilizados no se acumulan para la siguiente ronda.
- Los personajes muertos no reciben un turno activo.

Estas opciones de omisión y el consumo del ataque básico al fallar deben quedar expresamente incluidos al cerrar el reglamento implementable.

## 3. Movimiento, alcance y ocupación

### Movimiento confirmado

Cada personaje dispone de dos casillas base más una bonificación determinada por un dado de seis caras:

| Resultado del d6 | Bonificación | Movimiento total |
| ---------------- | -----------: | ---------------: |
| 1–2              |            0 |                2 |
| 3–4              |            1 |                3 |
| 5–6              |            2 |                4 |

Se mantiene la interpretación de una tirada de movimiento por turno, antes de moverse. Confirmado el 06/11/2026: cuando no hay enemigos vivos a siete casillas alrededor de los jugadores vivos, se activa exploración con seis movimientos por turno sin tirar el dado. La demo utiliza distancia Manhattan para ese radio.

- Movimiento por casillas en cuatro direcciones: arriba, abajo, izquierda y derecha.
- Los personajes no se mueven en diagonal.
- En la demo, el control muestra como objetivos percibidos a los enemigos vivos situados a seis pasos horizontales y verticales o menos del personaje, en cualquier dirección. La lista se actualiza al moverse; percibir no amplía el alcance de ataque.
- No se puede atravesar a un aliado.

### Alcances básicos confirmados

| Clase              | Alcance básico |
| ------------------ | -------------: |
| Paladín            |      1 casilla |
| Guerrero/caballero |      1 casilla |
| Mago               |     2 casillas |
| Arquero            |     3 casillas |

### Pendiente

- Métrica definitiva de la percepción enemiga y de futuras habilidades; el filtro de objetivos del control usa provisionalmente pasos horizontales y verticales.
- Ocupación por enemigos, cuerpos de jugadores muertos y objetos interactivos.
- Si los enemigos comparten las mismas restricciones de movimiento que los jugadores.
- Percepción orientada y sigilo; la exploración por proximidad conserva el orden de turnos y una acción.

## 4. Obstáculos y visión

### Tres combinaciones confirmadas

| Tipo                       | Bloquea movimiento | Bloquea visión | Ejemplo     |
| -------------------------- | ------------------ | -------------- | ----------- |
| Sólido y opaco             | Sí                 | Sí             | Pared       |
| Oculta y permite pasar     | No                 | Sí             | Hierba alta |
| Impide pasar y permite ver | Sí                 | No             | Pozo        |

La iluminación no modifica la probabilidad de ataque. La geometría del mapa sigue determinando visibilidad y percepción.

### Pendiente

- Cómo se representa la cobertura parcial de la fórmula de impacto, dado que el bloqueo de visión está definido mediante propiedades binarias.
- Qué ataques atraviesan obstáculos transitables que ocultan la visión.
- Forma, amplitud y distancia del campo de visión orientado de cada enemigo.
- Regla de esquinas para calcular la línea de visión.

## 5. Probabilidad de impacto

### Modelo aceptado

Los valores de precisión, esquive y agilidad usan inicialmente una escala de cero a diez.

Evasión = 0,7 × esquive + 0,3 × agilidad.

P(impacto), en porcentaje = limitar entre 10 y 95 [85 + 3 × (precisión − evasión) − H − D − C].

Donde:

- h = vida actual / vida máxima.
- H = 20 × máximo(0; 1 − 2h): penalización por heridas. Hasta el 50 % de vida no hay penalización; debajo crece gradualmente.
- D = 8 × máximo(0; distancia − 1): penalización por distancia para ataques a distancia.
- C = 10 con cobertura parcial; cero sin ella.

La iluminación fue eliminada expresamente.

Antes de calcular una probabilidad se valida que el personaje pueda actuar, que el objetivo esté dentro del alcance y que el ataque tenga una trayectoria válida. Los límites del porcentaje no hacen posible un ataque bloqueado.

La comprobación de impacto se realiza en el servidor. El d20 determina el daño base y el d6 determina su bonificación porcentual. El modelo numérico es la base inicial aceptada; el balance podrá ajustarse mediante pruebas.

En la demo, el control presenta esos dados en secuencia: primero D20, con la comprobación de impacto por separado; si falla, muestra el fallo y no pide D6. Si acierta, el jugador tira D6 después de ver el D20 y el daño final se muestra antes del clip de ataque y la reducción de vida. La tirada pendiente y sus resultados son decisiones del servidor guardadas entre ambos pasos; recargar o reintentar no vuelve a tirar.

## 6. Daño, defensas y críticos

### Confirmado

- El d20 determina el daño base B.
- El d6 determina una bonificación porcentual sobre B, en lugar de sumar su resultado como puntos de daño.

| Resultado del d6 | Bonificación sobre B | Multiplicador M |
| ---------------- | -------------------: | --------------: |
| 1–2              |                  0 % |               1 |
| 3–4              |                 25 % |            1,25 |
| 5–6              |                 50 % |            1,50 |

Daño bruto = B × M.

La precisión y el impacto se comprueban antes mediante el modelo de la sección 5.

- Salud: puntos de vida.
- Defensa física: reducción mediante puntos planos del daño físico.
- Resistencia mágica: reducción mediante puntos planos del daño mágico.
- La defensa correspondiente se resta después de obtener el daño bruto.
- Obtener 20 en el d20 no activa un efecto especial; es el máximo daño base de ese dado.
- El crítico garantizado por sigilo aplica directamente M = 1,50 y reemplaza la tirada del d6. No se sortea ni se acumula una bonificación adicional del d6.

Ejemplo: B = 12 y d6 = 4 producen 15 de daño bruto. Con 5 puntos de defensa física, un ataque físico causa 10 de daño final.

### Recomendaciones operativas propuestas

- Daño final = máximo(0; daño bruto − defensa correspondiente), con redondeo aún pendiente. La defensa no genera curación.

### Pendiente

- Cómo se redondean resultados fraccionarios y en qué momento del cálculo.
- Si una defensa suficiente reduce el daño a cero o existe un mínimo de daño.
- Cálculo de habilidades, mejoras por equipo y ataques de daño mixto.
- Si todos los enemigos usan los mismos dados básicos o dados propios.

## 7. Enemigos, percepción y alarma

### Confirmado

Cada enemigo dispone de vida, movimiento, alcance, percepción y daño. Las estadísticas necesarias para impacto y defensa deben incorporarse al catálogo cuando se definan sus valores.

- Si no ve a nadie, permanece idle en su posición.
- Puede detectar jugadores cuando estos atraviesan su campo de visión orientado, respetando obstáculos.
- Los enemigos se mueven y actúan durante la fase enemiga.
- La alarma se comunica mediante percepción entre enemigos: cuando B puede percibir a A y A detectó a un jugador, B recibe también la información de dónde está ese jugador.
- B puede conocer la posición comunicada aunque todavía no tenga visión directa del jugador.

Esta información compartida no elimina las comprobaciones de alcance y trayectoria necesarias para atacar.

### Pendiente

- Aplicación exacta del campo de visión y de los obstáculos a la percepción del enemigo que comunica la alarma.
- Si la alarma se propaga en cadena a través de enemigos recién alertados.
- Qué hace un enemigo alertado que no tiene visión directa del jugador: investigar, perseguir la posición comunicada o permanecer idle. La regla idle debe distinguir enemigos sin conocimiento y enemigos con información compartida.
- Si la posición compartida se actualiza y cuándo caduca.
- Cómo elige entre varios jugadores visibles.
- Cómo cambia su orientación y qué hace cuando no existe un camino disponible.
- Orden interno de los turnos enemigos.

## 8. Sigilo y entrada en combate

### Confirmado

- El sigilo se deriva de no ser percibido por ningún enemigo.
- Iniciar el combate atacando sin haber sido percibido otorga daño crítico al ataque inicial: el resultado del d20 se multiplica directamente por 1,50 y no se tira el d6.
- Atacar y revelar al personaje rompe esa situación de sigilo.
- La detección visual depende de la orientación del enemigo y de los obstáculos.

### Interpretación propuesta

El crítico está garantizado si el ataque inicial impacta; la tirada de impacto sigue usando el modelo acordado. Debe confirmarse esta interacción si se pretende que el ataque inicial también acierte automáticamente.

### Pendiente

- Si un ataque inicial fallido también revela al atacante y dispara la alarma.
- Si el crítico se concede individualmente a un atacante oculto durante un combate ya iniciado o únicamente al abrir el combate de la sala.
- Si puede recuperarse el sigilo al perder todos los enemigos la percepción.
- Cómo se combina la exploración con el orden de turnos.

## 9. Muerte, altares y derrota

### Confirmado

- Un jugador con cero puntos de vida queda muerto.
- Puede ser revivido mediante una estatua o altar disponible en una stage posterior.
- Las stages 1 y 2 no contienen altares de resurrección.
- Los altares comienzan a aparecer a partir de la stage 3.
- Si muere todo el grupo, la partida termina y se inicia una nueva.

### Pendiente

- Vida con la que se revive, costo, usos y quién activa el altar.
- Destino y disponibilidad de los objetos de un personaje muerto.
- Qué puede ver o hacer el jugador mientras espera ser revivido.
- No se ha establecido que todas las stages posteriores contengan un altar.

## 10. Cofres, botín e inventario

### Confirmado

- Al limpiar una sala, sus cofres pendientes se abren automáticamente y entregan botín bueno: no generan mímicos, serpientes, trampas ni otras consecuencias negativas.
- Confirmado el 06/11/2026: se pueden abrir cofres antes de matar a todos los enemigos. La apertura manual sortea armamento de la clase del personaje seleccionado que abre, poción o serpiente.
- Las probabilidades descritas como 33 %, 33 % y 33 % se interpretan como tres resultados equiprobables de un tercio cada uno, para sumar el 100 %.
- Botín posible: pociones, armas, piezas de armadura y otros ítems por definir.
- Consecuencias negativas posibles: mímico, serpiente, trampa y otras por definir.
- Los jugadores pueden pasarse objetos entre ellos.
- Cada instancia de objeto es única; no puede duplicarse.
- Un personaje solo puede recibir y tener en su bolsa o equipo objetos compatibles con su clase. No puede recoger, conservar ni equipar objetos exclusivos de otra clase; la restricción también se aplica al botín, recompensas y futuras transferencias. Por ejemplo, un paladín no puede tener arcos de arquera ni botas de mago. Confirmado por el responsable el 20/10/2026.
- Bolsa de cuatro espacios, más cuatro ranuras de equipo: casco, pechera, arma y botas. En el inventario, el casco queda arriba de la pechera, el arma a su derecha y las botas debajo.
- Las pociones ocupan cuatro casillas propias en una fila debajo de Movimiento y Tu acción; no consumen espacio de bolsa. Al recibir botín o recolectar, se comprueba el cupo correspondiente. Se prevén pociones de defensa, fuerza y recurso para más adelante; sus efectos aún no están definidos.
- El paladín equipa escudos en su ranura de arma y no espadas. El escudo inicial sustituye a la espada provisional de la demo; las instancias guardadas se convierten sin cambiar su ID.
- Estas piezas son objetos obtenibles como botín. Modifican estadísticas, sin cambiar la apariencia del personaje.
- Se puede descartar un objeto de la bolsa o de las casillas de pociones. Equipar, desequipar, consumir y descartar deben pedir confirmación explícita para evitar acciones accidentales; cancelar no ejecuta la acción.
- Desequipar requiere un espacio libre en la bolsa. Al equipar una pieza en una ranura ocupada, ambas piezas se intercambian: la anterior ocupa exactamente el espacio de bolsa de la nueva, incluso con bolsa llena. Confirmado por el responsable el 20/10/2026.

### Requisitos operativos propuestos

- Un cofre se resuelve una sola vez. Su estado, contenido y consecuencia quedan registrados.
- Un cofre resuelto antes de limpiar la sala no genera una segunda recompensa al limpiarla.
- Los monstruos creados por cofres quedan incorporados al estado de la sala.
- Transferir un objeto cambia su propietario en una operación indivisible; nunca crea una segunda instancia.

### Pendiente

- Cantidad, calidad y tabla del botín bueno entregado automáticamente tras limpiar la sala.
- Reparto del botín automático y tratamiento de un inventario lleno.
- Tablas y balance definitivos dentro del armamento y las pociones; la demo usa armas compatibles y pociones comunes del catálogo.
- Si abrir un cofre y transferir objetos consumen una acción, y desde qué distancia se realizan.

## 11. Salas, stages, progresión y final

### Confirmado

- Encontrar y usar una puerta permite pasar a la sala siguiente.
- Es posible avanzar sin matar enemigos y sin obtener botín.
- Las zonas posteriores tienen enemigos más fuertes, por lo que evitar combates y recompensas dificulta el avance.
- Los personajes suben de nivel durante la aventura y mejoran sus estadísticas base.
- Cada clase prioriza estadísticas distintas al subir de nivel. Las estadísticas puntuadas tienen un máximo base de 10; el equipo puede elevarlas por encima de ese límite. Los valores y ritmos concretos siguen pendientes de balance.
- La ficha muestra daño físico y mágico junto con los atributos puntuados; la barra de vida indica HP actuales y máximos.
- El equipo obtenido modifica sus estadísticas.
- Al pasar de stage recuperan la mitad de la vida que habían perdido.
- Completar el juego termina la partida. Puede iniciarse otra.

### Salida de stage: confirmado

- La puerta no traslada automáticamente a todo el grupo.
- Cada jugador vivo debe cruzarla individualmente.
- Quien cruza queda inhabilitado para seguir jugando en la stage actual y espera a los demás.
- La stage siguiente comienza cuando cruzan todos los jugadores vivos. Los personajes muertos no bloquean esta condición.
- El estado de espera individual debe persistirse si se guarda la partida a mitad de la salida.

### Compatibilidad con la muerte: confirmado

Los personajes muertos avanzan con el estado del grupo a las stages siguientes y conservan su condición de muertos. Solo reviven al activar un altar según las reglas de resurrección. No tienen que cruzar físicamente la puerta ni recuperan vida por la transición de stage.

También falta concretar si un personaje que ya cruzó queda fuera del tablero y deja de ser objetivo de ataques. No se ha establecido inmunidad mientras espera.

### Recuperación entre stages: interpretación operativa

Para un personaje vivo:

vida nueva = vida actual + 0,5 × (vida máxima − vida actual).

Ejemplo: con 100 de vida máxima y 40 actuales, recupera 30 y queda con 70.

Un personaje muerto permanece muerto: la recuperación entre stages no sustituye al altar.

### Pendiente

- Cómo se gana experiencia y si se comparte entre el grupo.
- Cantidad y estructura de salas y stages.
- Cómo se distinguen las puertas internas de una sala y las salidas de stage, si son mecanismos diferentes.
- Qué sucede con enemigos y cofres de una sala abandonada y si se puede volver.
- Recuperación de recursos de habilidades entre stages.
- Redondeo de la recuperación de vida.

## 12. Guardado y continuación

### Requisito confirmado

Guardar los ítems y todos los datos de la partida para poder continuarla posteriormente. La recuperación se realizará mediante un código privado, sin exigir cuentas de usuario.

### Diseño recomendado

El servidor conserva una instantánea persistente del estado. El guardado automático ocurre después de cada operación de juego confirmada, incluyendo las tiradas. Un guardado manual o «guardar y salir» puede usar el mismo mecanismo.

Para una sola acción, el resultado y el cambio de estado deben persistirse juntos. Cargar una partida restaura un resultado ya resuelto; no vuelve a sortearlo. La continuación recupera el último punto confirmado.

| Área               | Datos necesarios                                                                                                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidad y reglas | Identificador de partida, versión del formato, versión de reglas y contenido, estado activa/pausada/ganada/perdida y mecanismo de código privado de recuperación.                                    |
| Grupo              | Posiciones del lobby, asociación de cada jugador con su personaje y mecanismo para recuperar el control.                                                                                             |
| Personajes         | Clase, nivel, experiencia, salud, estadísticas base, modificaciones, equipo, inventario, recursos, efectos, posición, condición vivo/muerto y estado de espera después de cruzar la salida de stage. |
| Mundo              | Stage y sala actual, salas visitadas, puertas y objetivos resueltos, posiciones y estados de objetos.                                                                                                |
| Enemigos           | Salud, posición, orientación, recursos, condición, percepción/alarma y objetivos o última posición conocida cuando proceda.                                                                          |
| Cofres y botín     | Cofres abiertos, resultados ya determinados, consecuencias activadas e identificadores y propietarios únicos de objetos.                                                                             |
| Turnos             | Número de ronda, fase jugadores/enemigos, actor activo, jugadores pendientes de cruzar, fase movimiento/acción, tirada de movimiento ya realizada y casillas restantes.                              |
| Resultados         | Tiradas resueltas, eventos confirmados e identificadores de comandos procesados para impedir duplicación. Si se usa aleatoriedad reproducible, estado del generador.                                 |

Las animaciones se reconstruyen desde los eventos o el estado confirmado. No hace falta guardar un fotograma del tablero.

### Recomendaciones de integridad

- Cada partida tiene un único estado autoritativo y una única línea de continuación activa.
- Las órdenes repetidas por doble toque o reconexión no aplican dos veces la misma acción.
- La partida no depende de que permanezca conectada la notebook o el creador de la sala.
- Los identificadores de objetos se mantienen al cargar y al transferirlos.
- Se restauran los personajes muertos y sus posibilidades de resurrección.
- Los datos se escriben en almacenamiento persistente del backend, además del estado que mantiene una sala activa en memoria.

### Pendiente

- Cómo se emite y recupera el código privado y cómo cada celular vuelve a controlar su personaje. Se recomienda distinguir el código de entrada al lobby del código para recuperar el guardado.
- Quién puede guardar, pausar, continuar y cerrar la partida.
- Reacción a la desconexión del jugador activo o de la pantalla compartida.
- Política para partidas ganadas/perdidas: conservar como historial y bloquear su continuación, reiniciar o permitir regresar a un guardado previo.
- Política de compatibilidad con cambios futuros de reglas y contenido.

## 13. Arquitectura propuesta, sin decisión nueva de stack

Se mantiene como propuesta inicial TypeScript, Phaser para el tablero, React para las interfaces, Node.js con Colyseus para las salas y un módulo propio para las reglas. La demo local usa PostgreSQL y Docker Compose por solicitud posterior; el alojamiento público sigue pendiente. Ver [alcance implementado](docs/demo.md).

Separar las responsabilidades:

- Pantalla compartida: representación del estado y animaciones.
- Control móvil: ficha, selección y envío de intenciones del jugador.
- Servidor: validación, turnos, tiradas, enemigos, propiedad del botín y persistencia.
- Motor de reglas: resolución del combate, movimiento, percepción y progresión.
- Contenido: clases, enemigos, habilidades, ítems, mapas y aventuras.

La arquitectura debe permitir completar esas tablas de contenido más adelante sin incrustarlas en las pantallas.

## 14. Próximas decisiones de mayor impacto

1. Concretar el redondeo y el mínimo de daño después de aplicar defensa.
2. Determinar dónde esperan quienes cruzaron la salida y si pueden recibir ataques.
3. Resolver el comportamiento de alarma sin visión directa y el orden de exploración.
4. Determinar costos de abrir cofres, pasar objetos y revivir, además del reparto del botín automático.
5. Definir quién controla la recuperación mediante código y las políticas de desconexión.

Las estadísticas, habilidades y tablas definitivas de objetos permanecen en standby. La capacidad de bolsa y las cuatro ranuras de equipo ya están confirmadas.

## Decisiones confirmadas: barras de clase y roles

Paladín tanque: mayor vida y armadura, menor daño; Fe dorada. Guerrero: equilibrio entre vida y daño físico; Furia roja. Mago: mayor daño y resistencia mágica, poca vida y alcance 2; Maná celeste. Arquera: alcance 3, poca vida y alto daño; Enfoque verde claro. Ya es seleccionable con estadísticas provisionales.

Barra dividida en tercios: especial consume uno, ulti los tres. Básicos e ítems recuperan recurso. Para la demo se aceptaron inicio en 1/3, recarga de 1/3 por básico o poción y habilidades de daño aumentado. Valores, nombres y multiplicadores numéricos temporales en [contrato de demo](docs/demo.md); no fijan balance definitivo.

## Ritmo visual confirmado

Respetar la duración de las animaciones originales y no habilitar la siguiente fase hasta que termine la reproducción. La figura del personaje ocupa aproximadamente una casilla y media; el paladín es algo más alto. Esto no amplía su casilla lógica ni hitbox.
