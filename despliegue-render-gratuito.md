# Despliegue gratuito con Render, Neon y Vercel

Fecha: 3 de noviembre de 2026.

Estado: **despliegue público activo y flujo multijugador básico verificado**. La recuperación después de detener y volver a iniciar el servidor remoto sigue pendiente; no se considera probada por una recarga del control.

## Alcance y recursos

La restricción confirmada es usar únicamente planes gratuitos. El diseño conserva un solo proceso Node.js/Colyseus como autoridad y PostgreSQL durable, según la [guía del servidor persistente](despliegue-servidor-persistente.md) y la [arquitectura](arquitectura.md).

| Componente | Recurso previsto o existente | Responsabilidad |
| --- | --- | --- |
| Web | Vercel: `https://pixel-adventure-three.vercel.app` | Publicar la interfaz y sus recursos estáticos. |
| Servidor y gateway | Un único servicio **Render Free**, en Virginia: `https://pixel-adventure-apx4.onrender.com/` | Ejecutar Node.js/Colyseus y Caddy en el mismo servicio. |
| Base de datos | **Neon Free**, proyecto `pixel-adventure`, ID `solitary-term-01648592` | Conservar campañas, sesiones y resultados confirmados fuera del filesystem de Render. |

La base se llama `umbral`, usa PostgreSQL 17 y está en `aws-us-east-1`. No se crea una base gratuita de Render: su modalidad gratuita tiene vencimiento y no corresponde al guardado de aventuras a largo plazo.

## Acceso y enrutamiento

Los jugadores deberán abrir el dominio HTTPS del servicio Render. Caddy recibirá el tráfico HTTP que Render entrega después de terminar TLS. La web de Vercel seguirá siendo el upstream de la interfaz.

| Ruta pública | Destino | Tratamiento |
| --- | --- | --- |
| `/api/*` | `127.0.0.1:2567` | Conservar la ruta completa. |
| `/health/*` | `127.0.0.1:2567` | Conservar la ruta completa; devolver el JSON de salud del servidor. |
| `/realtime/*` | `127.0.0.1:2567` | Retirar `/realtime` exactamente una vez y reenviar el upgrade WebSocket. |
| Resto, incluidos `/assets/*` | Web de Vercel por HTTPS | Enviar el `Host` correspondiente al upstream de Vercel. |

Caddy escuchará en el puerto público indicado por `PORT`, normalmente `10000` en Render. El proceso Node recibirá `PORT=2567` únicamente en su entorno de arranque. No se debe reemplazar el puerto público de Render por el del backend.

El gateway no necesita obtener certificados ni habilitar HTTPS dentro del servicio: Render sirve HTTPS/WSS. No se habilitan logs de acceso que registren URLs con códigos privados o tokens.

## Variables y configuración

| Dato | Destino | Regla |
| --- | --- | --- |
| `DATABASE_URL` | Entorno del servidor en Render | Obtener de Neon y mantener SSL habilitado. No copiar a Vercel, `VITE_*`, Git, documentación ni logs. |
| `APP_ORIGINS` | Servidor | Incluir el origen HTTPS exacto del dominio Render, sin barra final. El arranque puede obtenerlo de `RENDER_EXTERNAL_HOSTNAME`. |
| `WEB_UPSTREAM` | Gateway | Hostname de Vercel, sin esquema ni ruta: `pixel-adventure-three.vercel.app`. |
| `PORT` | Gateway | Puerto suministrado por Render; valor de referencia `10000`. |
| `NODE_ENV` | Servidor | `production`. |

Se preparan `infra/render/Caddyfile` e `infra/render/start.sh` para configurar el gateway y supervisar ambos procesos. El arranque debe esperar la salud del backend, propagar las señales de terminación y finalizar el servicio si falla cualquiera de los procesos.

La conexión de GitHub disponible durante esta preparación tiene permiso de lectura y `push=false`. Por eso el contenido necesario de los archivos de despliegue se cargó mediante la configuración de build, inicio y entorno de Render. El build decodifica `UMBRAL_GATEWAY_CONFIG_BASE64` y `UMBRAL_START_SCRIPT_BASE64` dentro de `.render/`; el inicio ejecuta `bash .render/start.sh`. Caddy 2.11.7 se descarga de la publicación oficial y se valida con SHA-256 antes de extraerlo. Los archivos locales quedan pendientes de incorporación al repositorio por un colaborador con escritura. Esto no representa un commit ni un push realizado.

