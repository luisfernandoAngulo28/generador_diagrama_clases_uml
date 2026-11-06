# 🎤 Guía de Defensa — 2do Examen Parcial (Paso 4: verificación de autoría)

> **Grupo 43** · Elizabeth Rivero Peña · Luis Fernando Angulo Heredia
>
> En el Paso 4 el docente verifica **que ustedes hicieron el software y lo
> entienden**. No memoricen frases: memoricen los **anclajes** (archivo,
> función, evento, decisión y su porqué) y expliquen con sus palabras. Cada
> respuesta dice **"Muéstralo"**: el archivo y la línea, o el diagrama
> (`docs/diagrams/2do_parcial/`), que deben poder abrir en segundos.
>
> Complementa a `DEFENSA_ORAL.md` (1er Parcial: generador, colaboración, XMI, PUDS).

---

## 0. Reglas de oro

1. **Abran el código, no lo reciten.** "Le muestro: está en `hybrid.provider.ts`,
   línea 114" vale más que cualquier definición.
2. **Cada decisión tiene un porqué medido o probado.** Por ejemplo: *"Gemini
   responde primero porque medimos qwen en nuestra laptop: 8–13 s contra 2–12 s
   de Gemini"*.
3. **Sean honestos con la IA de desarrollo.** El historial muestra
   `Co-Authored-By: Claude` en la mayoría de los commits. Si lo preguntan:
   > *"Usamos Claude Code como asistente de programación y lo declaramos en el
   > documento (Sección 2.7). Las decisiones de diseño fueron nuestras: MongoDB
   > junto a PostgreSQL, Gemini primero con Ollama de respaldo, y que la IA solo
   > toque el lienzo si se le pide. Nosotros probamos cada parte y la corregimos.
   > Pregúntenme por cualquier línea."*

   Y **cumplan esa última frase**: esta guía existe para eso.
4. **Si no saben algo, digan dónde lo buscarían.** Por ejemplo: "eso lo decide
   `usable()` en el motor híbrido; déjeme abrirlo".

---

## 1. Pitch de 60 segundos (practíquenlo en voz alta)

> "En el 1er Parcial construimos una herramienta CASE: diagramas de clases
> UML, colaboración en tiempo real, XMI y un generador de backends Spring Boot.
> En el 2do Parcial la IA dejó de ser un asistente privado y se volvió un
> **moderador del grupo**, como un docente en el aula:
> - **el chat es público** y la IA **responde por nombre** a quien pregunta;
> - tiene **contexto grupal**, porque sabe quién creó cada clase gracias a la
>   autoría granular que guardamos en MongoDB;
> - tiene **contexto individual**, porque recuerda el hilo de cada integrante;
> - solo **modifica el diagrama si se lo piden**.
>
> El motor es **híbrido**: Gemini en la nube y Ollama local como respaldo sin
> internet. Además, el celular ve todo **en vivo** con un visor Flutter.
> Todo lo del 1er Parcial sigue funcionando."

---

## 2. Mapa mental del 2do Parcial (dibújenlo si les piden explicar el flujo)

```
 Navegador / Celular ──JWT en el handshake──▶ Socket.io (sala = diagramId)
        │                                        │
        │ chat:send                              ├─ ChatGateway ──▶ ModeratorService ──▶ AiService ──▶ HybridAiProvider
        │                                        │                     │  contexto dual        (Gemini ⇄ Ollama)
        │◀── chat:new-message / ai:status ───────┤                     ▼
        │                                        │                  MongoDB: diagrams · activity_logs · chat · sessions
        │ PATCH /diagrams/:id (REST)             │
        └──▶ DiagramsService: sanitize → applyAuthorship → diffModel → bitácora
                                                 └─ DiagramsGateway ── diagram:authorship ──▶ sala
```

Diagramas de apoyo: **02 componentes** (vista general), **05** (chat con la IA)
y **06** (guardado con autoría).

---

## 3. Preguntas probables y respuestas

### 🟣 A. Los requisitos del docente (la IA como "docente en el aula")

**A1. ¿Cómo sabe la IA a quién responder?**
- El celular o el navegador envía el **JWT en el *handshake*** de Socket.io.
- El servidor identifica al usuario con `resolveSocketUser()`, así que **no
  confiamos en el nombre que envíe el cliente**.
- Ese nombre entra al prompt (*"Quien te pregunta ahora es: Luis"*).
- Además, `ensureAddressed()` **garantiza** que la respuesta empiece por su
  nombre aunque el modelo lo olvide.

📍 Muéstralo:
- `backend/src/diagrams/socket-auth.ts:10`
- `backend/src/ai/moderator/moderator-prompt.ts:42` y `:161`

