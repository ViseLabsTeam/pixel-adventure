# Flujo de trabajo con subagentes

Preferencia de trabajo confirmada por el responsable el **23 de octubre de 2026**. Esta guía complementa [AGENTS.md](../AGENTS.md) y las [buenas prácticas](buenas-practicas-desarrollo.md). La solicitud actual del responsable define el alcance de cada entrega; esta guía no autoriza por sí sola tareas futuras.

## Preparar y repartir el trabajo

1. El orquestador revisa el estado de Git, las instrucciones del repositorio y los archivos afectados. Define tareas, dependencias, responsables de archivos y criterios observables de aceptación antes de delegar.
2. Asigna **un subagente por cada tarea de implementación independiente**. Si dos tareas necesitan editar el mismo archivo o una depende del resultado de otra, separa los cambios o ejecútalos en secuencia. Todos comparten el árbol de trabajo: ningún agente debe sobrescribir cambios ajenos.
3. En cambios de aplicación también asigna los roles de pruebas, documentación y revisión de seguridad y estructura. Si el límite de concurrencia impide iniciarlos juntos, los organiza por tandas sin omitir la revisión final. En tareas exclusivamente documentales convoca solo los roles pertinentes.
4. Cada encargo indica objetivo, archivos o límites bajo su responsabilidad, interfaces con otras tareas, comprobaciones esperadas y qué debe comunicar al terminar. Los agentes informan pronto si descubren una dependencia o un conflicto de archivos.

## Responsabilidades

| Rol | Entrega esperada |
| --- | --- |
| Implementación por tarea | Construye su parte dentro de los límites asignados, coordina contratos compartidos con el orquestador y comunica cambios, decisiones y riesgos. |
| Pruebas | Crea o adapta pruebas de comportamiento para los criterios de aceptación y los fallos relevantes; ejecuta las suites aplicables y comunica resultados reproducibles. Es responsable de los archivos de pruebas mientras trabaja en paralelo con implementación. |
| Documentación | Actualiza las fuentes afectadas según la [guía de documentación](documentacion.md). Distingue comportamiento implementado, evidencia obtenida y pendientes; comprueba enlaces y rutas. |
| Seguridad y estructura | Revisa el cambio sin editar los archivos de implementación. Señala hallazgos concretos con ubicación, impacto y condición para considerarlos resueltos. Verifica permisos, validación de entradas, exposición de secretos, integridad de partida, límites entre paquetes, TypeScript y claridad del código según corresponda. |
| Orquestador | Integra los resultados, revisa personalmente los diffs y la evidencia, devuelve hallazgos al responsable de cada parte y decide cuándo la entrega está lista. La revisión de seguridad no se presenta como una auditoría exhaustiva. |

Si el revisor detecta un problema, el agente responsable lo corrige y el revisor comprueba la corrección. El orquestador resuelve los cambios transversales y no da por válido un resultado solo por el informe de un subagente.

## Verificación e integración

- Cada agente entrega un resumen de archivos modificados o revisados, comprobaciones ejecutadas con su resultado, escenarios sin probar y pendientes. No se afirma que una prueba, dispositivo o escenario pasó si no se ejecutó.
- El orquestador revisa el diff completo, comprueba que las piezas encajan y que no se perdió trabajo previo, y ejecuta o confirma las verificaciones finales relevantes. Un hallazgo abierto vuelve a su responsable antes de reconstruir la demo.
- `pnpm check` verifica tipos, pruebas de paquetes, contenido y formato. Las pruebas nuevas fuera de `packages` deben ejecutarse además de forma explícita; `pnpm test` solo recorre `packages`.
- `pnpm test:integration` usa PostgreSQL en una base cuyo nombre termina en `_test`; `pnpm test:e2e` usa navegador y servicios levantados. Elegirlas según la [matriz de riesgo](buenas-practicas-desarrollo.md#8-pruebas-según-riesgo). Las pruebas de recuperación que interrumpen servicios no se ejecutan durante partidas ajenas.
- `pnpm docs:check` valida enlaces locales. Una entrega solo documental requiere además revisar rutas, estados declarados y coherencia; no necesita instalar dependencias ni ejecutar pruebas de juego.

## Reconstrucción final de Docker

Después de aprobar un cambio de código, assets o configuración ejecutable, el orquestador reconstruye los servicios afectados de la demo. Para un cambio solo web, usa `docker compose build web` y luego `docker compose up -d --no-deps web`, con las dependencias ya activas; aplica el mismo criterio al servidor. Si cambian ambos servicios, usa `docker compose up -d --build`. Cuando cambian las fuentes gráficas, prepara antes los derivados como indica el [README](../README.md#probar-con-docker). Conserva el volumen `campaign_data` y evita comandos que lo eliminen.

Antes de recrear el servidor, revisa el efecto sobre partidas activas y lo comunica. Después comprueba `docker compose ps`, la salud del servidor y de PostgreSQL, la respuesta HTTP de la web y los logs relevantes. Un build correcto no demuestra por sí solo que la demo funciona. Para cambios exclusivamente documentales no reconstruye Docker.

## Cierre

El orquestador informa qué cambió, qué comprobó cada rol, el estado final de Docker cuando corresponda y los límites que siguen abiertos. Registra evidencia del MVP en [estado-mvp.md](estado-mvp.md) únicamente cuando la comprobación se realizó.
