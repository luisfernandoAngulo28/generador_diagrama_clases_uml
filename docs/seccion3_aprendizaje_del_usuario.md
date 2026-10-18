# Sección 3. Mecanismo de aprendizaje del usuario

> Sección obligatoria del documento SDD del 2do Parcial. Describe cómo un
> usuario nuevo aprende a usar la herramienta **sin documentación externa**.
> Cada mecanismo indica el archivo donde está implementado.

---

## 3.1 Enfoque: la aplicación enseña a usarse a sí misma

El aprendizaje del usuario se diseñó en **cuatro niveles**, del más guiado al
más autónomo. Un usuario nuevo los recorre en ese orden:

| Nivel | Mecanismo | Cuándo aparece | Qué aprende el usuario |
|---|---|---|---|
| 1. Primer contacto | Estado vacío del lienzo | Al abrir un diagrama sin clases | Por dónde empezar |
| 2. Guiado | Recorrido (tour) de 7 pasos | Automáticamente la primera vez; luego con el botón **Recorrido** | El flujo completo: modelar → validar → generar → exportar → consultar a la IA |
| 3. Consulta | Leyenda UML, atajos, paleta de comandos, plantillas, tooltips | Cuando el usuario los necesita | La notación UML y las funciones avanzadas |
| 4. Retroalimentación | Validador del modelo y Moderador IA del chat | Mientras trabaja | Qué hizo mal y por qué; conceptos de ingeniería de software |

---

## 3.2 Nivel 1 — Estado vacío del lienzo

Un lienzo en blanco no le dice nada a un principiante. Por eso, cuando el
diagrama no tiene clases, se muestra una tarjeta *"Diseña tu Arquitectura de
Software"* con cuatro puntos de partida:

1. **Crear primera clase:** agrega una entidad al lienzo.
2. **Cargar plantilla:** abre la galería de plantillas.
3. **Escanear boceto:** reconoce con IA un diagrama dibujado en papel o pizarra.
4. **Atajos de teclado:** muestra los atajos principales.

**Implementación:** `frontend/src/components/CanvasEmptyState.tsx`

![Captura 9: estado vacío del lienzo con accesos rápidos y el chat del equipo.](docs/documento_final/img/evidencias/prod_lienzo_vacio.jpg){width=6in}

---

## 3.3 Nivel 2 — Recorrido guiado (tour)

La primera vez que el usuario entra, la aplicación inicia sola un **tour de 7
pasos**. Cada paso **resalta el control real de la interfaz** y explica para
qué sirve:

| Paso | Control resaltado | Lo que explica |
|---|---|---|
| 1 | Nombre del diagrama | Con qué nombre se guarda el diagrama |
| 2 | Botón **+ Clase** | Crear una clase y editar sus atributos y su clave primaria |
| 3 | Selector de relación | Elegir el tipo de relación y arrastrar entre clases para conectarlas |
| 4 | **Validar** | Revisar integridad y normalización (3FN) antes de generar |
| 5 | **Spring Boot** | Descargar el backend completo de 4 capas |
| 6 | Exportar **XMI** | Llevar el modelo a Enterprise Architect (XMI 2.1) |
| 7 | **Chat del equipo** | El chat es público; el Moderador IA responde por nombre y solo cambia el diagrama si se lo piden |

**Detalles de diseño:**
- **Se muestra una sola vez:** al terminar se guarda la marca
  `case-tool-tour-seen` en el navegador.
- **Se puede repetir:** el usuario lo vuelve a lanzar con el botón
  **Recorrido** de la barra de herramientas.
- **El globo de ayuda se reubica solo** (arriba, abajo o al costado del control)
  para no salirse de la pantalla.
- **2do Parcial:** el paso 7 se actualizó para presentar el **chat grupal
  público** en lugar del asistente privado del 1er Parcial.

**Implementación:** `frontend/src/components/Tour.tsx` (componente);
`TOUR_STEPS` y `TOUR_SEEN_KEY` en `frontend/src/App.tsx`.

![Captura 10: paso 2 de 7 del recorrido guiado, resaltando el botón "+ Clase".](docs/documento_final/img/evidencias/prod_recorrido.jpg){width=6in}

---

## 3.4 Nivel 3 — Ayuda bajo demanda

- **Leyenda de notación UML 2.5** sobre el lienzo: muestra qué significa cada
  flecha y rombo (herencia, composición, agregación, dependencia…), para
  aprender la notación mientras se modela. `UmlLegend.tsx`
- **Guía de atajos de teclado** (15 atajos): `Ctrl+K`, `Ctrl+Z` / `Ctrl+Y`,
  `Ctrl+F`, `Supr`, doble clic para editar, arrastrar para relacionar, etc. `ShortcutsModal.tsx`
