# Umbral — RPG cooperativo web

Demo para **2 a 4 jugadores**, en modo local u online. Una pantalla compartida muestra el tablero; cada celular muestra su ficha y envía acciones. En online, el anfitrión comparte la pantalla del tablero por videollamada. Revisado el **27 de octubre de 2026**.

## Probar con Docker

Requisito: Docker Desktop en ejecución, con contenedores Linux y Docker Compose.

```sh
docker compose up -d --build
docker compose ps
```

Abrí **http://127.0.0.1:8088**. Compose crea PostgreSQL 18, aplica las migraciones al iniciar el servidor y sirve la web con Nginx. Las partidas se guardan en el volumen `campaign_data`. Para detener sin borrar las partidas: `docker compose stop`; para continuar: `docker compose up -d`.

La imagen Docker usa los recursos derivados incluidos en el árbol de trabajo. Cuando cambien los GIF, el mapa fuente o los sonidos generados, ejecutar `pnpm assets:prepare` antes de `docker compose up -d --build`; el build local `pnpm build` también los regenera.

Los valores predeterminados son para desarrollo local. `.env.example` documenta puertos y variables. PostgreSQL solo publica su puerto en `127.0.0.1:5434`; la web publica `8088`. El servidor y los WebSockets quedan detrás del proxy. El modo online usa el mismo servidor; un enlace temporal HTTPS permite acceder desde otras redes mientras el túnel está activo. No hay alojamiento permanente.

### Partida local: una mesa y varios celulares

1. En la notebook/TV, elegí **Crear una partida**. La pantalla compartida no ocupa un jugador.
2. Conservá el **código privado de recuperación** del lobby; es distinto del código público de invitación.
3. En cada celular, abrí la IP local de esa computadora con el puerto 8088, por ejemplo `http://192.168.1.10:8088`. Ambos dispositivos deben estar en la misma red y el firewall debe permitir ese puerto.
4. Elegí **Unirse a una partida**, ingresá el código público, nombre y personaje. El lobby muestra la **Dirección para celulares** y permite editarla; el QR requiere una dirección distinta de localhost. Para configurarla al construir Docker, agregá `SHARE_ORIGIN=http://IP-DE-LA-COMPUTADORA:8088` a `.env` y ejecutá `docker compose up -d --build web`. Si cambia la IP de la computadora, actualizá esa dirección.
5. Con 2–3 viajeros conectados, el coordinador inicia. En el celular, **Personaje** reúne ficha, dados, movimiento y ataques; Movimiento y Tu acción aparecen uno al lado del otro, con cuatro pociones en una fila debajo. La lista de ataque muestra enemigos vivos a seis casillas o menos del personaje. **Inventario** muestra bolsa y equipo en otra vista. Ambas caben en una pantalla móvil sin desplazar la página. **El tablero solo aparece en la pantalla compartida**.

### Partida online: mesa por videollamada

1. Levantá la demo con Docker y abrí un [Quick Tunnel de Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) hacia `http://127.0.0.1:8088`:

   ```sh
   cloudflared tunnel --url http://127.0.0.1:8088
   ```

   Si el DNS de Windows no resuelve `api.trycloudflare.com`, en esta demo se comprobó esta alternativa con Docker:

   ```sh
   docker run --rm -d --name umbral-demo-tunnel --dns 8.8.8.8 --network umbral-demo_default cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://web:80
   docker logs umbral-demo-tunnel
   ```

   Ese contenedor queda activo al cerrar la consola. Para apagar el enlace, ejecutá `docker stop umbral-demo-tunnel`.

2. En la computadora del anfitrión, elegí **Crear partida online**. En el lobby, ingresá la dirección `https://…trycloudflare.com` que mostró `cloudflared` si la invitación todavía no la usa. También podés poner `ONLINE_ORIGIN=https://…trycloudflare.com` en `.env` y reconstruir la web para sugerirla desde el inicio. La dirección online debe ser un origen HTTPS público, sin usuario, contraseña, ruta ni parámetros.
3. Compartí **solo el enlace de invitación para controles** o su código público con los jugadores. Cada uno lo abre en su dispositivo, elige nombre y personaje; el anfitrión comparte la ventana de la mesa por videollamada. El código privado de recuperación se conserva fuera de la invitación y de la videollamada.
4. Con al menos dos controles conectados, el anfitrión inicia desde la mesa. Los turnos, el guardado y la recuperación funcionan mediante el mismo servidor que en una partida local. Al detener `cloudflared`, el enlace deja de funcionar; la partida persiste en PostgreSQL y puede recuperarse con su código privado cuando vuelva a haber un enlace disponible. Al iniciar otro túnel, actualizá la dirección de invitación del lobby porque cambia el hostname.

