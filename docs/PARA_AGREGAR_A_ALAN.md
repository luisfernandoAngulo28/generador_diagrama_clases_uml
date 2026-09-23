# Secciones para agregar al documento (Parcial 1 - Alan)

> Este archivo reúne, en orden, las secciones que faltan o están flojas en el
> documento, listas para pegar. Cada bloque indica **dónde va**. Todo está
> anclado al código real del proyecto (defendible en la sustentación).

---

## ➊ AGREGAR EN LA PARTE I — después de "2.5 Inteligencia Artificial aplicada en Desarrollo de Software"

> **Por qué:** la sección 2.5 actual cubre la *IA en el desarrollo* (Copilot,
> generación de código). El enunciado pide TAMBIÉN "IA en las **funciones** del
> software" (la IA dentro del producto). Agregar como 2.5.4 o como nueva sección.

### IA en las Funciones del Software

Es necesario distinguir dos usos de la inteligencia artificial en el proyecto.
La **IA en el desarrollo** (sección anterior) se refiere al uso de herramientas
de IA para *construir* el sistema. La **IA en las funciones del software** es la
IA incorporada como **una característica del propio producto**, que el usuario
final utiliza. En este proyecto, la IA es una funcionalidad central de la
herramienta: asiste a construir y manipular los diagramas de clases mediante
lenguaje natural, voz e imágenes.

**Asistencia por operaciones atómicas (no generación total).** Una decisión de
diseño clave es que la IA no regenera el diagrama completo desde cero, sino que
asiste con **operaciones concretas e incrementales** (crear una clase, agregar un
atributo, establecer una relación) que se aplican y validan sobre el estado
actual del lienzo, preservando el trabajo previo del usuario. La IA aumenta la
productividad del diseñador sin reemplazar su criterio.

**Funciones de IA implementadas en el producto:**

- **Asistente conversacional restringido al dominio:** responde exclusivamente
  sobre ingeniería de software y sobre el proyecto en curso, rechazando temas
  ajenos (asistente "enjaulado"). A partir de instrucciones en lenguaje natural
  propone las operaciones atómicas sobre el diagrama.
- **Interacción por voz:** los comandos pueden dictarse por voz en lugar de
  escribirse (Web Speech API en la web y reconocimiento de voz nativo en el
  móvil), enviándose al mismo canal del asistente.
- **Interpretación de fotografías y bocetos:** permite subir una fotografía de un
  diagrama de clases dibujado a mano; un modelo de visión detecta las clases,
  atributos y relaciones y las transcribe como elementos interactivos en el
  lienzo.
- **Sugerencia inteligente de relaciones:** a partir de las clases existentes, la
  IA sugiere relaciones coherentes (asociación, agregación, composición,
  herencia), ayudando a completar el modelo.

**Arquitectura de la capa de IA (proveedores intercambiables):** la
funcionalidad de IA se diseñó con el patrón *fachada* y proveedores
intercambiables. Mediante configuración se elige entre un proveedor en la nube
(Google Gemini, por defecto, con capacidades multimodales) y un proveedor local
(Ollama en el escritorio y un modelo *on-device* en el móvil), lo que permite
ejecutar la asistencia de IA sin conexión a internet.

---

## ➋ AGREGAR EN LA PARTE I (o en la descripción del sistema) — como nueva sección

> **Por qué:** el enunciado exige explícitamente **IA local** (celular y
> escritorio) y **prever la desconexión**. En el documento actual estos temas
> aparecen apenas de pasada y no se nombran las tecnologías. Esta sección lo
> cierra.

### Operación Offline e Inteligencia Artificial Local

**Operación offline y manejo de la desconexión.** Dado que el sistema debe
trabajar de manera local y prever la desconexión, el cliente móvil incorpora un
servicio de sincronización con enfoque *offline-first* (`OfflineSyncService`):

- **Detección de conectividad:** informa en todo momento si el dispositivo tiene
  o no conexión, y lleva un contador de operaciones pendientes visible en la
  interfaz.
- **Cola de mutaciones persistente:** cuando el usuario realiza una operación de
  escritura sin conexión, esta no se pierde: se encola y se persiste localmente
  en el dispositivo, de modo que la cola sobrevive incluso si se cierra la
  aplicación.
- **Reproducción ordenada al reconectar:** cuando la conectividad se restablece,
  las operaciones encoladas se reproducen **en el mismo orden** en que se
  realizaron, garantizando la coherencia de los datos y evitando conflictos.

**Inteligencia artificial local (sin conexión).** El enunciado requiere que la
asistencia de IA pueda funcionar de forma local, tanto en el celular como en el
escritorio:

- **En el dispositivo móvil:** se integra la biblioteca `flutter_gemma`, que
  ejecuta un modelo de lenguaje directamente en el dispositivo (inferencia
  *on-device* sobre el motor MediaPipe/LiteRT de Google), sin llamadas de red
  durante la conversación. Se utilizó el modelo **Qwen2.5-1.5B-Instruct** en
  formato `.task`. Para reforzar la restricción de dominio se añadió un filtro
  local de palabras clave que descarta al instante las preguntas ajenas. Fue
  verificado en un dispositivo físico, respondiendo consultas de UML en modo
  avión (sin conexión).
- **En el escritorio:** la capa de IA del backend permite alternar, mediante
  configuración, entre el proveedor en la nube (Google Gemini) y un proveedor
  local basado en **Ollama** (`http://localhost:11434`), de modo que toda la
  funcionalidad de IA puede ejecutarse sin salir de la máquina del usuario.

---

## ➌ REFORZAR EN EL FLUJO/COLABORACIÓN o en el Manual — párrafo de concurrencia

> **Por qué:** la colaboración en tiempo real está bien cubierta, pero el
> mecanismo concreto de **control de exclusión** (el punto más fuerte del
> sistema para lo colaborativo) solo se menciona de forma genérica. Agregar este
> párrafo donde se describa la colaboración.

### Control de Concurrencia: Bloqueo por Clase

Para evitar conflictos cuando varios usuarios editan el mismo diagrama de forma
simultánea, el sistema implementa un **control de exclusión a nivel de clase**.
Cuando un usuario abre el editor de una clase, el servidor emite el evento
`lock-class` y esa clase se muestra bloqueada (con un indicador visual) para los
demás usuarios, impidiendo la sobreescritura de datos. Al guardar o cancelar, se
emite `unlock-class`, liberando el elemento y sincronizando el resultado a todos
los participantes. Este mecanismo, sobre WebSockets (Socket.IO), es lo que
permite que tres o más usuarios trabajen sobre el mismo modelo sin pisarse,
atendiendo directamente al requisito de coordinación y exclusión propio de un
entorno colaborativo.

---

## ✅ Verificación rápida (no requiere pegar nada nuevo)

- **Sección 2.12 Spring Boot:** confirmar que enumera las librerías realmente
  usadas del proyecto generado (spring-boot-starter-web, spring-boot-starter-
  data-jpa, postgresql, spring-boot-starter-validation, jackson-datatype-
  hibernate6, springdoc-openapi-starter-webmvc-ui 2.6.0, spring-boot-starter-
  test, spring-boot-maven-plugin sobre Java 17 y Spring Boot 3.3.4). Si no las
  enumera, pegar el detalle correspondiente.
- **Alcance (1.4):** verificar que, además de los módulos actuales (Archivos,
  Conexión, Ingeniería Inversa, Voz), quede explícito el **modelado UML**, la
  **colaboración en tiempo real** y la **generación de código Spring Boot**, que
  son el núcleo del producto.
