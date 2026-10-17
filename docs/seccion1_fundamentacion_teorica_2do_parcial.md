# Sección 1. Fundamentación teórica de la aplicación (2do Examen Parcial)

> Sección obligatoria del documento SDD del 2do Parcial. Cubre lo aplicado en
> el 1er y 2do Parcial. Cada tema termina con **"Dónde se ve en el código"**:
> esas referencias son la evidencia para el paso de Validación y Verificación
> (V&V) y para la defensa de autoría. Pegar en el Word en este orden.

---

## 1.1 La Ingeniería de Software Asistida por Computadora (CASE)

Una herramienta **CASE** (*Computer-Aided Software Engineering*) es un software
que automatiza o asiste actividades del proceso de desarrollo: análisis,
diseño, generación de código, documentación, pruebas y gestión. Su objetivo es
aumentar la productividad y la calidad, reduciendo los errores manuales que se
producen al pasar de una fase a otra (Sommerville, 2016).

Según la parte del ciclo de vida que cubren, las herramientas CASE se clasifican en:

| Tipo | Fases que cubre | Ejemplos |
|---|---|---|
| **Upper CASE** (alto nivel) | Requisitos, análisis y diseño (modelado) | Enterprise Architect, StarUML |
| **Lower CASE** (bajo nivel) | Implementación, generación de código, pruebas | Generadores de código, compiladores |
| **I-CASE** (integradas) | Cubren ambas, con un repositorio común | Rational Rose, herramientas MDA |

**Beneficios:** coherencia entre diseño e implementación, menor tiempo de
desarrollo, documentación siempre actualizada, estandarización (UML) y trabajo
en equipo sobre un mismo modelo.

**Nuestra aplicación es una herramienta I-CASE**, porque integra en un mismo
repositorio (el diagrama) las dos mitades del ciclo:

- **Upper CASE:** modelado visual de diagramas de clases UML, validación del
  modelo, interoperabilidad XMI con Enterprise Architect y documentación generada.
- **Lower CASE:** generación automática de un backend **Spring Boot 3.3.4**
  completo (entidades JPA, repositorios, servicios, controladores REST,
  Swagger, `schema.sql`, `data.sql`, colección Postman y Docker).
- **Asistencia inteligente (2do Parcial):** un moderador de IA grupal que
  responde dudas teóricas y modifica el diagrama compartido a pedido.

**Dónde se ve en el código**
- Modelado: `frontend/src/App.tsx`, `frontend/src/components/UmlClassNode.tsx`, `UmlRelationEdge.tsx`
- Validación del modelo: `backend/src/diagrams/validation.util.ts`
- Interoperabilidad XMI (OMG XMI 2.1): `backend/src/diagrams/xmi.util.ts`, `xmi-import.util.ts`
- Generador: `backend/src/generator/generator.service.ts` y `backend/src/generator/templates/`

---

## 1.2 Aceleración de la productividad: desarrollo basado en componentes y reuso

El **Desarrollo Basado en Componentes** (CBSE) construye sistemas ensamblando
piezas independientes y reutilizables con interfaces bien definidas, en lugar
de escribir todo desde cero. El **reuso** se aplica a varios niveles: código,
diseño (patrones) y arquitectura (plantillas de aplicación).

Nuestro generador aplica el reuso de tres formas:

1. **Plantillas como componentes de generación.** Cada capa del backend
   generado sale de una plantilla independiente y probada: `entity`,
   `repository`, `service`, `controller`, `enum`, `interface`, `schema-sql`,
   `data-sql`, `postman`, `openapi-config`, `jackson-config` y `project-files`.
   Agregar una capa nueva es agregar un componente sin tocar los demás.
2. **Reuso de componentes del ecosistema Spring.** El código generado no
   reimplementa la persistencia ni la API: se apoya en componentes maduros
   (Spring Data JPA, Spring Web, springdoc-openapi/Swagger), que es lo que
   permite que un diagrama se convierta en un backend funcional en segundos.
