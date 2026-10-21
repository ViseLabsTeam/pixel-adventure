# Umbral — RPG cooperativo web

Demo local para **2 a 4 jugadores**. Una pantalla compartida muestra el tablero; cada celular muestra su ficha y envía acciones. Revisado el **21 de octubre de 2026**.

## Probar con Docker

Requisito: Docker Desktop en ejecución, con contenedores Linux y Docker Compose.

```sh
docker compose up -d --build
docker compose ps
```

Abrí **http://localhost:8088**. Compose crea PostgreSQL 18, aplica las migraciones al iniciar el servidor y sirve la web con Nginx. Las partidas se guardan en el volumen `campaign_data`. Para detener sin borrar las partidas: `docker compose stop`; para continuar: `docker compose up -d`.

La imagen Docker usa los recursos derivados incluidos en el árbol de trabajo. Cuando cambien los GIF o el mapa fuente, ejecutar `pnpm assets:prepare` antes de `docker compose up -d --build`; el build local `pnpm build` también los regenera.

Los valores predeterminados son para desarrollo local. `.env.example` documenta puertos y variables. PostgreSQL solo publica su puerto en `127.0.0.1:5434`; la web publica `8088`. El servidor y los WebSockets quedan detrás del proxy. No se contrató ni publicó alojamiento.

### Una mesa y varios celulares

1. En la notebook/TV, elegí **Crear una partida**. La pantalla compartida no ocupa un jugador.
2. Conservá el **código privado de recuperación** del lobby; es distinto del código público de invitación.
3. En cada celular, abrí la IP local de esa computadora con el puerto 8088, por ejemplo `http://192.168.1.10:8088`. Ambos dispositivos deben estar en la misma red y el firewall debe permitir ese puerto.
4. Elegí **Unirse a una partida**, ingresá el código público, nombre y personaje. El lobby muestra la **Dirección para celulares** y permite editarla; el QR requiere una dirección distinta de localhost. Para configurarla al construir Docker, agregá `SHARE_ORIGIN=http://IP-DE-LA-COMPUTADORA:8088` a `.env` y ejecutá `docker compose up -d --build web`. Si cambia la IP de la computadora, actualizá esa dirección.
5. Con 2–3 viajeros conectados, el coordinador inicia. En el celular, **Personaje** reúne ficha, dados, movimiento y ataques; Movimiento y Tu acción aparecen uno al lado del otro, con cuatro pociones en una fila debajo. La lista de ataque muestra enemigos vivos a seis casillas o menos del personaje. **Inventario** muestra bolsa y equipo en otra vista. Ambas caben en una pantalla móvil sin desplazar la página. **El tablero solo aparece en la pantalla compartida**.

Hay paladín, guerrero, mago y arquera. Cada clase se elige una sola vez por mesa: se reserva durante 30 segundos al seleccionarla, se renueva mientras el formulario esté abierto y queda ocupada al unirse. Una reserva abandonada vence. **Las estadísticas de la arquera son de prueba**: alcance 3, poca vida y daño físico alto. La bolsa tiene **4 espacios de equipo**, más **4 casillas de pociones** en una fila y las ranuras **casco, pechera, arma y botas**. Las pociones no ocupan la bolsa.

### Guardado y recuperación

Cada operación confirmada guarda snapshot, eventos y recibo juntos. Una recarga reutiliza la sesión del dispositivo; un reintento conserva el comando y recupera su resultado original. Si falta el jugador activo, el turno espera.

- **Mesa perdida:** Inicio → Continuar una aventura guardada → código privado. Conserva personajes, orden, vida, turno y objetos.
- **Celular perdido:** el coordinador abre «Recuperar un control perdido», elige el personaje y entrega el código privado de un uso. En el celular nuevo: Continuar → Recuperar mi personaje. Vence en 10 minutos y reemplaza el control anterior al canjearlo.
- **Guardado incierto:** la interfaz conserva la operación pendiente. «Reintentar» concilia esa misma operación; no vuelve a generar una tirada confirmada.

## Alcance de esta demo

Inicio, configuración local de sonido/volumen/animación/grilla, lobby con QR, controles móviles, tablero explorable con cámara, barras de vida, 30 enemigos de prueba incluidos goblins, 11 cofres y zonas de fuente/salida. Las ubicaciones actuales proceden de `collisionV2.json`. Mapa a la derecha a alto completo, panel lateral izquierdo y barras de recursos por tercios. El tablero reproduce spritesheets derivados de los GIF para movimiento y ataques. La tirada D6/D20 aparece sobre Personaje y en la mesa con el nombre de quien la hizo; revela el resultado y después se cierra. La ficha y el inventario móviles aprovechan el espacio disponible con un retrato ampliado. Detalles y fallbacks en docs/demo.md. El Anfitrión guía la expedición sin revelar la trama final.

