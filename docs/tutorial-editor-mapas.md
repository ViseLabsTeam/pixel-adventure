# Tutorial del editor de mapas

El editor sirve para dibujar la colisión y ubicar puntos sobre un PNG. Funciona **solo en desarrollo**, en `http://localhost:5173/map-editor.html`. Guarda el trabajo descargando un JSON; nunca cambia una partida abierta ni escribe en PostgreSQL.

## 1. Abrirlo

Desde la raíz del repositorio, con las dependencias ya instaladas:

```powershell
cd apps/web
.\node_modules\.bin\vite.cmd --host 127.0.0.1
```

Abrí `http://localhost:5173/map-editor.html`. Para cerrar Vite, presioná `Ctrl+C` en esa terminal. El editor no necesita que estén encendidos el servidor del juego ni PostgreSQL.

El mapa actual se abre automáticamente con [Scene_Overview.png](../assets/mapas/Scene_Overview.png), casillas de 16 píxeles y origen `(494,366)`. Esas coordenadas significan que el punto `(0,0)` del juego está en el píxel `(494,366)` de la imagen. Los valores negativos señalan casillas a la izquierda o arriba del origen. Mové la barra **Zoom** y desplazá el área del mapa para inspeccionarlo.

## 2. Dibujar obstáculos y árboles

Elegí una herramienta en la barra superior:

| Herramienta        | Uso                                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pintar muro        | Arrastrá sobre la base de un muro. Las casillas rojas bloquean pasos y ataques.                                                                                   |
| Pintar tronco      | Seleccioná un árbol y marcá solo las casillas de su tronco; aparecen violetas.                                                                                    |
| Borrar casilla     | Arrastrá para quitar muro o tronco. Conserva las apariciones, cofres y plantas de esa casilla.                                                                    |
| Delinear árbol     | Elegí un árbol y hacé clic alrededor de su silueta. **Cerrar silueta** calcula la posición del pie desde las casillas de tronco. Podés corregir **Pie Y** a mano. |
| Vista de personaje | Hacé clic para colocar el círculo azul de prueba. Probá detrás, delante y debajo de una copa.                                                                     |

Las piedras pequeñas rodeadas de pasto son parte del piso: dejalas libres. También deben quedar libres las escaleras y aberturas. El área de copa no bloquea; solo el tronco. **Nuevo árbol** crea una silueta nueva. Para otro PNG, usá **PNG** y luego **Nuevo mapa** si querés empezar con el trazado vacío; ajustá origen y tamaño de casilla antes de pintar.

Para volver a dibujar una copa, seleccioná el árbol y pulsá **Reiniciar silueta**. Esto borra solo los puntos del contorno de ese árbol en la edición actual; conserva sus casillas de tronco y los demás árboles. La silueta noroeste del mapa actual ya está vacía para que puedas trazarla de nuevo. Hasta que tenga al menos tres puntos y exportes el JSON, esa copa no tendrá capa visual generada.

## 3. Elegir apariciones, cofres y objetos

**Ubicar aparición:** seleccioná el número de jugador (1 a 4) y hacé clic en una casilla libre. Repetí para los cuatro. Una nueva marca del mismo número reemplaza la anterior.

**Ubicar cofre:** hacé clic en una casilla para crearlo. El editor asigna un ID (`chest-5`, por ejemplo) y muestra sus datos en la fila **Objeto**. Allí podés cambiar el ID y el identificador del objeto que entrega, por ejemplo `potion` o `iron-helmet`. Hacé clic sobre un cofre existente para seleccionarlo. Los cofres de esta demo entregan su botín al terminar el combate; su interacción actual permite recoger botín que haya quedado en el suelo.

La lista **Objeto** lee el [catálogo del juego](../packages/content/src/items.ts) e indica las clases compatibles. Por ejemplo: `archer-bow` entrega un arco solo a la arquera, `mage-staff` un bastón solo al mago y `mage-travel-boots` botas solo al mago. Un paladín no puede recibirlos ni guardarlos en la bolsa. Si no hay un personaje compatible con espacio al abrir el cofre, el botín espera allí. `potion` sigue siendo común a todas las clases. La misma restricción rige para las recompensas de interactuables.

**Ubicar interactuable:** hacé clic para crear un punto con tipo, nombre e identificador de objeto. Una planta puede tener tipo `plant`, nombre `Hierbas` y objeto `potion`. También podés usar otros tipos; el campo **Objeto** acepta identificadores que existan en el catálogo del juego. Seleccioná una marca verde para editarla o usá **Eliminar punto**. En la demo, un personaje a una casilla o menos puede interactuar **una sola vez** para recibir ese objeto. La interacción gasta la acción del turno y exige espacio libre en la bolsa. El identificador del objeto recolectado permanece igual al guardar o reintentar. Esta política de recolección es provisional; otras acciones como activar palancas requieren reglas y efectos propios.

