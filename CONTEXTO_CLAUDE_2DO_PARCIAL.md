# 🤖 CONTEXTO COMPLETO PARA CLAUDE — 2DO EXAMEN PARCIAL SW1

> **Instrucción de uso:** Pega este archivo completo al inicio de cualquier nueva conversación con Claude para que tenga todo el contexto del proyecto y pueda asistirte correctamente.

---

## 👤 IDENTIFICACIÓN DEL PROYECTO

| Campo | Valor |
|---|---|
| **Materia** | Ingeniería de Software 1 (SW1) |
| **Grupo** | 43 |
| **Integrantes** | Elizabeth Rivero Peña · Luis Fernando Angulo Heredia |
| **Tipo** | 2do Examen Parcial (Extensión del 1er Parcial) |
| **Fecha de Entrega** | **Miércoles 11 de Noviembre de 2026 a las 08:00 AM** |
| **Repositorio** | `luisfernandoAngulo28/generador_diagrama_clases_uml` |

---

## 🏗️ STACK TECNOLÓGICO ACTUAL (1er PARCIAL — NO TOCAR)

El 1er Parcial fue evaluado al **100% funcional**. No se rompe nada de lo que existe.

| Capa | Tecnología |
|---|---|
| Backend CASE Tool | NestJS (Node.js + TypeScript) |
| Base de Datos actual | PostgreSQL 16 (TypeORM) — a migrar al 2do parcial |
| WebSockets | Socket.io (@nestjs/websockets) |
| Frontend Web | React + React Flow + Vite + TypeScript |
| App Móvil | Flutter (Dart) |
| IA Proveedor 1 | Google Gemini API (@google/generative-ai) |
| IA Proveedor 2 | Ollama Local (qwen2.5:1.5b-instruct, moondream) |
| Generador | Backend Spring Boot 3.3.4 generado como ZIP desde el diagrama UML |
| Despliegue | Docker Compose + VPS con DuckDNS + SSL Let's Encrypt |

### Funcionalidades heredadas del 1er Parcial (TODO se mantiene):
1. Edición normal del diagrama de clases UML en lienzo visual.
2. Exportar e importar diagramas en formato XMI.
3. Colaboración en tiempo real (locks pesimistas por clase, presencia de usuarios).
4. Generador de backend Spring Boot 3.3.4 con JPA, Swagger, Docker desde el diagrama.
5. Interpretación por voz (useSpeechRecognition) para comandos a la IA.
6. IA local con Ollama (Plan B offline para la defensa sin internet).

---

## 🎯 REQUERIMIENTOS DEL 2DO PARCIAL (Apuntes del Docente)

### El Concepto Central: "La IA como Docente en el Aula / Desarrollador Senior"

La novedad central es que la IA deja de ser un asistente privado 1 a 1 y se convierte
en un moderador grupal visible para todos los integrantes del equipo.

Metáfora del docente: Como en el aula, el docente sabe quién pregunta, a quién responde,
qué están haciendo todos en el tablero, y puede mentorar en aspectos conceptuales y prácticos.

### Reglas de Comportamiento de la IA:

1. La IA SIEMPRE nombra a quien responde:
   - CORRECTO: "Trevor, aquí tu respuesta: un atributo derivado es..."
   - INCORRECTO: Responder de forma genérica sin dirigirse a nadie.

2. Chat completamente público: No existen conversaciones privadas.
   Todos los conectados a la sala ven preguntas y respuestas.

3. Doble Rol de Mentor:
   - Teórico: Responde dudas conceptuales de Ingeniería de Software.
   - Práctico: Si se solicita, ejecuta acciones directamente sobre el diagrama compartido.

4. Contexto Dual (Grupal e Individual):
   - Grupal: Conoce el estado del diagrama, quién hizo qué y cuándo.
   - Individual: Recuerda el hilo de preguntas previas de cada integrante.

### Modelo de IA (Híbrido — según docente):
- Ollama local (qwen2.5 / llama3.2) => VALORABLE, suma puntos extra, no obligatorio.
- Google AI Studio / Gemini => Principal y respaldo en cloud.
- Ambos integrados con fallback automático e imperceptible.

---

## 📋 PROCESO DE REVISIÓN — 4 PASOS OBLIGATORIOS (Secuenciales)