3. **Arquitectura en capas como plantilla de aplicación.** Todo backend
   generado repite la misma estructura Controller → Service → Repository →
   Entity, así que cualquier desarrollador ya sabe dónde está cada cosa.

En el frontend se aplica el mismo principio: la interfaz se compone de **31
componentes React** reutilizables (lienzo, inspector, chat, paneles), y la
lógica pura (diferencias, métricas, exportaciones) vive en módulos sin UI.

**Dónde se ve en el código**
- Plantillas (cada una con su test): `backend/src/generator/templates/*.template.ts` y `*.spec.ts`
- Componentes de UI: `frontend/src/components/` · lógica reutilizable: `frontend/src/lib/`

---

## 1.3 Arquitectura del software (los 4 tipos)

### 1.3.1 Arquitectura de backend — monolito modular por responsabilidades

El backend de la herramienta CASE es un **monolito modular en NestJS**
(Node.js + TypeScript). Cada módulo encapsula una responsabilidad y expone
solo lo necesario mediante inyección de dependencias:

| Módulo | Responsabilidad |
|---|---|
| `auth` | Registro, login y JWT; guard global que protege la API REST |
| `users` | Usuarios (PostgreSQL) |
| `diagrams` | Diagramas, autoría granular, bitácora, sesiones continuas, gateway de colaboración en tiempo real |
| `ai` | Motor IA híbrido (Gemini + Ollama), moderador grupal y gateway del chat |
| `generator` | Generación del backend Spring Boot en ZIP |
| `attachments` | Archivos adjuntos en Amazon S3 |

Dentro de cada módulo se respeta la separación **Controller (HTTP) /
Gateway (WebSocket) → Service (lógica) → Schema/Entity (datos)**. En el motor
de IA se aplica el **patrón Strategy** (`AiProvider`, con dos implementaciones:
`GeminiProvider` y `OllamaProvider`) compuesto por `HybridAiProvider`, que
agrega fallback automático y *circuit breaker*.

**Evidencia:** `backend/src/app.module.ts`, `backend/src/*/…module.ts`,
`backend/src/ai/providers/`.

### 1.3.2 Arquitectura de frontend — componentes, hooks y capa de API

- **Arquitectura de componentes (React + Vite + TypeScript):** cada parte de la
  UI es un componente independiente (`ChatPanel`, `ClassInspector`,
  `UmlClassNode`, `HistoryPanel`…).
- **Estado global con Context API:** `AuthContext` (sesión y JWT) y `ToastContext` (avisos).
- **Hooks personalizados** para efectos secundarios: `useSpeechRecognition` (dictado por voz).
- **Capa de acceso a datos separada:** `api/client.ts` (REST con Axios e
  interceptor JWT) y `api/socket.ts` (Socket.io con el JWT en el *handshake*).
  Los componentes no hablan directamente con el servidor.
- **Lienzo con React Flow**, que representa clases como nodos y relaciones como aristas.

**Evidencia:** `frontend/src/components/`, `frontend/src/context/`,
`frontend/src/hooks/`, `frontend/src/api/`.

### 1.3.3 Arquitectura de datos — persistencia políglota

En el 2do Parcial adoptamos **persistencia políglota**: cada dato se guarda en
el motor que mejor se adapta a su forma.

| Motor | Colecciones / tablas | Por qué |
|---|---|---|
| **MongoDB** (NoSQL documental) | `diagrams`, `diagram_sessions`, `diagram_activity_logs`, `group_chat_messages` | El modelo UML es un **árbol** (clases → atributos, relaciones) con la autoría **embebida** en cada elemento; las sesiones y la bitácora crecen con el uso. Un documento evita *joins* y se guarda tal cual. |
| **PostgreSQL** (relacional) | `users`, `attachments` | Datos relacionales con restricciones (correo único), estables y ya probados en el 1er Parcial. |