El túnel es una vía temporal de prueba, no un alojamiento permanente. Una dirección con formato válido no demuestra que otro dispositivo pueda conectarse: comprobá el enlace desde otra red antes de invitar al grupo. La [guía de Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) indica que cualquier persona con la URL puede abrir el servicio mientras el túnel esté activo.

Hay paladín, guerrero, mago y arquera. Cada clase se elige una sola vez por mesa: se reserva durante 30 segundos al seleccionarla, se renueva mientras el formulario esté abierto y queda ocupada al unirse. Una reserva abandonada vence. **Las estadísticas de la arquera son de prueba**: alcance 3, poca vida y daño físico alto. La bolsa tiene **4 espacios de equipo**, más **4 casillas de pociones** en una fila y las ranuras **casco, pechera, arma y botas**. Las pociones no ocupan la bolsa.

### Guardado y recuperación

Cada operación confirmada guarda snapshot, eventos y recibo juntos. Una recarga reutiliza la sesión del dispositivo; un reintento conserva el comando y recupera su resultado original. Cada jugador tiene 20 segundos útiles por turno: las animaciones pausan la cuenta, pero la desconexión del control no. Al vencer, pasa al siguiente turno. La cuenta atrás aparece solo en la mesa.

- **Mesa perdida:** Inicio → Continuar una aventura guardada → código privado. Conserva personajes, orden, vida, turno y objetos.
- **Celular perdido:** el coordinador abre «Recuperar un control perdido», elige el personaje y entrega el código privado de un uso. En el celular nuevo: Continuar → Recuperar mi personaje. Vence en 10 minutos y reemplaza el control anterior al canjearlo.
- **Guardado incierto:** la interfaz conserva la operación pendiente. «Reintentar» concilia esa misma operación; no vuelve a generar una tirada confirmada.

## Alcance de esta demo

Si todo el grupo cae, la mesa y los controles muestran el fin de la expedición. El mapa actual incluye un revividor de prueba: un personaje vivo puede activarlo una vez para devolver a los caídos con 1 punto de vida al sur del altar. Las partidas guardadas conservan el mapa con el que se crearon.

Inicio, configuración local de sonido/volumen/animación/grilla, lobby con QR, controles móviles, tablero explorable con cámara, barras de vida, 41 enemigos de prueba incluidos 11 goblins arqueros, 11 cofres y zonas de fuente/salida. Las ubicaciones actuales proceden de `mapa_con_arqueros.json`. El mapa ocupa toda la ventana de la mesa; una franja superior muestra personajes, vida, recurso, turno, temporizador y movimiento. La crónica translúcida de abajo a la izquierda conserva las dos acciones recientes; invitación, recuperación y ajustes están en el menú de la mesa. Las barras de recurso siguen divididas en tercios. La cámara comienza centrada en las apariciones del grupo, añade seis casillas visibles por eje respecto del encuadre sin zoom y sigue el centro del grupo cercano al jugador activo. El tablero reproduce spritesheets derivados de los GIF para movimiento y ataques. La tirada D6/D20 aparece sobre Personaje y en la mesa con el nombre de quien la hizo; revela el resultado y después se cierra. La ficha y el inventario móviles aprovechan el espacio disponible con un retrato ampliado. Detalles y fallbacks en docs/demo.md. El Anfitrión guía la expedición sin revelar la trama final.

Cada paso cardinal dura 2 segundos. El D6 de movimiento está centrado sobre las flechas. Los dados habilitados reproducen su GIF y tienen un halo; Reducir movimiento conserva la imagen estática y el halo. Para atacar, elegí objetivo y habilidad (básico si no seleccionás otra), tocá el dado D20 y esperá su resultado. Si impacta, se habilita el dado D6 a su lado para calcular el daño final. Si se acaba el turno con un D20 acertado y el D6 pendiente, el servidor tira ese D6 automáticamente una sola vez antes de avanzar. Después se reproduce el ataque, aparece el daño y cambia la barra de vida. Si falla, se muestra el fallo tras el D20 y no se tira D6. Los ataques enemigos conservan su presentación actual. Un fallo no reduce vida.

Cuando un jugador o enemigo recibe daño positivo, su figura se vuelve roja durante un segundo, retrocede levemente en sentido opuesto al atacante y desprende partículas rojas, sin cambiar de casilla. Los fallos y los golpes de daño cero no activan estos efectos visuales; la opción de movimiento reducido los omite. La mesa reproduce un sonido de impacto distinto de los de inventario y curación.

