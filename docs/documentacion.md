# Guía de documentación

Fecha: 15 de octubre de 2026. Esta guía organiza la documentación del proyecto y su mantenimiento. Los contratos que todavía no existen en código se identifican como propuestos.

## Una fuente para cada decisión

| Información | Fuente principal | Cuándo actualizarla |
| --- | --- | --- |
| Jugabilidad confirmada y pendientes | [Reglas](../rpg-cooperativo-reglas-v01.md) | Cuando el responsable cierre o cambie una regla. |
| Stack, mensajes, estado y persistencia | [Especificación técnica](../rpg-cooperativo-especificacion-tecnica.md) | Cuando cambie una decisión técnica o un contrato. |
| Alcance inicial y aceptación | [Brief del MVP](../rpg-cooperativo-brief-mvp.md) | Cuando se ajuste la primera entrega o sus políticas de prueba. |
| Límites y dependencias de módulos | [Arquitectura](arquitectura.md) | Cuando cambie la distribución de responsabilidades. |
| Convenciones y verificaciones | [Buenas prácticas](buenas-practicas-desarrollo.md) | Cuando cambie el flujo de desarrollo. |
| Instalación y estado general | [README](../README.md) | Cuando cambie el arranque o se habilite un flujo real. |
| Evidencia de aceptación | [Estado del MVP](estado-mvp.md) | Después de una comprobación o de un cambio que invalide evidencia. |
| Razones de decisiones estructurales | `docs/decisiones/NNNN-titulo.md` | Al proponer, adoptar o reemplazar una decisión significativa. |
| Archivos de arte recibidos y faltantes | [Inventario general de assets](assets.md), con enlaces a cada carpeta | Al recibir, convertir, asignar o sustituir recursos. |

Referenciar las fórmulas del reglamento y los criterios del brief en lugar de copiarlos completos en cada guía. Las tablas de seguimiento pueden resumirlos, pero no redefinirlos.

En arte, el inventario general compara categorías con el paladín completo; cada inventario local conserva nombres exactos y metadatos. Mantener separados `Falta`, `Por asignar` y `Disponible`, y no convertir ninguno de esos estados en «integrado» sin una comprobación en el juego.

Las instrucciones nuevas del responsable actualizan la fuente que corresponda. Si una decisión de juego contradice una guía técnica, adaptar la solución técnica y documentar el cambio. Un ejemplo de código, fixture o comentario no cierra por sí mismo una regla pendiente.

La implementación actual se describe en [Demo](demo.md). Decisiones: [0001 — Base](decisiones/0001-base-arquitectonica.md) y [0002 — Demo persistente](decisiones/0002-demo-persistente.md).

## Estados que deben quedar claros

| Etiqueta | Significado |
| --- | --- |
| Confirmado | Decisión explícita del responsable; citar documento o fecha. |
| Propuesto | Diseño o alternativa que todavía no se adoptó o comprobó. |
| Política temporal | Comportamiento acotado a un preset o entorno de prueba. |
| Implementado | Existe código identificable; no implica que todas las pruebas pasen. |
| Verificado | Hay una comprobación reproducible con resultado, fecha y entorno. |
| Pendiente | Falta una decisión, implementación, recurso o prueba específica. |

Un documento puede contener varios estados, siempre que estén marcados. Evitar frases como «soporta reconexión» si solo existe un plan o un mock.

## Estructura y escritura

- Escribir la documentación de producto en español y los identificadores de código en inglés, respetando los contratos existentes.
- Usar Markdown UTF-8, títulos descriptivos y enlaces relativos dentro del repositorio.
- Separar párrafos, tablas y listas con líneas en blanco; indicar el lenguaje de los bloques de código.
- Diferenciar rutas existentes de rutas objetivo. Usar enlaces para archivos existentes y código en línea para rutas propuestas.
- Describir propósito, comportamiento, límites y forma de verificar. Evitar narrar cada edición o duplicar el código.
- Registrar fechas cuando afecten estado, evidencia, versiones o decisiones. No afirmar vigencia de dependencias sin consultar sus fuentes oficiales.
- Usar ejemplos ficticios para códigos, credenciales y usuarios. No incluir secretos reales en capturas, logs ni comandos.