**A2. ¿Cómo garantizan que el chat es público?**
`ChatGateway.handleSend()` emite todo a la **sala** del diagrama
(`this.server.in(diagramId)`):
- primero la pregunta;
- luego `ai:status` ("pensando para Luis");
- al final la respuesta.

No existe ningún evento privado.

📍 Muéstralo: `backend/src/ai/chat/chat.gateway.ts:51` · diagrama **05**.

**A3. ¿Qué es el "contexto dual"?**
En `ModeratorService.answer()`, antes de llamar a la IA, se consultan **en
paralelo**:
- **Grupal:** el diagrama con su autoría, las últimas 25 entradas de la
  bitácora, los últimos 8 mensajes de la sala y quiénes están conectados.
- **Individual:** los últimos 8 mensajes **de** ese usuario o **dirigidos a**
  él (`$or: sender.userId / addressedTo.userId`).

📍 Muéstralo: `backend/src/ai/moderator/moderator.service.ts:96` · fragmento `par` del diagrama **05**.

**A4. ¿Cómo evitan que la IA cambie el diagrama si solo le preguntaron algo?**
Hay **dos capas**:
1. **El prompt** se lo pide.
2. **El servidor lo impone sin confiar en el modelo:** `isExplicitChangeRequest()`
   busca verbos de cambio ("crea", "agrega", "relaciona"…). Si no hay ninguno,
   las operaciones se descartan.

Además, `validateOperations()` elimina operaciones sobre clases inexistentes y
`CREATE_CLASS` de clases que ya existen.

📍 Muéstralo:
- `backend/src/ai/moderator/intent.ts:21`
- `backend/src/ai/validate-operations.ts:13`
- tests: `intent.spec.ts`

**A4-bis. El enunciado dice que la IA modifica el diagrama "de manera configurable". ¿Dónde está?**
- En el chat del equipo hay un **interruptor por sala**: **«IA edita el lienzo»** ⇄ **«IA solo sugiere»**.
- Se guarda en el diagrama (`aiCanEditCanvas` en MongoDB). Cualquiera lo cambia con
  el evento `ai:settings`, y **toda la sala** ve el nuevo modo y el aviso *"Luis puso a la IA en modo solo sugerencias"*.
  El cambio queda en la bitácora.
- **Lo impone el servidor**, no el modelo: `applyCanvasPolicy()`. En «solo sugerencias» las operaciones nunca
  llegan al lienzo y la respuesta se **reescribe** con los pasos para hacerlo a mano ("• Crear la clase Reserva (fecha: LocalDate)").
  Se reescribe porque el modelo local pequeño a veces dice "agregué…" aunque el prompt se lo prohíba.

📍 Muéstralo:
- `backend/src/ai/moderator/canvas-policy.ts`
- `backend/src/ai/chat/chat.gateway.ts` (`handleSettings`)
- `frontend/src/components/ChatPanel.tsx` (botón `role="switch"`)
- tests: `canvas-policy.spec.ts`
- **En vivo:** apaga el interruptor, pide "agrega la clase Reserva…", muestra los pasos; enciéndelo y repite: se crea.

**A4-ter. ¿Qué es el "Modo IA"? ¿En qué se diferencia del chat normal?**
- Es una **vista distinta y un enfoque distinto**: botón **Modo IA** en la barra superior.
- **Vista:** se oculta la barra de edición y el panel de clases; el chat pasa al centro y el diagrama queda al costado como vista previa en vivo, de solo lectura.
- **Enfoque:** no se dibuja, se conversa. Todo mensaje va a la IA y hay accesos directos: *Revisar diagrama*, *Crear proyecto*, *Explicar diagrama*, *¿Qué hizo el equipo?*
- **Es por persona:** uno puede estar en Modo IA mientras otro dibuja en el lienzo normal, y ambos ven lo mismo en vivo porque la sala y el chat son los mismos. Se recuerda al recargar (`localStorage`).
- **No confundir** con el interruptor «IA edita el lienzo»: ese es de **toda la sala** y define si la IA puede cambiar el diagrama; Modo IA es solo la vista de cada uno.

📍 Muéstralo: `frontend/src/components/AiModeBar.tsx`, `ChatPanel.tsx` (`AI_SHORTCUTS`), `App.tsx` (`toggleAiMode`).