El equipo pertenece a una clase: el servidor impide recibir, guardar o equipar objetos de otra clase. El inicio entrega escudo al paladín, espada al guerrero, bastón al mago y arco a la arquera, además de botas y pechera propias. Las pociones son comunes. El botín exclusivo espera en su cofre si no hay un destinatario compatible con espacio. Los guardados anteriores se actualizan con respaldo, conservando los IDs de los objetos.

Tocá una pieza de la bolsa para equipar o descartar, o una poción de Personaje para usar o descartar; después pulsá **Confirmar**. Tocá una pieza equipada para desequiparla; requiere espacio en la bolsa. Si equipás otra pieza en su lugar, la anterior vuelve al mismo espacio de bolsa de la nueva. Al equipar aparecen partículas y un brillo claro que se desvanece en un segundo; consumir una poción produce el mismo efecto en verde. Equipar, desequipar y curarse tienen sonidos distintos en la mesa. Beber de la fuente comparte el sonido de curación, sin brillo verde; desequipar no tiene brillo. Las acciones de inventario consumen la acción del turno; **Cancelar** o Escape conservan el estado. Descartar elimina el objeto definitivamente y muestra ese aviso antes de confirmar.

En **Configuración**, los sonidos de la mesa están activados por defecto y tienen un interruptor distinto del de los clics de los controles. El volumen es común y se guarda en cada dispositivo. Los cuatro sonidos nuevos se oyen solo en la mesa compartida, cuando llega la acción confirmada. Si el navegador bloquea audio hasta una interacción del anfitrión, la mesa ofrece **Activar sonido**. Reducir movimiento no silencia los sonidos.

El preset alterna combate y exploración por proximidad: sin enemigos vivos a siete casillas Manhattan de ningún jugador vivo, cada turno concede seis movimientos sin D6. En combate mantiene distancia Manhattan, redondeo hacia abajo, daño mínimo cero y una acción por turno. Equipar, desequipar, consumir e interactuar gastan esa acción. Los cofres pueden abrirse cerca durante el turno: sortean por tercios un arma de la clase del personaje que abre, una poción o una serpiente. Los pendientes al eliminar todos los enemigos conservan su apertura automática con botín bueno. La salida **termina el encuentro de demo**, no implementa la transición entre stages. Ver [políticas y valores](docs/demo.md).

Pendientes: estadísticas y habilidades definitivas, orientaciones definitivas de animaciones, percepción/alarma/sigilo de la aventura, transferencias, progresión, altares, stages y revelación final. El cálculo de daño desde sigilo sí tiene un fixture unitario; no hay exploración con sigilo jugable todavía.

La ficha móvil muestra ocho atributos con símbolos en dos columnas: precisión, esquive, agilidad, defensa física, resistencia mágica, alcance y daños físico/mágico. La barra de vida conserva los HP actuales y máximos. El límite de 10 corresponde a atributos base; el equipo puede aumentarlos por encima de 10. Hay una receta provisional de crecimiento distinta para cada clase, pero ganar niveles todavía no forma parte de la demo. El paladín y el guerrero usan retratos de reposo animados; el mago y la arquera esperan sus GIF de reposo. La caminata lateral del guerrero usa temporalmente su clip S reflejado hacia la izquierda hasta recibir un lateral propio.

## Desarrollo

### Despliegue preparado

El [despliegue con web estática en Vercel y servidor Colyseus persistente](docs/despliegue-servidor-persistente.md) conserva el contrato público `/api/*`, `/realtime/*` y `/health/*` mediante un gateway HTTPS delante de ambos. `vercel.json` compila solo `web`; el servicio `server` ejecuta un único proceso Node.js con PostgreSQL externo. La configuración está preparada, pero aún no se probó en un dominio público.

Node.js **22.12 o superior** (verificado localmente con 22.14; Docker usa 24), pnpm **10.34.7**. Un solo gestor y `pnpm-lock.yaml`.

```sh
npx --yes pnpm@10.34.7 install --frozen-lockfile
docker compose up -d db
npx --yes pnpm@10.34.7 db:migrate
npx --yes pnpm@10.34.7 assets:prepare
npx --yes pnpm@10.34.7 dev
```

En PowerShell podés usar `npx.cmd`. Si ya levantaste toda la demo Docker, detené primero web y servidor con `docker compose stop web server`; dejá db activo. La demo admite un único backend por base.

