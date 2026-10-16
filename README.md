# Umbral — RPG cooperativo web

Demo local para **2 a 4 jugadores**. Una pantalla compartida muestra el tablero; cada celular muestra su ficha y envía acciones. Revisado el **16 de octubre de 2026**.

## Probar con Docker

Requisito: Docker Desktop en ejecución, con contenedores Linux y Docker Compose.

```sh
docker compose up -d --build
docker compose ps
```

Abrí **http://localhost:8088**. Compose crea PostgreSQL 18, aplica las migraciones al iniciar el servidor y sirve la web con Nginx. Las partidas se guardan en el volumen `campaign_data`. Para detener sin borrar las partidas: `docker compose stop`; para continuar: `docker compose up -d`.

Los valores predeterminados son para desarrollo local. `.env.example` documenta puertos y variables. PostgreSQL solo publica su puerto en `127.0.0.1:5434`; la web publica `8088`. El servidor y los WebSockets quedan detrás del proxy. No se contrató ni publicó alojamiento.

### Una mesa y varios celulares

1. En la notebook/TV, elegí **Crear una partida**. La pantalla compartida no ocupa un jugador.
2. Conservá el **código privado de recuperación** del lobby; es distinto del código público de invitación.
3. En cada celular, abrí la IP local de esa computadora con el puerto 8088, por ejemplo `http://192.168.1.10:8088`. Ambos dispositivos deben estar en la misma red y el firewall debe permitir ese puerto.
4. Elegí **Unirse a una partida**, ingresá el código público, nombre y personaje. También podés editar la dirección del QR en «Conectar celulares en la misma red». Un QR que contiene localhost apunta al propio teléfono.
5. Con 2–4 viajeros conectados, el coordinador inicia. El celular tira movimiento, envía pasos, elige ataque/objetos y finaliza turno. **El tablero solo aparece en la pantalla compartida**.

Hay paladín, guerrero y mago. **La arquera no es seleccionable.** Las estadísticas son de prueba. La bolsa tiene **4 espacios**, más **casco, guantes, pantalones y pechera**: el equipo modifica estadísticas y conserva la apariencia.

### Guardado y recuperación

Cada operación confirmada guarda snapshot, eventos y recibo juntos. Una recarga reutiliza la sesión del dispositivo; un reintento conserva el comando y recupera su resultado original. Si falta el jugador activo, el turno espera.

- **Mesa perdida:** Inicio → Continuar una aventura guardada → código privado. Conserva personajes, orden, vida, turno y objetos.
- **Celular perdido:** el coordinador abre «Recuperar un control perdido», elige el personaje y entrega el código privado de un uso. En el celular nuevo: Continuar → Recuperar mi personaje. Vence en 10 minutos y reemplaza el control anterior al canjearlo.
- **Guardado incierto:** la interfaz conserva la operación pendiente. «Reintentar» concilia esa misma operación; no vuelve a generar una tirada confirmada.

## Alcance de esta demo

Inicio, configuración local de sonido/volumen/animación/grilla, lobby con QR, controles móviles, tablero de 10 × 10, barras de vida, dos enemigos de prueba, cuatro cofres y zonas de fuente/salida. Mapa a la derecha a alto completo, panel lateral izquierdo y barras de recursos por tercios. El tablero reproduce spritesheets derivados de los GIF para movimiento y ataques; detalles y fallbacks en docs/demo.md. El Anfitrión guía la expedición sin revelar la trama final.

El preset empieza en combate: distancia Manhattan, redondeo hacia abajo, daño mínimo cero y una acción por turno. Equipar, desequipar, consumir e interactuar gastan esa acción. Los cofres se abren tras eliminar los enemigos; el botín va al primer personaje vivo con espacio, o queda junto al cofre. La salida **termina el encuentro de demo**, no implementa la transición entre stages. Ver [políticas y valores](docs/demo.md).

Pendientes: estadísticas y habilidades definitivas, orientaciones definitivas de animaciones, percepción/alarma/sigilo de la aventura, transferencias, progresión, altares, stages y revelación final. El cálculo de daño desde sigilo sí tiene un fixture unitario; no hay exploración con sigilo jugable todavía.

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

| Script | Resultado |
| --- | --- |
| `pnpm check` | Tipos, pruebas unitarias, contenido y formato. |
| `pnpm build` | Recursos derivados, tipos, bundle web y servidor. |
| `pnpm test:integration` | Pruebas PostgreSQL sobre una base cuyo nombre termine en `_test`. |
| `pnpm test:e2e` | Navegador contra la demo levantada; crea campañas de prueba. |
| `pnpm assets:prepare` | Regenera retratos, escenario y manifiesto; conserva originales. |
| `pnpm format` | Formatea código y pruebas. |
| `pnpm docs:check` | Comprueba enlaces locales de Markdown. |

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
- `assets/{paladin,guerrero,mago,mapas,maestro}`: originales por categoría; derivados dentro de `generated`.
- `infra`, `scripts`, `tests/e2e`: contenedores, herramientas y pruebas.

| Documento | Contenido |
| --- | --- |
| [Reglas](rpg-cooperativo-reglas-v01.md) | Decisiones confirmadas y pendientes, contenido v0.4. |
| [Especificación técnica](rpg-cooperativo-especificacion-tecnica.md) | Diseño completo y referencia al subconjunto implementado. |
| [Brief](rpg-cooperativo-brief-mvp.md) | Alcance y criterios A01–A15. |
| [Arquitectura](docs/arquitectura.md) | Estructura y dependencias. |
| [Buenas prácticas](docs/buenas-practicas-desarrollo.md) | Convenciones y verificación. |
| [Documentación](docs/documentacion.md) | Fuentes de verdad y mantenimiento. |
| [Demo](docs/demo.md) | Contratos implementados, fixtures y límites. |
| [Estado del MVP](docs/estado-mvp.md) | Evidencia, resultados y casos no comprobados. |
| [Assets](docs/assets.md) | Inventario, recursos integrados y faltantes. |
| [ADR inicial](docs/decisiones/0001-base-arquitectonica.md) / [ADR de la demo](docs/decisiones/0002-demo-persistente.md) | Decisiones y consecuencias. |
| [AGENTS](AGENTS.md) | Instrucciones del repositorio. |
