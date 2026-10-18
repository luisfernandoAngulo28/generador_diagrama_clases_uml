<!-- Contenido del SEGUNDO CICLO (2do Parcial) que ensamblar_documento.py inserta
     en el documento del 1er Parcial. Cada bloque empieza con "@@ nombre" y se
     inserta en el ancla definida en ensamblar_documento.py. -->

@@ perfil_intro

## 1.1.1 Introducción al Segundo Parcial

El segundo ciclo de desarrollo convierte la herramienta CASE en un **espacio de trabajo grupal moderado por inteligencia artificial**. En el primer ciclo, el asistente de IA era privado: cada usuario conversaba con él a solas. En este ciclo, la IA actúa como un **docente en el aula o un desarrollador senior** que acompaña a todo el equipo. Incorpora cinco capacidades:

1. **Chat grupal público:** todos los integrantes ven cada pregunta y cada respuesta.
2. **Moderador IA que responde por nombre:** *"Luis, aquí tu respuesta…"*, con contexto **grupal** (el estado del diagrama y quién hizo qué) e **individual** (las preguntas previas de cada integrante).
3. **Autoría granular persistida en MongoDB:** quién creó y quién modificó cada clase, atributo y relación, y desde qué fuente (manual, IA o XMI).
4. **Sesiones continuas** que se pausan y se reanudan otro día exactamente donde quedaron.
5. **Visor móvil en Flutter** que sigue el diagrama y el chat en tiempo real.

El motor de IA pasa a ser **híbrido**: Google Gemini en la nube y Ollama local como respaldo automático sin internet.

@@ perfil_problema

## 1.2.1 Descripción del problema --- Segundo Parcial

En el sistema del primer ciclo, la IA ayudaba a un solo usuario por vez y no sabía quién preguntaba. Por eso respondía de forma genérica, y lo que aprendía un integrante no lo veían los demás. Además:

- **Autoría:** no se registraba quién había creado cada clase o atributo; la bitácora era un texto libre por guardado.
- **Continuidad:** el trabajo no podía retomarse con su contexto (conversación, presencia y bloqueos).
- **Móvil:** quien seguía el trabajo desde el celular no veía los cambios en vivo.
- **Conectividad:** la IA dependía de un único proveedor en la nube.

@@ perfil_objetivo

## 1.3.1 Objetivo General --- Segundo Parcial

Extender la herramienta CASE con un **Moderador IA grupal**. El moderador debe:

- responder en un chat público, nombrando a quien pregunta;
- usar el contexto grupal e individual del equipo;
- modificar el diagrama solo a pedido explícito.

El ciclo incluye además persistencia en MongoDB con autoría granular y sesiones continuas, un motor de IA híbrido (nube y local) y un visor móvil en tiempo real.

@@ perfil_especificos

## 1.4.1 Objetivos Específicos --- Segundo Parcial

- Migrar la persistencia de los diagramas a **MongoDB**, conservando los datos del primer ciclo, con **autoría granular** por clase, atributo y relación, y una **bitácora estructurada** por cambio.
- Implementar **sesiones continuas** (ACTIVE / PAUSED) que restauren el chat y la actividad al volver a la sala.
- Identificar a cada integrante en la sala mediante **JWT en el handshake de Socket.io**.
- Construir un **chat grupal público** sobre WebSockets (`chat:send`, `chat:new-message`, `ai:status`).
- Diseñar el **System Prompt del Moderador / Desarrollador Senior**: rol, contexto dual y regla de nombrar a quien pregunta.
- Implementar un **motor de IA híbrido** (Gemini + Ollama) con respaldo automático, *circuit breaker* y orden configurable.
- Garantizar en el servidor que **la IA solo modifique el lienzo ante un pedido explícito**.
- Mostrar la **autoría en vivo** en el inspector de clases.
- Desarrollar el **visor UML en vivo** en Flutter, de solo lectura, con chat y **notificaciones locales**.
- Documentar los modelos del segundo ciclo en **UML 2.5.1** y mantener la trazabilidad entre modelo, código y prueba.

@@ alcance

### Módulo de Chat Grupal y Moderador IA (Segundo Ciclo)

Chat público de la sala del diagrama: todos ven cada mensaje. Las preguntas a la IA las responde el Moderador IA dirigiéndose por nombre a quien pregunta, con contexto grupal e individual, y muestra qué proveedor respondió (🏠 Ollama Local / ☁️ Gemini Cloud). Si se le pide explícitamente, aplica cambios al diagrama, que quedan registrados como "vía IA".