- **Paleta de comandos** (`Ctrl+K`, estilo VS Code): busca cualquier acción o
  clase escribiendo su nombre, sin conocer de antemano dónde está el menú.
  `CommandPaletteModal.tsx`
- **Galería de plantillas** (7): Herencia básica, Composición (todo-parte),
  Muchos a muchos, Asociación 1:N, Sistema de Restaurante, Sistema Clínico /
  Hospital y Sistema Académico Universitario. **Se aprende viendo ejemplos
  correctos** de cada tipo de relación. `TemplatesPanel.tsx`, `lib/templates.ts`
- **Tooltips descriptivos** en los botones de la barra, por ejemplo *"Deshacer
  (Ctrl+Z)"* o *"Abrir paleta rápida de comandos (Ctrl + K)"*.

![Captura 11a: leyenda de notación UML 2.5 sobre el lienzo.](docs/documento_final/img/evidencias/prod_leyenda.jpg){width=5.5in}

![Captura 11b: guía de atajos de teclado y comandos rápidos.](docs/documento_final/img/evidencias/prod_atajos.jpg){width=5.5in}

---

## 3.5 Nivel 4 — Retroalimentación mientras se trabaja

### 3.5.1 El validador como maestro de modelado

**Validar** no solo dice "error": explica **qué regla de modelado** se rompió.
Estos son los mensajes reales:

- *"La clase "Pedido" no tiene ningún atributo marcado como clave primaria (PK)."*
- *"Hay 2 clases con el mismo nombre ("Cliente"). Los nombres de clase deben ser únicos."*
- *"Hay una relación que apunta a una clase que ya no existe en el diagrama."*
- Avisos de **normalización**: atributos desnormalizados y claves foráneas
  escritas a mano que deberían modelarse como relación.

Así el usuario aprende las reglas de OMT y de normalización **en el momento en
que las necesita**. `backend/src/diagrams/validation.util.ts`, `ValidationPanel.tsx`

### 3.5.2 El Moderador IA: un agente de ayuda en línea (2do Parcial)

El chat público del equipo funciona como un **docente en el aula**:

- **Responde por nombre** a quien pregunta (*"Trevor, aquí tu respuesta…"*), y
  todos los integrantes ven la pregunta y la respuesta. **Lo que aprende uno lo
  aprende el equipo.**
- **Mentor teórico:** explica conceptos (atributo derivado, composición vs.
  agregación, normalización, JPA), con ejemplos tomados **del diagrama del
  propio equipo**.
- **Mentor práctico:** si se le pide explícitamente (*"agrega la clase Producto
  y relaciónala muchos a muchos con Pedido"*), aplica el cambio y lo deja
  marcado como **"vía IA"** en la autoría.
- **Memoria individual:** recuerda las preguntas previas de cada integrante y
  da continuidad (*"como te comenté antes…"*).
- **Funciona sin internet:** si Gemini no está disponible, responde el modelo
  local (Ollama).
- **Voz:** también se le puede preguntar por dictado.

`ChatPanel.tsx`, `backend/src/ai/moderator/`, `backend/src/ai/chat/chat.gateway.ts`

![Captura 12: el Moderador IA responde por nombre una pregunta teórica y no modifica el lienzo.](docs/documento_final/img/evidencias/prod_moderador_pregunta.jpg){width=6in}

---

## 3.6 Aprendizaje en el cliente móvil

El visor UML de Flutter está pensado para usarse sin instrucciones:

- **Acceso directo:** el botón flotante **"Visor UML en vivo"** en la pantalla
  principal.
- **Mismo login de la web:** el usuario entra con la misma cuenta y elige un
  diagrama de la lista.
- **Texto de ayuda en el lienzo:** *"Solo lectura · pellizca para hacer zoom ·
  toca una clase para ver su autoría"*.
- **Notificaciones:** avisan de cambios y de respuestas de la IA, así el
  integrante que sigue la clase desde el celular se entera sin buscar.

`flutter-template/lib/live/uml_viewer_screen.dart`

---

## 3.7 Cómo aprende un usuario nuevo: recorrido de ejemplo

1. **Entra por primera vez:** el tour lo lleva en 7 pasos por todo el flujo.
2. **Ve el lienzo vacío:** elige **Cargar plantilla → Composición** y observa un
   modelo correcto.
3. **Crea su propia clase y valida:** el validador le avisa *"no tiene clave
   primaria"* y aprende la regla.
4. **Duda qué relación usar:** consulta la **leyenda UML** o le pregunta al
   **Moderador IA** en el chat, y su equipo ve la explicación.
5. **Genera el backend Spring Boot.** Nunca abrió un manual.

> El **Manual de Usuario** (`MANUAL_DE_USUARIO.md`) existe como respaldo
> escrito, pero no es necesario para empezar a usar la herramienta.