**A4-quater. ¿La IA atiende "cualquier consulta": revisiones, hacer un proyecto, cambios?**
- `classifyRequest()` clasifica cada mensaje: **pregunta, cambio, revisión o proyecto**.
- **Revisión:** el servidor corre `validateModel()` y le pasa los resultados al modelo; además los agrega él mismo a la respuesta ("Validador automático…"), así que esa parte no puede ser inventada.
- **Proyecto:** el prompt pide el sistema completo de una vez (de 4 a 8 clases con relaciones), y el servidor agrega `AUTO_LAYOUT` al final.
- **Otros temas:** responde en una o dos frases y ofrece volver al proyecto.
- ⚠️ **Limitación, díganla ustedes antes de que la encuentren:** sin internet, el modelo local solo arma 2 clases (medido). Por eso los proyectos completos intentan primero con Gemini aunque el orden sea `local-first` (`heavy` en `hybrid.provider.ts`).

📍 Muéstralo: `backend/src/ai/moderator/intent.ts`, `moderator.service.ts` (`validatorSummary`). **En vivo:** Modo IA → Crear proyecto → "…para un sistema de veterinaria".

**A5. ¿Cómo se aplica al lienzo un cambio pedido a la IA?**
- La respuesta viaja con `operations` a toda la sala, pero **solo el cliente de
  quien preguntó las aplica** (si no, se aplicarían una vez por cada persona
  conectada).
- Ese cliente guarda con `source: 'AI'`, y la autoría queda como *"Luis · vía IA"*.

📍 Muéstralo:
- `frontend/src/components/ChatPanel.tsx` (`forMe && message.operations`)
- `frontend/src/App.tsx:942` (`applyAiOperations`)

### 🟢 B. Datos, autoría y sesiones (MongoDB)

**B1. ¿Por qué MongoDB? ¿Por qué no dejaron todo en PostgreSQL?**
- **Persistencia políglota.** El modelo UML es un **árbol**: clases → atributos
  y relaciones, con la autoría **embebida en cada elemento**. Un documento lo
  guarda tal cual, sin *joins*.
- Usuarios y adjuntos son relacionales y ya funcionaban, así que **quedaron en
  PostgreSQL**. Cambiarlos solo agregaba riesgo.

📍 Muéstralo: diagrama **03** · `backend/src/app.module.ts` (TypeORM + Mongoose juntos).

**B2. ¿Cómo se calcula la autoría? ¿Un usuario la puede falsificar?**
**No se puede falsificar**, por dos razones:
1. El `ValidationPipe` (con `whitelist`) **borra** cualquier `author` que envíe
   el cliente.
2. `applyAuthorship()` la calcula **comparando el modelo guardado con el nuevo**:
   - elemento nuevo → `author = yo`;
   - elemento cambiado → conserva su autor y `lastModifiedBy = yo`;
   - elemento sin cambios → conserva sus sellos.

**Mover una clase no cuenta como cambio.** Los atributos no tienen id, así que se
emparejan **por nombre** dentro de su clase.

📍 Muéstralo: `backend/src/diagrams/authorship.util.ts:214` · diagrama **06** · test "ignores stamps sent by the client".

**B3. ¿Qué guarda la bitácora y para qué sirve?**
- `diffModel()` genera **una entrada por cambio** (`CLASS_CREATED`,
  `ATTRIBUTE_ADDED`, `RELATION_DELETED`…) con una frase legible.
- Con eso la IA responde *"¿qué hizo Marco?"* **con datos reales**.
- Si el cambio vino de la IA, se agrega "(vía IA)".

📍 Muéstralo: `authorship.util.ts:66` · colección `diagram_activity_logs`.

**B4. ¿Qué es una "sesión continua"?**
- Mientras alguien está en la sala, la sesión está **ACTIVE**.
- Cuando sale el último, pasa a **PAUSED**.
- Al volver, se **reanuda la misma sesión** (mismo `_id`) y llega
  `session:init-state` con el chat y la bitácora.

Se probó de punta a punta: salir → PAUSED → volver → mismo id.

📍 Muéstralo: `backend/src/diagrams/sessions.service.ts:46` y `:89` · diagrama **07**.

**B5. ¿Perdieron los datos del 1er Parcial al migrar?**
No:
- El script `migrate-pg-to-mongo` copió 8 diagramas y 55 entradas de historial
  **conservando los UUID**, así que los enlaces viejos siguen funcionando.
- Es **idempotente** (`$setOnInsert` + `upsert`): lo corrimos dos veces y la
  segunda insertó 0.

📍 Muéstralo: `backend/src/scripts/migrate-pg-to-mongo.ts`.

### 🔵 C. Motor de IA híbrido (IA local)

**C1. ¿Entrenaron el modelo?**
**No: lo configuramos.** Entrenar es ajustar millones de pesos con datos y GPU.
Nosotros usamos un modelo **preentrenado** (qwen2.5:1.5b-instruct en Ollama, y
Gemini) y lo guiamos con:
- un **System Prompt** de rol ("Moderador / Desarrollador Senior");
- el contexto inyectado en cada pregunta;
- ejemplos *few-shot* y un mini glosario;
- temperatura 0;
- salida en **JSON con un contrato fijo**.

