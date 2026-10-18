# Anexos

> Sección de Anexos (cumple el punto obligatorio "Anexos" del enunciado),
> **actualizada para el 2do Examen Parcial**. Insertar al final del documento.
> Donde se indica *(Figura A.n)*, insertar la imagen correspondiente con la
> fecha visible. Los datos entre ⟨corchetes⟩ debe completarlos el grupo.

## Anexo A. Evidencia del sistema en funcionamiento

Este anexo reúne la evidencia de que el sistema fue construido, desplegado y
verificado de extremo a extremo. Las secciones A.1 a A.7 corresponden al 1er
Parcial (se mantienen vigentes) y las A.8 a A.12 a lo agregado en el 2do Parcial.

### A.1 Despliegue en producción

La herramienta está desplegada en un servidor accesible públicamente, con
certificado SSL válido (HTTPS):

- **URL de producción:** `https://diagramasw1pracial100.duckdns.org`
- **Infraestructura:** servidor AWS EC2 con Docker Compose. Contenedores:
  - frontend (nginx con SSL);
  - backend NestJS;
  - PostgreSQL 16;
  - **MongoDB 7** (nuevo en el 2do Parcial).

  Los servicios se reinician solos y HTTP redirige a HTTPS.

  > ⟨Al 17/10/2026, la versión del 2do Parcial con MongoDB está probada en local
  > y en Docker, pero aún no desplegada en el VPS. Tomar la Figura A.1 después
  > del despliegue.⟩
- **Dominio y certificado:** DuckDNS + Let's Encrypt.
- **Almacenamiento en la nube:** los archivos adjuntos de los diagramas se
  guardan en un *bucket* de Amazon S3.

*(Figura A.1: sitio en producción con el candado de seguridad (HTTPS).)*

### A.2 Modelado y generación de código

*(Figura A.2: lienzo principal con un diagrama de clases.)*
*(Figura A.3: edición de atributos y operaciones de una clase.)*
*(Figura A.4: relaciones con multiplicidades en notación UML 2.5.)*
*(Figura A.5: código Java generado y Swagger UI con los endpoints CRUD.)*

### A.3 Colaboración en tiempo real

*(Figura A.6: dos navegadores editando el mismo diagrama, con la presencia de
usuarios y el bloqueo por clase.)*

### A.4 Asistencia por inteligencia artificial (1er Parcial)

*(Figura A.7: generación de clases por chat e interpretación de una fotografía
de pizarra.)*

### A.5 Interoperabilidad con Enterprise Architect (XMI)

*(Figura A.8: modelo exportado e importado en formato XMI dentro de Enterprise Architect.)*

### A.6 Cliente móvil y IA local verificados en dispositivo físico

- **APK compilado (modo release):** `ExamenSW1.apk`.
- Verificado en un teléfono Android real:
  - creación y listado de registros contra el backend generado (GET y POST
    persistidos en PostgreSQL);
  - dictado por voz;
  - **asistente de IA local funcionando en modo avión**.

*(Figura A.9: aplicación móvil en funcionamiento.)*

### A.7 Pruebas automatizadas

El backend tiene **117 pruebas unitarias en 19 archivos** (Vitest), todas
aprobadas al 17/10/2026. Cubren:
- el generador y cada plantilla;
- validación y XMI;
- autoría y bitácora;
- el motor de IA híbrido y el prompt del moderador.

*(Figura A.10: ejecución de `npx vitest run` con "117 passed".)*

### A.8 Persistencia en MongoDB con autoría granular (2do Parcial)

- Colecciones `diagrams`, `diagram_sessions`, `diagram_activity_logs` y
  `group_chat_messages`.
- Cada clase, atributo y relación registra quién la creó, quién la modificó y
  desde qué fuente (manual, IA o XMI).
- Migración desde PostgreSQL con IDs conservados: 8 diagramas y 55 entradas de
  historial. Se ejecutó dos veces sin duplicar datos.

*(Figura A.11: documento de un diagrama en MongoDB con los campos `author` y `lastModifiedBy`.)*
*(Figura A.12: panel de historial con la bitácora por cambio, incluido "(vía IA)".)*

### A.9 Chat grupal público con el Moderador IA (2do Parcial)

- Todos los conectados ven cada pregunta y respuesta; la IA nombra a quien
  pregunta y muestra qué proveedor respondió (🏠 Ollama Local / ☁️ Gemini Cloud).
- Prueba con dos usuarios simultáneos:
  - indicador *"La IA está pensando la respuesta para Luis"*;
  - cambio aplicado y sincronizado en ambos lienzos;
  - autoría *"Creada por Luis · vía IA"*.

*(Figura A.13: chat público con una respuesta "Moderador IA → Luis".)*
*(Figura A.14: inspector de clase con la sección de autoría.)*

### A.10 Motor de IA híbrido (2do Parcial)

Mediciones reales en la laptop del equipo (CPU):

| Escenario | Respondió | Tiempo |
|---|---|---|
| Gemini primero (por defecto) | Gemini Cloud | 4,3 s |
| Falla Gemini → respaldo automático | Ollama Local | 13,5 s |
| Ollama primero, modelo precalentado | Ollama Local | 5,0 s |

*(Figura A.15: log del backend con el desglose de tokens y tiempos de Ollama.)*

### A.11 Visor UML en tiempo real en Flutter (2do Parcial)

- El móvil ve en vivo (solo lectura) el diagrama y el chat del equipo; un
  cambio pedido a la IA desde la web aparece sin recargar.