Decisiones clave:
- **Autoría granular:** cada clase, atributo y relación guarda `author`,
  `lastModifiedBy` y `source` (MANUAL, AI, XMI_IMPORT). La calcula el servidor
  comparando el modelo anterior con el nuevo, así que **el cliente no puede
  falsificarla**.
- **Bitácora estructurada:** una entrada por cambio (`CLASS_CREATED`,
  `ATTRIBUTE_ADDED`, `RELATION_DELETED`…), que permite a la IA responder
  *"¿qué hizo Marco?"* con datos reales.
- **Migración sin pérdida:** un script idempotente copió los datos del 1er
  Parcial conservando los mismos identificadores (UUID).

**Evidencia:** `backend/src/diagrams/schemas/`, `backend/src/diagrams/authorship.util.ts`,
`backend/src/scripts/migrate-pg-to-mongo.ts`.

### 1.3.4 Arquitectura de despliegue — contenedores en la nube

```
Usuario (web / móvil Flutter)
        │ HTTPS (Let's Encrypt)
        ▼
  nginx (contenedor frontend) ── sirve el SPA React
        │  /auth /diagrams /ai /sessions /generator /attachments  → proxy
        │  /socket.io                                              → WebSocket
        ▼
  backend NestJS (contenedor) ──┬── MongoDB 7 (contenedor, volumen mongo_data)
                                ├── PostgreSQL 16 (contenedor, volumen db_data)
                                ├── Amazon S3 (adjuntos)
                                └── Gemini API (IA en la nube) / Ollama (IA local)
```

- **Docker Compose** orquesta cuatro contenedores separados con *healthchecks*
  y reinicio automático; los datos viven en volúmenes persistentes.
- **Servidor en la nube** (instancia AWS EC2 de 1 GB) con dominio
  **DuckDNS** (`diagramasw1pracial100.duckdns.org`) y certificado
  **SSL/TLS de Let's Encrypt**; nginx redirige HTTP → HTTPS.
- **Despliegue por compilación local:** el `dist/` se compila en la PC y se sube
  por SCP, porque compilar en el servidor de 1 GB agotaba la memoria.
- **Plan B local:** `docker-compose.local.yml` levanta la misma pila en una
  laptop con IA local, para defender sin internet.

**Evidencia:** `docker-compose.prod.yml`, `docker-compose.local.yml`,
`frontend/nginx.conf`, `deploy/deploy-local-build.ps1`.

---

## 1.4 Propósito del software: "dar larga vida al software"

Un software vive mientras pueda **cambiar a bajo costo**. La mayor parte del
costo total ocurre después de la primera versión, en mantenimiento y evolución
(Sommerville, 2016). Para alargar la vida del sistema aplicamos:

1. **Estándares de programación verificados por herramientas:**
   - TypeScript con tipado estricto (backend con `strict: true`; frontend con
     `noUnusedLocals`, `noUnusedParameters` y `noFallthroughCasesInSwitch`).
   - Linter **oxlint** (reglas de React Hooks incluidas) y formateador
     **Prettier**; en Flutter, `flutter_lints`.
   - El estándar de codificación del equipo está documentado en el Anexo B.
2. **Diseño modular y extensible:** módulos con una sola responsabilidad,
   plantillas independientes en el generador y contratos explícitos
   (`AiProvider`). Agregar un tercer proveedor de IA o una nueva capa generada
   no obliga a modificar el resto.
3. **Pruebas automatizadas:** **106 pruebas unitarias** (Vitest) cubren el
   generador, la validación, XMI, la autoría, el motor híbrido y el prompt del
   moderador. Fallan si un cambio rompe un comportamiento existente.
4. **Evolución sin romper lo anterior:** el 2do Parcial agregó MongoDB, IA
   grupal y el visor móvil **manteniendo intactas** las funciones del 1er
   Parcial (verificado con pruebas de regresión: XMI, generador, locks).
5. **Configuración externa:** URL, claves y proveedores de IA se definen con
   variables de entorno (`.env.example` documentado), no en el código.