### Módulo de Autoría, Bitácora y Sesiones (Segundo Ciclo)

Persistencia en MongoDB. Incluye:

- **autoría embebida** en cada clase, atributo y relación;
- **bitácora estructurada** con una entrada por cambio;
- **sesiones continuas** que guardan participantes y bloqueos, y se reanudan al volver.

### Módulo de Motor de IA Híbrido (Segundo Ciclo)

Combina Google Gemini (nube) y Ollama con qwen2.5 (local) detrás de un mismo contrato. Por defecto responde Gemini, y Ollama toma el relevo sin internet. El orden puede invertirse para la demostración.

### Módulo Visor Móvil en Tiempo Real (Segundo Ciclo)

Pantalla Flutter de solo lectura. Muestra en vivo el diagrama (con autoría y bloqueos) y el chat del equipo, y emite notificaciones locales de mensajes y cambios.

@@ actores

### 2.1.1 Actores del Segundo Ciclo

Desde el segundo ciclo, la herramienta **sí identifica a cada usuario** (registro e inicio de sesión con JWT), porque el Moderador IA debe saber a quién responde y la autoría debe registrar quién hizo cada cambio. Los actores del ciclo 2 son:

- **Integrante del equipo:** el Usuario del ciclo 1, ahora identificado. Además de modelar, conversa en el chat grupal, consulta al Moderador IA, le pide cambios y revisa la autoría y la bitácora.
- **Integrante (móvil):** el mismo integrante, que sigue la sala desde el celular en modo de solo lectura.
- **Moderador IA:** actor secundario (Google Gemini o Ollama local) que responde en el chat grupal.

@@ priorizar

**Casos de uso del Segundo Ciclo**

| **NRO** | **CASO DE USO** | **ACTOR** | **ESTADO** | **PRIORIDAD** | **RIESGO** |
|---|---|---|---|---|---|
| CU13 | Iniciar Sesión | Integrante / Integrante (móvil) | Aprobado | Alta | Crítico |
| CU14 | Enviar Mensaje al Chat Grupal | Integrante | Aprobado | Alta | Crítico |
| CU15 | Consultar al Moderador IA | Integrante / Moderador IA | Aprobado | Alta | Crítico |
| CU16 | Solicitar Cambio del Diagrama a la IA | Integrante / Moderador IA | Aprobado | Alta | Crítico |
| CU17 | Consultar Autoría y Bitácora | Integrante | Aprobado | Alta | Normal |
| CU18 | Reanudar Sesión de Trabajo | Integrante | Aprobado | Media | Normal |
| CU19 | Visualizar Diagrama en Vivo (Móvil) | Integrante (móvil) | Aprobado | Alta | Normal |
| CU20 | Recibir Notificaciones en el Móvil | Integrante (móvil) | Aprobado | Media | Normal |

@@ detallar

### Casos de uso del Segundo Ciclo

**CU13 --- Iniciar Sesión**

| **Propósito** | Identificar al integrante, para que la IA sepa a quién responde y la autoría registre quién hizo cada cambio. |
|---|---|
| **Resumen** | El integrante ingresa su correo y contraseña. El sistema valida las credenciales y emite un JWT, que acompaña cada petición REST y el *handshake* del WebSocket. |
| **Actores** | Integrante, Integrante (móvil) |
| **Actor Iniciador** | Integrante |

**Flujo Principal:**

> 1\. El integrante abre la herramienta y completa correo y contraseña.
>
> 2\. El sistema busca el usuario por correo y compara la contraseña con su hash bcrypt.
>
> 3\. El sistema genera un JWT con el identificador y el nombre del usuario.
>
> 4\. El cliente guarda el token y abre la herramienta.
>
> 5\. Al entrar a un diagrama, el socket envía el JWT en el *handshake* y el servidor identifica al integrante en la sala.

**Precondición:** El integrante debe estar registrado.

**CU14 --- Enviar Mensaje al Chat Grupal**

| **Propósito** | Permitir que el equipo converse en un canal público asociado al diagrama. |
|---|---|
| **Resumen** | El integrante escribe un mensaje sin activar la IA. El sistema lo guarda y lo difunde a todos los conectados a la sala, en la web y en el móvil. |
| **Actores** | Integrante |
| **Actor Iniciador** | Integrante |

**Flujo Principal:**

