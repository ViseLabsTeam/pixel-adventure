# Buenas prácticas de desarrollo

Fecha: 15 de octubre de 2026. Estado: **convenciones para la implementación**. Las herramientas y scripts que todavía faltan se indican expresamente. Esta guía acompaña la [arquitectura](arquitectura.md) y el [brief del MVP](../rpg-cooperativo-brief-mvp.md).

## 1. Trabajar por flujos verificables

Cada cambio debe resolver un comportamiento concreto y permitir comprobarlo. Para una funcionalidad completa, recorrer contrato, regla, coordinación, persistencia e interfaz según corresponda. Una pantalla estática no acredita un flujo multijugador y una prueba de motor no acredita guardado.

Antes de editar, identificar archivos existentes, restricciones y criterio de aceptación afectado. Preservar cambios ajenos. Mantener los ajustes de formato o refactorizaciones ajenas al propósito fuera de la entrega, salvo que sean necesarios para resolverla.

Aplicar la solución más pequeña que cumpla el requisito y mantenga los límites de módulos. Crear una interfaz de persistencia o aleatoriedad cuando facilite sustituir esa dependencia en pruebas; no construir un framework de repositorios, eventos o inyección sin un caso concreto.

## 2. TypeScript y contratos

- Conservar `strict: true`. El modo estricto agrupa comprobaciones del sistema de tipos; al actualizar TypeScript pueden aparecer nuevas exigencias, según su [documentación oficial](https://www.typescriptlang.org/tsconfig/strict.html).
- Recibir datos externos como desconocidos y validarlos antes de usarlos. Incluye mensajes, variables de entorno, contenido, HTTP y snapshots recuperados.
- Evitar `any`, aserciones de tipo y aserciones de no nulidad para silenciar problemas. Una excepción puntual debe tener una razón verificable y quedar confinada al límite que la necesita.
- Representar comandos, fases y resultados con uniones discriminadas. Comprobar casos exhaustivos para que una nueva variante requiera revisar sus consumidores.
- Separar errores esperados del dominio de fallos de infraestructura. Un movimiento inválido tiene código comprensible; una conexión SQL rota se registra y bloquea confirmaciones.
- No capturar errores con bloques vacíos ni transformar cualquier excepción en un resultado exitoso por defecto.
- No mutar el estado confirmado mientras se calcula un resultado provisional. Probar que un rechazo no deja efectos parciales.
- Centralizar fórmulas y políticas en el motor o contenido correspondiente. No repetir cálculos de daño en componentes.

Los esquemas de `protocol` describen entradas y vistas públicas, no toda la base de datos. Reutilizar tipos inferidos cuando el esquema sea la fuente de un contrato; no mantener manualmente una interfaz idéntica que pueda desactualizarse.

## 3. Nombres y organización

| Elemento | Convención |
| --- | --- |
| Variables y funciones | `camelCase`, con nombres del dominio y verbos concretos. |
| Tipos y componentes React | `PascalCase`. |
| Comandos y códigos del protocolo | Conservar los identificadores existentes, por ejemplo `MOVE_STEP`. |
| Archivos de lógica y directorios | `kebab-case`, por ejemplo `resolve-attack.ts`. |
| Componentes React | `PascalCase.tsx`, por ejemplo `PlayerControls.tsx`. |
| Tests unitarios | `*.test.ts` o `*.test.tsx`, junto a su módulo. |
| E2E | `*.spec.ts` en `tests/e2e`. |
| Migraciones | Prefijo incremental y propósito, por ejemplo `0001-create-campaigns.sql`. |
| Documentos | Nombres descriptivos en español; conservar los enlaces de los existentes. |

Un archivo concentra una responsabilidad coherente. Separarlo cuando cambien sus motivos de modificación, no al superar un número arbitrario de líneas. Evitar contenedores genéricos como `utils.ts` para reglas no relacionadas.

Documentar el motivo de una excepción, invariante o algoritmo que no resulte evidente. No agregar comentarios que repitan cada instrucción. Los `TODO` deben describir qué falta y enlazar una decisión o pendiente cuando exista.

Los nombres de assets recibidos se conservan en sus fuentes, incluso si no cumplen la convención. El manifiesto proporciona nombres lógicos estables sin exigir renombrar los originales.

## 4. Reglas, tiempo y aleatoriedad

El servidor es la fuente de las tiradas. El motor recibe una fuente de aleatoriedad inyectada; las pruebas usan secuencias conocidas y la ejecución normal usa la implementación del servidor. El cliente nunca elige semilla, daño ni resultados.

Cuando el tiempo afecte un comportamiento, pasar un reloj o instante explícito al módulo que lo necesita. No depender del reloj del teléfono para turnos o autorización. Las animaciones pueden usar tiempos locales porque no deciden el estado de juego.

Mantener los datos de `prototype-content` separados de las reglas confirmadas. Redondeo, mínimo de daño y demás políticas del preset deben tener una configuración identificable y pruebas. No introducir cambios de balance al corregir transporte o presentación.

## 5. Persistencia y reintentos

Aplicar el flujo transaccional de la [arquitectura](arquitectura.md#4-recorrido-de-una-operación). La operación visible como confirmada ya debe estar persistida.

Mantener un solo comando de turno pendiente por controlador para evitar toques ambiguos. Conservar el sobre original si no se recibió respuesta. Una respuesta de éxito no se deduce de una animación, y un timeout no demuestra que la operación haya fallado.

Los reintentos de transporte usan el mismo `commandId`. Una intención nueva utiliza otro identificador después de resolver la incertidumbre anterior. Al recibir una revisión antigua para una intención nueva, actualizar la vista y permitir una decisión actualizada del jugador; no convertir silenciosamente el ataque anterior en otro ataque.

Persistir las identidades de objetos y validar un único propietario o ubicación. Guardar el resultado de tiradas y recursos consumidos, no solamente la vida final.

Probar además la recuperación de una fase enemiga interrumpida: conservar qué operaciones internas ya fueron confirmadas y evitar ejecutarlas nuevamente al reiniciar.

## 6. Interfaz y recursos

- Representar estado confirmado y diferenciar cualquier vista previa. Mantener texto de conexión y errores legibles sin depender solo del color.
- Ofrecer controles táctiles suficientemente grandes y separados, etiquetas claras y estados deshabilitados comprensibles. Verificarlos en los dispositivos objetivo.
- Mantener la ficha consultable cuando no sea el turno del jugador, respetando las acciones permitidas.
- Liberar listeners, timers, conexiones y escenas en su ciclo de vida. Comprobar navegación repetida y reconexión para detectar duplicaciones.
- Cargar Phaser y recursos del tablero únicamente donde se utilizan. Preparar recursos por escenario cuando exista esa necesidad.
- Conservar originales y un procedimiento reproducible de conversión de arte. Validar transparencia, bordes, escala, punto de apoyo, duración y direcciones antes de reemplazar placeholders.
- No presentar como implementadas las habilidades sugeridas por un nombre de GIF. El arte y las reglas tienen fuentes de decisión distintas.

Usar CSS propio y componentes compartidos cuando haya repetición real. Añadir una biblioteca de interfaz solo si resuelve una necesidad concreta y se revisa su costo para el móvil.

## 7. Seguridad y configuración

Autenticar las conexiones y autorizar cada comando por rol y campaña. El servidor determina el personaje de la sesión; no acepta que el cliente escoja libremente otro actor. El rol de pantalla no permite ejecutar ataques y el de coordinador no equivale automáticamente a controlar personajes.

Usar HTTPS/WSS en despliegues, comprobar orígenes permitidos en el handshake, validar mensajes y acotar tamaño y frecuencia. La validación de origen complementa la autenticación; no la reemplaza. Estas medidas siguen la [guía de WebSocket de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html). Los valores concretos de los límites se fijarán y probarán en la integración.

Separar código público de lobby, código privado de recuperación y credenciales de personaje. Generar secretos en el servidor, almacenar sus verificadores de forma adecuada y limitar intentos de recuperación. No incluir secretos en el QR público, parámetros de URL, estado sincronizado ni logs.

Validar configuración al arrancar y rechazar un servicio mal configurado con un error útil. Toda variable `VITE_*` se considera pública, como establece la especificación del proyecto. Mantener valores reales fuera del repositorio y ejemplos ficticios en `.env.example` cuando se cree.

El scaffold debe revisar `.gitignore` para excluir secretos y salidas generadas sin ocultar ejemplos, migraciones ni recursos fuente. La demo ya excluye .env, node_modules, dist, capturas y resultados locales; conservar .env.example.

## 8. Pruebas según riesgo

| Cambio | Verificación mínima pertinente |
| --- | --- |
| Fórmulas, movimiento o turnos | Tests del motor con azar controlado, límites y rechazos sin efectos. |
| Contratos o permisos | Payload inválido, rol incorrecto, actor ajeno y compatibilidad de sus consumidores. |
| SQL o guardado | PostgreSQL real de prueba, commit/rollback, restricciones y recuperación. |
| Idempotencia o concurrencia | Reenvío, identificador reutilizado con otro contenido, comandos simultáneos y revisión antigua. |
| Reconexión | Mismo personaje/slot, controles offline, recarga y recuperación tras reiniciar backend. |
| Interfaz multijugador | Contextos separados para tablero y dos/cuatro controles; estado coherente. |
| Asset o CSS | Inspección visual del caso afectado y comprobación de carga, escala y legibilidad. |
| Documentación | Enlaces, anclas, rutas, estado declarado y coherencia con las fuentes. |

Vitest y Playwright son las herramientas de referencia del proyecto; están instaladas y fijadas en el lockfile. Los mocks ayudan a probar límites aislados, pero la evidencia de persistencia y E2E del MVP requiere servicios reales.

Probar resultados observables e invariantes, no la secuencia privada de llamadas de una función. Evitar pruebas que solo repitan la implementación. No fijar un porcentaje arbitrario de cobertura como sustituto de los escenarios críticos.

Prioridades de fallo: doble toque, caída después de commit y antes del aviso, fallo de guardado, recuperación simultánea, revisión obsoleta, identidad del objeto y permisos por personaje. Para cada regresión relevante, agregar una prueba que falle con el defecto y pase con la corrección.

Los entornos de prueba usan credenciales y bases separadas. El reseteo de datos se limita a la base de prueba identificada; ninguna suite debe limpiar una base de desarrollo con campañas del usuario ni producción.

## 9. Comandos y verificaciones

Scripts implementados en package.json. Los resultados de ejecución están en [estado del MVP](estado-mvp.md); no confundir disponibilidad del script con evidencia.

| Comando | Contrato |
| --- | --- |
| `pnpm dev` | Iniciar web y servidor de desarrollo con requisitos documentados. |
| `pnpm build` | Compilar paquetes y aplicaciones; fallar ante errores. |
| `pnpm typecheck` | Revisar tipos de todo el workspace sin producir la entrega. |
| Lint (pendiente, sin script) | Incorporar reglas de importación y análisis cuando se configure el linter. |
| `pnpm format:check` | Comprobar formato sin reescribir archivos. |
| `pnpm test` | Ejecutar tests unitarios sin servicios externos. |
| `pnpm test:integration` | Probar persistencia en una base _test ya preparada, según README. |
| `pnpm test:e2e` | Verificar flujos contra la demo real levantada; crea campañas de prueba. |
| `pnpm db:migrate` | Aplicar migraciones pendientes a la base seleccionada de manera explícita. |
| `pnpm content:validate` | Validar definiciones, referencias, políticas y recursos declarados. |

Prettier verifica formato, Vitest el motor y PostgreSQL, y Playwright los flujos entre pantallas. No hay un linter ni CI configurados todavía. `pnpm check` agrupa tipos, pruebas unitarias, contenido y formato.

En CI, instalar con el lockfile sin actualizarlo, ejecutar tipos, lint, contenido, pruebas y build. Incorporar los servicios requeridos para integración y E2E. Un script vacío, un fallo ignorado o una suite que omite todos sus casos no cuenta como verificación aprobada.

Para cambios pequeños, ejecutar las comprobaciones afectadas; la integración de una entrega debe pasar los controles comunes disponibles. Si un control todavía no existe o no puede ejecutarse, comunicar la limitación y mantener el criterio como no comprobado.

## 10. Rendimiento con evidencia

El juego opera por turnos. Evitar resolver simulación o escribir SQL en cada frame visual. Las animaciones interpolan resultados confirmados sin modificar posiciones lógicas por su cuenta.

Establecer una medición inicial con un tablero y cuatro controles, anotando dispositivo, navegador, conexión, tamaño del mapa y duración de sesión. Después de una optimización, repetir el mismo escenario y comprobar que conserva los resultados funcionales.

| Medida | Para qué sirve |
| --- | --- |
| Bytes iniciales y recursos por ruta | Detectar si el control móvil descarga arte o motor gráfico innecesarios. |
| Latencia de comando p50/p95 | Evaluar respuesta al toque y variación de red/servidor. |
| Tiempo de transacción y tamaño de snapshot | Detectar el costo real del guardado por operación. |
| Longitud de cola y conexiones SQL | Identificar saturación sin ocultarla con reintentos. |
| Memoria por sala y listeners tras reconexiones | Detectar retención de objetos y suscripciones duplicadas. |
| Tiempo de frame en el tablero | Localizar escenas o efectos que perjudican legibilidad y fluidez. |

No se fijan cifras de FPS o latencia garantizada sin pruebas en los equipos objetivo. Registrar primero la base medida y luego un presupuesto acordado para cada entorno. Si cambia la frecuencia de guardado, las garantías de recuperación deben revisarse explícitamente.

Optimizar primero consultas, recursos descargados y trabajo repetido observado. Usar memoización, índices adicionales, caché o escalado cuando exista un costo concreto y una forma de invalidar datos correctamente.

## 11. Operación y entrega

Registrar errores con campaña, revisión, tipo de comando y duración, evitando credenciales y payloads completos. Distinguir logs de aplicación de la evidencia durable de comandos. El historial público no debe revelar datos ocultos del juego.

Comprobar proceso vivo y disponibilidad de persistencia por separado. Al cerrar el servidor, dejar de admitir trabajo nuevo, resolver operaciones en curso de forma controlada y permitir recuperación del último estado confirmado.

Una copia de seguridad requiere una prueba de restauración antes de considerarse fiable para campañas importantes. El autosave no reemplaza ese backup.

Una entrega de código debe explicar el comportamiento resultante, las decisiones temporales y las verificaciones ejecutadas. Actualizar contratos y documentación afectados en el mismo cambio. Para revisar, usar diferencias acotadas y preservar el trabajo no relacionado.

La primera entrega jugable solo puede declararse completa con evidencia de los criterios del brief, identificando fallos y casos no comprobados, especialmente Android e iOS físicos. Ver [estado del MVP](estado-mvp.md).