**Evidencia:** `backend/tsconfig.json`, `.prettierrc`, `oxlint.json`,
`docs/estandar_de_codificacion.md`, `backend/src/**/*.spec.ts`.

---

## 1.5 IA local: diferencia entre entrenar y configurar un modelo

| | **Entrenar** un modelo | **Configurar** un modelo (lo que hicimos) |
|---|---|---|
| Qué se hace | Ajustar millones de parámetros con grandes volúmenes de datos | Usar un modelo **ya preentrenado** y guiarlo con instrucciones |
| Requiere | Datasets, GPU/TPU, días o semanas de cómputo | Un *runtime* (Ollama) y un buen *System Prompt* |
| Resultado | Un modelo nuevo (pesos nuevos) | El mismo modelo con un **rol** y un **contexto** definidos |

**Nosotros configuramos, no entrenamos.** Usamos **qwen2.5:1.5b-instruct**
(Alibaba) ejecutado localmente con **Ollama**, y **Gemini** (Google AI Studio)
en la nube. Lo configuramos así:

- **System Prompt de rol:** *"Eres el Moderador y Desarrollador Senior del
  equipo… dirígete siempre por su nombre a quien pregunta… solo modifica el
  lienzo si te lo piden explícitamente"*.
- **Contexto dual inyectado en cada pregunta:**
  - **Grupal:** el estado del diagrama con su autoría, la bitácora de quién hizo
    qué y el chat público de la sala.
  - **Individual:** el hilo de preguntas previas de quien pregunta.
- **Ejemplos (few-shot)** y un mini glosario UML para el modelo pequeño.
- **Parámetros de inferencia:** temperatura 0 (respuestas deterministas) y
  salida en JSON con un contrato fijo de operaciones.
- **Validación determinista:** el servidor descarta operaciones inválidas y las
  que no responden a un pedido explícito. **La IA nunca toca el diagrama sin
  control.**

**Motor híbrido (local + nube):** ambos proveedores comparten el mismo
contrato. Por defecto responde Gemini, y **Ollama toma el relevo
automáticamente si no hay internet**; con `AI_HYBRID_ORDER=local-first` se
invierte el orden para la demostración. Lo medimos en la laptop del equipo
(CPU): el prompt completo tardaba 36–79 s en el modelo local; el *prompt lite*,
con caché de prefijo, baja a 5–18 s.

**Dónde se ve en el código:** `backend/src/ai/moderator/moderator-prompt.ts`,
`backend/src/ai/providers/hybrid.provider.ts`, `ollama.provider.ts`,
`backend/src/ai/moderator/intent.ts`.

---

## 1.6 SDD — Specification-Driven Development (Desarrollo Dirigido por Especificaciones)

En SDD la **especificación es el artefacto central**: el código se deriva de
ella, y no al revés. En nuestra herramienta, **el diagrama de clases UML es la
especificación** y el generador la transforma directamente en un backend
ejecutable:

```
Especificación (diagrama UML) ──validación──▶ Generador ──▶ Backend Spring Boot
   clases, atributos, tipos,                 plantillas      entidades JPA, repos,
   relaciones, multiplicidades                               servicios, REST, SQL
```

Se relaciona con el **Proceso Unificado (PUDS)** de Jacobson, Booch y
Rumbaugh (1999), que es dirigido por modelos: el modelo de diseño guía la
implementación.

- **Ventajas:** el proceso es claro y estructurado, el código es coherente con
  el diseño, la generación es inmediata y el modelo sirve como documentación viva.
- **Desventaja (la "ventana" del SDD):** *si se olvidó algo en la
  especificación, todo lo generado lo arrastra.* Una relación mal declarada
  produce claves foráneas incorrectas en todas las capas.
- **Cómo mitigamos esa ventana:** el validador revisa el modelo **antes** de
  generar (clases sin nombre o sin clave primaria, clases o atributos
  duplicados, relaciones hacia clases inexistentes, atributos desnormalizados
  y claves foráneas escritas a mano),
  la IA moderadora señala problemas de modelado, y la bitácora con autoría
  permite rastrear quién introdujo cada elemento.

