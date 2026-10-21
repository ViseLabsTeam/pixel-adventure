# Dados

`D6.gif` y `D20.gif` son los originales recibidos. Cada uno tiene 20 fotogramas de 80 ms: una pasada dura **1,6 segundos**. El movimiento usa D6. El ataque del jugador muestra primero D20; si impacta, habilita D6 y muestra el daño final antes del clip de ataque. En fallos muestra el D20 y «Falló el ataque», sin pedir D6. La comprobación de impacto porcentual continúa separada: el D20 es la base del daño, según las reglas.

`generated/` contiene las imágenes estáticas que forman los botones de dado y los tiempos derivados para integrar los GIF. La animación es presentación: el servidor decide y persiste cada tirada antes de mostrarla. Los GIF también aparecen sobre el tablero compartido con el nombre del actor; el resultado numérico confirmado se revela después de la animación correspondiente.