> 1\. El integrante desactiva el botón de IA del panel de chat y escribe su mensaje.
>
> 2\. El sistema guarda el diagrama actual (para que la IA vea el lienzo vigente si se le consulta luego).
>
> 3\. El cliente emite `chat:send` con `askAi: false`.
>
> 4\. El servidor identifica al autor por su JWT y guarda el mensaje en `group_chat_messages`.
>
> 5\. El servidor emite `chat:new-message` a toda la sala.
>
> 6\. Todos los integrantes ven el mensaje con nombre, avatar y hora.

**Precondición:** El integrante inició sesión (CU13) y está en la sala de un diagrama.

**CU15 --- Consultar al Moderador IA**

| **Propósito** | Resolver dudas teóricas o sobre el diagrama del equipo con un mentor que responde por nombre y con contexto. |
|---|---|
| **Resumen** | El integrante pregunta con la IA activada. La pregunta se publica en la sala y el Moderador IA responde dirigiéndose a quien preguntó. Usa el estado del diagrama con su autoría, la bitácora, la conversación de la sala y el hilo individual del integrante. |
| **Actores** | Integrante, Moderador IA |
| **Actor Iniciador** | Integrante |

**Flujo Principal:**

> 1\. El integrante escribe o dicta su pregunta con la IA activada.
>
> 2\. El sistema publica la pregunta en la sala (incluye CU14).
>
> 3\. El sistema emite `ai:status` y todos ven *"La IA está pensando la respuesta para …"*.
>
> 4\. El servidor reúne el contexto dual: diagrama con autoría, bitácora, chat de la sala e hilo del integrante.
>
> 5\. El motor híbrido consulta a Gemini y, si no hay internet o falla, a Ollama local.
>
> 6\. El sistema garantiza que la respuesta empiece con el nombre del integrante y la guarda con el proveedor usado.
>
> 7\. El sistema difunde la respuesta a toda la sala con el badge del proveedor.

**Flujo alternativo (sin internet):** en el paso 5, Gemini falla y responde Ollama (punto de extensión *Responder con IA local*).

**Precondición:** El integrante inició sesión y está en la sala.

**CU16 --- Solicitar Cambio del Diagrama a la IA**

| **Propósito** | Permitir que el Moderador IA, como desarrollador senior, aplique cambios al diagrama compartido cuando se le piden explícitamente. |
|---|---|
| **Resumen** | El integrante pide un cambio (*"agrega la clase Producto y relaciónala muchos a muchos con Pedido"*). La IA propone operaciones y el servidor las valida. Solo el cliente de quien pidió el cambio las aplica, y se guardan con autoría "vía IA". |
| **Actores** | Integrante, Moderador IA |
| **Actor Iniciador** | Integrante |

**Flujo Principal:**

> 1\. El integrante escribe un pedido con un verbo de cambio (crea, agrega, elimina, relaciona…).
>
> 2\. Se ejecuta CU15 y la IA devuelve una respuesta y una lista de operaciones.
>
> 3\. El servidor descarta operaciones inválidas (clases inexistentes o ya existentes) y verifica que el mensaje sea un pedido explícito.
>
> 4\. La respuesta llega a toda la sala; el cliente de quien pidió el cambio aplica las operaciones al lienzo.
>
> 5\. El cambio se sincroniza a todos y se guarda con `source: AI`.
>
> 6\. La autoría registra *"Creada por Luis · vía IA"* y la bitácora agrega la entrada *"(vía IA)"*.

**Precondición:** El integrante inició sesión y está en la sala.

**CU17 --- Consultar Autoría y Bitácora**

| **Propósito** | Saber quién creó o modificó cada elemento del diagrama y cuándo. |
|---|---|
| **Resumen** | El inspector de clases muestra la autoría actualizada en vivo. El panel Historial lista la bitácora estructurada del diagrama. |
| **Actores** | Integrante |
| **Actor Iniciador** | Integrante |

**Flujo Principal:**

> 1\. El integrante abre una clase con doble clic.
>
> 2\. El inspector muestra *"Creada por …"*, *"Última edición …"*, la fuente ("vía IA" o importado de XMI) y el autor de cada atributo.
>
> 3\. El integrante abre el panel Historial.
>
> 4\. El sistema devuelve las últimas 50 entradas de la bitácora: usuario, acción y resumen.
>
> 5\. Tras cada guardado, el servidor emite `diagram:authorship` y el inspector se actualiza sin recargar.

**Precondición:** El diagrama fue guardado al menos una vez.

**CU18 --- Reanudar Sesión de Trabajo**