CRÍTICO: Cada paso es obligatorio para avanzar al siguiente. No se puede saltear ninguno.

---

### PASO 1: Documentación publicada — Máximo 08:00 AM del 11 de Noviembre

La documentación es tipo SDD (Specification-Driven Development).

#### Carátula Obligatoria:
- Título: "Segundo Examen Parcial" (debe especificar que es el 2do examen)
- Nombre de la aplicación
- Integrantes: Elizabeth Rivero Peña y Luis Fernando Angulo Heredia
- Grupo: 43
- Fecha de entrega

#### Sección 1: Fundamentación Teórica de la Aplicación
Incluir TODO lo aplicado en el 1er y 2do Examen Parcial. Temas obligatorios:

**1. La Ingeniería de Software Asistida por Computadora (CASE)**
- Qué es una herramienta CASE, tipos, beneficios.
- Cómo nuestra aplicación es una herramienta CASE.

**2. Aceleración de la Productividad / Desarrollo Basado en Componentes**
- Cómo el generador de Spring Boot aplica el principio de reuso y componentes.

**3. Arquitectura del Software — 4 Tipos OBLIGATORIOS (deben verse en el código)**

| Tipo | Cómo se refleja en el proyecto |
|---|---|
| Arquitectura de Backend | NestJS con módulos (ai, diagrams, auth, generator, users) por responsabilidad. |
| Arquitectura de Frontend | React con componentes reutilizables, hooks, capa API separada, Context API. |
| Arquitectura de Datos | MongoDB (NoSQL) con colecciones diagrams, sessions, logs, chat_messages. |
| Arquitectura de Despliegue | Docker Compose, VPS, DuckDNS, SSL/TLS Let's Encrypt, contenedores separados. |

**4. Propósito del Software: "Dar larga vida al software"**
- Seguir estándares de programación (ESLint, Prettier, TypeScript tipado estricto).
- Diseño modular y extensible para reducir el costo del cambio.

**5. IA Local: Diferencia entre Entrenar y Configurar un Modelo**
- En nuestro caso CONFIGURAMOS el modelo (Ollama + qwen2.5).
- No entrenamos desde cero; usamos un LLM preentrenado y lo guiamos con System Prompts.
- IA local = opción offline/Plan B. Google AI Studio = proveedor principal en cloud.

**6. SDD — Specification-Driven Development (Desarrollo Dirigido por Especificaciones)**
- El sistema parte del diagrama UML (la especificación) y genera el backend Spring Boot.
- La especificación es el contrato. Si falla la especificación, falla el sistema generado.
- Referencia del docente: Booch, Jacobson, Rumbaugh — metodología PUDS.
- Ventaja: Claro, estructurado, genera código directamente desde el modelo.
- Desventaja (ventana): Si se olvidó algo en el diagrama, todo lo generado puede fallar.

**7. Estándares UML**
- El diagrama soporta UML según OMG (Object Management Group) — omg.com.
- Versión UML 2.x.
- Reglas de Modelado: Libro OMT (Object Modeling Technique) — Rumbaugh.

**8. Mecanismo de Onboarding del Usuario (Agente de Ayuda)**
- La aplicación tiene un mecanismo que enseña al usuario a usarla (Tour.tsx / FeaturesPanel.tsx).
- Este agente en línea dice cómo usar la aplicación de manera genérica.

#### Sección 2: Registro del Desarrollo (Evidencia del Proceso)
- Historial de commits en Git.
- Capturas de pruebas funcionales con fecha.
- Registro de funcionalidades implementadas por semana.
- PLAN_EVOLUCION_2DO_PARCIAL.md sirve como evidencia de planificación.

#### Sección 3: Mecanismo de Aprendizaje del Usuario
- Descripción del sistema de onboarding (tour guiado, panel de ayuda).
- Cómo un usuario nuevo aprende a usar la herramienta sin documentación externa.

#### Sección 4: Anexos
- Bibliografía en Normas APA.
- Metodología de investigación empleada (PUDS / RUP simplificado).
- Capturas de pantalla del sistema en funcionamiento.

---

### PASO 2: Presentación Física (11 de Noviembre — día del examen)

- Traer 2 carátulas físicas impresas.
- Cada carátula lleva un código QR que apunta:
  1. Al repositorio de GitHub del proyecto.
  2. A la aplicación desplegada en producción (DuckDNS con SSL).