Cada paso cardinal dura 2 segundos. El D6 de movimiento está centrado sobre las flechas. Para atacar, elegí objetivo y habilidad (básico si no seleccionás otra), tocá el dado D20 y esperá su resultado. Si impacta, se habilita el dado D6 a su lado para calcular el daño final. Después se reproduce el ataque, aparece el daño y cambia la barra de vida. Si falla, se muestra el fallo tras el D20 y no se tira D6. Los ataques enemigos conservan su presentación actual. Un fallo no reduce vida.

El equipo pertenece a una clase: el servidor impide recibir, guardar o equipar objetos de otra clase. El inicio entrega escudo al paladín, espada al guerrero, bastón al mago y arco a la arquera, además de botas y pechera propias. Las pociones son comunes. El botín exclusivo espera en su cofre si no hay un destinatario compatible con espacio. Los guardados anteriores se actualizan con respaldo, conservando los IDs de los objetos.

Tocá una pieza de la bolsa para equipar o descartar, o una poción de Personaje para usar o descartar; después pulsá **Confirmar**. Tocá una pieza equipada para desequiparla; requiere espacio en la bolsa. Si equipás otra pieza en su lugar, la anterior vuelve al mismo espacio de bolsa de la nueva. Las acciones de inventario consumen la acción del turno; **Cancelar** o Escape conservan el estado. Descartar elimina el objeto definitivamente y muestra ese aviso antes de confirmar.

El preset empieza en combate: distancia Manhattan, redondeo hacia abajo, daño mínimo cero y una acción por turno. Equipar, desequipar, consumir e interactuar gastan esa acción. Los cofres se abren tras eliminar los enemigos; el botín va al primer personaje vivo con espacio, o queda junto al cofre. La salida **termina el encuentro de demo**, no implementa la transición entre stages. Ver [políticas y valores](docs/demo.md).

Pendientes: estadísticas y habilidades definitivas, orientaciones definitivas de animaciones, percepción/alarma/sigilo de la aventura, transferencias, progresión, altares, stages y revelación final. El cálculo de daño desde sigilo sí tiene un fixture unitario; no hay exploración con sigilo jugable todavía.

La ficha móvil muestra ocho atributos con símbolos en dos columnas: precisión, esquive, agilidad, defensa física, resistencia mágica, alcance y daños físico/mágico. La barra de vida conserva los HP actuales y máximos. El límite de 10 corresponde a atributos base; el equipo puede aumentarlos por encima de 10. Hay una receta provisional de crecimiento distinta para cada clase, pero ganar niveles todavía no forma parte de la demo. El paladín y el guerrero usan retratos de reposo animados; el mago y la arquera esperan sus GIF de reposo. La caminata lateral del guerrero usa temporalmente su clip S reflejado hacia la izquierda hasta recibir un lateral propio.

## Desarrollo

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
| `pnpm assets:prepare`   | Regenera retratos, escenario, animaciones, vistas de dados y manifiesto; conserva originales. |
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
- `assets/{paladin,guerrero,mago,arquera,enemigos,mapas,maestro,dados,fuentes}`: recursos por categoría; derivados dentro de `generated` cuando corresponde.
- `infra`, `scripts`, `tests/e2e`: contenedores, herramientas y pruebas.

| Documento                                                                                                               | Contenido                                                 |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [Reglas](rpg-cooperativo-reglas-v01.md)                                                                                 | Decisiones confirmadas y pendientes, contenido v0.4.      |
| [Especificación técnica](rpg-cooperativo-especificacion-tecnica.md)                                                     | Diseño completo y referencia al subconjunto implementado. |
| [Brief](rpg-cooperativo-brief-mvp.md)                                                                                   | Alcance y criterios A01–A15.                              |
| [Arquitectura](docs/arquitectura.md)                                                                                    | Estructura y dependencias.                                |
| [Buenas prácticas](docs/buenas-practicas-desarrollo.md)                                                                 | Convenciones y verificación.                              |
| [Documentación](docs/documentacion.md)                                                                                  | Fuentes de verdad y mantenimiento.                        |
| [Demo](docs/demo.md)                                                                                                    | Contratos implementados, fixtures y límites.              |
| [Estado del MVP](docs/estado-mvp.md)                                                                                    | Evidencia, resultados y casos no comprobados.             |
| [Assets](docs/assets.md)                                                                                                | Inventario, recursos integrados y faltantes.              |
| [ADR inicial](docs/decisiones/0001-base-arquitectonica.md) / [ADR de la demo](docs/decisiones/0002-demo-persistente.md) | Decisiones y consecuencias.                               |
| [AGENTS](AGENTS.md)                                                                                                     | Instrucciones del repositorio.                            |