Los README de un paquete se incorporan cuando ese paquete exista. Deben explicar su responsabilidad, API pública, dependencias permitidas, pruebas y un ejemplo breve; no necesitan repetir toda la arquitectura.

## Registro de decisiones arquitectónicas

Un registro de decisión, o ADR, conserva el problema y el motivo de una elección. Usarlo para cambios de límites entre paquetes, persistencia, identidad, contratos incompatibles, herramientas principales o despliegue. Un ajuste de nombre o de CSS no necesita un ADR.

Numerar los registros de manera incremental y enlazarlos desde esta guía. Mantener un registro aceptado como historia: una decisión que lo reemplaza crea otro registro y actualiza su estado y enlace de sustitución. La aceptación documental y la verificación mediante código son hechos distintos.

Plantilla para un futuro `docs/decisiones/NNNN-titulo.md`:

```markdown
# NNNN — Título concreto

Fecha: AAAA-MM-DD
Estado: Propuesto | Adoptado | Rechazado | Sustituido
Implementación: Pendiente | Parcial | Completa
Verificación: Pendiente o referencia a evidencia
Origen de la decisión: solicitud o documento que la respalda

## Contexto

Problema, restricciones y necesidad actual.

## Decisión

Elección y alcance exacto. Identificar lo temporal.

## Alternativas

Opciones consideradas y motivo de la elección.

## Consecuencias

Beneficios, costos, limitaciones y efecto sobre guardados o contratos.

## Verificación y revisión

Qué evidencia comprobará la decisión y qué cambios justifican revisarla.

## Referencias

Documentos del proyecto, fuentes oficiales y ADR relacionados.
```

Registro inicial: [0001 — Base arquitectónica del MVP](decisiones/0001-base-arquitectonica.md).

## Evidencia de pruebas

Cada verificación del MVP debe registrar fecha, revisión del código cuando exista Git, entorno, versiones relevantes, comandos o pasos, resultado esperado, resultado obtenido y criterio A01–A15 relacionado. Usar los estados `PASÓ`, `FALLÓ` y `NO COMPROBADO`.

Una ejecución parcial debe indicar su alcance: dos controles no acreditan cuatro; emulación móvil no acredita un teléfono físico; una base simulada no acredita persistencia real. Adjuntar logs o capturas sanitizados solo cuando aporten evidencia.

Para pruebas de recuperación, registrar el estado anterior, la interrupción provocada y el estado restaurado. No basta con que la pantalla vuelva a abrir.

## Mantenimiento por cambio

| Cambio realizado | Documentación que revisar |
| --- | --- |
| Regla o política del preset | Reglas o brief, configuración de contenido y pruebas relacionadas. |
| Mensaje o respuesta de API | Especificación, contrato ejecutable y ejemplos de sus consumidores. |
| Snapshot o migración | Especificación, versiones de guardado y procedimiento de recuperación. |
| Nueva dependencia o cambio de paquetes | Arquitectura, instrucciones de arranque y ADR si cambia una decisión estructural. |
| Asset o mapeo de dirección | Inventario, manifiesto y referencia de origen. |
| Script, variable o servicio | README, ejemplo de entorno y guía operativa aplicable. |
| Resultado de aceptación | Estado del MVP y evidencia reproducible. |

Cuando el código implemente un contrato, su esquema ejecutable será la referencia de su forma exacta; la documentación explicará propósito, permisos y compatibilidad. Una discrepancia con una regla confirmada se corrige como defecto, no cambiando silenciosamente el reglamento.

## Revisión de una entrega documental

Comprobar enlaces locales y sus anclas, rutas mencionadas, nombres reales de archivos, consistencia de estados y ausencia de secretos. Revisar que ningún ejemplo prometa servicios inexistentes. Para una entrega exclusivamente documental, estas comprobaciones son suficientes; las pruebas de aplicación corresponden a los cambios de comportamiento.