- Ambos enlaces activos y vigentes hasta que finalice el semestre.
- El sistema debe estar en CALIDAD DE PRODUCTO (producción, no modo desarrollo).

---

### PASO 3: Validación y Verificación (V&V)

"¿Estamos construyendo correctamente el software? ¿Estamos haciendo un buen proceso?"

- Actividad V&V: Confirmar que lo que está en el código está reflejado en los modelos.
  (Diagrama UML <-> código generado <-> base de datos)
- Mostrar que el proceso de desarrollo fue correcto y trazable.
- Lo que está en el código debe estar reflejado en los modelos y viceversa.

---

### PASO 4: Verificación de Autoría (Anti-Plagio / Defensa)

"Verificar que realmente uno hizo el software."

- No existen 2 aplicaciones iguales: cada grupo tiene su propia identidad.
- El docente verifica que los integrantes conocen y pueden explicar cada parte del código.
- Demostrar dominio técnico de: arquitectura elegida, decisiones de diseño e implementaciones.

---

## 🗄️ DISEÑO NoSQL — COLECCIONES MONGODB

### Colección `diagrams` (Con Autoría Granular)
Cada clase, atributo y relación registra quién lo creó, cuándo y desde qué fuente.

```json
{
  "_id": "ObjectId",
  "name": "Sistema de Ventas",
  "classes": [
    {
      "id": "uuid",
      "name": "Pedido",
      "author": { "userId": "u1", "userName": "Marco", "timestamp": "2026-10-20T10:15:00Z", "source": "MANUAL" },
      "lastModifiedBy": { "userId": "ai", "userName": "Copilot IA", "timestamp": "2026-10-20T10:20:00Z" },
      "attributes": [
        {
          "id": "uuid",
          "name": "total",
          "type": "Double",
          "visibility": "private",
          "author": { "userId": "u1", "userName": "Marco", "timestamp": "2026-10-20T10:16:00Z" }
        }
      ]
    }
  ],
  "relations": [],
  "createdBy": { "userId": "u1", "userName": "Marco" },
  "lastModifiedBy": { "userId": "u2", "userName": "Luis" },
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### Colección `diagram_sessions` (Sesiones Continuas)
Permite pausar y reanudar el trabajo exactamente donde se quedó.

```json
{
  "_id": "ObjectId",
  "diagramId": "ref",
  "status": "ACTIVE | PAUSED | CLOSED",
  "startedAt": "ISODate",
  "lastActivityAt": "ISODate",
  "participants": [
    { "userId": "u1", "userName": "Marco", "role": "editor", "joinedAt": "ISODate" }
  ],
  "activeLocks": {
    "cls_uuid": { "userId": "u1", "userName": "Marco", "lockedAt": "ISODate" }
  }
}
```

### Colección `diagram_activity_logs` (Bitácora Grupal)
Permite a la IA responder "¿qué hizo Marco?" con datos reales.

```json
{
  "_id": "ObjectId",
  "diagramId": "ref",
  "actor": { "userId": "u1", "userName": "Marco", "type": "USER | AI" },
  "action": "CLASS_CREATED | ATTRIBUTE_ADDED | RELATION_CREATED | AI_REVIEW_PERFORMED",
  "target": { "entityType": "CLASS | ATTRIBUTE | RELATION", "entityId": "uuid", "entityName": "Pedido" },
  "details": {},
  "timestamp": "ISODate"
}
```

### Colección `group_chat_messages` (Chat Grupal Público con IA)

```json
{
  "_id": "ObjectId",
  "diagramId": "ref",
  "sender": { "userId": "u1", "userName": "Marco", "type": "USER | AI" },
  "text": "¿Qué es un atributo derivado?",
  "isAiResponse": false,
  "addressedTo": null,
  "appliedOperationsCount": 0,
  "providerUsed": "OLLAMA_LOCAL | GEMINI_CLOUD",
  "timestamp": "ISODate"
}
```

---

## 📡 PROTOCOLO DE WEBSOCKETS (Sala Grupal)

| Evento | Dirección | Descripción |
|---|:---:|---|
| `join-diagram` | Cliente → Servidor | Une al usuario a la sala; el servidor responde con snapshot completo (diagrama, locks, chat). |
| `session:init-state` | Servidor → Cliente | Entrega contexto completo para restaurar la sesión continua. |
| `chat:send` | Cliente → Servidor | Envía mensaje al chat grupal público. |
| `chat:new-message` | Servidor → Sala | Difusión instantánea a TODOS los usuarios y al móvil Flutter. |
| `ai:status` | Servidor → Sala | Notifica que la IA está procesando: `{ isThinking: true, promptBy: "Marco" }`. |
| `diagram:operation` | Cliente → Servidor | Aplicación de cambios al modelo UML con autoría. |
| `diagram:sync` | Servidor → Sala | Difusión de cambios al lienzo para sincronizar clientes web y Flutter. |
| `lock-class / unlock-class` | Cliente → Servidor | Bloqueo pesimista por clase para evitar colisiones. |
| `locks-update` | Servidor → Sala | Lista actualizada de clases bloqueadas. |
| `mobile:notification` | Servidor → Móvil | Notificación push para dispositivos Flutter. |

---

## 🧠 MOTOR IA HÍBRIDO (Flujo de Decisión)

```
Petición de usuario en sala (@IA o consulta)
    ↓