📍 Muéstralo: `moderator-prompt.ts` (`ROLE`, `LITE_STATIC`).

**C1-bis. ¿Entonces qué tiene de "personalizado por ustedes" el modelo local?**
- Creamos nuestro propio modelo en Ollama, **`moderador-uml`**, con un *Modelfile*:
  `FROM qwen2.5:1.5b-instruct` + `SYSTEM` (rol, reglas y glosario del moderador) +
  `PARAMETER` (temperatura 0, `num_ctx` 4096, `num_predict` 256, `repeat_penalty` 1.1).
- El Modelfile **se genera desde el código** (`buildModelfile()` usa el mismo `LITE_STATIC` que el backend)
  con `npm run ollama:modelo`, que también ejecuta `ollama create`.
- El backend lo usa por defecto (`OLLAMA_TEXT_MODEL=moderador-uml`) y, si no existe, vuelve a qwen2.5 base.
- Es **configuración**, no entrenamiento: no cambiamos pesos. Tampoco lo vendan como más rápido: en CPU tarda lo mismo.
- **En vivo:** `ollama show moderador-uml --modelfile` y `ollama run moderador-uml "¿Qué es un atributo derivado?"`
  (responde como moderador aunque no lo llame el backend).

📍 Muéstralo: `backend/src/ai/ollama-modelfile.ts`, `backend/ollama/Modelfile`, `backend/src/scripts/crear-modelo-ollama.ts`.

**C2. ¿Cómo funciona el fallback? ¿Qué pasa si se cae internet en plena defensa?**
- `HybridAiProvider` arma una **cadena de proveedores** según `AI_HYBRID_ORDER`.
- Por defecto es *cloud-first*: Gemini primero.
- Si Gemini falla (sin red), **abre un *circuit breaker* de 30 s** y responde
  Ollama. El usuario no hace nada distinto.
- El badge del chat muestra quién respondió (🏠 / ☁️).

📍 Muéstralo:
- `backend/src/ai/providers/hybrid.provider.ts:114` (`textChain`), `:129` (`usable`), `:161` (`onFailure`)
- diagrama **08**

**C3. ¿Por qué Gemini primero y no Ollama, si "lo local suma puntos"?**
**Porque lo medimos:**
- En nuestra laptop (CPU), qwen lee el prompt a ~50 tokens/s. Con el prompt
  completo (1.380 tokens) tardaba **36–79 s**.
- Lo optimizamos con un prompt "lite", la caché de prefijo de Ollama y
  precalentamiento al arrancar: bajó a **5–18 s**.
- Gemini respondió en 2–12 s (casi siempre ~5 s) y con mejor teoría.

Por eso Ollama es el **respaldo sin internet**. Y con
`AI_HYBRID_ORDER=local-first` **demostramos Ollama primero** cuando el docente
quiera verlo.

**C4. ¿Qué es el *circuit breaker* y por qué un timeout no lo abre?**
- Si un proveedor está **caído** (conexión rechazada, modelo no descargado, sin
  red), se omite durante 30 s para no hacer esperar a cada usuario.
- Un **timeout** no lo abre, porque el modelo pudo estar **cargándose en RAM**:
  medimos 8,7 s en frío contra menos de 1 s en caliente.

📍 Muéstralo: `hybrid.provider.ts:161` · test "falls back to the cloud when the local model times out" (comentario: *a timeout does not open the breaker*).

**C5. ¿Qué es el "prompt lite" y la caché de prefijo?**
- Es un prompt corto (~750 tokens contra 1.380) cuya **parte fija va primero y
  es idéntica en cada llamada**.
- Ollama reutiliza su caché KV y solo procesa lo nuevo: la lectura del prompt
  bajó de 21 s a 2–4 s.

📍 Muéstralo: `moderator-prompt.ts:178` (`buildModeratorLitePrompt`) y `LITE_STATIC`.

### 🟠 D. Tiempo real, chat y móvil

**D1. ¿Qué pasa si dos personas le preguntan a la IA al mismo tiempo?**
- Cada pregunta tiene su `requestId`, y `ai:status` lo incluye.
- El panel muestra "pensando para Luis" y "pensando para Marco" a la vez.
- Las respuestas son independientes y cada una se dirige a su autor.

**D2. ¿Y si dos editan y guardan a la vez?**
- **Limitación conocida y declarada:** el guardado reemplaza el modelo completo
  (*last-write-wins*).