| **Propósito** | Continuar el trabajo otro día exactamente donde quedó. |
|---|---|
| **Resumen** | Al entrar a la sala, el sistema reanuda la misma sesión (de PAUSED a ACTIVE) y envía el chat y la actividad recientes. |
| **Actores** | Integrante |
| **Actor Iniciador** | Integrante |

**Flujo Principal:**

> 1\. El integrante abre un diagrama.
>
> 2\. El cliente emite `join-diagram` con su JWT.
>
> 3\. El servidor busca la última sesión no cerrada: si estaba PAUSED la reactiva y, si no existe, la crea.
>
> 4\. El servidor envía `session:init-state` con la sesión, la bitácora reciente y el chat.
>
> 5\. El panel de chat muestra la conversación anterior.
>
> 6\. Cuando sale el último integrante, la sesión vuelve a PAUSED.

**Precondición:** El integrante inició sesión (CU13).

**CU19 --- Visualizar Diagrama en Vivo (Móvil)**

| **Propósito** | Seguir desde el celular, en solo lectura, el diagrama y el chat del equipo. |
|---|---|
| **Resumen** | El integrante abre el visor UML de la app Flutter, elige un diagrama y lo ve actualizarse en vivo, con la autoría de cada clase y el chat con la IA. |
| **Actores** | Integrante (móvil) |
| **Actor Iniciador** | Integrante (móvil) |

**Flujo Principal:**

> 1\. El integrante toca "Visor UML en vivo" e inicia sesión (CU13).
>
> 2\. El sistema lista los diagramas del equipo y el integrante elige uno.
>
> 3\. El visor descarga el diagrama y se une a la sala por WebSocket.
>
> 4\. Cuando alguien cambia el diagrama en la web, el visor lo redibuja y resalta las clases modificadas.
>
> 5\. El integrante toca una clase para ver su autoría o cambia a la pestaña Chat.

**Precondición:** La app está instalada y el integrante tiene una cuenta.

**CU20 --- Recibir Notificaciones en el Móvil**

| **Propósito** | Avisar al integrante de la actividad del equipo aunque no esté mirando la pantalla. |
|---|---|
| **Resumen** | El visor muestra notificaciones locales cuando llega un mensaje de otro integrante, una respuesta de la IA o un cambio en el diagrama. |
| **Actores** | Integrante (móvil) |
| **Actor Iniciador** | Sistema (evento de la sala) |

**Flujo Principal:**

> 1\. Llega un `chat:new-message` de otro integrante o del Moderador IA, y el visor muestra la notificación *"Moderador IA → Luis"*.
>
> 2\. Llega un `diagram-update` con el nombre de quien editó, y el visor notifica *"Luis modificó Pedido"*, como máximo un aviso cada 10 segundos.

**Precondición:** El visor está abierto en un diagrama (CU19) y el integrante concedió el permiso de notificaciones.

@@ estructurar

Para el segundo ciclo, el modelo de casos de uso se amplía con dos paquetes nuevos:

- **Sala grupal con Moderador IA:** CU13–CU18.
- **Visor móvil:** CU19–CU20.

Entre los casos de uso se establecen estas relaciones:

- CU15 **incluye** a CU14 (toda consulta se publica en el chat).
- CU16 **extiende** a CU15.
- *Responder con IA local* **extiende** a CU15 (sin internet).
- CU18 y CU19 **incluyen** a CU13.
- CU20 **extiende** a CU19.

El actor secundario Moderador IA participa en CU15 y CU16.

![](docs/diagrams/2do_parcial/pud/uc_general.png){width="4.6in"}

*Figura --- Diagrama General de Casos de Uso, Ciclos 1 y 2 (UML 2.5.1)*

@@ paquetes

En el segundo ciclo se agregan los paquetes **chat grupal** (frontend) y **live** (visor de la app móvil). También se amplían los paquetes **diagrams** (autoría, bitácora y sesiones) y **ai** (motor híbrido, moderador y gateway del chat). Las dependencias siguen siendo unidireccionales: **ai** depende de **diagrams** para leer el modelo y la bitácora, y ambos dependen de **auth** para identificar al usuario.

![](docs/diagrams/2do_parcial/pud/paquetes.png){width="5.4in"}

*Figura --- Diagrama de Paquetes del Sistema, Ciclo 2*

@@ comunicacion

***CU13 --- Iniciar Sesión***

![](docs/diagrams/2do_parcial/pud/com_cu13.png){width="4.3in"}

*Figura --- Diagrama de Comunicación CU13*

***CU14 --- Enviar Mensaje al Chat Grupal***

