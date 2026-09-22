# Interacción por Voz, Operación Offline e Inteligencia Artificial Local

> Sección para agregar a la Fundamentación Teórica / descripción del sistema.
> Cubre tres requisitos centrales del enunciado: la interacción por voz, el
> funcionamiento sin conexión con manejo de la desconexión, y el uso de modelos
> de IA locales en el celular y en el escritorio. Todo está anclado a la
> implementación real del proyecto.

## 1. Interacción por Voz

Uno de los requisitos centrales del proyecto es que el flujo de trabajo pueda
realizarse mediante **interacción por voz**, funcionando como un asistente, sin
depender exclusivamente de formularios, botones o ratón. Esto se implementó en
las dos plataformas del sistema:

### 1.1 Reconocimiento de voz en el cliente móvil

El cliente móvil, desarrollado en Flutter, integra la biblioteca
**`speech_to_text`**, que da acceso al motor de reconocimiento de voz nativo del
dispositivo. Al activar el micrófono, la aplicación invoca
`SpeechToText.listen()` configurado con el idioma español de Bolivia
(`localeId: 'es_BO'`), transcribe en tiempo real lo que el usuario dicta y, a
través del callback `onResult`, convierte la frase reconocida en la acción
correspondiente (por ejemplo, crear un registro o consultar datos del backend).
De esta forma, el usuario puede operar la aplicación **sin escribir**, cumpliendo
el objetivo de un asistente controlado por voz.

### 1.2 Comandos de voz en la herramienta web

En la herramienta web, el reconocimiento de voz se implementó sobre la **Web
Speech API** del navegador, encapsulada en un *hook* de React
(`useSpeechRecognition`). El usuario dicta una instrucción (por ejemplo,
"crea dos clases relacionadas") que se transcribe en el navegador y se envía al
mismo canal del asistente de IA, el cual la interpreta y la aplica sobre el
diagrama. Así, tanto el modelado como la manipulación del lienzo pueden
realizarse por voz.

## 2. Operación Offline y Manejo de la Desconexión

Dado que el enunciado exige **prever la desconexión** y que la aplicación pueda
**trabajar de manera local**, el cliente móvil incorpora un servicio de
sincronización offline (`OfflineSyncService`) diseñado bajo un enfoque
*offline-first*.

- **Detección de conectividad:** el servicio expone un flujo (`onlineStream`)
  que informa en todo momento si el dispositivo tiene o no conexión, y un
  contador de operaciones pendientes (`pendingCountStream`) que se refleja en la
  interfaz.
- **Cola de mutaciones persistente:** cuando el usuario realiza una operación de
  escritura (un `POST` al backend) sin conexión, esta **no se pierde**: se
  encola como una `PendingMutation` y se persiste localmente en el dispositivo
  mediante `SharedPreferences` (clave `offline_pending_mutations`). De este modo
  la cola sobrevive incluso si se cierra la aplicación.
- **Reproducción ordenada al reconectar:** cuando la conectividad se restablece,
  el servicio **reproduce las operaciones encoladas en el mismo orden** en que
  se realizaron, garantizando la coherencia de los datos y evitando conflictos
  de secuencia. Las peticiones de solo lectura no se encolan; únicamente las
  operaciones que modifican el estado.

Este mecanismo responde directamente al escenario planteado por la naturaleza
colaborativa y distribuida del sistema: un usuario puede seguir trabajando
aunque pierda la conexión, y sus cambios se integran de forma controlada al
recuperarla.

## 3. Inteligencia Artificial Local (sin conexión a internet)

El enunciado requiere que la asistencia de IA pueda funcionar **de forma local**,
tanto en el celular como en el escritorio, para no depender de una conexión a
internet ni de servicios en la nube. El proyecto resuelve esto con dos
implementaciones distintas según la plataforma.

### 3.1 IA local en el dispositivo móvil

El cliente móvil integra la biblioteca **`flutter_gemma`**, que ejecuta un modelo
de lenguaje **directamente en el dispositivo** (inferencia *on-device* sobre el
motor MediaPipe / LiteRT de Google), sin realizar ninguna llamada de red durante
la conversación. El usuario carga una sola vez un modelo en formato `.task`
(se utilizó **Qwen2.5-1.5B-Instruct**, ~1.6 GB) y, a partir de ese momento, el
asistente responde preguntas de ingeniería de software **completamente offline**.

Para reforzar la restricción de dominio —un modelo pequeño no siempre respeta
por sí solo la instrucción de responder solo sobre ingeniería de software— se
añadió un **filtro local de palabras clave** que descarta al instante las
preguntas ajenas al dominio, sin siquiera invocar al modelo. Esta capacidad fue
verificada en un dispositivo físico: el modelo cargó, respondió correctamente a
consultas de UML en modo avión (sin conexión) y el filtro rechazó los mensajes
fuera de tema.

### 3.2 IA local en el escritorio

En el backend (herramienta web de escritorio), la capa de IA se diseñó bajo el
patrón *fachada* con proveedores intercambiables. Mediante la variable de
entorno `AI_PROVIDER` es posible alternar entre el proveedor en la nube
(**Google Gemini**, por defecto) y un proveedor **local basado en Ollama**
(`OllamaProvider`), que consume un modelo servido localmente en
`http://localhost:11434`. De esta manera, toda la funcionalidad de IA de la
herramienta —chat asistido, sugerencia de relaciones e interpretación de
imágenes— puede ejecutarse **sin salir de la máquina del usuario**, cumpliendo el
requisito de IA local en el escritorio.

## 4. Síntesis

La combinación de estos tres mecanismos —reconocimiento de voz en ambas
plataformas, operación offline con cola de sincronización, e inteligencia
artificial local en el celular y el escritorio— permite que el sistema opere de
manera **autónoma, accesible y resiliente a la desconexión**, tal como exige el
planteamiento del proyecto, sin sacrificar la coherencia de los datos ni la
asistencia inteligente al usuario.