**Dónde se ve en el código:** `backend/src/diagrams/validation.util.ts`,
`backend/src/generator/`.

---

## 1.7 Estándares UML

- **UML** es el lenguaje estándar de modelado de software, mantenido por el
  **OMG** (*Object Management Group*, omg.org). La versión vigente es **UML 2.5.1**
  (Object Management Group, 2017).
- Nuestro diagrama de clases soporta la notación UML 2.x:
  - Clases con atributos y operaciones, visibilidad (`+ - # ~`) y estereotipos
    (`«enum»`, `«abstract»`, `«interface»`).
  - Relaciones de asociación, agregación, composición, herencia y dependencia,
    con multiplicidades 1:1, 1:N, N:1 y N:M y nombres de rol.
- **Intercambio estándar:** los diagramas se exportan e importan en **XMI**
  (*XML Metadata Interchange*, también del OMG), compatible con Enterprise Architect.
- **Reglas de modelado — OMT:** la *Object Modeling Technique* de Rumbaugh et
  al. (1991) es la base del modelo de clases de UML. De sus reglas de modelado
  salen las que aplica nuestro validador:
  - toda clase tiene nombre único e identifica a sus objetos (clave primaria);
  - una clase no repite atributos;
  - las asociaciones solo unen clases existentes;
  - los vínculos entre clases se modelan como **relaciones** y no como atributos
    sueltos (por eso se avisa de las claves foráneas escritas a mano y de los
    atributos desnormalizados).

**Dónde se ve en el código:** `backend/src/diagrams/uml.types.ts`,
`frontend/src/components/UmlLegend.tsx`, `backend/src/diagrams/xmi.util.ts`.

---

## 1.8 Mecanismo de onboarding del usuario (agente de ayuda)

La aplicación **enseña a usarse a sí misma**, sin documentación externa:

1. **Recorrido guiado (Tour):** la primera vez que el usuario entra, un tour de
   7 pasos resalta cada parte de la interfaz. Los pasos son:
   1. dar nombre al diagrama;
   2. agregar una clase;
   3. elegir el tipo de relación;
   4. validar el modelo;
   5. generar el backend Spring Boot;
   6. exportar a XMI;
   7. usar el asistente de IA.

   Se puede repetir desde el botón **"Recorrido"** de la barra.
2. **Ayuda contextual:**
   - Un **estado vacío** del lienzo con las primeras acciones sugeridas.
   - Una **leyenda UML** que explica la notación.
   - Un modal de **atajos de teclado**.
   - Una **paleta de comandos** (`Ctrl+K`).
   - **Plantillas** de diagramas de ejemplo.
3. **Agente de ayuda en línea (IA):** el Moderador IA del chat público responde
   dudas sobre cómo modelar y sobre conceptos de ingeniería de software,
   dirigiéndose por su nombre a quien pregunta. Como el chat es público, lo
   que aprende un integrante queda visible para todo el equipo.

**Dónde se ve en el código:** `frontend/src/components/Tour.tsx` (pasos en
`TOUR_STEPS`, `App.tsx`), `CanvasEmptyState.tsx`, `UmlLegend.tsx`,
`ShortcutsModal.tsx`, `CommandPaletteModal.tsx`, `TemplatesPanel.tsx`,
`ChatPanel.tsx`.

---

## Referencias de esta sección (formato APA 7)

Jacobson, I., Booch, G., & Rumbaugh, J. (1999). *The unified software development process*. Addison-Wesley.

Object Management Group. (2017). *OMG Unified Modeling Language (OMG UML), version 2.5.1*. https://www.omg.org/spec/UML/2.5.1

Rumbaugh, J., Blaha, M., Premerlani, W., Eddy, F., & Lorensen, W. (1991). *Object-oriented modeling and design*. Prentice Hall.

Sommerville, I. (2016). *Software engineering* (10th ed.). Pearson.