Desarrollo: web **http://localhost:5173**, servidor interno **2567** y PostgreSQL **5434**. Vite redirige API y WebSockets al servidor. El backend toma `DATABASE_URL` del entorno; con los valores locales de Compose funciona sin configurarla. Si cambiás contraseña/puerto, exportá también la URL correspondiente. Docker Compose lee `.env`; el comando de desarrollo no lo carga automáticamente.

El editor local de colisiones está en **http://localhost:5173/map-editor.html** durante desarrollo. Carga el PNG y el trazado de muros/troncos, permite corregir las siluetas de árboles y exporta un JSON para revisar e incorporar. Las partidas nuevas usan ese trazado; las guardadas conservan sus bloqueos.

Para abrirlo, ubicar apariciones, agregar o mover enemigos del catálogo, colocar cofres y plantas recolectables, y aplicar el JSON al juego, seguí el [tutorial del editor](docs/tutorial-editor-mapas.md).

| Script                  | Resultado                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm check`            | Tipos, pruebas unitarias, contenido y formato.                                                |
| `pnpm build`            | Recursos derivados, tipos, bundle web y servidor.                                             |
| `pnpm test:integration` | Pruebas PostgreSQL sobre una base cuyo nombre termine en `_test`.                             |
| `pnpm test:e2e`         | Navegador contra la demo levantada; crea campañas de prueba.                                  |
| `pnpm assets:prepare`   | Regenera retratos, escenario, animaciones, vistas de dados, cuatro WAV y manifiesto; conserva originales. |
| `pnpm format`           | Formatea código y pruebas.                                                                    |
| `pnpm docs:check`       | Comprueba enlaces locales de Markdown.                                                        |

Para preparar integración, ejecutar una vez:

```sh
docker compose exec -T db psql -U umbral -d postgres -c "CREATE DATABASE umbral_test;"
npx --yes pnpm@10.34.7 test:integration
```

Puede cambiarse la conexión mediante `TEST_DATABASE_URL`. Las pruebas eliminan solo las campañas que crearon. E2E usa Microsoft Edge instalado; `PLAYWRIGHT_CHANNEL` permite elegir otro canal disponible y `DEMO_URL` cambiar el destino. El caso de recuperación se habilita con `RUN_RECOVERY_TESTS=1`: **reinicia el servidor y detiene brevemente PostgreSQL de esta demo local**. No ejecutarlo durante una partida de otras personas. No elimina volúmenes.

## Organización y documentación

- `apps/web`: React y tablero Phaser, cargado solo por la pantalla compartida.
- `apps/server`: HTTP/Colyseus, autorización, casos de uso y PostgreSQL.
- `packages/core`: reglas independientes y aleatoriedad inyectada.
- `packages/protocol`: contratos y validación de comandos.
- `packages/content`: catálogo público y preset exclusivo del servidor.
- `assets/{paladin,guerrero,mago,arquera,enemigos,mapas,maestro,dados,fuentes,audio}`: recursos por categoría; derivados dentro de `generated` cuando corresponde.
- `infra`, `scripts`, `tests/e2e`: contenedores, herramientas y pruebas.

| Documento                                                                                                               | Contenido                                                 |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [Reglas](rpg-cooperativo-reglas-v01.md)                                                                                 | Decisiones confirmadas y pendientes, contenido v0.4.      |
| [Especificación técnica](rpg-cooperativo-especificacion-tecnica.md)                                                     | Diseño completo y referencia al subconjunto implementado. |
| [Brief](rpg-cooperativo-brief-mvp.md)                                                                                   | Alcance y criterios A01–A15.                              |
| [Arquitectura](docs/arquitectura.md)                                                                                    | Estructura y dependencias.                                |
| [Buenas prácticas](docs/buenas-practicas-desarrollo.md)                                                                 | Convenciones y verificación.                              |
| [Documentación](docs/documentacion.md)                                                                                  | Fuentes de verdad y mantenimiento.                        |
| [Flujo de trabajo con subagentes](docs/flujo-trabajo-agentes.md)                                                       | Delegación, revisión y reconstrucción de la demo.         |
| [Demo](docs/demo.md)                                                                                                    | Contratos implementados, fixtures y límites.              |
| [Estado del MVP](docs/estado-mvp.md)                                                                                    | Evidencia, resultados y casos no comprobados.             |
| [Assets](docs/assets.md)                                                                                                | Inventario, recursos integrados y faltantes.              |
| [ADR inicial](docs/decisiones/0001-base-arquitectonica.md) / [ADR de la demo](docs/decisiones/0002-demo-persistente.md) | Decisiones y consecuencias.                               |
| [AGENTS](AGENTS.md)                                                                                                     | Instrucciones del repositorio.                            |