- Se mitiga con el **bloqueo pesimista por clase** del 1er Parcial y con la
  sincronización inmediata (`diagram-update`) antes de guardar.
- Es honesto decirlo: está en la Sección 2.8.

**D3. ¿Cómo sabe el celular quién cambió el diagrama?**
- El evento `diagram-update` ahora incluye `editorName`.
- El visor compara el contenido de cada clase (`contentKey`), resalta las que
  cambiaron y notifica (como máximo un aviso cada 10 s).

📍 Muéstralo: `flutter-template/lib/live/live_room.dart` (handler `diagram-update`).

**D4. ¿Por qué el móvil es de solo lectura?**
- Es un **visor**: escucha la sala y nunca emite cambios ni mensajes.
- Así no puede haber conflictos de edición desde una pantalla pequeña.
- Igual ve el diagrama, la autoría, los bloqueos y el chat con la IA.

**D5. Encontraron bugs del 1er Parcial. ¿Cuáles?**
Sí, al probar con dos usuarios reales. Los dos principales:
1. **Sincronización congelada:** una pestaña en segundo plano dejaba de
   sincronizar porque un flag se reseteaba con `requestAnimationFrame`, que el
   navegador no ejecuta en pestañas ocultas.
2. **Posiciones perdidas:** las clases perdían su posición al recargar porque
   `PositionDto` no tenía decoradores y el `ValidationPipe` borraba `x` e `y`.

Ambos están corregidos y registrados (Sección 2.5).

📍 Muéstralo: `frontend/src/App.tsx:524` · `backend/src/diagrams/dto/uml-model.dto.ts` (`PositionDto`).

### 🟡 E. Teoría ligada al proyecto

**E1. ¿Por qué su herramienta es CASE? ¿De qué tipo?**
Es **I-CASE (integrada)**:
- **Upper CASE:** modelado UML, validación y XMI.
- **Lower CASE:** genera el backend Spring Boot.
- **Repositorio común:** el diagrama.

**E2. ¿Qué es SDD y cuál es su "ventana"?**
- **SDD:** la especificación (el diagrama) es la fuente y el código se deriva
  de ella.
- **La ventana:** si olvidaste algo en el modelo, todo lo generado falla.
- **Cómo la mitigamos:**
  - el **validador** se ejecuta antes de generar (sin PK, duplicados, FK
    manuales, desnormalización);
  - la **IA moderadora** señala problemas de modelado;
  - la **bitácora** permite rastrear quién introdujo cada elemento.

**E3. ¿Qué versión de UML? ¿Quién la define?**
- **UML 2.5.1**, del **OMG** (omg.org).
- Los 28 diagramas del Ciclo 2 están en notación UML 2.5.1, hechos en Enterprise Architect.
- El intercambio es en XMI 2.1, también del OMG.
- Las reglas de modelado vienen de **OMT** (Rumbaugh, 1991).

**E4. Las 4 arquitecturas: dígame dónde se ve cada una.**
- **Backend:** monolito modular NestJS → `app.module.ts`.
- **Frontend:** componentes, hooks, Context API y capa `api/` →
  `frontend/src/components`, `context`, `api`.
- **Datos:** persistencia políglota → diagrama **03**.
- **Despliegue:** Docker Compose en EC2 con TLS → `docker-compose.prod.yml` y
  diagrama **01**.

**E5. ¿Qué significa "dar larga vida al software" en su proyecto?**
Que cambiar sea barato:
- **módulos independientes**: agregar un proveedor de IA es implementar
  `AiProvider`;
- **146 tests** que frenan regresiones;
- estándares verificados por herramientas: TypeScript estricto, oxlint y
  Prettier;
- configuración por variables de entorno.

**Prueba concreta:** el 2do Parcial agregó todo esto **sin romper** el 1er Parcial.

**E6. Proceso Unificado: ¿ciclos, fases y flujos? ¿Cómo lo aplicaron?** (el ingeniero dijo que lo pregunta)
- **Características:** dirigido por casos de uso, centrado en la arquitectura,
  iterativo e incremental.
- **Ciclo:** termina con una versión del producto. Tuvimos **2 ciclos**: Ciclo 1
  (1er Parcial, 30/08–23/09) y Ciclo 2 (2do Parcial, 17/10–10/11).
- **4 fases por ciclo, cada una con su hito:**
  - **Inicio:** alcance, casos de uso y riesgos. Hito: objetivos del ciclo de vida.
  - **Elaboración:** requisitos y arquitectura base probada. Hito: arquitectura del ciclo de vida.
  - **Construcción:** el sistema completo. Hito: capacidad operativa inicial (beta).
  - **Transición:** despliegue y corrección de defectos. Hito: lanzamiento del producto.