Las marcas celestes numeradas son apariciones; `C` amarillo señala un cofre; `P` verde una planta y `I` otro interactuable. Las apariciones y cofres deben quedar en casillas libres. Un interactuable puede dibujarse sobre un obstáculo si existe una casilla libre adyacente desde la que pueda usarse.

Un borde rojo alrededor de una aparición o cofre indica que está sobre una casilla bloqueada. Podés liberar la casilla con **Borrar casilla** sin perder el punto, o seleccionar el punto y pulsar **Eliminar punto** para ubicarlo de nuevo. Antes de incorporar el JSON, comprobá también que haya un recorrido desde las apariciones hasta los cofres y la salida.

## 4. Agregar y mover enemigos

1. Elegí **Ubicar / arrastrar enemigo** y seleccioná el tipo en **Enemigo a agregar**. El selector usa el [catálogo de enemigos](../packages/content/enemy-recipes.json), compartido con el juego. Actualmente incluye Centinela del umbral, Eco errante y Goblin de las ruinas.
2. Hacé clic en una casilla para agregarlo. Cada aparición recibe un ID propio, por ejemplo `goblin-1`; podés colocar varios del mismo tipo. Los marcadores `E` de color salmón son enemigos.
3. Para moverlo, arrastrá su marcador con esa herramienta. También podés seleccionarlo en **Enemigos del mapa**: el editor centra la vista y muestra sus datos. Editá **X** e **Y**, incluso negativos, o usá **Mover punto seleccionado** y hacé clic en el destino.
4. El campo **Enemigo** de la fila de edición cambia el tipo de la aparición seleccionada; **Enemigo a agregar** elige el tipo para las próximas apariciones. **Eliminar punto** borra solo el seleccionado.

Ubicá los enemigos en casillas libres, sin superponerlos con otros enemigos, apariciones, cofres o plantas. El editor informa obstáculos y superposiciones; la generación y validación rechazan ubicaciones inválidas. El JSON guarda `enemies` con `id`, `archetypeId`, `x` e `y`; las estadísticas proceden del catálogo. Al importar un JSON antiguo sin `enemies`, se conservan los tres enemigos originales de demo mediante [las ubicaciones de compatibilidad](../assets/mapas/legacy-enemies.json). Una lista explícita `enemies: []` representa un mapa sin enemigos y **Nuevo mapa** comienza con esa lista vacía.

Cuando incorporemos otro tipo al catálogo, aparecerá en el selector al recargar el editor. El tipo necesita estadísticas válidas; si además tiene sprites, se integra su receta en [actor-recipes.json](../packages/content/actor-recipes.json), se generan sus recursos y se incluyen en la web. Mientras no tenga arte integrado, el tablero usa el marcador provisional de enemigo. Un GIF por sí solo no agrega un tipo ni define sus habilidades.

## 5. Guardar e incorporar el mapa actual

1. Pulsá **Exportar JSON**. El navegador descargará `collision.json` en su carpeta de descargas. Ese botón guarda una copia de lo que ves en el editor, pero no cambia [el JSON del repositorio](../assets/mapas/collision.json). Exportá antes de recargar o cerrar la pestaña: los cambios sin exportar se pierden. Conservá una copia anterior antes de reemplazar el archivo del proyecto.
2. Revisá que haya cuatro apariciones distintas, que enemigos, cofres e interactuables tengan IDs únicos, tipos u objetos conocidos, y que las zonas libres sigan conectadas. El archivo exportado convierte los rectángulos de muro originales en una lista de casillas, por lo que puede ser más largo.
3. Copiá el JSON revisado a `assets/mapas/collision.json` y, desde la raíz del repositorio, ejecutá:

   ```powershell
   node scripts/prepare-map.mjs
   .\node_modules\.bin\tsx.cmd scripts/validate-content.ts
   .\node_modules\.bin\tsc.cmd --noEmit
   ```

4. Si jugás con Docker, reconstruí con `docker compose up -d --build web` para incorporar los archivos generados y el servidor actualizado. En desarrollo, el servidor debe tomar el contenido regenerado. Creá una **partida nueva** para ver las apariciones, enemigos, cofres, plantas y colisiones actualizados. Las partidas guardadas conservan los bloqueos, enemigos, personajes y cofres con los que se crearon; las anteriores que no tenían interactuables cargan con una lista vacía.

`prepare-map.mjs` regenera [las casillas bloqueadas](../packages/content/src/courtyard-collision.ts), [las ubicaciones](../packages/content/src/courtyard-placements.ts) y los recortes transparentes dentro de `assets/mapas/generated/`. El PNG original no se toca. La página del editor no se incluye en la web publicada.

## Otros mapas

El editor puede abrir un PNG y producir su JSON, pero el generador y la aventura están conectados actualmente a `Scene_Overview.png`. Para jugar en otro mapa hay que incorporar el archivo al contenido, generar sus recursos, definir zonas y validar sus recorridos. Exportar un JSON nuevo por sí solo no reemplaza el escenario de una campaña.
