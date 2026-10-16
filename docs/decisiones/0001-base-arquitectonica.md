# 0001 — Base arquitectónica del MVP

Fecha: 15 de octubre de 2026.

Estado original (15/10): **Propuesto**. Adoptado y concretado el 16/10 por [0002 — Demo persistente](0002-demo-persistente.md). El contexto siguiente conserva la propuesta original.

Implementación y verificación actuales: consultar [estado del MVP](../estado-mvp.md).

Origen: [especificación técnica](../../rpg-cooperativo-especificacion-tecnica.md), [brief del MVP](../../rpg-cooperativo-brief-mvp.md) y solicitud de organizar el proyecto desde el inicio. Este registro no afirma que la integración ya esté validada ni aprueba nuevas reglas de juego.

## Contexto

El juego necesita mantener coherencia entre un tablero y hasta cuatro controles, resolver turnos en el servidor y recuperar una campaña completa tras un reinicio. El repositorio todavía contiene una base mínima de TypeScript y recursos gráficos.

El primer flujo debe probarse con clientes separados y PostgreSQL real. La arquitectura debe permitir completar clases, habilidades y arte sin rehacer el transporte ni el guardado.

## Decisión propuesta

- Un repositorio TypeScript con pnpm workspaces, aplicaciones web/servidor y paquetes de reglas, protocolo y contenido.
- Un backend modular en un único proceso inicial, con una cola por campaña y una sola sala activa por campaña.
- React para interfaces y Phaser para el tablero, con carga separada del controlador móvil.
- Colyseus para transporte y sincronización; una capa propia coordina autorización, reglas y persistencia.
- PostgreSQL para snapshots versionados, identidades, recibos de comandos y eventos confirmados.
- Guardar cada operación confirmada antes de publicar su resultado. Conservar el snapshot como punto de recuperación; el historial de eventos sirve para trazabilidad y presentación.

Las versiones exactas y la configuración del workspace se fijarán con la primera integración. Los límites concretos están en la [guía de arquitectura](../arquitectura.md).

## Alternativas consideradas

| Alternativa | Motivo para mantener la propuesta actual |
| --- | --- |
| Guardado solo en el navegador o en memoria | No permite acreditar recuperación durable después de perder el cliente o reiniciar el backend. |
| Microservicios y varios escritores por campaña | Agregan coordinación distribuida que la primera entrega no necesita. |
| Reconstrucción obligatoria desde todos los eventos | Exige mantener semántica histórica de cada evento; un snapshot versionado permite una primera recuperación más directa. |
| Motor de reglas ligado a Phaser o Colyseus | Dificulta probar cálculos e invariantes sin ejecutar interfaces o transporte. |

## Consecuencias

Se obtiene una separación clara y una ruta de prueba pequeña. A cambio, deben mantenerse adaptadores entre dominio, red y guardado, así como transacciones, compatibilidad de versiones y recuperación de errores.

Un solo proceso limita la capacidad y disponibilidad iniciales. La base durable permite recuperar estado, pero no garantiza continuidad sin interrupciones. El escalado horizontal requerirá decidir quién controla cada campaña entre procesos; el control de revisión SQL por sí solo no resuelve toda esa coordinación.

La escritura por operación incorpora latencia de base de datos. Medirla antes de modificar la frecuencia de guardado, porque cambiar esa frecuencia afecta la garantía de recuperación.

## Verificación y revisión

Validar instalación, tablero y controles, turnos, reintentos, fallo de persistencia y recuperación con los criterios A01–A15. Registrar evidencia en [estado del MVP](../estado-mvp.md).

Revisar esta propuesta si las mediciones muestran saturación, si se requieren varios procesos simultáneos o si cambian los requisitos de continuidad. Cambiar proveedores, paquetes o formato de guardado exige revisar compatibilidad; no basta con editar este registro.