- **5 flujos de trabajo:** requisitos (modelo de casos de uso), análisis (clases de
  análisis y comunicación), diseño (clases de diseño, secuencia, despliegue),
  implementación (componentes y código) y prueba.
- 📍 Muéstralo: la tabla de ciclos × fases al inicio del capítulo 7 de la Parte 2.
- ⚠️ **No confundir:** "análisis, diseño, implementación" son **flujos**, no fases.

**E7. ¿Monolito o microservicios? ¿Qué se complica con microservicios?**
- Elegimos **monolito modular**: no hay carga que lo justifique, pero los módulos
  (`auth`, `diagrams`, `ai`, `generator`) están listos para separarse. El primero
  sería `ai`, que es el que más recursos consume.
- **Microservicios a favor:** cada servicio escala por separado y usa los recursos
  que necesita.
- **Lo que se complica y cómo se resuelve:**
  - **Transacción entre varios servicios y *rollback*:** patrón **Saga**, con
    acciones de compensación.
  - **Reportes y *joins* entre bases distintas:** réplica de solo lectura,
    **CQRS** o *data warehouse*.
  - **Avisar cambios** (por ejemplo, inventario → ventas): **eventos** en un *broker*.
  - **Frontend:** **microfrontends** unidos por un **API Gateway**.

**E8. Estilos de arquitectura de backend.**
En capas, MVC, **hexagonal** (puertos y adaptadores), **Clean** / cebolla, DDD y
microservicios. Nuestro motor de IA es hexagonal en pequeño: `AiProvider` es el
**puerto**, y `GeminiProvider` y `OllamaProvider` son **adaptadores** intercambiables.

**E9. ¿Qué es una base de datos vectorial?**
- Cada registro guarda un **vector** (*embedding*) que genera un modelo de IA.
- Se buscan los vectores **más cercanos** para aproximar la **intención** de una
  consulta: búsqueda semántica o RAG.
- **No la usamos.** Serviría para que la IA busque en chats y diagramas antiguos
  por significado y no por palabras exactas.

**E10. SDD al desarrollar con IA: ¿qué le entregan a la IA? Muéstrelo.**
- No trabajamos a puro *prompt*. La **especificación es la fuente de verdad**
  (*source of truth*) que la IA lee en cada tarea.
- Flujo: especificación → plan → tareas → implementación → verificación.
- 📍 En el entorno de desarrollo: `Contexto_Examen_Requisitos.md` y
  `CONTEXTO_CLAUDE_2DO_PARCIAL.md` (especificación),
  `PLAN_EVOLUCION_2DO_PARCIAL.md` y `PLAN_SEMANA1_MONGODB.md` (plan), commits
  pequeños por tarea, y tests más la trazabilidad (verificación).
- **Para qué sirve:** menos ida y vuelta con la IA y menos tiempo revisando lo que genera.

**E11. IA local: ¿cómo se trabaja, cómo se entrena, cómo se personaliza?**
1. Elegir el modelo según el hardware (parámetros y cuantización): 1.500 millones
   de parámetros en una laptop sin GPU.
2. Runtime **Ollama** y `ollama pull`.
3. Personalizar, de menos a más esfuerzo: *System Prompt* → **Modelfile** (nuestro
   `moderador-uml`) → **RAG** → ***fine-tuning*** (LoRA, cambia los pesos).
   **Nosotros llegamos hasta el Modelfile.**
4. Integrarlo por su API HTTP con un contrato JSON fijo.
5. Medir: sin internet, el modelo local solo arma 2 clases de un proyecto completo.

**E12. Del diagrama de clases a la base de datos y a Spring Boot.**
- **Modelo OO → relacional** con las reglas de **OMT** (Rumbaugh):
  - cada clase es una tabla y la clave primaria identifica al objeto;
  - en 1..*, la clave foránea va en el lado "muchos";
  - un *..* necesita una tabla intermedia;
  - la herencia se resuelve con una tabla por jerarquía, por subclase o por clase concreta.
- **Spring Boot en 4 capas:** **Modelo** (entidad JPA, fiel al diagrama, con sus
  relaciones), **Repositorio**, **Servicio** y **Controlador**.
- **La base se genera con el ORM** (JPA/Hibernate) a partir de la capa Modelo, no
  con un script.

### 🔴 F. V&V (lo pregunta el Paso 3, pero reaparece en la defensa)

**F1. Verificación vs. validación.**
- **Verificación:** ¿construimos *bien* el producto? El código cumple el modelo
  y la especificación (tests, trazabilidad).
- **Validación:** ¿construimos el producto *correcto*? Hace lo que pidió el
  docente (prueba con dos usuarios, preguntas reales a la IA).

