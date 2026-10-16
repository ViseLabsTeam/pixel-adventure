# 0002 — Demo persistente y assets por categoría

Fecha: 16 de octubre de 2026. Estado: **Adoptado para la demo**. Implementación: código disponible; ver [evidencia](../estado-mvp.md).

Origen: solicitud del responsable de empezar la demo con lobby, configuración, tablero compartido, celulares, Docker, base de datos y assets centralizados; excluir arquera y usar bolsa 4 + casco/guantes/pantalones/pechera.

## Decisión

Se concreta la [base arquitectónica](0001-base-arquitectonica.md) en apps/web, apps/server y paquetes core/protocol/content. PostgreSQL serializa por fila de campaña y confirma cada operación antes de enviar resultado. Colyseus transporta proyecciones completas por mensaje: simplifica la primera integración por turnos y mantiene separado el formato SQL. React muestra interfaces y Phaser se carga de forma diferida solo en el tablero.

Todos los originales pasan a assets/paladin, guerrero, mago, mapas y maestro, conservando nombres y bytes. Cada categoría contiene sus derivados generated y el manifiesto se centraliza en assets/manifest.json. Los retratos provienen del primer fotograma; las animaciones completas quedan pendientes.

Docker Compose ejecuta PostgreSQL 18, un backend Node 24 y Nginx. Las migraciones se aplican al iniciar, con exclusión por advisory lock. El lockfile fija dependencias. Desarrollo local también se comprobó en Node 22.14 mediante build y pruebas; el flujo servido para E2E fue Docker.

## Consecuencias y límites

Los snapshots dirigidos son sencillos para cinco pantallas, pero requieren medir tráfico antes de escalar. El servidor conserva eventos históricos y los últimos 40 en el snapshot. No se ejecuta una simulación por frame ni se escribe desde Phaser.

Solo se admite una réplica del backend. La exclusión dentro del proceso y la revisión SQL no constituyen un mecanismo de liderazgo distribuido. La limpieza de salas/campañas inactivas, backups y despliegue público quedan pendientes.

Se implementa un encuentro, no la aventura completa. Los valores, botín, costo de equipo, enemigos ya alertados y salida de demo se detallan en [políticas](../demo.md); no sustituyen las reglas confirmadas sobre stages, altares o exploración.

La revisión de esta decisión requiere pruebas de reintento, fallo de guardado y reinicio, además de cualquier cambio en protocolo, formato de guardado o número de procesos.