## Arranque, guardado y actualizaciones

El [servidor actual](../apps/server/src/index.ts) ejecuta las migraciones antes de escuchar y restaura las campañas activas desde PostgreSQL al iniciar. Ese comportamiento implementado debe comprobarse contra Neon en el despliegue remoto.

Mantener un único proceso Node por base de datos y **desactivar autodeploy**. Una única réplica no garantiza ausencia de solapamiento durante una actualización: un proveedor puede iniciar el nuevo proceso antes de detener el anterior. Hasta implementar un lease de ownership entre procesos, las actualizaciones requieren detener y drenar el backend anterior antes de restaurar campañas en el nuevo. No actualizar durante una partida activa sin coordinar esa interrupción.

Un éxito de build no verifica persistencia. La reconexión WebSocket y la recuperación durable desde PostgreSQL son comprobaciones distintas. Consultar las [buenas prácticas](buenas-practicas-desarrollo.md) antes de ejecutar pruebas que interrumpan servicios.

## Límites del modo gratuito

- Render Free puede suspender el servicio después de 15 minutos sin tráfico entrante. El primer acceso posterior puede tardar aproximadamente un minuto en despertar el servicio.
- Render aplica cuotas mensuales de horas, transferencia y builds; Neon limita almacenamiento y cómputo según su plan Free. Revisar el consumo antes de una reunión. No habilitar upgrades automáticos ni planes pagos como solución a un límite.
- El filesystem de Render es efímero. Los guardados deben permanecer en Neon; no usar archivos locales ni SQLite como almacenamiento durable.
- El servicio puede reiniciarse por mantenimiento. La recuperación de la aventura y la reconexión de controles necesitan verificación remota antes de considerar la entrega jugable.

Referencias de los proveedores: [Render Free](https://render.com/docs/free), [WebSockets en Render](https://render.com/docs/websocket) y [precios y planes de Neon](https://neon.com/pricing). Las cuotas y condiciones deben revisarse al operar el despliegue; no se promete disponibilidad permanente dentro de un plan gratuito.

## Evidencia obtenida

- Servicio Render `srv-dbl19l6i0phs73bi2gr0`, despliegue `dep-dbl19lui0phs73bi2img`: estado `live`, finalizado el 3 de noviembre de 2026 a las 17:10 UTC, desde el commit `088a3d8750a090b21c0f57a58636987e5562bb2c` de `master`. Plan de ejecución `free`, una instancia y autodeploy desactivado.
- `/health/live` y `/health/ready`: HTTP 200, JSON `{"ok":true}`. Se confirmó en Neon la creación de las tablas mediante las migraciones del servidor.
- Portada, fuente PixelOperator, imagen del Anfitrión y JSON de colisiones: HTTP 200 desde el dominio Render, con sus tipos de contenido correctos.
- Prueba en navegador con tres pestañas: coordinador/tablero y dos jugadores distintos. Se creó una sala, se conectaron ambos controles, se inició la aventura y se renderizó el tablero Phaser con los dos personajes.
- Se tiró movimiento desde ambos controles, se observaron los resultados en la interfaz, el avance de turnos y la respuesta al botón de finalizar turno.
- Se recargó un control: volvió a conectarse con el mismo personaje e inventario. Una consulta SQL de solo lectura confirmó una campaña `ACTIVE` con dos jugadores y revisión persistida en Neon.
- `bash -n` y pruebas simuladas de supervisión de procesos: correctas. `caddy validate`: configuración válida. El build local del servidor con esbuild también finalizó correctamente.

Las pestañas representan clientes separados, pero no constituyen una prueba física desde celulares. Un script adicional de transporte ejecutado desde el entorno local agotó su tiempo de espera; no se cuenta como prueba aprobada ni como fallo demostrado del juego. La prueba de navegador anterior sí completó el flujo indicado.

## Verificación pendiente

1. Probar desde celulares físicos y completar combate, loot y cambio de sala.
2. Verificar explícitamente la idempotencia del mismo comando y la conservación de una tirada dentro del mismo turno al reconectar.
3. Con una campaña de prueba, detener el backend y recuperarla desde Neon después del reinicio; comprobar que no se duplican acciones ni objetos. No ejecutar un redeploy superpuesto durante partidas activas.
4. Incorporar estos archivos al repositorio con permisos de escritura. Actualizar el [estado del MVP](estado-mvp.md) únicamente con evidencia obtenida, según la [guía de documentación](documentacion.md).