- Toca una clase para ver su autoría.
- Notificaciones locales de mensajes y cambios.
- APK de release compilado con los cambios.

*(Figura A.16: visor móvil, pestaña Diagrama. Figura A.17: pestaña Chat.)*

### A.12 Mecanismo de aprendizaje del usuario

*(Figura A.18: tour guiado. Figura A.19: estado vacío del lienzo. Figura A.20:
leyenda UML y guía de atajos.)*

---

## Anexo B. Estándar de Codificación

El estándar de codificación del proyecto se documenta completo en el anexo
correspondiente (`docs/estandar_de_codificacion.md`). Incluye:
- convenciones de nomenclatura y estándares internacionales;
- stack tecnológico;
- herramientas de calidad: oxlint, Prettier, TypeScript estricto, Vitest y
  flutter_lints;
- configuración del entorno y métricas de calidad.

> *(Insertar aquí el contenido del documento "Estándar de Codificación".)*

---

## Anexo C. Información del grupo y recursos del proyecto

| Campo | Valor |
|---|---|
| Documento | **Segundo Examen Parcial** |
| Materia | Ingeniería de Software 1 (SW1) |
| Docente | Ing. Rolando Martínez Canedo |
| Grupo | **43** |
| Integrantes | **Elizabeth Rivero Peña** (registro ⟨…⟩) · **Luis Fernando Angulo Heredia** (registro ⟨…⟩) |
| Fecha de entrega | Miércoles 11 de noviembre de 2026, 08:00 |
| Repositorio (QR 1) | `https://github.com/luisfernandoAngulo28/generador_diagrama_clases_uml` |
| Aplicación en producción (QR 2) | `https://diagramasw1pracial100.duckdns.org` |
| Aplicación móvil | `ExamenSW1.apk` (incluye el Visor UML en vivo) |

---

## Anexo D. Metodología de investigación y de desarrollo

### D.1 Metodología de desarrollo: PUDS (Proceso Unificado, versión simplificada)

Seguimos el **Proceso Unificado de Desarrollo de Software** (Jacobson, Booch y
Rumbaugh, 1999). Sus tres principios se ven en el proyecto:

- **Dirigido por casos de uso:** los requisitos se modelaron como actores y
  casos de uso por ciclo (`docs/diagrams/actores.*`, `emcu_ciclo1..3.*`).
- **Centrado en la arquitectura:** las cuatro arquitecturas (backend, frontend,
  datos y despliegue) se definieron antes de construir; por ejemplo,
  `PLAN_SEMANA1_MONGODB.md` diseñó la persistencia antes de escribir código.
- **Iterativo e incremental:** el 1er Parcial fue la base y el 2do Parcial se
  construyó en cuatro iteraciones, cada una con su commit y su verificación.

| Fase PUDS | Qué se hizo en el 2do Parcial |
|---|---|
| Inicio | Requisitos del docente, actores y EMCU, plan de 4 semanas (`PLAN_EVOLUCION_2DO_PARCIAL.md`) |
| Elaboración | Arquitectura de datos políglota, protocolo WebSocket, diseño del motor IA híbrido |
| Construcción | Iteración 1: MongoDB y autoría · 2: IA híbrida · 3: chat grupal · 4: visor Flutter |
| Transición | Pruebas de regresión, documentación SDD, despliegue en el VPS y simulacro |

### D.2 Métodos de investigación empleados

- **Investigación documental:** especificaciones del OMG (UML 2.5.1, XMI 2.1),
  bibliografía de ingeniería de software y documentación técnica oficial
  (NestJS, MongoDB, Socket.IO, Ollama, Gemini).
- **Investigación experimental:** mediciones controladas para decidir el diseño.
  Por ejemplo, la latencia del modelo local con el prompt completo (36–79 s)
  frente al prompt lite con caché (5–18 s) determinó que Gemini responda primero
  por defecto y Ollama quede como respaldo sin internet.
- **Prueba y verificación:** pruebas unitarias automatizadas, pruebas de punta a
  punta y pruebas con varios usuarios simultáneos. Los defectos encontrados y
  sus causas se registran en la Sección 2.5.

---

## Anexo F. Bibliografía (APA 7)

Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design patterns: Elements of reusable object-oriented software*. Addison-Wesley.

Google. (s.f.). *Gemini API documentation*. Google AI for Developers. https://ai.google.dev/gemini-api/docs

Jacobson, I., Booch, G., & Rumbaugh, J. (1999). *The unified software development process*. Addison-Wesley.

MongoDB, Inc. (s.f.). *MongoDB manual*. https://www.mongodb.com/docs/manual/

NestJS. (s.f.). *NestJS documentation*. https://docs.nestjs.com/

Object Management Group. (2005). *MOF 2.0/XMI mapping specification, version 2.1*. https://www.omg.org/spec/XMI/

Object Management Group. (2017). *OMG Unified Modeling Language (OMG UML), version 2.5.1*. https://www.omg.org/spec/UML/2.5.1

Ollama. (s.f.). *Ollama documentation*. https://github.com/ollama/ollama/tree/main/docs

Rumbaugh, J., Blaha, M., Premerlani, W., Eddy, F., & Lorensen, W. (1991). *Object-oriented modeling and design*. Prentice Hall.

Sadalage, P. J., & Fowler, M. (2012). *NoSQL distilled: A brief guide to the emerging world of polyglot persistence*. Addison-Wesley.

Socket.IO. (s.f.). *Socket.IO documentation*. https://socket.io/docs/v4/

Sommerville, I. (2016). *Software engineering* (10th ed.). Pearson.