![](docs/diagrams/2do_parcial/pud/com_cu14.png){width="4.3in"}

*Figura --- Diagrama de Comunicación CU14*

***CU15 --- Consultar al Moderador IA***

![](docs/diagrams/2do_parcial/pud/com_cu15.png){width="4.3in"}

*Figura --- Diagrama de Comunicación CU15*

***CU16 --- Solicitar Cambio del Diagrama a la IA***

![](docs/diagrams/2do_parcial/pud/com_cu16.png){width="4.3in"}

*Figura --- Diagrama de Comunicación CU16*

***CU17 --- Consultar Autoría y Bitácora***

![](docs/diagrams/2do_parcial/pud/com_cu17.png){width="4.3in"}

*Figura --- Diagrama de Comunicación CU17*

***CU18 --- Reanudar Sesión de Trabajo***

![](docs/diagrams/2do_parcial/pud/com_cu18.png){width="4.3in"}

*Figura --- Diagrama de Comunicación CU18*

***CU19 --- Visualizar Diagrama en Vivo (Móvil)***

![](docs/diagrams/2do_parcial/pud/com_cu19.png){width="4.3in"}

*Figura --- Diagrama de Comunicación CU19*

***CU20 --- Recibir Notificaciones en el Móvil***

![](docs/diagrams/2do_parcial/pud/com_cu20.png){width="4.3in"}

*Figura --- Diagrama de Comunicación CU20*

@@ clases_analisis

**Clases de análisis del Segundo Ciclo**

**Boundary:**

- `LoginPage`
- `ChatPanel`
- `ClassInspector` (ahora con la sección de autoría)
- `HistoryPanel`
- `UmlViewerScreen` (móvil)

**Control:**

- Los gateways WebSocket del chat y de la sala.
- El Moderador IA, el motor híbrido y los servicios de diagramas y de sesiones.
- `LiveRoom`, que conecta el móvil a la sala.

**Entity:**

- Las colecciones de MongoDB: `Diagram` con su `AuthorStamp` embebido, `ActivityLog`, `DiagramSession` y `GroupChatMessage`.
- `User` en PostgreSQL.

![](docs/diagrams/2do_parcial/pud/clases_analisis.png){width="5.3in"}

*Figura --- Clases de Análisis, Ciclo 2 (Boundary-Control-Entity)*

@@ analisis_paquete

En el segundo ciclo, el paquete **ai** deja de ser independiente: depende de **diagrams** para construir el contexto grupal del moderador (modelo con autoría y bitácora) y de **auth** para identificar al usuario en el socket. La dependencia es unidireccional: **diagrams** no conoce a **ai**. Por eso el gateway del chat vive en el módulo **ai** y comparte el mismo servidor Socket.io que la colaboración, sin crear un ciclo de dependencias.

@@ despliegue