**F2. Demuestre que el código está en los modelos.**
Abran `docs/diagrams/2do_parcial/README.md`: cada diagrama lista los archivos
que refleja. Ejemplo en vivo:
1. Diagrama **07**, transición *disconnect [nadie conectado] / PAUSED*.
2. `sessions.service.ts:89`: `onlineUserIds.length === 0 ? { status: 'PAUSED' }`.

> Si preguntan por **CLOSED**, respuesta honesta: está definido en el esquema
> y las consultas lo excluyen, pero **aún no hay transición implementada**.
> Así lo dice el propio diagrama 07: el modelo refleja el código tal como está.

**F3. "Un mensaje de A hacia B en la secuencia, ¿dónde está en el código?"** (lo adelantó en la pizarra)
- Es una **operación de la clase que RECIBE** el mensaje (B), no de quien lo envía.
  B ofrece ese servicio y A lo usa (dependencia A → B).
- **Ejemplo:** en CU15, `ChatGateway` envía `answer()` a `ModeratorService`, y
  `answer()` está en `backend/src/ai/moderator/moderator.service.ts`.
- **Prueba automática en vivo:** `python docs/diagrams/ea/verificar_secuencias.py`
  da **86 de 86** mensajes que son operaciones de la clase receptora (otros 28 son
  de librerías: Mongoose `Model`, Socket.io `Server` y notificaciones de Flutter).
- Cada objeto de una secuencia es de una clase que aparece en el **diagrama de
  clases de diseño de la sala** (09), generado a partir de las secuencias.

**F4. "¿Los diagramas los hizo la IA?"**
- Están hechos en **Enterprise Architect 13.5**, en `docs/diagrams/ea/ciclo2.eap`.
  Ábranlo y muestren cualquier diagrama.
- **Cómo se hicieron:** un borrador textual escrito a partir del código
  (`docs/diagrams/2do_parcial/`), que el script `ea_builder.py` construyó en EA por
  su API COM. Después se revisaron contra el código y se corrigieron (por ejemplo,
  los mensajes de secuencia se reescribieron con las operaciones reales).
- Es el flujo que el ingeniero dijo que **sí vale**: borrador → herramienta CASE →
  revisión propia.

---

## 4. Demo en vivo (5 minutos) — guion

**Preparación:**
- Backend arriba. Dos navegadores: uno con la sesión de Elizabeth y otro en
  ventana privada con la de Luis.
- El celular con el visor abierto.
- Ollama precalentado si van a usar `local-first`.

1. **(Luis)** Abre el diagrama. Se ve *"2 conectados"* en la web y *"en la
   sala"* en el celular.
2. **(Luis)** Pregunta *"¿Qué es un atributo derivado?"*. Todos ven el
   indicador "pensando para Luis" y luego *"Luis, …"* con su badge.
3. **(Elizabeth)** Pregunta *"¿Quién creó la clase Pedido?"*. La respuesta sale
   de la bitácora: **contexto grupal**.
4. **(Luis)** Pide *"Agrega la clase Producto con nombre y precio y relaciónala
   muchos a muchos con Pedido"*.
   - Aparece en ambos navegadores **y en el celular**.
   - El inspector dice **"Creada por Luis · vía IA"**.
5. **(Luis)** Pregunta *"¿Y cómo se vería lo que me explicaste antes en
   nuestro diagrama?"*: **contexto individual**.
6. **(Bonus)** Apaguen el WiFi y vuelvan a preguntar: responde 🏠 Ollama
   Local. Si es necesario, reinicien con `AI_HYBRID_ORDER=local-first`.

**Plan B si algo falla:** `docker-compose.local.yml` levanta toda la pila en la
laptop, sin AWS ni internet.

---

## 5. Cambios en vivo que les pueden pedir (y cómo hacerlos)

| Pedido del docente | Dónde y cómo |
|---|---|
| "Que la IA responda en inglés" | `moderator-prompt.ts`, regla 7 de `ROLE` y regla 5 de `LITE_STATIC`: cambiar "Responde en español" |
| "Que use primero el modelo local" | Variable de entorno `AI_HYBRID_ORDER=local-first` y reiniciar el backend (sin tocar código) |
| "Cambie el timeout de Ollama" | `OLLAMA_TIMEOUT_MS` (local-first) u `OLLAMA_FALLBACK_TIMEOUT_MS` (respaldo) |
| "Que la IA también acepte la palabra *diseña*" | Agregar `'diseña'` a `CHANGE_VERBS` en `intent.ts` y su caso en `intent.spec.ts` |
| "Agregue otro tipo de entrada a la bitácora" | `ActivityAction` en `schemas/activity-log.schema.ts` + el `changes.push` en `diffModel()` (`authorship.util.ts`) |
| "Que el chat muestre otro dato" | `ChatBubble` en `ChatPanel.tsx` (el mensaje ya trae `appliedOperationsCount` y `providerUsed`) |
| "Corra las pruebas" | `cd backend && npx vitest run` → 106 pruebas |

