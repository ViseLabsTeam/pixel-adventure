# Servidor persistente para el despliegue web

Estado: configuración preparada; despliegue público y recuperación después de un reinicio remoto no verificados.

La [especificación técnica](../rpg-cooperativo-especificacion-tecnica.md#18-despliegue-y-operación) requiere un proceso Node.js/Colyseus persistente, inicialmente uno solo, y PostgreSQL durable. La imagen `server` de [infra/Dockerfile](../infra/Dockerfile) y [infra/compose.persistent.yaml](../infra/compose.persistent.yaml) preparan ese proceso sin iniciar otra réplica ni una base efímera. El proveedor, la región y el dominio del backend siguen pendientes.

## Variables y red

| Variable | Destino | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Servidor | URL privada de PostgreSQL con almacenamiento durable y copias de seguridad. Obligatoria en el Compose persistente. No copiarla a Vercel ni a variables `VITE_*`. |
| `APP_ORIGINS` | Servidor | Orígenes adicionales admitidos, separados por comas. Incluir el origen HTTPS público de la web. El mismo origen de la solicitud se acepta automáticamente según la política actual. |
| `SERVER_PORT` | Host del servidor | Puerto local donde el proxy HTTPS alcanza el contenedor; predeterminado `2567`. Se publica solo en `127.0.0.1`. El ejemplo de Caddy usa ese valor predeterminado. |
| `PUBLIC_HOST` | Caddy | Dominio público del gateway, por ejemplo `mesa.example.com`. |
| `WEB_UPSTREAM` | Caddy | Hostname del despliegue web de Vercel, sin esquema ni ruta. |
| `BACKEND_UPSTREAM` | Caddy | Dirección local del proceso Node, por ejemplo `127.0.0.1:2567`; debe coincidir con `SERVER_PORT`. |
| `PORT` | Contenedor | Fijado en `2567` por este Compose; el proceso atiende HTTP y WebSocket en el mismo puerto. |
| `NODE_ENV` | Contenedor | Fijado en `production`. |

[infra/Caddyfile.backend.example](../infra/Caddyfile.backend.example) muestra un gateway público de un solo dominio: `/api/*` y `/health/*` conservan la ruta hacia el proceso persistente; `/realtime/*` retira el prefijo antes de llegar a Colyseus; el resto, incluidos los recursos `/assets/*`, llega al despliegue estático de Vercel. Caddy sirve HTTPS/WSS y reenvía la actualización WebSocket. `PUBLIC_HOST` es el dominio que usan los jugadores y `WEB_UPSTREAM` apunta al despliegue web de Vercel. El proceso Node escucha solo en el loopback del host. Verificar que la configuración del dominio y los certificados del gateway corresponden al entorno real antes de dirigir jugadores allí.

Este gateway conserva el contrato de un solo origen sin depender de que una reescritura externa de Vercel transporte WebSocket. El `vercel.json` de la raíz configura únicamente la web estática. No se ha probado este gateway contra un backend público ni contra Vercel.

`/health/live` y `/health/ready` devuelven únicamente `{ "ok": true | false }`; la segunda consulta PostgreSQL. No incluir credenciales ni detalles de fallos en esas respuestas. Las rutas de partida siguen usando los tokens y códigos de la aplicación. Si se habilitan herramientas administrativas o de diagnóstico, protegerlas fuera del enrutamiento público.

## Arranque

Desde la raíz del repositorio, configurar `DATABASE_URL` y `APP_ORIGINS` en el entorno del operador, sin guardarlos en Git. Ejemplo con valores ficticios:

```sh
DATABASE_URL='postgres://usuario:contraseña@host-privado:5432/umbral' APP_ORIGINS='https://mesa.example.com' docker compose -f infra/compose.persistent.yaml up -d --build
docker compose -f infra/compose.persistent.yaml ps
```

El servidor ejecuta las migraciones antes de escuchar y restaura las campañas activas desde PostgreSQL al iniciar. Comprobar `/health/ready` y los logs antes de dirigir tráfico público. Mantener **exactamente un proceso del servidor por base de datos**: el bloqueo y la revisión SQL protegen las escrituras, pero la exclusión de salas entre procesos aún no está implementada. Para desplegar una nueva imagen, esperar a que terminen las operaciones pendientes y comprobar la recuperación de la partida después del reinicio. No usar `down --volumes` en un entorno con datos.

La persistencia durable depende del PostgreSQL externo y de sus copias de seguridad. La reconexión de un WebSocket y la recuperación durable desde la base son pruebas distintas; consultar la [guía de desarrollo](buenas-practicas-desarrollo.md#8-pruebas-según-riesgo) y el [estado del MVP](estado-mvp.md) para registrar evidencia concreta.