**Despliegue --- Segundo Ciclo.** Se agrega un cuarto contenedor, **MongoDB 7** con el volumen `mongo_data`, junto a PostgreSQL 16, el backend NestJS y el frontend (nginx con TLS de Let's Encrypt). nginx enruta además `/sessions`. El backend consulta Gemini en la nube y, como respaldo, un Ollama local (`docker-compose.local.yml` para la defensa sin internet). El celular se conecta por HTTPS/WSS al mismo dominio.

![](docs/diagrams/2do_parcial/01_despliegue.png){width="6.2in"}

*Figura --- Diagrama de Despliegue, Ciclo 2 (UML 2.5.1)*

@@ diseno_logico

**Diseño lógico --- Segundo Ciclo.** El diagrama de componentes muestra las interfaces provistas por el backend (REST y eventos Socket.io de la sala) y quién las requiere: el frontend web (lienzo, chat e inspector) y la app móvil (visor).

![rot](docs/diagrams/2do_parcial/02_componentes.png){width="6.3in"}

*Figura --- Diagrama de Componentes, Ciclo 2*

@@ datos

**Diseño de datos lógicos --- Segundo Ciclo.** Se adopta **persistencia políglota**:

- **MongoDB:** guarda lo que tiene forma de árbol o crece con el uso.
  - `diagrams`: el modelo UML con la autoría **embebida** en cada clase, atributo y relación; `_id` UUID para conservar los identificadores migrados.
  - `diagram_sessions`: estado ACTIVE/PAUSED, participantes y bloqueos activos.
  - `diagram_activity_logs`: bitácora, una entrada por cambio, con actor, acción y destino.
  - `group_chat_messages`: chat público; las respuestas de la IA registran a quién van dirigidas (`addressedTo`) y el proveedor usado.
- **PostgreSQL:** conserva lo relacional: `users` (correo único) y `attachments`.

Las referencias entre colecciones son por identificador, sin claves foráneas, para que la bitácora y el chat sobrevivan aunque se elimine el diagrama.

![](docs/diagrams/2do_parcial/03_clases_persistencia.png){width="6.3in"}

*Figura --- Diagrama de Clases de Persistencia, Ciclo 2*

**Diseño de clases del motor de IA.** Se aplica el patrón **Strategy**: `AiProvider` con dos implementaciones (`GeminiProvider` y `OllamaProvider`), compuestas por `HybridAiProvider`, que agrega el orden configurable, los timeouts y el *circuit breaker*.

![rot](docs/diagrams/2do_parcial/04_clases_motor_ia.png){width="6.3in"}

*Figura --- Diagrama de Clases del Motor de IA híbrido y el Moderador*

@@ secuencias

***CU13 --- Iniciar Sesión***

![](docs/diagrams/2do_parcial/pud/seq_cu13.png){width="5.6in"}

*Figura --- Diagrama de Secuencia CU13*

***CU14 --- Enviar Mensaje al Chat Grupal***

![](docs/diagrams/2do_parcial/pud/seq_cu14.png){width="6.3in"}

*Figura --- Diagrama de Secuencia CU14*

***CU15 --- Consultar al Moderador IA***

![](docs/diagrams/2do_parcial/pud/seq_cu15.png){width="6.3in"}

*Figura --- Diagrama de Secuencia CU15 (la versión detallada, con el respaldo Gemini ↔ Ollama, está en la sección 4.4)*

***CU16 --- Solicitar Cambio del Diagrama a la IA***

![](docs/diagrams/2do_parcial/pud/seq_cu16.png){width="6.3in"}

*Figura --- Diagrama de Secuencia CU16*

***CU17 --- Consultar Autoría y Bitácora***

![](docs/diagrams/2do_parcial/pud/seq_cu17.png){width="6.3in"}

*Figura --- Diagrama de Secuencia CU17*

***CU18 --- Reanudar Sesión de Trabajo***

![](docs/diagrams/2do_parcial/pud/seq_cu18.png){width="6.0in"}

*Figura --- Diagrama de Secuencia CU18*

***CU19 --- Visualizar Diagrama en Vivo (Móvil)***

![](docs/diagrams/2do_parcial/pud/seq_cu19.png){width="6.3in"}

*Figura --- Diagrama de Secuencia CU19*

***CU20 --- Recibir Notificaciones en el Móvil***

![](docs/diagrams/2do_parcial/pud/seq_cu20.png){width="6.0in"}

*Figura --- Diagrama de Secuencia CU20*

## 4.4 Diseño detallado del Segundo Ciclo

Estos diagramas detallan los tres mecanismos centrales del ciclo 2:

- **La pregunta pública al Moderador IA**, con el contexto dual y el respaldo entre proveedores.
- **El guardado con autoría granular.**
- **El estado de la sesión continua y la decisión del motor híbrido.**

![](docs/diagrams/2do_parcial/05_secuencia_chat_ia.png){width="6.3in"}

*Figura --- Secuencia detallada: pregunta pública al Moderador IA (alt / opt / par)*

![rot](docs/diagrams/2do_parcial/06_secuencia_guardado_autoria.png){width="6.3in"}

*Figura --- Secuencia detallada: guardado con autoría granular y bitácora*

![](docs/diagrams/2do_parcial/07_estados_sesion.png){width="5.0in"}

*Figura --- Máquina de estados de la sesión continua (ACTIVE ⇄ PAUSED)*

![](docs/diagrams/2do_parcial/08_actividad_motor_hibrido.png){width="4.4in"}

*Figura --- Diagrama de actividad del motor de IA híbrido*

@@ implementacion

## 5.3 Implementación --- Segundo Ciclo

El segundo ciclo extiende los mismos servicios (backend NestJS, frontend React y app Flutter) sin romper lo del primer ciclo. Todo se desarrolló en la rama `feat/mongodb-autoria` y se integra mediante un Pull Request.

### 1. Backend --- NestJS (nuevos módulos y cambios)

- **Persistencia (MongoDB + Mongoose):**
  - Esquemas `DiagramDocument`, `DiagramSessionDocument`, `ActivityLogDocument` y `GroupChatMessageDocument`.
  - `DiagramsService` reescrito sobre Mongoose con la **misma interfaz pública**, así que el generador y XMI no cambiaron.
  - `MongooseModule` convive con TypeORM: usuarios y adjuntos siguen en PostgreSQL.
- **Autoría y bitácora (`authorship.util.ts`):**
  - `applyAuthorship()` calcula los sellos `author`, `lastModifiedBy` y `source` comparando el modelo guardado con el nuevo; el cliente no puede falsificarlos.
  - `diffModel()` genera una entrada de bitácora por cambio.
  - `sanitizeModel()` normaliza los `null` que guarda Mongo.
- **Sesiones continuas (`SessionsService`):** `join` / `leave` (ACTIVE ⇄ PAUSED), `saveLocks` y `getInitState`; endpoint `GET /sessions/:diagramId/latest`.
- **Identidad en el socket (`socket-auth.ts`):** el JWT del *handshake* identifica al usuario; el guard JWT global ya no intercepta los mensajes WebSocket.
- **Chat grupal (`ChatGateway`):**
  - eventos `chat:send`, `chat:new-message`, `ai:status` y `chat:error`;
  - solo el cliente de quien pidió un cambio aplica las operaciones;
  - evento `ai:settings`: interruptor por sala «IA edita el lienzo» / «IA solo sugiere», guardado en el diagrama y registrado en la bitácora.
- **Moderador IA (`ModeratorService`, `moderator-prompt.ts`):**
  - contexto dual (25 entradas de bitácora, 8 mensajes de la sala y 8 del hilo individual);
  - prompt completo para Gemini y prompt *lite* con caché de prefijo para Ollama;
  - `ensureAddressed()` garantiza que la respuesta nombre a quien preguntó;
  - `applyCanvasPolicy()` aplica en el servidor el modo de la sala y `isExplicitChangeRequest()`: sin pedido explícito, o en modo «solo sugerencias», no se toca el lienzo; en ese modo las operaciones propuestas se devuelven como pasos para hacerlo a mano.
- **Modelo propio `moderador-uml` (Ollama):** *Modelfile* generado desde el código (`FROM qwen2.5:1.5b-instruct`, rol y glosario del moderador, temperatura 0, `num_ctx` 4096); se crea con `npm run ollama:modelo` y, si falta, el backend usa qwen2.5 base.
- **Motor híbrido (`HybridAiProvider`):** cadena Gemini ⇄ Ollama según `AI_HYBRID_ORDER`, timeouts de 20 y 60 s, *circuit breaker* de 30 s y precalentamiento de Ollama al arrancar.
- **Migración:** script idempotente `migrate-pg-to-mongo` (copió 8 diagramas y 55 entradas de historial conservando los UUID).

### 2. Frontend --- React (nuevos módulos)

- **`ChatPanel`** reescrito como chat público por WebSocket:
  - avatar, nombre, hora y destinatario de cada mensaje;
  - badge del proveedor e indicador animado *"pensando para…"*;
  - interruptor "preguntar a la IA" y dictado por voz.
- **`ClassInspector`:** sección **Autoría** (creada por, última edición y autor de cada atributo), actualizada con `diagram:authorship`.
- **`App.tsx`:**
  - aplica las operaciones de la IA y las guarda con `source: 'AI'`;
  - corrección de la sincronización en pestañas en segundo plano.
- **`api/socket.ts`:** envía el JWT en el *handshake*.

### 3. App móvil --- Flutter (nuevo)

- **Carpeta `lib/live/`:**
  - `CaseApi` (login y diagramas);
  - `LiveRoom` (`socket_io_client`, solo escucha);
  - `UmlViewerScreen` (lienzo con zoom, ajuste a pantalla, resaltado de cambios, bloqueos, autoría y pestaña de chat);
  - `LiveNotifications` (`flutter_local_notifications`).
- **Acceso:** botón flotante "Visor UML en vivo".
- **Android:** permiso `POST_NOTIFICATIONS` y *desugaring*; APK de release compilado.

### 4. Despliegue --- Segundo Ciclo

- **`docker-compose.prod.yml`:**
  - servicio `mongo:7` con *healthcheck* y volumen `mongo_data`;
  - variables `MONGO_URI`, `AI_HYBRID_ORDER`, `OLLAMA_TIMEOUT_MS` y `OLLAMA_FALLBACK_TIMEOUT_MS`.
- **nginx:** enruta `/sessions`.
- **Migración:** se ejecuta una vez con `docker compose exec backend node dist/scripts/migrate-pg-to-mongo.js`.

@@ pruebas

## 6.6 Pruebas del Segundo Ciclo

- **Pruebas automatizadas:** 129 pruebas unitarias en 22 archivos (Vitest), todas aprobadas. Cubren autoría y bitácora, saneamiento del modelo, motor híbrido, prompt del moderador, detección de pedidos explícitos, validación de operaciones de la IA, generador y XMI.
- **CP-05 --- Autoría granular:** Marco crea una clase y Luis le agrega un atributo. El sistema registra a Marco como autor, a Luis como última edición y a Luis como autor del atributo; un autor enviado por el cliente se ignora. *Resultado: correcto.*
- **CP-06 --- Sesión continua:** salir de la sala la deja PAUSED; volver la reactiva con el mismo identificador y restaura el chat. *Resultado: correcto.*
- **CP-07 --- Moderador IA:**
  - una pregunta teórica obtiene respuesta por nombre;
  - *"¿quién creó Pedido?"* se responde con la bitácora;
  - *"como te comenté antes…"* demuestra el contexto individual;
  - un pedido de cambio genera las operaciones correctas y una pregunta no modifica el lienzo.

  *Resultado: correcto.*
- **CP-08 --- Motor híbrido (medido en CPU):**

  | Escenario | Proveedor que respondió | Tiempo |
  |---|---|---|
  | `cloud-first` | Gemini | 4,3 s |
  | Falla Gemini → respaldo | Ollama | 13,5 s |
  | `local-first`, modelo precalentado | Ollama | 5,0 s |
- **CP-09 --- Dos usuarios en el navegador:**
  - indicador *"pensando para Luis"* visible para ambos;
  - el cambio pedido por Luis aparece en ambos lienzos;
  - el inspector muestra *"Creada por Luis · vía IA"*.

  *Resultado: correcto.*
- **CP-10 --- Visor móvil:** un cambio pedido desde la web aparece en el celular sin recargar, junto con el chat y la autoría. *Resultado: correcto.*

Las pruebas con usuarios reales encontraron y corrigieron, entre otros, estos defectos (el registro completo está en la sección 7.5):

- una pestaña en segundo plano dejaba de sincronizar;
- las clases perdían su posición al recargar (defecto del ciclo 1);
- aparecían entradas falsas en la bitácora.

@@ manual

### 3.2.8 Iniciar sesión (Segundo Ciclo)

Desde el segundo ciclo, la herramienta pide **registrarse e iniciar sesión** con correo y contraseña. El nombre de la cuenta es el que verá el equipo en el chat y en la autoría de cada clase.

### 3.2.9 Chat del equipo y Moderador IA

El panel derecho es el **chat público del equipo**: todos los conectados ven cada mensaje.

1. Con el **botón del robot activo**, el mensaje se envía también al **Moderador IA**. Todos ven *"La IA está pensando la respuesta para …"* y luego la respuesta, que empieza con tu nombre y muestra qué IA respondió (🏠 Ollama Local o ☁️ Gemini Cloud).
2. Con el robot **apagado**, el mensaje es solo para el equipo.
3. Para que la IA **cambie el diagrama**, pídeselo con un verbo de acción (*"agrega la clase Producto con nombre y precio y relaciónala muchos a muchos con Pedido"*). El cambio aparece en el lienzo de todos y queda registrado como "vía IA".
4. El **micrófono** permite dictar la pregunta.

### 3.2.10 Ver quién hizo qué (autoría e historial)

- **Doble clic en una clase:** el inspector muestra *"Creada por …"*, *"Última edición …"* y el autor de cada atributo.
- **Botón Historial:** lista la bitácora del diagrama, con una entrada por cambio y el nombre de quien lo hizo.

### 3.2.11 Retomar el trabajo otro día

Al volver a abrir un diagrama, la herramienta **reanuda la misma sesión**: el chat anterior y la actividad reciente aparecen sin hacer nada.

### 3.2.12 Visor UML en vivo (celular)

1. En la app móvil, toca **"Visor UML en vivo"** e inicia sesión con la misma cuenta de la web.
2. Elige un diagrama: verás las clases y relaciones (pellizca para hacer zoom; el botón de ajuste encuadra todo el diagrama).
3. Cuando alguien cambia el diagrama, el visor lo actualiza y **resalta** la clase modificada.
4. **Toca una clase** para ver su autoría.
5. La pestaña **Chat** muestra la conversación del equipo con la IA.
6. Si concedes el permiso, recibirás **notificaciones** de mensajes y cambios.