---

## 6. Preguntas trampa

- **"¿Esto lo hizo la IA?"** → Regla de oro 3, y abran cualquier archivo que pida.
- **"¿El modelo local está entrenado con sus datos?"** → No. Está configurado;
  los datos del equipo entran como **contexto** en cada pregunta y no modifican
  el modelo.
- **"¿La IA puede borrar el diagrama de otro?"** → Solo con un pedido explícito,
  con operaciones validadas y quedando registrado en la bitácora como
  "(vía IA)" con el nombre de quien lo pidió.
- **"¿Mongo no tiene esquema, cómo validan?"** → Los esquemas son de Mongoose y
  los DTO usan class-validator, así que la validación ocurre antes de guardar.
  Además, `sanitizeModel()` normaliza los `null` que Mongo guardaba en lugar de
  `undefined`.
- **"¿Por qué no microservicios?"** → Un monolito modular basta para un equipo de
  2 en una instancia de 1 GB. Los módulos ya separan responsabilidades: si
  creciera, se podrían extraer.
- **"¿Está en producción?"** → ⟨Decir el estado real ese día. Hay que desplegar
  antes del **martes 10/11**: el PDF se sube hasta las 08:00 y la defensa es a las
  16:00. Desde las 16:00 no se toca nada hasta recibir la nota.⟩

---

## 7. Números que deben saber de memoria

| Dato | Valor |
|---|---|
| Pruebas unitarias | **146** (22 archivos), todas en verde |
| Commits | 89 hasta la Sección 1 (79 del 1er Parcial + 10 del 2do) |
| Tamaño del 2do Parcial | 94 archivos, +8.673 / −252 líneas |
| Ollama, prompt completo → lite | 36–79 s → 5–18 s (CPU) |
| Gemini | 2–12 s (casi siempre ~5 s) · cloud-first medido en 4,3 s |
| Ollama en frío / en caliente | ~8,7 s / <1 s (pregunta corta) |
| Circuit breaker | 30 s |
| Timeouts de Ollama | 20 s (va primero) · 60 s (respaldo) |
| Contexto de la IA | 25 entradas de bitácora · 8 de la sala · 8 del hilo individual |
| Migración | 8 diagramas + 55 entradas de historial, IDs conservados |
| Modelos UML del Ciclo 2 | 28 diagramas en Enterprise Architect 13.5, UML 2.5.1 |
| Verificación secuencia ↔ código | 86 de 86 mensajes son operaciones de la clase receptora (+28 de librerías) |
| Proceso Unificado | 2 ciclos × 4 fases (Inicio, Elaboración, Construcción, Transición) × 5 flujos |

---

## 8. Cómo repartir el estudio (los dos deben saber todo, pero así no se pisan)

| Elizabeth — profundizar | Luis — profundizar |
|---|---|
| B (MongoDB, autoría, bitácora, sesiones) | C (motor híbrido, Ollama, prompts) |
| D3–D4 (visor Flutter) | A (moderador, chat, reglas del docente) |
| E1–E6 (CASE, SDD, UML, arquitecturas, Proceso Unificado) | E7–E12 (microservicios, estilos, BD vectorial, SDD con IA, IA local, OMT) |
| | D1–D2, D5 (tiempo real y bugs) |
| F (V&V con los diagramas) | La demo y los cambios en vivo (sección 5) |

**Ensayo:** cada una le hace a la otra 10 preguntas al azar de la sección 3. La
regla del ensayo: **responder abriendo el archivo**.

## ✅ Checklist antes de entrar

- [ ] Backend, MongoDB y PostgreSQL arriba; `npx vitest run` en verde.
- [ ] Dos cuentas listas; el celular con el APK y el visor probado.
- [ ] Ollama con `moderador-uml` creado (`npm run ollama:modelo`) y precalentado (si usan `local-first`).
- [ ] VS Code con estos archivos en pestañas: `hybrid.provider.ts`,
      `moderator.service.ts`, `moderator-prompt.ts`, `authorship.util.ts`,
      `chat.gateway.ts`, `sessions.service.ts`, `ChatPanel.tsx`.
- [ ] Los 8 PNG de `docs/diagrams/2do_parcial/` a mano.
- [ ] Plan B: `docker-compose.local.yml` probado sin internet.
