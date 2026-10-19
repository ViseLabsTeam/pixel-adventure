# Instrucciones de trabajo del repositorio

Estas instrucciones se aplican a todo el proyecto. Las indicaciones actuales del responsable tienen prioridad dentro de su alcance. Leer documentos que describen trabajo futuro no autoriza por sí solo a implementar ese trabajo: ejecutar la tarea solicitada.

## Contexto y fuentes

- Consultar el [README](README.md) para conocer el estado real y el índice.
- Antes de implementar juego, leer [reglas](rpg-cooperativo-reglas-v01.md), [especificación](rpg-cooperativo-especificacion-tecnica.md) y [brief](rpg-cooperativo-brief-mvp.md).
- Aplicar [arquitectura](docs/arquitectura.md), [buenas prácticas](docs/buenas-practicas-desarrollo.md) y [documentación](docs/documentacion.md) según el cambio.
- Las rutas objetivo y los comandos previstos no deben presentarse como implementados. Comprobar los archivos y scripts existentes.
- Conservar las decisiones confirmadas y distinguir los fixtures, políticas temporales y asuntos pendientes. Las estadísticas y habilidades definitivas siguen sin cerrar.

## Organización del código

- Mantener `apps/web`, `apps/server`, `packages/core`, `packages/protocol` y `packages/content` como límites objetivo. Crearlos cuando se implemente su responsabilidad.
- El motor es independiente de React, Phaser, Colyseus, SQL y del navegador. Recibe las dependencias necesarias, incluida la aleatoriedad.
- Las interfaces envían intenciones; el servidor valida y decide los resultados. El actor se obtiene de la sesión autorizada.
- Respetar las direcciones de importación de la guía arquitectónica. Evitar ciclos, importaciones internas entre paquetes y dependencias del servidor en el bundle web.
- Usar TypeScript estricto. Validar datos externos en tiempo de ejecución; los tipos estáticos no sustituyen esa validación.
- Preferir módulos concretos y funciones pequeñas con una responsabilidad. Introducir abstracciones cuando resuelvan una necesidad comprobable.

## Integridad de la partida

- Confirmar estado, recibo del comando y eventos en una transacción antes de publicar éxito o mutar el estado sincronizado de juego.
- Serializar operaciones por campaña y verificar la revisión persistida. Mantener una sola ejecución activa de cada campaña.
- Consultar el recibo de un comando autorizado antes de rechazarlo por revisión antigua; un reintento confirmado debe recuperar el resultado original.
- No repetir tiradas ni duplicar objetos al recargar, reconectar o reintentar. Conservar identidades de campaña, personaje e ítem.
- Diferenciar la reconexión del transporte de la recuperación durable desde PostgreSQL.
- Tratar un resultado de guardado incierto como pendiente de conciliación, nunca como permiso para ejecutar otra vez una acción.
- No filtrar códigos privados, credenciales ni resultados ocultos mediante estado público, URLs, logs o fixtures.

## Recursos gráficos

- Leer el [inventario general de assets](docs/assets.md) y el inventario de la carpeta correspondiente antes de trabajar con recursos.
- Usar el [paladín](assets/paladin/README.md) como conjunto completo de referencia, por indicación del responsable. Comparar categorías visuales, no exigir nombres idénticos entre clases.
- Distinguir archivos ausentes de recursos existentes pendientes de asignación. En el mago, los lanzamientos y `ice_storm.gif` no tienen aún un mapeo confirmado a básico, especial y ulti.
- Conservar los originales. Separar fuentes, recursos derivados y manifiesto de integración.
- Respetar la corrección vigente del responsable: **`caminata_W.gif → arriba (−Y)`** y **`caminata_s.gif → abajo (+Y)`**. La reproducción de S dura lo mismo que W. Reflejar horizontalmente los sprites para mirar a izquierda/derecha; no deducir efectos de habilidades a partir de nombres.
- Un nombre de animación no aprueba una habilidad, su costo ni su efecto. Usar placeholders explícitos cuando falten recursos necesarios para una prueba.

## Flujo de trabajo y verificación

- Revisar el estado del repositorio antes de editar y preservar trabajo ajeno. No borrar ni reordenar archivos sin una necesidad de la tarea.
- Cambiar únicamente lo necesario para la entrega solicitada. No contratar servicios, publicar ni migrar datos reales como efecto secundario de una tarea documental.
- Conservar un solo gestor y lockfile cuando se prepare el workspace. Verificar compatibilidad antes de fijar o actualizar dependencias.
- Ejecutar las verificaciones relevantes que existan. Para documentación, comprobar enlaces, rutas y coherencia; no inventar pruebas de aplicación ni instalar dependencias solo para validar texto.
- Los cambios de reglas, autorizaciones, persistencia o recuperación requieren pruebas de comportamiento y fallos. Consultar la matriz de la guía de desarrollo.
- Actualizar la documentación afectada junto con el cambio. Registrar evidencia del MVP únicamente cuando se haya obtenido.
- Informar qué cambió, cómo se verificó y qué sigue pendiente. No afirmar que un comando, dispositivo o escenario fue probado si no lo fue.

## Entrega

Una tarea termina cuando cumple el alcance solicitado y sus comprobaciones aplicables. Los pendientes posteriores deben quedar identificados, sin ampliar silenciosamente la tarea. Para el MVP jugable, usar los criterios A01–A15 del brief y el [registro de estado](docs/estado-mvp.md).
