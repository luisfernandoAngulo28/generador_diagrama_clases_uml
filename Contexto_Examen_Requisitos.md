### Herramienta colaborativa para diseño de datos
- El encargo se fue acotando hasta centrarse en una herramienta orientada al diseño de datos, especialmente al modelado con **diagramas de clases**.
- La herramienta debía permitir trabajo colaborativo, como una pizarra virtual compartida, donde varias personas pudieran intervenir sobre el mismo modelo.
- Se señaló que herramientas existentes como ArchiTech no bastaban para este escenario porque no eran colaborativas en el sentido requerido.
- Se remarcó la necesidad de controlar problemas de exclusión y coordinación, ya que varias personas podrían editar simultáneamente el mismo diseño.

### Uso de IA y edición asistida
- Se incorporó como requisito una capa de IA dentro de la herramienta para facilitar el trabajo del diseñador.
- La IA no debía generar el diagrama completo desde cero, sino asistir con operaciones concretas: crear clases, eliminar elementos, agregar atributos, mover objetos o establecer relaciones.
- Se aclaró que la interacción podría darse por comandos de voz, sin depender necesariamente de teclado y mouse.
- La idea central era aumentar productividad mediante asistencia, no reemplazar el trabajo de diseño.

### Generación de backend e integración con otras herramientas
- Se añadió que la herramienta debía poder generar código backend a partir del diagrama de clases.
- El backend debía estar estructurado con las capas típicas esperadas y usar **PostgreSQL** como base de datos.
- También se pidió que la herramienta fuera capaz de importar y exportar modelos con otras soluciones, usando un formato estándar como XML especializado.
- La integración permitiría pasar modelos entre herramientas y continuar trabajo ya avanzado sin reiniciar desde cero.

### Frontend móvil, operación sin internet y validación
- La presentación final incluiría una aplicación móvil que consuma el backend generado por la herramienta.
- Se señaló que el frontend debía interactuar por voz, especialmente cuando no existiera una interfaz clásica con formularios, botones o mouse.
- Otro requisito importante fue que la aplicación funcionara sin internet y sincronizara los cambios cuando se recuperara la conexión.
- Se aclaró además que la guía local de IA debía residir en el celular para mantener operativa la asistencia incluso sin conectividad.
- Como cierre, se explicó que el día de la presentación se revisaría la herramienta colaborativa, su capacidad de generar código y sus características clave, mientras que el frontend móvil se desarrollaría en clase y podría hacerse con Flutter o React.