HybridAiProvider
    ↓
¿Ollama Local responde en < 4 segundos?
    ├── SÍ → Usa respuesta de qwen2.5 → badge "Ollama Local 🏠"
    └── NO (timeout / offline / error)
            ↓
        Fallback a Gemini API (Google AI Studio)
            ↓
        Usa respuesta de Gemini → badge "Gemini Cloud ☁️"
```

### Contexto que recibe la IA en el System Prompt:
1. Estado del diagrama: clases actuales, atributos, tipos de datos.
2. Registro de autoría reciente: "Marco creó Pedido a las 10:15; Luis agregó total a las 10:16".
3. Historial de preguntas del usuario actual (contexto individual).
4. Rol asignado: "Eres el Moderador / Desarrollador Senior del equipo. Responde siempre dirigiéndote
   por nombre al usuario que pregunta. Solo modifica el lienzo si te lo piden explícitamente."

---

## 🗓️ CRONOGRAMA 4 SEMANAS

| Semana | Fechas | Objetivo |
|---|---|---|
| **Semana 1** | 17 - 23 Oct | MongoDB + Autoría Granular + Sesiones Continuas |
| **Semana 2** | 24 - 30 Oct | Motor IA Híbrido + System Prompt "Docente en el Aula" |
| **Semana 3** | 31 Oct - 6 Nov | WebSocket Grupal + ChatPanel Público + UI de Autoría |
| **Semana 4** | 7 - 11 Nov | Flutter Visor Realtime + Push + Documentación + Simulacro |

---

## ⚡ CHECKLIST TÉCNICO COMPLETO

### Semana 1 — MongoDB y Persistencia
- [ ] Instalar @nestjs/mongoose y mongoose en backend/package.json
- [ ] Agregar servicio mongo al docker-compose.prod.yml y docker-compose.local.yml
- [ ] Crear DiagramSchema con autoría embebida por clase, atributo y relación
- [ ] Crear DiagramSessionSchema para sesiones continuas
- [ ] Crear DiagramActivityLogSchema para bitácora grupal
- [ ] Crear GroupChatMessageSchema para el chat grupal público
- [ ] Migrar DiagramsService a MongoDB con trazabilidad de autor
- [ ] Endpoint de restauración de sesión (GET /sessions/:diagramId/latest)

### Semana 2 — Motor IA Híbrido
- [ ] Crear HybridAiProvider con timeout de 4s para Ollama y fallback a Gemini
- [ ] Diseñar System Prompt del Moderador Senior con identidad de usuario
- [ ] El System Prompt incluye: estado del diagrama, logs grupales, hilo individual del usuario
- [ ] Testear con: pregunta teórica, pregunta de contexto y solicitud de acción en lienzo
- [ ] Mostrar en UI qué proveedor respondió (badge Ollama / Gemini)

### Semana 3 — WebSocket Grupal y Frontend
- [ ] Extender DiagramsGateway: eventos chat:send, chat:new-message, ai:status, ai:respond
- [ ] Refactorizar ChatPanel.tsx de HTTP REST privado a WebSocket grupal público
- [ ] Mostrar avatar, nombre y timestamp de cada participante en el chat
- [ ] Indicador animado cuando la IA está pensando
- [ ] Indicador de autoría en ClassInspector.tsx (quién creó / editó cada clase)

### Semana 4 — Flutter, Documentación y Simulacro
- [ ] Agregar socket_io_client a flutter-template/pubspec.yaml
- [ ] Crear UmlViewerScreen.dart: conecta al socket, escucha diagram:sync, modo solo lectura
- [ ] Implementar notificaciones push en Flutter (flutter_local_notifications)
- [ ] Redactar Sección 1 de la Documentación (Fundamentación Teórica — todos los puntos)
- [ ] Redactar Sección 2 (Registro del Desarrollo con evidencias)
- [ ] Preparar 2 carátulas físicas con QR codes
- [ ] Simulacro final: 3 usuarios simultáneos + preguntas a la IA + cambios en vivo en Flutter

---

## 📚 BIBLIOGRAFÍA EN NORMAS APA

Rumbaugh, J., Blaha, M., Premerlani, W., Eddy, F., & Lorensen, W. (1991).
Object-Oriented Modeling and Design. Prentice Hall.

Jacobson, I., Booch, G., & Rumbaugh, J. (1999).
The Unified Software Development Process. Addison-Wesley.

Object Management Group. (2017).
OMG Unified Modeling Language Specification, Version 2.5.1.
https://www.omg.org/spec/UML/2.5.1

Sommerville, I. (2016).
Software Engineering (10th ed.). Pearson.

Beck, K. (2002).
Test Driven Development: By Example. Addison-Wesley.

---

## ❓ PREGUNTAS FRECUENTES DEL DOCENTE — RESPUESTAS LISTAS

**¿Por qué MongoDB en lugar de PostgreSQL?**
Porque el 2do parcial requiere sesiones continuas, historial granular de autoría y documentos
flexibles para guardar el modelo UML con metadatos de quién creó cada clase y atributo.
MongoDB con documentos embebidos permite esto sin joins complejos y es más natural para
guardar el modelo UML (que es un árbol de objetos, no una tabla relacional).

**¿Cómo sabe la IA quién está preguntando?**
El WebSocket de NestJS inyecta los datos del usuario autenticado (JWT) en cada mensaje.
Cuando la IA recibe la consulta, lleva en el System Prompt el nombre del usuario, su historial
de acciones en el lienzo y su hilo de preguntas previas de la sesión actual.

**¿Qué es SDD?**
Specification-Driven Development. El usuario diseña el diagrama de clases UML (la especificación)
y nuestro sistema lo transforma directamente en código ejecutable Spring Boot 3.3.4.
El diagrama es el contrato que guía el desarrollo. Si la especificación falla, el sistema generado falla.

**¿Cuál es la diferencia entre Validación y Verificación?**
Verificación: ¿Estamos construyendo el software correctamente? (El código refleja el modelo).
Validación: ¿Estamos construyendo el software correcto? (El sistema hace lo que el usuario necesita).

**¿Qué es OMT?**
Object Modeling Technique. Técnica de modelado de Rumbaugh que inspiró el UML actual.
Define cómo representar clases, atributos, operaciones y relaciones entre objetos.

**¿Cuál arquitectura usaron en el frontend?**
Arquitectura de Componentes (React). Cada parte del UI es un componente reutilizable e independiente
(ChatPanel, ClassInspector, UmlClassNode). El estado global se maneja con Context API y los efectos
secundarios con Hooks personalizados (useSpeechRecognition, useSocket, etc.).

**¿Cómo funciona el modelo de IA local?**
Usamos Ollama, un runtime local para LLMs. NO entrenamos el modelo, lo CONFIGURAMOS mediante
un System Prompt que define su rol (Desarrollador Senior / Docente) y le da el contexto del diagrama
y la sala. Si Ollama no está disponible, el sistema conmuta automáticamente a Gemini API de Google.

**¿Qué diferencia tiene el 2do parcial del 1er parcial?**
El 1er parcial tenía una IA 1-a-1 por HTTP REST (privada). El 2do parcial convierte a la IA en un
moderador grupal visible para todos, con contexto dual (grupal e individual), identidad del usuario,
persistencia en MongoDB con autoría granular y sesiones continuas entre días de trabajo.
